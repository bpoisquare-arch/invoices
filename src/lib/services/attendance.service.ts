import { prisma } from '@/lib/prisma'

export function toEmployeeModel(emp: any): Employee {
  const joiningStr = emp.joiningDate
    ? (emp.joiningDate instanceof Date ? emp.joiningDate.toISOString().slice(0, 10) : String(emp.joiningDate).slice(0, 10))
    : (emp.joining_date || null)

  return {
    id: emp.id,
    user_id: emp.userId ?? emp.user_id ?? null,
    employee_id: emp.employeeId ?? emp.employee_id,
    name: emp.name,
    normalized_name: emp.normalizedName ?? emp.normalized_name ?? emp.name?.toLowerCase().trim() ?? '',
    designation: emp.designation,
    email: emp.email ?? null,
    branch: emp.branch || 'Multan',
    salary: emp.salary !== undefined && emp.salary !== null ? Number(emp.salary) : null,
    joining_date: joiningStr,
    is_old_staff: Boolean(emp.isOldStaff ?? emp.is_old_staff),
    is_attendance_exempt: Boolean(emp.isAttendanceExempt ?? emp.is_attendance_exempt),
    leave_quotas: emp.leaveQuotas ?? emp.leave_quotas ?? DEFAULT_ATTENDANCE_SETTINGS,
    is_active: Boolean(emp.isActive ?? emp.is_active ?? true),
    created_at: emp.createdAt instanceof Date ? emp.createdAt.toISOString() : (emp.created_at || new Date().toISOString()),
    updated_at: emp.updatedAt instanceof Date ? emp.updatedAt.toISOString() : (emp.updated_at || new Date().toISOString()),
  }
}

export function toAttendanceRecordModel(rec: any): AttendanceRecord {
  const dateStr = rec.attendanceDate
    ? (rec.attendanceDate instanceof Date ? rec.attendanceDate.toISOString().slice(0, 10) : String(rec.attendanceDate).slice(0, 10))
    : (rec.attendance_date || '')

  return {
    id: rec.id,
    employee_id: rec.employeeId ?? rec.employee_id,
    attendance_date: dateStr,
    day_of_week: rec.dayOfWeek ?? rec.day_of_week ?? '',
    in_time: rec.inTime ?? rec.in_time ?? null,
    out_time: rec.outTime ?? rec.out_time ?? null,
    arrival_status: rec.arrivalStatus ?? rec.arrival_status ?? 'Missing In',
    departure_status: rec.departureStatus ?? rec.departure_status ?? 'Missing Out',
    total_working_minutes: rec.totalWorkingMinutes ?? rec.total_working_minutes ?? 0,
    total_working_hours_formatted: rec.totalWorkingHoursFormatted ?? rec.total_working_hours_formatted ?? '0h 0m',
    raw_punches: rec.rawPunches ?? rec.raw_punches ?? [],
    created_at: rec.createdAt instanceof Date ? rec.createdAt.toISOString() : (rec.created_at || new Date().toISOString()),
    updated_at: rec.updatedAt instanceof Date ? rec.updatedAt.toISOString() : (rec.updated_at || new Date().toISOString()),
  }
}

import {
  Employee,
  AttendanceRecord,
  AttendanceRecordWithEmployee,
  AttendanceSettings,
  RawPunch,
} from '@/types/database.types'
import {
  DEFAULT_ATTENDANCE_SETTINGS,
  normalizeEmployeeName,
  calculateArrivalStatus,
  calculateDepartureStatus,
  calculateWorkingDuration,
  parseDateString,
  LEAVE_TYPES,
} from './attendance-calculator'
import {
  readAllEmployeeMetadata,
  writeEmployeeMetadata,
  readAllHolidays,
  writeHoliday,
  getGazettedHolidays,
  saveGazettedHoliday,
} from './employee-storage'

// Clean up stale localStorage cache from previous offline sync versions
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('attendance_employees_store')
    localStorage.removeItem('attendance_records_store')
    localStorage.removeItem('attendance_settings_store')
  } catch {
    // Ignore
  }
}

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'emp-0001-uuid',
    user_id: null,
    employee_id: 'EMP-0001',
    name: 'Ayesha',
    normalized_name: 'ayesha',
    designation: 'Accounts Executive',
    is_active: true,
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'emp-0002-uuid',
    user_id: null,
    employee_id: 'EMP-0002',
    name: 'Ali Ahmed',
    normalized_name: 'ali ahmed',
    designation: 'Operations Coordinator',
    is_active: true,
    created_at: new Date('2026-01-02').toISOString(),
    updated_at: new Date('2026-01-02').toISOString(),
  },
  {
    id: 'emp-0003-uuid',
    user_id: null,
    employee_id: 'EMP-0003',
    name: 'Khizar',
    normalized_name: 'khizar',
    designation: 'Senior Consultant',
    is_active: true,
    created_at: new Date('2026-01-03').toISOString(),
    updated_at: new Date('2026-01-03').toISOString(),
  },
]

// ----------------------------------------------------
// 1. ATTENDANCE SETTINGS SERVICES
// ----------------------------------------------------

export async function getAttendanceSettings(): Promise<AttendanceSettings> {
  try {
    const s = await prisma.attendanceSetting.findUnique({ where: { id: 'default' } })
    if (s) {
      return {
        id: s.id,
        weekday_in_time: s.weekdayInTime,
        weekday_grace_minutes: s.weekdayGraceMinutes,
        weekday_out_time: s.weekdayOutTime,
        saturday_in_time: s.saturdayInTime,
        saturday_grace_minutes: s.saturdayGraceMinutes,
        saturday_out_time: s.saturdayOutTime,
        timezone: s.timezone,
        created_at: s.createdAt.toISOString(),
        updated_at: s.updatedAt.toISOString(),
      }
    }
  } catch (err) {
    console.warn('MySQL attendance settings fetch failed:', err)
  }

  return DEFAULT_ATTENDANCE_SETTINGS
}

export async function updateAttendanceSettings(
  params: Partial<AttendanceSettings>
): Promise<AttendanceSettings> {
  const current = await getAttendanceSettings()
  const updated: AttendanceSettings = {
    ...current,
    ...params,
    id: 'default',
    updated_at: new Date().toISOString(),
  }

  try {
    await prisma.attendanceSetting.upsert({
      where: { id: 'default' },
      update: {
        weekdayInTime: updated.weekday_in_time,
        weekdayGraceMinutes: updated.weekday_grace_minutes,
        weekdayOutTime: updated.weekday_out_time,
        saturdayInTime: updated.saturday_in_time,
        saturdayGraceMinutes: updated.saturday_grace_minutes,
        saturdayOutTime: updated.saturday_out_time,
        timezone: updated.timezone,
      },
      create: {
        id: 'default',
        weekdayInTime: updated.weekday_in_time,
        weekdayGraceMinutes: updated.weekday_grace_minutes,
        weekdayOutTime: updated.weekday_out_time,
        saturdayInTime: updated.saturday_in_time,
        saturdayGraceMinutes: updated.saturday_grace_minutes,
        saturdayOutTime: updated.saturday_out_time,
        timezone: updated.timezone,
      },
    })
  } catch (err) {
    console.warn('MySQL attendance settings update error:', err)
  }

  return updated
}

// ----------------------------------------------------
// 2. EMPLOYEE SERVICES & METADATA SYNC
import { EmployeeLeaveQuotas } from '@/types/database.types'
import { EmployeeMetadata } from './employee-storage'

export async function getEmployeeMetadataMap(): Promise<Record<string, EmployeeMetadata>> {
  const fileMeta = readAllEmployeeMetadata()

  try {
    const log = await prisma.attendanceAuditLog.findFirst({
      where: { action: 'EMPLOYEE_METADATA_STORE' },
      orderBy: { createdAt: 'desc' },
      select: { details: true },
    })

    if (log && log.details && typeof log.details === 'object') {
      const dbMeta = log.details as Record<string, any>
      return {
        ...fileMeta,
        ...dbMeta,
      }
    }
  } catch (err) {
    console.warn('Database metadata fetch warning:', err)
  }
  return fileMeta as any
}

export async function saveEmployeeMetadata(
  idOrEmpId: string,
  meta: { branch?: string | null; salary?: number | null; joining_date?: string | null; is_old_staff?: boolean | null; is_attendance_exempt?: boolean | null; email?: string | null; leave_quotas?: EmployeeLeaveQuotas }
): Promise<void> {
  // 1. Write immediately to server-side in-memory & file store
  writeEmployeeMetadata(idOrEmpId, meta)

  // 2. Also persist to MySQL attendance_audit_logs store
  try {
    const currentMap = await getEmployeeMetadataMap()
    const existing = currentMap[idOrEmpId] || {}
    const isOldStaffVal = meta.is_old_staff !== undefined ? Boolean(meta.is_old_staff) : existing.is_old_staff
    const isExemptVal = meta.is_attendance_exempt !== undefined ? Boolean(meta.is_attendance_exempt) : existing.is_attendance_exempt
    const joiningDateVal = isOldStaffVal ? null : (meta.joining_date !== undefined ? meta.joining_date : existing.joining_date)

    currentMap[idOrEmpId] = {
      ...existing,
      ...(meta.branch !== undefined ? { branch: meta.branch || 'Multan' } : {}),
      ...(meta.salary !== undefined ? { salary: meta.salary } : {}),
      ...(meta.email !== undefined ? { email: meta.email } : {}),
      joining_date: joiningDateVal || undefined,
      is_old_staff: isOldStaffVal,
      is_attendance_exempt: isExemptVal,
      ...(meta.leave_quotas !== undefined ? { leave_quotas: meta.leave_quotas } : {}),
    }

    await prisma.attendanceAuditLog.create({
      data: {
        action: 'EMPLOYEE_METADATA_STORE',
        details: currentMap as any,
      },
    })
  } catch (err) {
    console.error('Error in saveEmployeeMetadata db write:', err)
  }
}

export function cleanDesignation(desig?: string | null): string {
  if (!desig) return 'Staff'
  return desig
    .replace(/[–—\-]\s*(Multan|Lahore)(\s+Office)?/gi, '')
    .replace(/\s*(Multan|Lahore)\s*Office/gi, '')
    .trim()
}

export const DEFAULT_EMPLOYEE_LEAVE_QUOTAS: EmployeeLeaveQuotas = {
  annual_leaves: 6,
  sick_leaves: 7,
  casual_leaves: 7,
  wfh_quota: 4,
  probation_leaves: 3,
}

async function calculateAllEmployeeUsedLeaves(): Promise<Map<string, {
  annual_leaves: number
  sick_leaves: number
  casual_leaves: number
  wfh_quota: number
  probation_leaves: number
}>> {
  const map = new Map<string, {
    annual_leaves: number
    sick_leaves: number
    casual_leaves: number
    wfh_quota: number
    probation_leaves: number
  }>()

  try {
    const currentYear = new Date().getFullYear()
    let recs: any[] = []

    try {
      const mysqlRecs = await prisma.attendanceRecord.findMany({
        where: {
          attendanceDate: {
            gte: new Date('2026-09-01'),
            lte: new Date(`${currentYear}-12-31`),
          },
        },
        select: {
          employeeId: true,
          attendanceDate: true,
          arrivalStatus: true,
          departureStatus: true,
          rawPunches: true,
        },
      })
      if (mysqlRecs && mysqlRecs.length > 0) {
        recs = mysqlRecs.map((r) => ({
          employee_id: r.employeeId,
          attendance_date: r.attendanceDate.toISOString().slice(0, 10),
          arrival_status: r.arrivalStatus,
          departure_status: r.departureStatus,
          raw_punches: r.rawPunches,
        }))
      }
    } catch (err) {
      console.warn('MySQL used leaves query failed:', err)
    }

    if (recs && recs.length > 0) {
      for (const r of recs) {
        const empId = r.employee_id
        if (!empId) continue

        let current = map.get(empId)
        if (!current) {
          current = { annual_leaves: 0, sick_leaves: 0, casual_leaves: 0, wfh_quota: 0, probation_leaves: 0 }
          map.set(empId, current)
        }

        const arrStatus = r.arrival_status || ''
        const depStatus = r.departure_status || ''

        let noteStr: string | null = null
        if (Array.isArray(r.raw_punches)) {
          const found = (r.raw_punches as any[]).find((p) => p && typeof p === 'object' && p.notes)
          if (found) noteStr = found.notes
        }
        const leaveVal = parseLeaveValue(noteStr || depStatus)

        const isLeave = arrStatus === 'Leave' || depStatus.includes('Leave') || ['Sick Leave', 'Casual Leave', 'Annual Leave', 'Probation Leave', 'Probation Leaves'].includes(depStatus)
        const isWfh = depStatus === 'Work From Home' || arrStatus === 'Work From Home'

        if (isWfh) {
          current.wfh_quota += leaveVal
        } else if (isLeave) {
          if (depStatus.includes('Probation') || arrStatus.includes('Probation')) {
            current.probation_leaves += leaveVal
          } else if (depStatus.includes('Annual') || arrStatus.includes('Annual')) {
            current.annual_leaves += leaveVal
          } else if (depStatus.includes('Sick') || arrStatus.includes('Sick')) {
            current.sick_leaves += leaveVal
          } else if (depStatus.includes('Casual') || arrStatus.includes('Casual')) {
            current.casual_leaves += leaveVal
          }
        }
      }
    }
  } catch (e) {
    console.error('Error computing used leaves:', e)
  }

  return map
}

export async function getEmployees(params?: {
  search?: string
  isActiveOnly?: boolean
  skipLeaveCalculation?: boolean
}): Promise<Employee[]> {
  try {
    let data: any[] = []

    try {
      const where: any = {}
      if (params?.isActiveOnly !== false) {
        where.isActive = true
      }
      const mysqlEmps = await prisma.employee.findMany({
        where,
        orderBy: { employeeId: 'asc' },
      })
      if (mysqlEmps) {
        data = mysqlEmps.map(toEmployeeModel)
      }
    } catch (err) {
      console.warn('MySQL employee fetch failed:', err)
    }

    if (!data || data.length === 0) {
      return []
    }

    const metaMap = await getEmployeeMetadataMap()
    const usedMap = params?.skipLeaveCalculation
      ? new Map()
      : await calculateAllEmployeeUsedLeaves()

    let result: Employee[] = data.map((emp) => {
      const meta = metaMap[emp.id] || metaMap[emp.employee_id] || {}
      const isOldStaff = emp.is_old_staff !== undefined && emp.is_old_staff !== null
        ? Boolean(emp.is_old_staff)
        : (meta.is_old_staff !== undefined ? Boolean(meta.is_old_staff) : false)
      const isAttendanceExempt = emp.is_attendance_exempt !== undefined && emp.is_attendance_exempt !== null
        ? Boolean(emp.is_attendance_exempt)
        : (meta.is_attendance_exempt !== undefined ? Boolean(meta.is_attendance_exempt) : false)

      const used = usedMap.get(emp.id) || usedMap.get(emp.employee_id) || { annual_leaves: 0, sick_leaves: 0, casual_leaves: 0, wfh_quota: 0, probation_leaves: 0 }

      const dbQuotas = typeof emp.leave_quotas === 'object' && emp.leave_quotas !== null ? (emp.leave_quotas as any) : null
      const effectiveQuotas = dbQuotas || meta.leave_quotas || {}

      const initialAnn = effectiveQuotas?.annual_leaves !== undefined ? Number(effectiveQuotas.annual_leaves) : (DEFAULT_EMPLOYEE_LEAVE_QUOTAS.annual_leaves ?? 6)
      const initialSick = effectiveQuotas?.sick_leaves !== undefined ? Number(effectiveQuotas.sick_leaves) : (DEFAULT_EMPLOYEE_LEAVE_QUOTAS.sick_leaves ?? 7)
      const initialCas = effectiveQuotas?.casual_leaves !== undefined ? Number(effectiveQuotas.casual_leaves) : (DEFAULT_EMPLOYEE_LEAVE_QUOTAS.casual_leaves ?? 7)
      const initialWfh = effectiveQuotas?.wfh_quota !== undefined ? Number(effectiveQuotas.wfh_quota) : (DEFAULT_EMPLOYEE_LEAVE_QUOTAS.wfh_quota ?? 4)
      const initialProb = isOldStaff ? 0 : (effectiveQuotas?.probation_leaves !== undefined ? Number(effectiveQuotas.probation_leaves) : (DEFAULT_EMPLOYEE_LEAVE_QUOTAS.probation_leaves ?? 3))

      const rawJoining = emp.joining_date || meta.joining_date || null
      const cleanJoining = isOldStaff ? null : (rawJoining ? rawJoining.split('T')[0] : null)

      return {
        ...emp,
        email: emp.email || meta.email || null,
        designation: cleanDesignation(emp.designation),
        branch: emp.branch || meta.branch || 'Multan',
        salary: emp.salary !== undefined && emp.salary !== null ? emp.salary : (meta.salary !== undefined && meta.salary !== null ? meta.salary : null),
        joining_date: cleanJoining,
        is_old_staff: isOldStaff,
        is_attendance_exempt: isAttendanceExempt,
        leave_quotas: {
          annual_leaves: Math.max(0, Number((initialAnn - used.annual_leaves).toFixed(2))),
          sick_leaves: Math.max(0, Number((initialSick - used.sick_leaves).toFixed(2))),
          casual_leaves: Math.max(0, Number((initialCas - used.casual_leaves).toFixed(2))),
          wfh_quota: Number((initialWfh - used.wfh_quota).toFixed(2)),
          probation_leaves: Math.max(0, Number((initialProb - used.probation_leaves).toFixed(2))),
        },
        base_leave_quotas: {
          annual_leaves: 6,
          sick_leaves: 7,
          casual_leaves: 7,
          wfh_quota: 4,
          probation_leaves: isOldStaff ? 0 : 3,
        },
      }
    })

    if (params?.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim()
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.employee_id.toLowerCase().includes(q) ||
          e.designation.toLowerCase().includes(q) ||
          (e.branch && e.branch.toLowerCase().includes(q))
      )
    }

    return result
  } catch (err) {
    console.error('getEmployees catch:', err)
    return []
  }
}

/**
 * Gets single employee by ID or employee_id (EMP-XXXX)
 */
export async function getEmployeeById(idOrEmpId: string): Promise<Employee | null> {
  try {
    let data: any = null
    const isUuid = Boolean(idOrEmpId && idOrEmpId.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/))

    try {
      const mysqlEmp = await prisma.employee.findFirst({
        where: isUuid
          ? { OR: [{ id: idOrEmpId }, { employeeId: idOrEmpId }] }
          : { employeeId: idOrEmpId },
      })
      if (mysqlEmp) {
        data = toEmployeeModel(mysqlEmp)
      }
    } catch (err) {
      console.warn('MySQL employee getById failed:', err)
    }

    if (!data) {
      return null
    }

    const [metaMap, usedMap] = await Promise.all([
      getEmployeeMetadataMap(),
      calculateAllEmployeeUsedLeaves(),
    ])

    const meta = metaMap[data.id] || metaMap[data.employee_id] || {}
    const isOldStaff = data.is_old_staff !== undefined && data.is_old_staff !== null
      ? Boolean(data.is_old_staff)
      : (meta.is_old_staff !== undefined ? Boolean(meta.is_old_staff) : false)
    const isAttendanceExempt = data.is_attendance_exempt !== undefined && data.is_attendance_exempt !== null
      ? Boolean(data.is_attendance_exempt)
      : (meta.is_attendance_exempt !== undefined ? Boolean(meta.is_attendance_exempt) : false)

    const used = usedMap.get(data.id) || usedMap.get(data.employee_id) || { annual_leaves: 0, sick_leaves: 0, casual_leaves: 0, wfh_quota: 0, probation_leaves: 0 }

    const dbQuotas = typeof data.leave_quotas === 'object' && data.leave_quotas !== null ? (data.leave_quotas as any) : null
    const effectiveQuotas = dbQuotas || meta.leave_quotas || {}

    const initialAnn = effectiveQuotas?.annual_leaves !== undefined ? Number(effectiveQuotas.annual_leaves) : (DEFAULT_EMPLOYEE_LEAVE_QUOTAS.annual_leaves ?? 6)
    const initialSick = effectiveQuotas?.sick_leaves !== undefined ? Number(effectiveQuotas.sick_leaves) : (DEFAULT_EMPLOYEE_LEAVE_QUOTAS.sick_leaves ?? 7)
    const initialCas = effectiveQuotas?.casual_leaves !== undefined ? Number(effectiveQuotas.casual_leaves) : (DEFAULT_EMPLOYEE_LEAVE_QUOTAS.casual_leaves ?? 7)
    const initialWfh = effectiveQuotas?.wfh_quota !== undefined ? Number(effectiveQuotas.wfh_quota) : (DEFAULT_EMPLOYEE_LEAVE_QUOTAS.wfh_quota ?? 4)
    const initialProb = isOldStaff ? 0 : (effectiveQuotas?.probation_leaves !== undefined ? Number(effectiveQuotas.probation_leaves) : (DEFAULT_EMPLOYEE_LEAVE_QUOTAS.probation_leaves ?? 3))

    const rawJoining = data.joining_date || meta.joining_date || null
    const cleanJoining = isOldStaff ? null : (rawJoining ? rawJoining.split('T')[0] : null)

    return {
      ...data,
      email: data.email || meta.email || null,
      designation: cleanDesignation(data.designation),
      branch: data.branch || meta.branch || 'Multan',
      salary: data.salary !== undefined && data.salary !== null ? data.salary : (meta.salary !== undefined && meta.salary !== null ? meta.salary : null),
      joining_date: cleanJoining,
      is_old_staff: isOldStaff,
      is_attendance_exempt: isAttendanceExempt,
      leave_quotas: {
        annual_leaves: Math.max(0, Number((initialAnn - used.annual_leaves).toFixed(2))),
        sick_leaves: Math.max(0, Number((initialSick - used.sick_leaves).toFixed(2))),
        casual_leaves: Math.max(0, Number((initialCas - used.casual_leaves).toFixed(2))),
        wfh_quota: Number((initialWfh - used.wfh_quota).toFixed(2)),
        probation_leaves: Math.max(0, Number((initialProb - used.probation_leaves).toFixed(2))),
      },
      base_leave_quotas: {
        annual_leaves: initialAnn,
        sick_leaves: initialSick,
        casual_leaves: initialCas,
        wfh_quota: initialWfh,
        probation_leaves: initialProb,
      },
    }
  } catch (err) {
    return null
  }
}

/**
 * Checks if an employee with the exact normalized name already exists
 */
export async function checkDuplicateEmployeeName(name: string): Promise<{ exists: boolean; existingCount: number; employees: Employee[] }> {
  const norm = normalizeEmployeeName(name)
  if (!norm) return { exists: false, existingCount: 0, employees: [] }

  const all = await getEmployees({ isActiveOnly: false })
  const matching = all.filter((e) => (e.normalized_name || normalizeEmployeeName(e.name)) === norm)

  return {
    exists: matching.length > 0,
    existingCount: matching.length,
    employees: matching,
  }
}

/**
 * Generates next unique sequential Employee ID e.g. EMP-0001, EMP-0002
 */
export async function generateNextEmployeeId(): Promise<string> {
  let maxSeq = 0

  try {
    const mysqlEmps = await prisma.employee.findMany({ select: { employeeId: true } })
    if (mysqlEmps && mysqlEmps.length > 0) {
      for (const emp of mysqlEmps) {
        const match = emp.employeeId.match(/EMP-(\d+)/i)
        if (match) {
          const num = parseInt(match[1], 10)
          if (num > maxSeq) maxSeq = num
        }
      }
    }
  } catch (err) {
    console.warn('MySQL generateNextEmployeeId failed:', err)
  }

  const nextSeq = maxSeq + 1
  return `EMP-${nextSeq.toString().padStart(4, '0')}`
}

export function isWithinProbation(joiningDateStr?: string | null, isOld?: boolean): boolean {
  if (isOld) return false
  if (!joiningDateStr) return false
  const j = new Date(joiningDateStr.split('T')[0])
  const today = new Date()
  if (isNaN(j.getTime())) return false
  const monthsDiff = (today.getFullYear() - j.getFullYear()) * 12 + (today.getMonth() - j.getMonth())
  const daysDiff = Math.floor((today.getTime() - j.getTime()) / (1000 * 60 * 60 * 24))
  return daysDiff >= 0 && monthsDiff < 3
}

export async function createEmployee(params: {
  name: string
  designation: string
  email?: string | null
  branch?: string | null
  salary?: number | string | null
  joining_date?: string | null
  is_old_staff?: boolean | null
  is_attendance_exempt?: boolean | null
  leave_quotas?: EmployeeLeaveQuotas
}): Promise<{ employee: Employee; warning?: string }> {
  const name = params.name.trim()
  const designation = cleanDesignation(params.designation)
  const email = params.email && params.email.trim() ? params.email.trim() : null
  const branch = params.branch ? params.branch.trim() : 'Multan'
  const salary = params.salary !== undefined && params.salary !== null && params.salary !== '' ? Number(params.salary) : null
  const isOldStaff = Boolean(params.is_old_staff)
  const isAttendanceExempt = Boolean(params.is_attendance_exempt)
  const joiningDate = isOldStaff ? null : (params.joining_date && params.joining_date.trim() ? params.joining_date.trim() : new Date().toISOString().split('T')[0])
  const normalizedName = normalizeEmployeeName(name)
  const probationEligible = isWithinProbation(joiningDate, isOldStaff)

  const leaveQuotas: EmployeeLeaveQuotas = {
    annual_leaves: params.leave_quotas?.annual_leaves !== undefined ? Number(params.leave_quotas.annual_leaves) : DEFAULT_EMPLOYEE_LEAVE_QUOTAS.annual_leaves,
    sick_leaves: params.leave_quotas?.sick_leaves !== undefined ? Number(params.leave_quotas.sick_leaves) : DEFAULT_EMPLOYEE_LEAVE_QUOTAS.sick_leaves,
    casual_leaves: params.leave_quotas?.casual_leaves !== undefined ? Number(params.leave_quotas.casual_leaves) : DEFAULT_EMPLOYEE_LEAVE_QUOTAS.casual_leaves,
    wfh_quota: params.leave_quotas?.wfh_quota !== undefined ? Number(params.leave_quotas.wfh_quota) : DEFAULT_EMPLOYEE_LEAVE_QUOTAS.wfh_quota,
    probation_leaves: probationEligible ? (params.leave_quotas?.probation_leaves !== undefined ? Number(params.leave_quotas.probation_leaves) : DEFAULT_EMPLOYEE_LEAVE_QUOTAS.probation_leaves) : 0,
  }

  if (!name) throw new Error('Employee name is required.')
  if (!designation) throw new Error('Designation is required.')

  const dupCheck = await checkDuplicateEmployeeName(name)
  let warning: string | undefined
  if (dupCheck.exists) {
    warning = `Warning: An employee named "${name}" already exists (${dupCheck.employees[0].employee_id}). A new distinct employee ID has been generated.`
  }

  const employeeId = await generateNextEmployeeId()
  let data: any = null

  // 1. Create in MySQL via Prisma
  try {
    const created = await prisma.employee.create({
      data: {
        employeeId,
        name,
        normalizedName,
        designation,
        email,
        branch,
        salary: salary !== null ? salary : undefined,
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        isOldStaff,
        isAttendanceExempt,
        leaveQuotas: leaveQuotas as any,
        isActive: true,
      },
    })
    if (created) {
      data = toEmployeeModel(created)
    }
  } catch (err) {
    console.warn('MySQL createEmployee failed:', err)
  }

  if (data) {
    await saveEmployeeMetadata(data.id, { branch, salary, joining_date: joiningDate, is_old_staff: isOldStaff, is_attendance_exempt: isAttendanceExempt, email, leave_quotas: leaveQuotas })
    await saveEmployeeMetadata(data.employee_id, { branch, salary, joining_date: joiningDate, is_old_staff: isOldStaff, is_attendance_exempt: isAttendanceExempt, email, leave_quotas: leaveQuotas })
  }

  if (!data) {
    throw new Error('Failed to create employee in database')
  }

  return { employee: { ...data, branch, salary, joining_date: joiningDate, is_old_staff: isOldStaff, is_attendance_exempt: isAttendanceExempt, email, designation, leave_quotas: leaveQuotas }, warning }
}

export async function updateEmployee(
  id: string,
  params: {
    name?: string
    designation?: string
    email?: string | null
    branch?: string | null
    salary?: number | string | null
    joining_date?: string | null
    is_old_staff?: boolean | null
    is_attendance_exempt?: boolean | null
    is_active?: boolean
    leave_quotas?: EmployeeLeaveQuotas
  }
): Promise<Employee> {
  const isOldStaff = params.is_old_staff !== undefined ? Boolean(params.is_old_staff) : undefined
  const isAttendanceExempt = params.is_attendance_exempt !== undefined ? Boolean(params.is_attendance_exempt) : undefined

  const probationEligible = isWithinProbation(isOldStaff ? null : params.joining_date, isOldStaff)

  const finalQuotas = params.leave_quotas
    ? {
        ...params.leave_quotas,
        probation_leaves: probationEligible ? params.leave_quotas.probation_leaves : 0,
      }
    : undefined

  // 1. Primary Update: Hostinger MySQL via Prisma
  try {
    const prismaData: any = {
      ...(params.name !== undefined ? { name: params.name.trim(), normalizedName: normalizeEmployeeName(params.name) } : {}),
      ...(params.designation !== undefined ? { designation: cleanDesignation(params.designation) } : {}),
      ...(params.email !== undefined ? { email: params.email && params.email.trim() ? params.email.trim() : null } : {}),
      ...(params.branch !== undefined ? { branch: params.branch } : {}),
      ...(params.salary !== undefined ? { salary: params.salary !== null && params.salary !== '' ? Number(params.salary) : null } : {}),
      ...(params.joining_date !== undefined || isOldStaff !== undefined ? { joiningDate: isOldStaff ? null : (params.joining_date ? new Date(params.joining_date) : null) } : {}),
      ...(isOldStaff !== undefined ? { isOldStaff } : {}),
      ...(isAttendanceExempt !== undefined ? { isAttendanceExempt } : {}),
      ...(params.is_active !== undefined ? { isActive: params.is_active } : {}),
      ...(finalQuotas !== undefined ? { leaveQuotas: finalQuotas as any } : {}),
    }

    const isUuid = Boolean(id && id.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/))
    await prisma.employee.updateMany({
      where: isUuid ? { OR: [{ id }, { employeeId: id }] } : { employeeId: id },
      data: prismaData,
    })
  } catch (mysqlErr) {
    console.warn('MySQL updateEmployee warning:', mysqlErr)
  }

  // Persist metadata to DB store
  const emailVal = params.email !== undefined ? (params.email && params.email.trim() ? params.email.trim() : null) : undefined
  await saveEmployeeMetadata(id, {
    branch: params.branch,
    salary: params.salary !== undefined ? (params.salary ? Number(params.salary) : null) : undefined,
    joining_date: isOldStaff ? null : params.joining_date,
    is_old_staff: isOldStaff,
    is_attendance_exempt: isAttendanceExempt,
    email: emailVal,
    leave_quotas: finalQuotas,
  })

  const data = await getEmployeeById(id)
  if (!data) {
    throw new Error('Failed to update employee in database')
  }

  const [allMetaMap, usedMap] = await Promise.all([
    getEmployeeMetadataMap(),
    calculateAllEmployeeUsedLeaves(),
  ])

  const existingMeta = allMetaMap[id] || allMetaMap[data.employee_id] || {}
  const used = usedMap.get(id) || usedMap.get(data.employee_id) || { annual_leaves: 0, sick_leaves: 0, casual_leaves: 0, wfh_quota: 0, probation_leaves: 0 }

  const baseQuotas = existingMeta.leave_quotas || DEFAULT_EMPLOYEE_LEAVE_QUOTAS
  const liveRemQuotas: EmployeeLeaveQuotas = {
    annual_leaves: Math.max(0, Number(((baseQuotas.annual_leaves ?? 6) - used.annual_leaves).toFixed(2))),
    sick_leaves: Math.max(0, Number(((baseQuotas.sick_leaves ?? 7) - used.sick_leaves).toFixed(2))),
    casual_leaves: Math.max(0, Number(((baseQuotas.casual_leaves ?? 7) - used.casual_leaves).toFixed(2))),
    wfh_quota: Number(((baseQuotas.wfh_quota ?? 4) - used.wfh_quota).toFixed(2)),
    probation_leaves: isOldStaff ? 0 : Math.max(0, Number(((baseQuotas.probation_leaves ?? 3) - used.probation_leaves).toFixed(2))),
  }

  return {
    ...data,
    branch: params.branch !== undefined ? params.branch : (data.branch || 'Multan'),
    salary: params.salary !== undefined ? (params.salary ? Number(params.salary) : null) : (data.salary ?? null),
    joining_date: isOldStaff ? null : (params.joining_date !== undefined ? params.joining_date : (data.joining_date || null)),
    is_old_staff: isOldStaff !== undefined ? isOldStaff : Boolean(existingMeta.is_old_staff),
    is_attendance_exempt: isAttendanceExempt !== undefined ? isAttendanceExempt : Boolean(existingMeta.is_attendance_exempt),
    leave_quotas: liveRemQuotas,
    base_leave_quotas: baseQuotas,
  }
}

export async function deleteEmployee(id: string): Promise<void> {
  const isUuid = Boolean(id && id.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/))

  try {
    const emp = await prisma.employee.findFirst({
      where: isUuid ? { OR: [{ id }, { employeeId: id }] } : { employeeId: id },
    })
    if (emp) {
      await prisma.attendanceRecord.deleteMany({ where: { employeeId: emp.id } })
      await prisma.attendanceRequest.deleteMany({ where: { employeeId: emp.id } })
      await prisma.employee.delete({ where: { id: emp.id } })
    }
  } catch (err) {
    console.warn('MySQL deleteEmployee warning:', err)
  }
}

// ----------------------------------------------------
// 3. ATTENDANCE RECORDS SERVICES
// ----------------------------------------------------

export interface AttendanceFilterParams {
  employeeId?: string
  search?: string
  startDate?: string
  endDate?: string
  month?: string // YYYY-MM
  dayOfWeek?: string
  arrivalStatus?: string
  departureStatus?: string
  sortBy?: 'date_desc' | 'date_asc' | 'employee_asc' | 'employee_desc'
  page?: number
  pageSize?: number
}

export interface AttendanceListResponse {
  records: AttendanceRecordWithEmployee[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

export async function getAttendanceRecords(
  params: AttendanceFilterParams = {}
): Promise<AttendanceListResponse> {
  const employees = await getEmployees({ isActiveOnly: false, skipLeaveCalculation: true })
  const empMap = new Map<string, Employee>()
  employees.forEach((e) => {
    empMap.set(e.id, e)
    empMap.set(e.employee_id, e)
  })

  let allRecords: AttendanceRecord[] = []

  try {
    const where: any = {}
    if (params.employeeId && params.employeeId !== 'all') {
      const targetEmp = empMap.get(params.employeeId)
      const empUuid = targetEmp?.id || (params.employeeId.includes('-') && params.employeeId.length > 20 ? params.employeeId : null)
      where.employeeId = empUuid || params.employeeId
    }
    
    // Strict date range / month filtering
    const sDate = params.startDate || (params.month ? `${params.month}-01` : null)
    const eDate = params.endDate || (params.month ? `${params.month}-31` : null)

    if (sDate || eDate) {
      where.attendanceDate = {}
      if (sDate) where.attendanceDate.gte = new Date(`${sDate}T00:00:00`)
      if (eDate) where.attendanceDate.lte = new Date(`${eDate}T23:59:59`)
    }

    if (params.arrivalStatus && params.arrivalStatus !== 'all') {
      where.arrivalStatus = params.arrivalStatus
    }
    if (params.departureStatus && params.departureStatus !== 'all') {
      where.departureStatus = params.departureStatus
    }

    const mysqlRecs = await prisma.attendanceRecord.findMany({
      where,
      orderBy: { attendanceDate: 'desc' },
    })

    if (mysqlRecs) {
      allRecords = mysqlRecs.map(toAttendanceRecordModel)
    }
  } catch (err) {
    console.warn('MySQL attendance records query warning:', err)
  }

  // Filter in-memory for rich relations and search
  let filtered = allRecords.filter((rec) => {
    const emp = empMap.get(rec.employee_id)

    if (params.employeeId && params.employeeId !== 'all') {
      const isMatch =
        rec.employee_id === params.employeeId ||
        emp?.id === params.employeeId ||
        emp?.employee_id === params.employeeId
      if (!isMatch) return false
    }

    if (params.startDate && rec.attendance_date < params.startDate) {
      return false
    }

    if (params.endDate && rec.attendance_date > params.endDate) {
      return false
    }

    if (params.month && !rec.attendance_date.startsWith(params.month)) {
      return false
    }

    if (params.dayOfWeek && params.dayOfWeek !== 'all') {
      if (rec.day_of_week.toLowerCase() !== params.dayOfWeek.toLowerCase()) {
        return false
      }
    }

    if (params.arrivalStatus && params.arrivalStatus !== 'all') {
      if (rec.arrival_status !== params.arrivalStatus) return false
    }

    if (params.departureStatus && params.departureStatus !== 'all') {
      if (rec.departure_status !== params.departureStatus) return false
    }

    if (params.search) {
      const q = params.search.toLowerCase()
      const empName = emp?.name?.toLowerCase() || ''
      const empId = emp?.employee_id?.toLowerCase() || ''
      const designation = emp?.designation?.toLowerCase() || ''
      const date = rec.attendance_date.toLowerCase()

      const match =
        empName.includes(q) ||
        empId.includes(q) ||
        designation.includes(q) ||
        date.includes(q)

      if (!match) return false
    }

    return true
  })

  // Sort
  filtered.sort((a, b) => {
    const empA = empMap.get(a.employee_id)?.name || ''
    const empB = empMap.get(b.employee_id)?.name || ''

    if (params.sortBy === 'date_asc') {
      return a.attendance_date.localeCompare(b.attendance_date)
    }
    if (params.sortBy === 'employee_asc') {
      return empA.localeCompare(empB)
    }
    if (params.sortBy === 'employee_desc') {
      return empB.localeCompare(empA)
    }
    // default date_desc
    return b.attendance_date.localeCompare(a.attendance_date)
  })

  const totalCount = filtered.length
  const page = Math.max(1, params.page || 1)
  const pageSize = Math.max(1, params.pageSize || 25)
  const totalPages = Math.ceil(totalCount / pageSize) || 1

  const pagedRecords = filtered.slice((page - 1) * pageSize, page * pageSize)

  const recordsWithEmp: AttendanceRecordWithEmployee[] = pagedRecords.map((r) => {
    const rawP = Array.isArray(r.raw_punches) ? (r.raw_punches as any[]) : []
    const noteObj = rawP.find((p) => p && typeof p === 'object' && p.notes)
    return {
      ...r,
      notes: noteObj ? noteObj.notes : null,
      employee: empMap.get(r.employee_id) || null,
      raw_punches_parsed: rawP as unknown as RawPunch[],
    }
  })

  return {
    records: recordsWithEmp,
    totalCount,
    page,
    pageSize,
    totalPages,
  }
}

/**
 * Calculates aggregate summary metrics for an employee or all employees
 */
export async function getAttendanceSummary(params?: {
  employeeId?: string
  month?: string
  startDate?: string
  endDate?: string
}) {
  const res = await getAttendanceRecords({
    employeeId: params?.employeeId,
    month: params?.month,
    startDate: params?.startDate,
    endDate: params?.endDate,
    pageSize: 10000,
  })

  const records = res.records
  let onTimeArrivals = 0
  let lateArrivals = 0
  let missingInTimes = 0

  let onTimeDepartures = 0
  let earlyDepartures = 0
  let missingOutTimes = 0

  let totalWorkingMinutes = 0
  let requiredWorkingMinutes = 0

  const holidaysMap = await getGazettedHolidays()

  // Helper to check if a record represents an approved leave (case-insensitive)
  const isLeaveRecord = (rec?: AttendanceRecordWithEmployee | null): boolean => {
    if (!rec) return false
    const arr = (rec.arrival_status || '').toLowerCase()
    const dep = (rec.departure_status || '').toLowerCase()
    return arr.includes('leave') || dep.includes('leave')
  }

  // Track dates present in existing records
  const recordsByDate = new Map<string, AttendanceRecordWithEmployee>()

  for (const r of records) {
    const cleanDate = r.attendance_date ? r.attendance_date.split('T')[0] : ''
    const dayName = (r.day_of_week || '').toLowerCase()
    let dayNum = -1
    if (cleanDate) {
      const parts = cleanDate.split('-').map(Number)
      if (parts.length === 3) {
        const dt = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0)
        dayNum = dt.getDay()
      }
    }
    const isSunday = dayNum === 0 || dayName.includes('sun')
    const isGazettedHoliday = Boolean(cleanDate && holidaysMap[cleanDate])
    const hasPunches =
      Boolean(r.in_time && r.in_time !== '---') ||
      Boolean(r.out_time && r.out_time !== '---') ||
      (r.total_working_minutes ? r.total_working_minutes > 0 : false)

    if (r.arrival_status === 'On Time Arrival') onTimeArrivals++
    else if (r.arrival_status === 'Late Arrival' && (!isSunday && !isGazettedHoliday || hasPunches)) lateArrivals++
    else if (r.arrival_status === 'Missing In Time' && (!isSunday && !isGazettedHoliday || hasPunches)) missingInTimes++

    if (r.departure_status === 'On Time Departure') onTimeDepartures++
    else if (r.departure_status === 'Early Departure' && (!isSunday && !isGazettedHoliday || hasPunches)) earlyDepartures++
    else if (r.departure_status === 'Missing Out Time' && (!isSunday && !isGazettedHoliday || hasPunches)) missingOutTimes++

    totalWorkingMinutes += r.total_working_minutes || 0

    if (r.attendance_date) {
      recordsByDate.set(cleanDate, r)
    }

    // If no explicit startDate & endDate range provided, calculate directly per record:
    if (!params?.startDate || !params?.endDate) {
      const isLeave = isLeaveRecord(r)
      const isSaturday = dayNum === 6 || dayName.includes('sat')
      const isSunday = dayNum === 0 || dayName.includes('sun')
      const isGazettedHoliday = Boolean(cleanDate && holidaysMap[cleanDate])

      if (isSunday || isGazettedHoliday || isLeave) {
        // Sundays, Gazetted Holidays, and approved Leaves have 0 required hours
        requiredWorkingMinutes += 0
      } else if (isSaturday) {
        // Saturday: 4 hours
        requiredWorkingMinutes += 4 * 60
      } else {
        // Normal workday (Mon-Fri) including unapproved Absent: 8 hours
        requiredWorkingMinutes += 8 * 60
      }
    }
  }

  let empJoiningDate: string | null = null
  let empIsOldStaff = false
  if (params?.employeeId) {
    const allEmployees = await getEmployees({ isActiveOnly: false })
    const foundEmp = allEmployees.find(
      (e) => e.id === params.employeeId || e.employee_id === params.employeeId
    )
    if (foundEmp) {
      empJoiningDate = foundEmp.joining_date ? foundEmp.joining_date.split('T')[0] : null
      empIsOldStaff = Boolean(foundEmp.is_old_staff)
    }
  }

  // If explicit date range (startDate to endDate) is provided, iterate all calendar dates in range:
  if (params?.startDate && params?.endDate) {
    const sParts = params.startDate.split('-').map(Number)
    const eParts = params.endDate.split('-').map(Number)

    if (sParts.length === 3 && eParts.length === 3) {
      const cur = new Date(sParts[0], sParts[1] - 1, sParts[2], 12, 0, 0)
      const end = new Date(eParts[0], eParts[1] - 1, eParts[2], 12, 0, 0)

      while (cur <= end) {
        const year = cur.getFullYear()
        const month = String(cur.getMonth() + 1).padStart(2, '0')
        const day = String(cur.getDate()).padStart(2, '0')
        const dStr = `${year}-${month}-${day}`

        const dayNum = cur.getDay() // 0 = Sunday, 6 = Saturday
        const isSunday = dayNum === 0
        const isSaturday = dayNum === 6
        const isGazettedHoliday = Boolean(holidaysMap[dStr])

        const isBeforeJoining = Boolean(!empIsOldStaff && empJoiningDate && dStr < empJoiningDate)

        const r = recordsByDate.get(dStr)
        const isLeave = isLeaveRecord(r)

        if (isBeforeJoining) {
          // Pre-joining dates have 0 required hours
          requiredWorkingMinutes += 0
        } else if (isSunday || isGazettedHoliday || isLeave) {
          // 0 hours for Sunday, Gazetted Holiday, and approved Leave
          requiredWorkingMinutes += 0
        } else if (isSaturday) {
          // Saturday: 4 hours
          requiredWorkingMinutes += 4 * 60
        } else {
          // Normal workday (Mon-Fri) including Absent: 8 hours
          requiredWorkingMinutes += 8 * 60
        }

        cur.setDate(cur.getDate() + 1)
      }
    }
  }

  const totalDays = records.length
  const totalHours = Math.floor(totalWorkingMinutes / 60)
  const totalMins = totalWorkingMinutes % 60
  const formattedTotalHours = `${totalHours}h ${totalMins}m`

  const reqHours = Math.floor(requiredWorkingMinutes / 60)
  const reqMins = requiredWorkingMinutes % 60
  const formattedRequiredHours = `${reqHours}h ${reqMins}m`

  const differenceMinutes = totalWorkingMinutes - requiredWorkingMinutes
  const diffAbs = Math.abs(differenceMinutes)
  const diffHours = Math.floor(diffAbs / 60)
  const diffMins = diffAbs % 60
  const formattedDifference = `${differenceMinutes >= 0 ? '+' : '-'}${diffHours}h ${diffMins}m`

  const hoursCompletionRate =
    requiredWorkingMinutes > 0
      ? Math.round((totalWorkingMinutes / requiredWorkingMinutes) * 100)
      : 100

  const onTimeArrivalRate = totalDays > 0 ? Math.round((onTimeArrivals / totalDays) * 100) : 0
  const onTimeDepartureRate = totalDays > 0 ? Math.round((onTimeDepartures / totalDays) * 100) : 0

  return {
    totalDays,
    onTimeArrivals,
    lateArrivals,
    missingInTimes,
    onTimeArrivalRate,
    onTimeDepartures,
    earlyDepartures,
    missingOutTimes,
    onTimeDepartureRate,
    totalWorkingMinutes,
    formattedTotalHours,
    requiredWorkingMinutes,
    formattedRequiredHours,
    differenceMinutes,
    formattedDifference,
    hoursCompletionRate,
  }
}

/**
 * Gets overview KPIs for today's attendance
 */
export async function getTodayAttendanceMetrics() {
  const employees = await getEmployees({ isActiveOnly: true })
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

  const res = await getAttendanceRecords({
    startDate: today,
    endDate: today,
    pageSize: 1000,
  })

  const records = res.records
  const presentCount = records.length
  const onTimeArrivals = records.filter((r) => r.arrival_status === 'On Time Arrival').length
  const lateArrivals = records.filter((r) => r.arrival_status === 'Late Arrival').length
  const onTimeDepartures = records.filter((r) => r.departure_status === 'On Time Departure').length
  const earlyDepartures = records.filter((r) => r.departure_status === 'Early Departure').length
  const missingOutCount = records.filter((r) => r.departure_status === 'Missing Out Time').length

  return {
    totalEmployees: employees.length,
    todayPresent: presentCount,
    onTimeArrivals,
    lateArrivals,
    onTimeDepartures,
    earlyDepartures,
    missingOutCount,
    todayDate: today,
  }
}

export interface AttendanceImportSaveItem {
  employee_id: string
  attendance_date: string
  day_of_week: string
  in_time: string | null
  out_time: string | null
  arrival_status: string
  departure_status: string
  total_working_minutes: number
  total_working_hours_formatted: string
  raw_punches: RawPunch[]
}

/**
 * Batch saves imported attendance items with duplicate resolution strategy
 */
export async function saveImportedAttendanceBatch(
  items: AttendanceImportSaveItem[],
  duplicateStrategy: 'skip' | 'overwrite' = 'overwrite'
): Promise<{
  savedCount: number
  skippedDuplicates: number
  errors: string[]
}> {
  if (!items || items.length === 0) {
    return { savedCount: 0, skippedDuplicates: 0, errors: [] }
  }

  let savedCount = 0
  let skippedDuplicates = 0
  const errors: string[] = []

  const payload = items
    .filter((item) => item.employee_id && item.attendance_date)
    .map((r) => ({
      employee_id: r.employee_id,
      attendance_date: r.attendance_date,
      day_of_week: r.day_of_week,
      in_time: r.in_time,
      out_time: r.out_time,
      arrival_status: r.arrival_status,
      departure_status: r.departure_status,
      total_working_minutes: r.total_working_minutes,
      total_working_hours_formatted: r.total_working_hours_formatted,
      raw_punches: r.raw_punches as any,
    }))

  // Automatically unmark gazetted holiday for dates with recorded presence
  const datesWithPresence = new Set<string>()
  for (const item of items) {
    if (
      (item.in_time && item.in_time !== '--' && item.in_time !== '---') ||
      (item.out_time && item.out_time !== '--' && item.out_time !== '---') ||
      item.total_working_minutes > 0 ||
      item.arrival_status === 'On Time Arrival' ||
      item.arrival_status === 'Late Arrival'
    ) {
      datesWithPresence.add(item.attendance_date)
    }
  }

  for (const d of datesWithPresence) {
    try {
      await saveGazettedHoliday(d, undefined, false)
    } catch {
      // ignore
    }
  }

  if (payload.length > 0) {
    // 1. Primary Save: Hostinger MySQL via Prisma
    try {
      for (const item of payload) {
        const dObj = new Date(item.attendance_date)
        await prisma.attendanceRecord.upsert({
          where: {
            employeeId_attendanceDate: {
              employeeId: item.employee_id,
              attendanceDate: dObj,
            },
          },
          update: {
            dayOfWeek: item.day_of_week,
            inTime: item.in_time,
            outTime: item.out_time,
            arrivalStatus: item.arrival_status,
            departureStatus: item.departure_status,
            totalWorkingMinutes: item.total_working_minutes,
            totalWorkingHoursFormatted: item.total_working_hours_formatted,
            rawPunches: item.raw_punches,
          },
          create: {
            employeeId: item.employee_id,
            attendanceDate: dObj,
            dayOfWeek: item.day_of_week,
            inTime: item.in_time,
            outTime: item.out_time,
            arrivalStatus: item.arrival_status,
            departureStatus: item.departure_status,
            totalWorkingMinutes: item.total_working_minutes,
            totalWorkingHoursFormatted: item.total_working_hours_formatted,
            rawPunches: item.raw_punches,
          },
        })
      }
      savedCount = payload.length
    } catch (mysqlErr: any) {
      console.warn('MySQL saveImportedAttendanceBatch warning:', mysqlErr?.message)
      errors.push(mysqlErr?.message || 'Database error during batch save')
    }
  }

  return {
    savedCount,
    skippedDuplicates,
    errors,
  }
}

export function parseLeaveValue(notes?: string | null): number {
  if (!notes) return 1
  const match = notes.match(/\(([0-9]+(?:\.[0-9]+)?)\s*day/i) || notes.match(/([0-9]+(?:\.[0-9]+)?)\s*day/i)
  if (match) {
    const v = parseFloat(match[1])
    if (!isNaN(v) && v > 0) return v
  }
  return 1
}

export async function getEmployeeLeaveBalanceSummary(
  employeeIdOrUuid: string,
  targetDate?: string,
  excludeRecordId?: string
): Promise<{
  isProbation: boolean
  joiningDate: string | null
  quotas: EmployeeLeaveQuotas
  used: {
    probation_leaves: number
    annual_leaves: number
    sick_leaves: number
    casual_leaves: number
    wfh_quota: number
  }
  remaining: {
    probation_leaves: number
    annual_leaves: number
    sick_leaves: number
    casual_leaves: number
    wfh_quota: number
  }
  probationDates: string[]
  hasProbationInTargetMonth: boolean
}> {
  const isUuid = Boolean(employeeIdOrUuid && employeeIdOrUuid.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/))

  let emp = await getEmployeeById(employeeIdOrUuid)

  const metaMap = await getEmployeeMetadataMap()
  const meta = (emp?.id && metaMap[emp.id]) || (emp?.employee_id && metaMap[emp.employee_id]) || metaMap[employeeIdOrUuid] || {}
  const isOldStaff = meta.is_old_staff !== undefined ? Boolean(meta.is_old_staff) : Boolean(emp?.is_old_staff)
  const joiningDate = isOldStaff ? null : (meta.joining_date || emp?.joining_date || emp?.created_at || null)

  const targetDateStr = targetDate ? targetDate.split('T')[0] : ''
  const targetMonthStr = targetDateStr ? targetDateStr.substring(0, 7) : ''
  const year = targetDateStr ? targetDateStr.substring(0, 4) : String(new Date().getFullYear())

  // Calculate probation status
  let isProbation = false
  if (!isOldStaff && joiningDate && targetDateStr) {
    const j = new Date(joiningDate.split('T')[0])
    const t = new Date(targetDateStr)
    if (!isNaN(j.getTime()) && !isNaN(t.getTime())) {
      const monthsDiff = (t.getFullYear() - j.getFullYear()) * 12 + (t.getMonth() - j.getMonth())
      const daysDiff = Math.floor((t.getTime() - j.getTime()) / (1000 * 60 * 60 * 24))
      isProbation = daysDiff >= 0 && monthsDiff < 3
    }
  }

  const initialQuotas: EmployeeLeaveQuotas = {
    annual_leaves: emp?.base_leave_quotas?.annual_leaves ?? meta.base_leave_quotas?.annual_leaves ?? (DEFAULT_EMPLOYEE_LEAVE_QUOTAS.annual_leaves ?? 6),
    sick_leaves: emp?.base_leave_quotas?.sick_leaves ?? meta.base_leave_quotas?.sick_leaves ?? (DEFAULT_EMPLOYEE_LEAVE_QUOTAS.sick_leaves ?? 7),
    casual_leaves: emp?.base_leave_quotas?.casual_leaves ?? meta.base_leave_quotas?.casual_leaves ?? (DEFAULT_EMPLOYEE_LEAVE_QUOTAS.casual_leaves ?? 7),
    wfh_quota: emp?.base_leave_quotas?.wfh_quota ?? meta.base_leave_quotas?.wfh_quota ?? (emp?.leave_quotas?.wfh_quota === -1 ? -1 : (DEFAULT_EMPLOYEE_LEAVE_QUOTAS.wfh_quota ?? 4)),
    probation_leaves: isOldStaff ? 0 : (emp?.base_leave_quotas?.probation_leaves ?? meta.base_leave_quotas?.probation_leaves ?? (isProbation ? 3 : 0)),
  }

  const initial_prob = isOldStaff ? 0 : (initialQuotas.probation_leaves !== undefined ? Number(initialQuotas.probation_leaves) : (isProbation ? 3 : 0))
  const initial_ann = initialQuotas.annual_leaves !== undefined ? Number(initialQuotas.annual_leaves) : 6
  const initial_sick = initialQuotas.sick_leaves !== undefined ? Number(initialQuotas.sick_leaves) : 7
  const initial_cas = initialQuotas.casual_leaves !== undefined ? Number(initialQuotas.casual_leaves) : 7
  const initial_wfh = initialQuotas.wfh_quota !== undefined ? Number(initialQuotas.wfh_quota) : 4

  const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
  const empDbId = (emp?.id && uuidPattern.test(emp.id))
    ? emp.id
    : (uuidPattern.test(employeeIdOrUuid) ? employeeIdOrUuid : null)

  let allRecords: any[] = []
  if (empDbId) {
    try {
      const mysqlRecs = await prisma.attendanceRecord.findMany({
        where: {
          employeeId: empDbId,
          attendanceDate: {
            gte: new Date('2026-09-01T00:00:00'),
            lte: new Date(`${year}-12-31T23:59:59`),
          },
        },
        select: {
          id: true,
          employeeId: true,
          attendanceDate: true,
          arrivalStatus: true,
          departureStatus: true,
          rawPunches: true,
        },
      })
      if (mysqlRecs && mysqlRecs.length > 0) {
        allRecords = mysqlRecs.map((r) => ({
          id: r.id,
          employee_id: r.employeeId,
          attendance_date: r.attendanceDate.toISOString().slice(0, 10),
          arrival_status: r.arrivalStatus,
          departure_status: r.departureStatus,
          raw_punches: r.rawPunches,
        }))
      }
    } catch (err) {
      console.warn('MySQL getEmployeeLeaveBalanceSummary records error:', err)
    }
  }

  const probationDates: string[] = []
  let used_annual = 0
  let used_sick = 0
  let used_casual = 0
  let used_probation = 0
  let used_wfh = 0

  if (allRecords && allRecords.length > 0) {
    for (const r of allRecords) {
      if (excludeRecordId && r.id === excludeRecordId) continue
      if (targetDateStr && r.attendance_date === targetDateStr) continue

      const arrStatus = r.arrival_status || ''
      const depStatus = r.departure_status || ''

      let noteStr: string | null = null
      if (Array.isArray(r.raw_punches)) {
        const found = (r.raw_punches as any[]).find((p) => p && typeof p === 'object' && p.notes)
        if (found) noteStr = found.notes
      }
      const leaveVal = parseLeaveValue(noteStr || depStatus)

      const isLeave = arrStatus === 'Leave' || depStatus.includes('Leave') || ['Sick Leave', 'Casual Leave', 'Annual Leave', 'Probation Leave', 'Probation Leaves'].includes(depStatus)
      const isWfh = depStatus === 'Work From Home' || arrStatus === 'Work From Home'

      if (isWfh) {
        used_wfh += leaveVal
      } else if (isLeave) {
        if (depStatus.includes('Probation') || arrStatus.includes('Probation')) {
          used_probation += leaveVal
          if (r.attendance_date) {
            probationDates.push(r.attendance_date.split('T')[0])
          }
        } else if (depStatus.includes('Annual') || arrStatus.includes('Annual')) {
          used_annual += leaveVal
        } else if (depStatus.includes('Sick') || arrStatus.includes('Sick')) {
          used_sick += leaveVal
        } else if (depStatus.includes('Casual') || arrStatus.includes('Casual')) {
          used_casual += leaveVal
        }
      }
    }
  }

  const hasProbationInTargetMonth = targetMonthStr
    ? probationDates.some((d) => d.startsWith(targetMonthStr))
    : false

  return {
    isProbation,
    joiningDate,
    quotas: {
      probation_leaves: isOldStaff ? 0 : 3,
      annual_leaves: 6,
      sick_leaves: 7,
      casual_leaves: 7,
      wfh_quota: 4,
    },
    used: {
      probation_leaves: Number(used_probation.toFixed(2)),
      annual_leaves: Number(used_annual.toFixed(2)),
      sick_leaves: Number(used_sick.toFixed(2)),
      casual_leaves: Number(used_casual.toFixed(2)),
      wfh_quota: Number(used_wfh.toFixed(2)),
    },
    remaining: {
      probation_leaves: isOldStaff ? 0 : Math.max(0, Number((initial_prob - used_probation).toFixed(2))),
      annual_leaves: Math.max(0, Number((initial_ann - used_annual).toFixed(2))),
      sick_leaves: Math.max(0, Number((initial_sick - used_sick).toFixed(2))),
      casual_leaves: Math.max(0, Number((initial_cas - used_casual).toFixed(2))),
      wfh_quota: Number((initial_wfh - used_wfh).toFixed(2)),
    },
    probationDates,
    hasProbationInTargetMonth,
  }
}

export async function validateEmployeeLeaveQuotas(
  employeeIdOrUuid: string,
  attendanceDate: string,
  leaveOrWfhType: string,
  excludeRecordId?: string,
  requestedValue: number = 1
): Promise<void> {
  const summary = await getEmployeeLeaveBalanceSummary(employeeIdOrUuid, attendanceDate, excludeRecordId)
  const isProbationLeave = leaveOrWfhType.includes('Probation')
  const isAnnualLeave = leaveOrWfhType.includes('Annual')
  const isSickLeave = leaveOrWfhType.includes('Sick')
  const isCasualLeave = leaveOrWfhType.includes('Casual')
  const isMaternityLeave = leaveOrWfhType.includes('Maternity')
  const isWfh = leaveOrWfhType === 'Work From Home'

  if (isMaternityLeave) {
    // Maternity Leave has no quota limits or probation restrictions
    return
  } else if (isProbationLeave) {
    if (!summary.isProbation) {
      throw new Error('Probation period has completed (> 3 months from joining). Only Annual, Sick, or Casual Leaves can be applied.')
    }
    if (summary.hasProbationInTargetMonth) {
      const monthStr = attendanceDate.substring(0, 7)
      const existingDates = summary.probationDates.filter((d) => d.startsWith(monthStr)).join(', ')
      throw new Error(`Monthly Limit Exceeded: Only 1 Probation Leave is allowed per calendar month. This employee already has a Probation Leave recorded in ${monthStr} (${existingDates}).`)
    }
    if (summary.remaining.probation_leaves < requestedValue) {
      throw new Error(`Probation Leaves Quota Exceeded: Only ${summary.remaining.probation_leaves} remaining, but ${requestedValue} day(s) requested.`)
    }
  } else if (isAnnualLeave) {
    if (summary.isProbation) {
      throw new Error('Employee is currently in 3-month probation period. Only Probation Leaves (max 1/month) can be applied during probation.')
    }
    if (summary.remaining.annual_leaves < requestedValue) {
      throw new Error(`Annual Leaves Quota Exceeded: Only ${summary.remaining.annual_leaves} remaining, but ${requestedValue} day(s) requested.`)
    }
  } else if (isSickLeave) {
    if (summary.isProbation) {
      throw new Error('Employee is currently in 3-month probation period. Only Probation Leaves (max 1/month) can be applied during probation.')
    }
    if (summary.remaining.sick_leaves < requestedValue) {
      throw new Error(`Sick Leaves Quota Exceeded: Only ${summary.remaining.sick_leaves} remaining, but ${requestedValue} day(s) requested.`)
    }
  } else if (isCasualLeave) {
    if (summary.isProbation) {
      throw new Error('Employee is currently in 3-month probation period. Only Probation Leaves (max 1/month) can be applied during probation.')
    }
    if (summary.remaining.casual_leaves < requestedValue) {
      throw new Error(`Casual Leaves Quota Exceeded: Only ${summary.remaining.casual_leaves} remaining, but ${requestedValue} day(s) requested.`)
    }
  } else if (isWfh) {
    // Work From Home (WFH) is allowed unlimited - quota balance can go into negative
  }
}

export async function updateAttendanceRecord(
  id: string,
  params: {
    employee_id?: string
    in_time?: string | null
    out_time?: string | null
    attendance_date?: string
    arrival_status?: string
    departure_status?: string
    notes?: string | null
  }
): Promise<AttendanceRecord> {
  // If this is a synthetic absent record ID or missing ID, fallback to creating a manual record
  const isSynthetic = !id || id.startsWith('absent-') || id.startsWith('holiday-') || id.startsWith('dummy-')
  if (isSynthetic && params.employee_id && params.attendance_date) {
    return createManualAttendanceRecord({
      employee_id: params.employee_id,
      attendance_date: params.attendance_date,
      in_time: params.in_time,
      out_time: params.out_time,
      arrival_status: params.arrival_status,
      departure_status: params.departure_status,
      notes: params.notes,
    })
  }

  let current: AttendanceRecord | null = null
  if (!isSynthetic) {
    try {
      const mysqlRec = await prisma.attendanceRecord.findUnique({
        where: { id },
      })
      if (mysqlRec) {
        current = toAttendanceRecordModel(mysqlRec)
      }
    } catch (err) {
      console.warn('MySQL find record error:', err)
    }
  }

  // If record was not found by ID, try finding by employee_id + attendance_date or upsert
  if (!current) {
    if (params.employee_id && params.attendance_date) {
      return createManualAttendanceRecord({
        employee_id: params.employee_id,
        attendance_date: params.attendance_date,
        in_time: params.in_time,
        out_time: params.out_time,
        arrival_status: params.arrival_status,
        departure_status: params.departure_status,
        notes: params.notes,
      })
    }
    throw new Error('Attendance record not found in database.')
  }

  let effectiveEmpId = params.employee_id || current.employee_id
  if (effectiveEmpId && !effectiveEmpId.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)) {
    const emp = await getEmployeeById(effectiveEmpId)
    if (emp?.id) {
      effectiveEmpId = emp.id
    }
  }

  const dateToUse = params.attendance_date !== undefined ? params.attendance_date : current.attendance_date

  // Validate Leave or WFH Quotas before updating
  const isLeave = params.arrival_status === 'Leave' || (params.departure_status && params.departure_status.includes('Leave'))
  const isWfh = params.departure_status === 'Work From Home' || params.arrival_status === 'Work From Home' || params.notes === 'Work From Home'

  const currentRawP = Array.isArray(current.raw_punches) ? (current.raw_punches as any[]) : []
  const currentNote = currentRawP.find((p) => p && typeof p === 'object' && p.notes)?.notes
  const effectiveNote = params.notes !== undefined ? params.notes : currentNote

  if (effectiveEmpId && (isLeave || isWfh)) {
    const leaveTypeToValidate = isWfh ? 'Work From Home' : (params.departure_status || 'Casual Leave')
    const leaveVal = parseLeaveValue(effectiveNote)
    await validateEmployeeLeaveQuotas(effectiveEmpId, dateToUse, leaveTypeToValidate, id, leaveVal)
  }

  const settings = await getAttendanceSettings()

  const inTimeToUse = params.in_time !== undefined ? params.in_time : current.in_time
  const outTimeToUse = params.out_time !== undefined ? params.out_time : current.out_time

  const parsedDate = parseDateString(dateToUse)
  const dayOfWeek = parsedDate ? parsedDate.dayOfWeek : 1
  const dayName = parsedDate ? parsedDate.dayName : current.day_of_week

  let arrivalStatus = params.arrival_status || current.arrival_status
  let departureStatus = params.departure_status || current.departure_status
  let totalMinutes = 0
  let formatted = '00:00'

  if (params.arrival_status === 'Absent' || params.departure_status === 'Absent') {
    arrivalStatus = 'Absent'
    departureStatus = 'Absent'
    totalMinutes = 0
    formatted = '00:00'
  } else if (
    params.arrival_status === 'Leave' ||
    params.departure_status?.includes('Leave') ||
    LEAVE_TYPES.includes(params.departure_status as any)
  ) {
    arrivalStatus = 'Leave'
    departureStatus = params.departure_status || 'Casual Leave'
    totalMinutes = 0
    formatted = '00:00'
  } else if (isWfh) {
    arrivalStatus = 'On Time Arrival'
    departureStatus = 'Work From Home'
    totalMinutes = dayOfWeek === 6 ? 4 * 60 : 8 * 60
    formatted = dayOfWeek === 6 ? '4h 0m' : '8h 0m'
  } else {
    // Normal present / punch recalculation
    arrivalStatus = calculateArrivalStatus(inTimeToUse, dayOfWeek, settings)
    departureStatus = calculateDepartureStatus(outTimeToUse, dayOfWeek, settings)
    const duration = calculateWorkingDuration(inTimeToUse, outTimeToUse)
    totalMinutes = duration.totalMinutes
    formatted = duration.formatted
  }

  let punchesToSave: any = current.raw_punches || []
  if (isWfh) {
    punchesToSave = [
      { punch_time: inTimeToUse, type: 'IN', source: 'WFH', notes: effectiveNote || 'Work From Home' },
      { punch_time: outTimeToUse, type: 'OUT', source: 'WFH', notes: effectiveNote || 'Work From Home' },
    ]
  } else if (isLeave && effectiveNote) {
    punchesToSave = [{ punch_time: null, type: 'LEAVE', notes: effectiveNote }]
  }

  const updatedData: Record<string, any> = {
    attendance_date: dateToUse,
    day_of_week: dayName,
    in_time: (arrivalStatus === 'Absent' || arrivalStatus === 'Leave') ? null : inTimeToUse,
    out_time: (arrivalStatus === 'Absent' || arrivalStatus === 'Leave') ? null : outTimeToUse,
    arrival_status: arrivalStatus,
    departure_status: departureStatus,
    total_working_minutes: totalMinutes,
    total_working_hours_formatted: formatted,
    raw_punches: punchesToSave,
    updated_at: new Date().toISOString(),
  }

  let updated: AttendanceRecord | null = null

  // 1. Primary Update: Hostinger MySQL via Prisma
  try {
    const isRecUuid = Boolean(id && id.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/))
    const parsedDateObj = new Date(dateToUse)
    const mysqlRec = await prisma.attendanceRecord.upsert({
      where: isRecUuid
        ? { id }
        : {
            employeeId_attendanceDate: {
              employeeId: effectiveEmpId,
              attendanceDate: parsedDateObj,
            },
          },
      update: {
        attendanceDate: parsedDateObj,
        dayOfWeek: dayName,
        inTime: updatedData.in_time,
        outTime: updatedData.out_time,
        arrivalStatus: updatedData.arrival_status,
        departureStatus: updatedData.departure_status,
        totalWorkingMinutes: updatedData.total_working_minutes,
        totalWorkingHoursFormatted: updatedData.total_working_hours_formatted,
        rawPunches: updatedData.raw_punches,
      },
      create: {
        employeeId: effectiveEmpId,
        attendanceDate: parsedDateObj,
        dayOfWeek: dayName,
        inTime: updatedData.in_time,
        outTime: updatedData.out_time,
        arrivalStatus: updatedData.arrival_status,
        departureStatus: updatedData.departure_status,
        totalWorkingMinutes: updatedData.total_working_minutes,
        totalWorkingHoursFormatted: updatedData.total_working_hours_formatted,
        rawPunches: updatedData.raw_punches,
      },
    })
    if (mysqlRec) {
      updated = toAttendanceRecordModel(mysqlRec)
    }
  } catch (mysqlErr) {
    console.warn('MySQL updateAttendanceRecord warning:', mysqlErr)
  }

  if (!updated) {
    throw new Error('Failed to update attendance record in database.')
  }

  return updated
}

export async function createManualAttendanceRecord(params: {
  employee_id: string
  attendance_date: string
  in_time?: string | null
  out_time?: string | null
  arrival_status?: string
  departure_status?: string
  notes?: string | null
}): Promise<AttendanceRecord> {
  const settings = await getAttendanceSettings()

  let resolvedEmployeeId = params.employee_id
  if (resolvedEmployeeId && !resolvedEmployeeId.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)) {
    const emp = await getEmployeeById(resolvedEmployeeId)
    if (emp?.id) {
      resolvedEmployeeId = emp.id
    }
  }

  const parsedDate = parseDateString(params.attendance_date)
  const dayOfWeek = parsedDate ? parsedDate.dayOfWeek : 1
  const dayName = parsedDate ? parsedDate.dayName : 'Monday'

  let arrivalStatus = params.arrival_status || 'On Time Arrival'
  let departureStatus = params.departure_status || 'On Time Departure'
  let totalMinutes = 0
  let formatted = '00:00'

  const isWfh =
    params.departure_status === 'Work From Home' ||
    params.arrival_status === 'Work From Home' ||
    params.notes === 'Work From Home'

  const isLeave =
    params.arrival_status === 'Leave' ||
    params.departure_status?.includes('Leave') ||
    LEAVE_TYPES.includes(params.departure_status as any)

  if (resolvedEmployeeId && (isLeave || isWfh)) {
    const leaveTypeToValidate = isWfh ? 'Work From Home' : (params.departure_status || 'Casual Leave')
    const leaveVal = parseLeaveValue(params.notes)
    await validateEmployeeLeaveQuotas(resolvedEmployeeId, params.attendance_date, leaveTypeToValidate, undefined, leaveVal)
  }

  if (params.arrival_status === 'Absent' || params.departure_status === 'Absent') {
    arrivalStatus = 'Absent'
    departureStatus = 'Absent'
    totalMinutes = 0
    formatted = '00:00'
  } else if (
    params.arrival_status === 'Leave' ||
    params.departure_status?.includes('Leave') ||
    LEAVE_TYPES.includes(params.departure_status as any)
  ) {
    arrivalStatus = 'Leave'
    departureStatus = params.departure_status || 'Casual Leave'
    totalMinutes = 0
    formatted = '00:00'
  } else if (isWfh) {
    arrivalStatus = 'On Time Arrival'
    departureStatus = 'Work From Home'
    totalMinutes = dayOfWeek === 6 ? 4 * 60 : 8 * 60
    formatted = dayOfWeek === 6 ? '4h 0m' : '8h 0m'
  } else {
    arrivalStatus = calculateArrivalStatus(params.in_time || null, dayOfWeek, settings)
    departureStatus = calculateDepartureStatus(params.out_time || null, dayOfWeek, settings)
    const duration = calculateWorkingDuration(params.in_time || null, params.out_time || null)
    totalMinutes = duration.totalMinutes
    formatted = duration.formatted
  }

  const rawPunches = isWfh
    ? [
        { punch_time: params.in_time, type: 'IN', source: 'WFH', notes: params.notes || 'Work From Home' },
        { punch_time: params.out_time, type: 'OUT', source: 'WFH', notes: params.notes || 'Work From Home' },
      ]
    : isLeave && params.notes
    ? [{ punch_time: null, type: 'LEAVE', notes: params.notes }]
    : []

  const newRecord = {
    employee_id: resolvedEmployeeId,
    attendance_date: params.attendance_date,
    day_of_week: dayName,
    in_time: (arrivalStatus === 'Absent' || arrivalStatus === 'Leave') ? null : (params.in_time?.trim() || null),
    out_time: (arrivalStatus === 'Absent' || arrivalStatus === 'Leave') ? null : (params.out_time?.trim() || null),
    arrival_status: arrivalStatus,
    departure_status: departureStatus,
    total_working_minutes: totalMinutes,
    total_working_hours_formatted: formatted,
    raw_punches: rawPunches as any,
  }

  let data: AttendanceRecord | null = null

  // Primary Save: Hostinger MySQL via Prisma
  try {
    const parsedDateObj = new Date(params.attendance_date)
    const mysqlRec = await prisma.attendanceRecord.upsert({
      where: {
        employeeId_attendanceDate: {
          employeeId: resolvedEmployeeId,
          attendanceDate: parsedDateObj,
        },
      },
      update: {
        dayOfWeek: dayName,
        inTime: newRecord.in_time,
        outTime: newRecord.out_time,
        arrivalStatus: newRecord.arrival_status,
        departureStatus: newRecord.departure_status,
        totalWorkingMinutes: newRecord.total_working_minutes,
        totalWorkingHoursFormatted: newRecord.total_working_hours_formatted,
        rawPunches: newRecord.raw_punches,
      },
      create: {
        employeeId: resolvedEmployeeId,
        attendanceDate: parsedDateObj,
        dayOfWeek: dayName,
        inTime: newRecord.in_time,
        outTime: newRecord.out_time,
        arrivalStatus: newRecord.arrival_status,
        departureStatus: newRecord.departure_status,
        totalWorkingMinutes: newRecord.total_working_minutes,
        totalWorkingHoursFormatted: newRecord.total_working_hours_formatted,
        rawPunches: newRecord.raw_punches,
      },
    })
    if (mysqlRec) {
      data = toAttendanceRecordModel(mysqlRec)
    }
  } catch (err) {
    console.warn('MySQL createManualAttendanceRecord warning:', err)
  }

  if (!data) {
    throw new Error('Failed to save attendance record.')
  }

  return data
}

export async function deleteAttendanceRecord(id: string): Promise<void> {
  // MySQL via Prisma
  try {
    await prisma.attendanceRecord.deleteMany({ where: { id } })
  } catch (err) {
    console.warn('MySQL deleteAttendanceRecord warning:', err)
  }
}

export async function bulkDeleteAttendanceRecords(params: {
  startDate: string
  endDate: string
  employeeId?: string
}): Promise<{ deletedCount: number }> {
  let deletedCount = 0

  // MySQL via Prisma
  try {
    const where: any = {
      attendanceDate: {
        gte: new Date(params.startDate),
        lte: new Date(params.endDate),
      },
    }
    if (params.employeeId && params.employeeId !== 'all') {
      where.employeeId = params.employeeId
    }
    const res = await prisma.attendanceRecord.deleteMany({ where })
    deletedCount = res.count
  } catch (err) {
    console.warn('MySQL bulkDeleteAttendanceRecords warning:', err)
  }

  return { deletedCount }
}

// Deprecated no-op for backward compatibility
export async function syncAttendanceToSupabase(): Promise<{ syncedCount: number; error?: string }> {
  return { syncedCount: 0 }
}
