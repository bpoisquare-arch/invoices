import { createClient as createServerClient } from '@/lib/supabase/server'
import {
  calculateArrivalStatus,
  calculateDepartureStatus,
  calculateWorkingDuration,
  parseDateString,
  DEFAULT_ATTENDANCE_SETTINGS,
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
  branch: string // 'Lahore' | 'Multan'
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

// Local fallback file path (shared across both projects on the machine)
function getFallbackStorePath(): string {
  const primaryPath = path.join(process.cwd(), 'data', 'attendance_requests.json')
  // Ensure directory exists
  const dir = path.dirname(primaryPath)
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true })
    } catch {}
  }
  return primaryPath
}

// Also sync to Grocery Management's data folder if it exists
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
  try {
    const supabase = await createServerClient()
    let query = supabase.from('attendance_requests').select('*').order('created_at', { ascending: false })

    if (filter?.branch && filter.branch !== 'all') {
      query = query.ilike('branch', `%${filter.branch}%`)
    }
    if (filter?.status && filter.status !== 'all') {
      query = query.eq('status', filter.status)
    }
    if (filter?.employeeId && filter.employeeId !== 'all') {
      query = query.eq('employee_id', filter.employeeId)
    }
    if (filter?.startDate) {
      query = query.gte('attendance_date', filter.startDate)
    }
    if (filter?.endDate) {
      query = query.lte('attendance_date', filter.endDate)
    }

    const { data, error } = await query

    if (!error && Array.isArray(data)) {
      return data as AttendanceRequestItem[]
    }
  } catch {
    // If Supabase table doesn't exist yet, fall back to file store
  }

  // Fallback to local store
  let items = readFallbackRequests()
  if (filter?.branch && filter.branch !== 'all') {
    items = items.filter((r) => r.branch.toLowerCase() === filter.branch!.toLowerCase())
  }
  if (filter?.status && filter.status !== 'all') {
    items = items.filter((r) => r.status === filter.status)
  }
  if (filter?.employeeId && filter.employeeId !== 'all') {
    items = items.filter((r) => r.employee_id === filter.employeeId)
  }
  if (filter?.startDate) {
    items = items.filter((r) => r.attendance_date >= filter.startDate!)
  }
  if (filter?.endDate) {
    items = items.filter((r) => r.attendance_date <= filter.endDate!)
  }
  return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

/**
 * 2. Create a new Attendance Request (from branch user in Grocery Management)
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
  const newItem: AttendanceRequestItem = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    employee_id: params.employee_id,
    employee_name: params.employee_name || '',
    batch_id: params.batch_id || '',
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

  // Try Supabase table first
  try {
    const supabase = await createServerClient()
    const { data, error } = await supabase.from('attendance_requests').insert(newItem as any).select().single()
    if (!error && data) {
      // Also cache in local file
      const current = readFallbackRequests().filter((r) => r.id !== newItem.id)
      writeFallbackRequests([data as any, ...current])
      return data as AttendanceRequestItem
    }
  } catch {
    // Supabase table not created yet
  }

  // Fallback save
  const current = readFallbackRequests().filter(
    (r) => !(r.employee_id === newItem.employee_id && r.attendance_date === newItem.attendance_date && r.status === 'PENDING')
  )
  writeFallbackRequests([newItem, ...current])
  return newItem
}

/**
 * 3. Review Request (Admin Action in MIS - Invoice Gen: APPROVE or REJECT)
 */
export async function reviewAttendanceRequest(params: {
  requestId: string
  action: 'APPROVE' | 'REJECT'
  reviewedBy?: string
  reviewNotes?: string
}): Promise<{ success: boolean; request: AttendanceRequestItem; updatedRecord?: any; message: string }> {
  const supabase = await createServerClient()
  const settings = await getAttendanceSettings()

  // 1. Find the request
  let targetRequest: AttendanceRequestItem | null = null
  try {
    const { data } = await supabase.from('attendance_requests').select('*').eq('id', params.requestId).single()
    if (data) {
      targetRequest = data as AttendanceRequestItem
    }
  } catch {}

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

  // CASE A: REJECT
  if (params.action === 'REJECT') {
    targetRequest.status = 'REJECTED'
    targetRequest.reviewed_by = reviewedBy
    targetRequest.reviewed_at = reviewedAt
    targetRequest.review_notes = params.reviewNotes || 'Rejected by Admin'
    targetRequest.updated_at = reviewedAt

    // Update in Supabase
    try {
      await supabase
        .from('attendance_requests')
        .update({
          status: 'REJECTED',
          reviewed_by: reviewedBy,
          reviewed_at: reviewedAt,
          review_notes: targetRequest.review_notes,
          updated_at: reviewedAt,
        } as any)
        .eq('id', params.requestId)
    } catch {}

    // Update fallback store
    const all = readFallbackRequests().map((r) => (r.id === params.requestId ? targetRequest! : r))
    writeFallbackRequests(all)

    return {
      success: true,
      request: targetRequest,
      message: 'Request rejected. Attendance record kept unchanged in database.',
    }
  }

  // CASE B: APPROVE -> Live Database Update in `attendance_records`!
  targetRequest.status = 'APPROVED'
  targetRequest.reviewed_by = reviewedBy
  targetRequest.reviewed_at = reviewedAt
  targetRequest.review_notes = params.reviewNotes || 'Approved by Admin'
  targetRequest.updated_at = reviewedAt

  const parsedDate = parseDateString(targetRequest.attendance_date)
  const dayOfWeek = parsedDate ? parsedDate.dayOfWeek : 1
  const dayName = parsedDate ? parsedDate.dayName : 'Monday'

  // Fetch current attendance_record for this employee & date if exists
  const { data: existingRecords } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('employee_id', targetRequest.employee_id)
    .eq('attendance_date', targetRequest.attendance_date)
    .limit(1)

  const currentRecord = existingRecords && existingRecords[0] ? existingRecords[0] : null
  let updatedRecord: any = null

  if (targetRequest.request_type === 'LEAVE') {
    const isWfh = targetRequest.leave_type === 'Work From Home'
    const duration = targetRequest.leave_duration === 0.5 ? 0.5 : 1
    const leaveName = targetRequest.leave_type || 'Casual Leave'

    let payload: any

    if (isWfh) {
      // Work From Home: Shift timings locked, 100% Present
      const wfhIn = '10:30 AM'
      const wfhOut = dayOfWeek === 6 ? '03:00 PM' : '06:30 PM'
      const wfhMinutes = dayOfWeek === 6 ? 4 * 60 : 8 * 60
      const wfhFormatted = dayOfWeek === 6 ? '4h 0m' : '8h 0m'

      payload = {
        employee_id: targetRequest.employee_id,
        attendance_date: targetRequest.attendance_date,
        day_of_week: dayName,
        in_time: wfhIn,
        out_time: wfhOut,
        arrival_status: 'On Time Arrival',
        departure_status: 'Work From Home',
        total_working_minutes: wfhMinutes,
        total_working_hours_formatted: wfhFormatted,
        raw_punches: [
          { punch_time: wfhIn, type: 'IN', source: 'WFH', notes: targetRequest.reason || 'Work From Home (1 day)' },
          { punch_time: wfhOut, type: 'OUT', source: 'WFH', notes: targetRequest.reason || 'Work From Home (1 day)' },
        ],
        updated_at: new Date().toISOString(),
      }
    } else {
      // Standard / Probation Leave (0.5 or 1 day)
      const noteDetails = targetRequest.reason
        ? `${leaveName} (${duration} day${duration === 1 ? '' : 's'}): ${targetRequest.reason}`
        : `${leaveName} (${duration} day${duration === 1 ? '' : 's'})`

      payload = {
        employee_id: targetRequest.employee_id,
        attendance_date: targetRequest.attendance_date,
        day_of_week: dayName,
        in_time: null,
        out_time: null,
        arrival_status: 'Leave',
        departure_status: leaveName,
        total_working_minutes: 0,
        total_working_hours_formatted: '00:00',
        raw_punches: [
          {
            punch_time: null,
            type: 'LEAVE',
            notes: noteDetails,
          },
        ],
        updated_at: new Date().toISOString(),
      }
    }

    if (currentRecord?.id) {
      const { data, error } = await supabase
        .from('attendance_records')
        .update(payload as any)
        .eq('id', currentRecord.id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      updatedRecord = data
    } else {
      const { data, error } = await supabase
        .from('attendance_records')
        .insert({
          ...payload,
          created_at: new Date().toISOString(),
        } as any)
        .select()
        .single()
      if (error) throw new Error(error.message)
      updatedRecord = data
    }
  } else if (targetRequest.request_type === 'MISSING_IN') {
    const inTimeToUse = targetRequest.requested_in_time || '10:30 AM'
    const outTimeToUse = currentRecord?.out_time || null

    const arrivalStatus = calculateArrivalStatus(inTimeToUse, dayOfWeek, settings)
    const departureStatus = outTimeToUse
      ? calculateDepartureStatus(outTimeToUse, dayOfWeek, settings)
      : (currentRecord?.departure_status || 'On Time Departure')

    const duration = calculateWorkingDuration(inTimeToUse, outTimeToUse)

    const payload = {
      employee_id: targetRequest.employee_id,
      attendance_date: targetRequest.attendance_date,
      day_of_week: dayName,
      in_time: inTimeToUse,
      out_time: outTimeToUse,
      arrival_status: arrivalStatus,
      departure_status: departureStatus,
      total_working_minutes: duration.totalMinutes,
      total_working_hours_formatted: duration.formatted,
      updated_at: new Date().toISOString(),
    }

    if (currentRecord?.id) {
      const { data, error } = await supabase
        .from('attendance_records')
        .update(payload as any)
        .eq('id', currentRecord.id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      updatedRecord = data
    } else {
      const { data, error } = await supabase
        .from('attendance_records')
        .insert({
          ...payload,
          created_at: new Date().toISOString(),
        } as any)
        .select()
        .single()
      if (error) throw new Error(error.message)
      updatedRecord = data
    }
  } else if (targetRequest.request_type === 'MISSING_OUT') {
    const inTimeToUse = currentRecord?.in_time || null
    const outTimeToUse = targetRequest.requested_out_time || '06:30 PM'

    const arrivalStatus = inTimeToUse
      ? calculateArrivalStatus(inTimeToUse, dayOfWeek, settings)
      : (currentRecord?.arrival_status || 'On Time Arrival')
    const departureStatus = calculateDepartureStatus(outTimeToUse, dayOfWeek, settings)

    const duration = calculateWorkingDuration(inTimeToUse, outTimeToUse)

    const payload = {
      employee_id: targetRequest.employee_id,
      attendance_date: targetRequest.attendance_date,
      day_of_week: dayName,
      in_time: inTimeToUse,
      out_time: outTimeToUse,
      arrival_status: arrivalStatus,
      departure_status: departureStatus,
      total_working_minutes: duration.totalMinutes,
      total_working_hours_formatted: duration.formatted,
      updated_at: new Date().toISOString(),
    }

    if (currentRecord?.id) {
      const { data, error } = await supabase
        .from('attendance_records')
        .update(payload as any)
        .eq('id', currentRecord.id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      updatedRecord = data
    } else {
      const { data, error } = await supabase
        .from('attendance_records')
        .insert({
          ...payload,
          created_at: new Date().toISOString(),
        } as any)
        .select()
        .single()
      if (error) throw new Error(error.message)
      updatedRecord = data
    }
  }

  // Update request status to APPROVED in Supabase
  try {
    await supabase
      .from('attendance_requests')
      .update({
        status: 'APPROVED',
        reviewed_by: reviewedBy,
        reviewed_at: reviewedAt,
        review_notes: targetRequest.review_notes,
        updated_at: reviewedAt,
      } as any)
      .eq('id', params.requestId)
  } catch {}

  // Update request in fallback store
  const all = readFallbackRequests().map((r) => (r.id === params.requestId ? targetRequest! : r))
  writeFallbackRequests(all)

  return {
    success: true,
    request: targetRequest,
    updatedRecord,
    message: 'Request approved and live attendance record updated successfully in database.',
  }
}
