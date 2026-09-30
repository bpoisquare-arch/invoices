import { prisma } from '@/lib/prisma'
import {
  calculateArrivalStatus,
  calculateDepartureStatus,
  calculateWorkingDuration,
  parseDateString,
} from './attendance-calculator'
import { getAttendanceSettings } from './attendance.service'
import fs from 'fs'
import path from 'path'

export type AttendanceRequestType = 'LEAVE' | 'MISSING_IN' | 'MISSING_OUT'
export type AttendanceRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

export interface AttendanceRequestItem {
  id: string
  employee_id: string
  employee_name?: string
  batch_id?: string
  branch: string
  attendance_date: string // 'YYYY-MM-DD'
  request_type: AttendanceRequestType
  leave_type?: string | null
  leave_duration?: number | null
  requested_in_time?: string | null
  requested_out_time?: string | null
  reason?: string | null
  status: AttendanceRequestStatus
  submitted_by?: string | null
  reviewed_by?: string | null
  reviewed_at?: string | null
  review_notes?: string | null
  created_at: string
  updated_at: string
}

function getFallbackStorePath(): string {
  const primaryPath = path.join(process.cwd(), 'data', 'attendance_requests.json')
  const dir = path.dirname(primaryPath)
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true })
    } catch {}
  }
  return primaryPath
}

function getGroceryStorePath(): string | null {
  const p = path.resolve('D:\\Grocery Management\\data\\attendance_requests.json')
  try {
    const dir = path.dirname(p)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    return p
  } catch {
    return null
  }
}

function readFallbackRequests(): AttendanceRequestItem[] {
  try {
    const p = getFallbackStorePath()
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf-8')
      return JSON.parse(raw || '[]')
    }
  } catch (err) {
    console.error('Error reading fallback requests:', err)
  }
  return []
}

function writeFallbackRequests(items: AttendanceRequestItem[]) {
  try {
    const dataStr = JSON.stringify(items, null, 2)
    const p1 = getFallbackStorePath()
    fs.writeFileSync(p1, dataStr, 'utf-8')
    const p2 = getGroceryStorePath()
    if (p2) {
      fs.writeFileSync(p2, dataStr, 'utf-8')
    }
  } catch (err) {
    console.error('Error writing fallback requests:', err)
  }
}

/**
 * 1. Fetch Requests (Filtered by branch, status, employeeId, date)
 */
export async function getAttendanceRequests(filter?: {
  branch?: string
  status?: string
  employeeId?: string
  startDate?: string
  endDate?: string
}): Promise<AttendanceRequestItem[]> {
  let requestsList: AttendanceRequestItem[] = []

  // 1. Query dedicated attendance_requests from Hostinger MySQL via Prisma
  try {
    const where: any = {}
    if (filter?.branch && filter.branch !== 'all') {
      where.branch = { contains: filter.branch }
    }
    if (filter?.status && filter.status !== 'all') {
      where.status = filter.status
    }
    if (filter?.employeeId && filter.employeeId !== 'all') {
      where.employeeId = filter.employeeId
    }
    if (filter?.startDate || filter?.endDate) {
      where.attendanceDate = {}
      if (filter?.startDate) where.attendanceDate.gte = new Date(filter.startDate)
      if (filter?.endDate) where.attendanceDate.lte = new Date(filter.endDate)
    }

    const dbRows = await prisma.attendanceRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    if (dbRows && dbRows.length > 0) {
      requestsList = dbRows.map((r) => ({
        id: r.id,
        employee_id: r.employeeId,
        employee_name: r.employeeName,
        batch_id: r.batchId,
        branch: r.branch,
        attendance_date: r.attendanceDate instanceof Date ? r.attendanceDate.toISOString().slice(0, 10) : String(r.attendanceDate).slice(0, 10),
        request_type: r.requestType as AttendanceRequestType,
        leave_type: r.leaveType,
        leave_duration: r.leaveDuration ? Number(r.leaveDuration) : null,
        requested_in_time: r.requestedInTime,
        requested_out_time: r.requestedOutTime,
        reason: r.reason,
        status: r.status as AttendanceRequestStatus,
        submitted_by: r.submittedBy,
        reviewed_by: r.reviewedBy,
        reviewed_at: r.reviewedAt ? r.reviewedAt.toISOString() : null,
        review_notes: r.reviewNotes,
        created_at: r.createdAt.toISOString(),
        updated_at: r.updatedAt.toISOString(),
      }))
    }
  } catch (err) {
    console.warn('MySQL attendance requests fetch failed, falling back:', err)
  }

  // 2. Check MySQL attendanceRecord rawPunches for branch requests
  try {
    const mysqlRecsWithReqs = await prisma.attendanceRecord.findMany({
      where: {
        rawPunches: { not: '[]' },
      },
      select: { id: true, employeeId: true, attendanceDate: true, rawPunches: true },
    })

    if (mysqlRecsWithReqs && mysqlRecsWithReqs.length > 0) {
      for (const r of mysqlRecsWithReqs) {
        if (!Array.isArray(r.rawPunches)) continue
        const reqObj: any = (r.rawPunches as any[]).find((p: any) => p && p.type === 'BRANCH_REQUEST')
        if (reqObj) {
          const reqId = reqObj.id || reqObj.request_id || `req-${r.id}`
          const dateStr = r.attendanceDate instanceof Date ? r.attendanceDate.toISOString().slice(0, 10) : String(r.attendanceDate).slice(0, 10)
          const exists = requestsList.some((item) => item.id === reqId || (item.employee_id === r.employeeId && item.attendance_date === dateStr))
          if (!exists) {
            requestsList.push({
              id: reqId,
              employee_id: reqObj.employee_id || r.employeeId,
              employee_name: reqObj.employee_name || '',
              batch_id: reqObj.batch_id || '',
              branch: reqObj.branch || 'Multan',
              attendance_date: reqObj.attendance_date || dateStr,
              request_type: reqObj.request_type || 'LEAVE',
              leave_type: reqObj.leave_type || null,
              leave_duration: reqObj.leave_duration !== undefined ? reqObj.leave_duration : 1,
              requested_in_time: reqObj.requested_in_time || null,
              requested_out_time: reqObj.requested_out_time || null,
              reason: reqObj.reason || null,
              status: reqObj.status || 'PENDING',
              submitted_by: reqObj.submitted_by || 'Branch User',
              reviewed_by: reqObj.reviewed_by || null,
              reviewed_at: reqObj.reviewed_at || null,
              review_notes: reqObj.review_notes || null,
              created_at: reqObj.created_at || dateStr,
              updated_at: reqObj.updated_at || dateStr,
            })
          }
        }
      }
    }
  } catch {}

  // 3. Fallback to local store as extra layer
  try {
    const local = readFallbackRequests()
    for (const loc of local) {
      if (!requestsList.some((r) => r.id === loc.id || (r.employee_id === loc.employee_id && r.attendance_date === loc.attendance_date))) {
        requestsList.push(loc)
      }
    }
  } catch {}

  if (filter?.branch && filter.branch !== 'all') {
    requestsList = requestsList.filter((r) => (r.branch || '').toLowerCase().includes(filter.branch!.toLowerCase()))
  }
  if (filter?.status && filter.status !== 'all') {
    requestsList = requestsList.filter((r) => r.status === filter.status)
  }
  if (filter?.employeeId && filter.employeeId !== 'all') {
    requestsList = requestsList.filter((r) => r.employee_id === filter.employeeId)
  }
  if (filter?.startDate) {
    requestsList = requestsList.filter((r) => r.attendance_date >= filter.startDate!)
  }
  if (filter?.endDate) {
    requestsList = requestsList.filter((r) => r.attendance_date <= filter.endDate!)
  }

  return requestsList.sort((a, b) => new Date(b.created_at || b.attendance_date).getTime() - new Date(a.created_at || a.attendance_date).getTime())
}

/**
 * 2. Create a new Attendance Request
 */
export async function createAttendanceRequest(params: {
  employee_id: string
  employee_name?: string
  batch_id?: string
  branch: string
  attendance_date: string
  request_type: AttendanceRequestType
  leave_type?: string | null
  leave_duration?: number | null
  requested_in_time?: string | null
  requested_out_time?: string | null
  reason?: string | null
  submitted_by?: string | null
}): Promise<AttendanceRequestItem> {
  const reqId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

  let empUuid = params.employee_id
  let empName = params.employee_name || ''
  let empBatch = params.batch_id || ''

  try {
    const isUuid = Boolean(empUuid && empUuid.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/))
    const emp = await prisma.employee.findFirst({
      where: isUuid
        ? { OR: [{ id: empUuid }, { employeeId: empUuid }] }
        : { employeeId: empUuid },
    })
    if (emp) {
      empUuid = emp.id
      if (!empName) empName = emp.name
      if (!empBatch) empBatch = emp.employeeId
    }
  } catch (err) {
    console.warn('Could not resolve employee in Prisma for attendance request:', err)
  }

  const newItem: AttendanceRequestItem = {
    id: reqId,
    employee_id: empUuid,
    employee_name: empName,
    batch_id: empBatch,
    branch: params.branch,
    attendance_date: params.attendance_date,
    request_type: params.request_type,
    leave_type: params.leave_type || null,
    leave_duration: params.leave_duration !== undefined ? params.leave_duration : (params.request_type === 'LEAVE' ? 1 : null),
    requested_in_time: params.requested_in_time || null,
    requested_out_time: params.requested_out_time || null,
    reason: params.reason || null,
    status: 'PENDING',
    submitted_by: params.submitted_by || `${params.branch} Branch User`,
    reviewed_by: null,
    reviewed_at: null,
    review_notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  try {
    await prisma.attendanceRequest.create({
      data: {
        id: newItem.id,
        employeeId: newItem.employee_id,
        employeeName: newItem.employee_name || 'Staff',
        batchId: newItem.batch_id || 'EMP',
        branch: newItem.branch,
        attendanceDate: new Date(newItem.attendance_date),
        requestType: newItem.request_type,
        leaveType: newItem.leave_type,
        leaveDuration: newItem.leave_duration !== null && newItem.leave_duration !== undefined ? newItem.leave_duration : 1,
        requestedInTime: newItem.requested_in_time,
        requestedOutTime: newItem.requested_out_time,
        reason: newItem.reason,
        status: 'PENDING',
        submittedBy: newItem.submitted_by || `${newItem.branch} Branch User`,
      },
    })
  } catch (err) {
    console.warn('MySQL attendance request insert warning:', err)
  }

  try {
    const current = readFallbackRequests().filter(
      (r) => !(r.employee_id === newItem.employee_id && r.attendance_date === newItem.attendance_date && r.status === 'PENDING')
    )
    writeFallbackRequests([newItem, ...current])
  } catch {}

  return newItem
}

/**
 * 3. Review Request (APPROVE or REJECT)
 */
export async function reviewAttendanceRequest(params: {
  requestId: string
  action: 'APPROVE' | 'REJECT'
  reviewedBy?: string
  reviewNotes?: string
}): Promise<{ success: boolean; request: AttendanceRequestItem; updatedRecord?: any; message: string }> {
  const settings = await getAttendanceSettings()

  let targetRequest: AttendanceRequestItem | null = null
  try {
    const dbReq = await prisma.attendanceRequest.findUnique({
      where: { id: params.requestId },
    })
    if (dbReq) {
      targetRequest = {
        id: dbReq.id,
        employee_id: dbReq.employeeId,
        employee_name: dbReq.employeeName,
        batch_id: dbReq.batchId,
        branch: dbReq.branch,
        attendance_date: dbReq.attendanceDate instanceof Date ? dbReq.attendanceDate.toISOString().slice(0, 10) : String(dbReq.attendanceDate).slice(0, 10),
        request_type: dbReq.requestType as AttendanceRequestType,
        leave_type: dbReq.leaveType,
        leave_duration: dbReq.leaveDuration ? Number(dbReq.leaveDuration) : null,
        requested_in_time: dbReq.requestedInTime,
        requested_out_time: dbReq.requestedOutTime,
        reason: dbReq.reason,
        status: dbReq.status as AttendanceRequestStatus,
        submitted_by: dbReq.submittedBy,
        reviewed_by: dbReq.reviewedBy,
        reviewed_at: dbReq.reviewedAt ? dbReq.reviewedAt.toISOString() : null,
        review_notes: dbReq.reviewNotes,
        created_at: dbReq.createdAt.toISOString(),
        updated_at: dbReq.updatedAt.toISOString(),
      }
    }
  } catch (err) {
    console.warn('Prisma attendance request lookup warning:', err)
  }

  if (!targetRequest) {
    const all = readFallbackRequests()
    targetRequest = all.find((r) => r.id === params.requestId) || null
  }

  if (!targetRequest) {
    throw new Error('Attendance request not found.')
  }

  if (targetRequest.status !== 'PENDING') {
    throw new Error(`This request has already been ${targetRequest.status.toLowerCase()}.`)
  }

  const reviewedAt = new Date().toISOString()
  const reviewedBy = params.reviewedBy || 'Admin'

  if (params.action === 'REJECT') {
    targetRequest.status = 'REJECTED'
    targetRequest.reviewed_by = reviewedBy
    targetRequest.reviewed_at = reviewedAt
    targetRequest.review_notes = params.reviewNotes || 'Rejected by Admin'
    targetRequest.updated_at = reviewedAt

    try {
      await prisma.attendanceRequest.updateMany({
        where: { id: params.requestId },
        data: {
          status: 'REJECTED',
          reviewedBy,
          reviewedAt: new Date(reviewedAt),
          reviewNotes: targetRequest.review_notes,
        },
      })
    } catch (err) {
      console.warn('MySQL request reject update warning:', err)
    }

    const all = readFallbackRequests().map((r) => (r.id === params.requestId ? targetRequest! : r))
    writeFallbackRequests(all)

    return {
      success: true,
      request: targetRequest,
      message: 'Request rejected. Attendance record kept unchanged in database.',
    }
  }

  // CASE B: APPROVE
  targetRequest.status = 'APPROVED'
  targetRequest.reviewed_by = reviewedBy
  targetRequest.reviewed_at = reviewedAt
  targetRequest.review_notes = params.reviewNotes || 'Approved by Admin'
  targetRequest.updated_at = reviewedAt

  const parsedDate = parseDateString(targetRequest.attendance_date)
  const dayOfWeek = parsedDate ? parsedDate.dayOfWeek : 1
  const dayName = parsedDate ? parsedDate.dayName : 'Monday'

  let currentRecord: any = null
  try {
    currentRecord = await prisma.attendanceRecord.findFirst({
      where: {
        employeeId: targetRequest.employee_id,
        attendanceDate: new Date(targetRequest.attendance_date),
      },
    })
  } catch {}

  let updatedRecord: any = null

  if (targetRequest.request_type === 'LEAVE') {
    const isWfh = targetRequest.leave_type === 'Work From Home'
    const duration = targetRequest.leave_duration === 0.5 ? 0.5 : 1
    const leaveName = targetRequest.leave_type || 'Casual Leave'

    if (isWfh) {
      const wfhIn = '10:30 AM'
      const wfhOut = dayOfWeek === 6 ? '03:00 PM' : '06:30 PM'
      const wfhMinutes = dayOfWeek === 6 ? 4 * 60 : 8 * 60
      const wfhFormatted = dayOfWeek === 6 ? '4h 0m' : '8h 0m'

      updatedRecord = {
        in_time: wfhIn,
        out_time: wfhOut,
        arrival_status: 'On Time Arrival',
        departure_status: 'Work From Home',
        total_working_minutes: wfhMinutes,
        total_working_hours_formatted: wfhFormatted,
        raw_punches: [
          {
            type: 'BRANCH_REQUEST',
            ...targetRequest,
            status: 'APPROVED',
            reviewed_by: reviewedBy,
            reviewed_at: reviewedAt,
            review_notes: targetRequest.review_notes,
          },
          { punch_time: wfhIn, type: 'IN', source: 'WFH', notes: targetRequest.reason || 'Work From Home (1 day)' },
          { punch_time: wfhOut, type: 'OUT', source: 'WFH', notes: targetRequest.reason || 'Work From Home (1 day)' },
        ],
      }
    } else {
      const noteDetails = targetRequest.reason
        ? `${leaveName} (${duration} day${duration === 1 ? '' : 's'}): ${targetRequest.reason}`
        : `${leaveName} (${duration} day${duration === 1 ? '' : 's'})`

      updatedRecord = {
        in_time: null,
        out_time: null,
        arrival_status: 'Leave',
        departure_status: leaveName,
        total_working_minutes: 0,
        total_working_hours_formatted: '00:00',
        raw_punches: [
          {
            type: 'BRANCH_REQUEST',
            ...targetRequest,
            status: 'APPROVED',
            reviewed_by: reviewedBy,
            reviewed_at: reviewedAt,
            review_notes: targetRequest.review_notes,
          },
          { punch_time: null, type: 'LEAVE', notes: noteDetails },
        ],
      }
    }
  } else if (targetRequest.request_type === 'MISSING_IN') {
    const inTimeToUse = targetRequest.requested_in_time || '10:30 AM'
    const outTimeToUse = currentRecord?.outTime || null
    const arrivalStatus = calculateArrivalStatus(inTimeToUse, dayOfWeek, settings)
    const departureStatus = outTimeToUse
      ? calculateDepartureStatus(outTimeToUse, dayOfWeek, settings)
      : (currentRecord?.departureStatus || 'On Time Departure')
    const duration = calculateWorkingDuration(inTimeToUse, outTimeToUse)

    updatedRecord = {
      in_time: inTimeToUse,
      out_time: outTimeToUse,
      arrival_status: arrivalStatus,
      departure_status: departureStatus,
      total_working_minutes: duration.totalMinutes,
      total_working_hours_formatted: duration.formatted,
      raw_punches: [
        {
          type: 'BRANCH_REQUEST',
          ...targetRequest,
          status: 'APPROVED',
          reviewed_by: reviewedBy,
          reviewed_at: reviewedAt,
          review_notes: targetRequest.review_notes,
        },
        ...(Array.isArray(currentRecord?.rawPunches)
          ? (currentRecord.rawPunches as any[]).filter((p: any) => p && p.type !== 'BRANCH_REQUEST')
          : []),
      ],
    }
  } else if (targetRequest.request_type === 'MISSING_OUT') {
    const inTimeToUse = currentRecord?.inTime || null
    const outTimeToUse = targetRequest.requested_out_time || '06:30 PM'
    const arrivalStatus = inTimeToUse
      ? calculateArrivalStatus(inTimeToUse, dayOfWeek, settings)
      : (currentRecord?.arrivalStatus || 'On Time Arrival')
    const departureStatus = calculateDepartureStatus(outTimeToUse, dayOfWeek, settings)
    const duration = calculateWorkingDuration(inTimeToUse, outTimeToUse)

    updatedRecord = {
      in_time: inTimeToUse,
      out_time: outTimeToUse,
      arrival_status: arrivalStatus,
      departure_status: departureStatus,
      total_working_minutes: duration.totalMinutes,
      total_working_hours_formatted: duration.formatted,
      raw_punches: [
        {
          type: 'BRANCH_REQUEST',
          ...targetRequest,
          status: 'APPROVED',
          reviewed_by: reviewedBy,
          reviewed_at: reviewedAt,
          review_notes: targetRequest.review_notes,
        },
        ...(Array.isArray(currentRecord?.rawPunches)
          ? (currentRecord.rawPunches as any[]).filter((p: any) => p && p.type !== 'BRANCH_REQUEST')
          : []),
      ],
    }
  }

  // Update request status to APPROVED in MySQL via Prisma
  try {
    await prisma.attendanceRequest.updateMany({
      where: { id: params.requestId },
      data: {
        status: 'APPROVED',
        reviewedBy,
        reviewedAt: new Date(reviewedAt),
        reviewNotes: targetRequest.review_notes,
      },
    })
  } catch (err) {
    console.warn('MySQL request approve update warning:', err)
  }

  // Update or insert attendance_record in MySQL via Prisma
  try {
    const parsedDateObj = new Date(targetRequest.attendance_date)
    await prisma.attendanceRecord.upsert({
      where: {
        employeeId_attendanceDate: {
          employeeId: targetRequest.employee_id,
          attendanceDate: parsedDateObj,
        },
      },
      update: {
        dayOfWeek: dayName,
        inTime: updatedRecord?.in_time || null,
        outTime: updatedRecord?.out_time || null,
        arrivalStatus: updatedRecord?.arrival_status || 'On Time Arrival',
        departureStatus: updatedRecord?.departure_status || 'On Time Departure',
        totalWorkingMinutes: updatedRecord?.total_working_minutes || 0,
        totalWorkingHoursFormatted: updatedRecord?.total_working_hours_formatted || '0h 0m',
        rawPunches: updatedRecord?.raw_punches || [],
      },
      create: {
        employeeId: targetRequest.employee_id,
        attendanceDate: parsedDateObj,
        dayOfWeek: dayName,
        inTime: updatedRecord?.in_time || null,
        outTime: updatedRecord?.out_time || null,
        arrivalStatus: updatedRecord?.arrival_status || 'On Time Arrival',
        departureStatus: updatedRecord?.departure_status || 'On Time Departure',
        totalWorkingMinutes: updatedRecord?.total_working_minutes || 0,
        totalWorkingHoursFormatted: updatedRecord?.total_working_hours_formatted || '0h 0m',
        rawPunches: updatedRecord?.raw_punches || [],
      },
    })
  } catch (err) {
    console.warn('MySQL attendance record upsert on approval warning:', err)
  }

  const all = readFallbackRequests().map((r) => (r.id === params.requestId ? targetRequest! : r))
  writeFallbackRequests(all)

  return {
    success: true,
    request: targetRequest,
    updatedRecord,
    message: 'Request approved and live attendance record updated successfully in database.',
  }
}

/**
 * 4. Cancel Pending Request
 */
export async function cancelAttendanceRequest(requestId: string): Promise<boolean> {
  try {
    await prisma.attendanceRequest.deleteMany({
      where: { id: requestId, status: 'PENDING' },
    })
  } catch (err) {
    console.warn('MySQL cancel attendance request error:', err)
  }

  const current = readFallbackRequests().filter((r) => !(r.id === requestId && r.status === 'PENDING'))
  writeFallbackRequests(current)
  return true
}
