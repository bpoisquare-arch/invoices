import { createClient } from '@/lib/supabase/client'
import {
  Employee,
  AttendanceRecord,
  AttendanceRecordWithEmployee,
  AttendanceSettings,
  RawPunch,
} from '@/lib/supabase/database.types'
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
    const supabase = createClient()
    const { data, error } = await supabase
      .from('attendance_settings')
      .select('*')
      .eq('id', 'default')
      .single()

    if (error || !data) {
      return DEFAULT_ATTENDANCE_SETTINGS
    }

    return data
  } catch (err) {
    return DEFAULT_ATTENDANCE_SETTINGS
  }
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
    const supabase = createClient()
    const { data, error } = await supabase
      .from('attendance_settings')
      .upsert(updated)
      .select()
      .single()

    if (error || !data) {
      return updated
    }

    return data
  } catch (err) {
    return updated
  }
}

// ----------------------------------------------------
// 2. EMPLOYEE SERVICES & METADATA SYNC
import { EmployeeLeaveQuotas } from '@/lib/supabase/database.types'

export async function getEmployeeMetadataMap(): Promise<Record<string, { branch?: string; salary?: number | null; joining_date?: string; is_old_staff?: boolean | null; leave_quotas?: EmployeeLeaveQuotas }>> {
  const fileMeta = readAllEmployeeMetadata()

  try {
    const { createClient: createServerClient } = await import('@/lib/supabase/server')
    const supabase = await createServerClient()
    const { data, error } = await supabase
      .from('attendance_audit_logs')
      .select('details')
      .eq('action', 'EMPLOYEE_METADATA_STORE')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      console.warn('Database metadata fetch warning:', error.message)
    }

    if (data && data.details && typeof data.details === 'object') {
      return {
        ...(data.details as Record<string, any>),
        ...fileMeta,
      }
    }
  } catch (err) {
    console.error('Error fetching employee metadata from database:', err)
  }
  return fileMeta as any
}

export async function saveEmployeeMetadata(
  idOrEmpId: string,
  meta: { branch?: string | null; salary?: number | null; joining_date?: string | null; is_old_staff?: boolean | null; leave_quotas?: EmployeeLeaveQuotas }
): Promise<void> {
  // 1. Write immediately to server-side permanent file store
  writeEmployeeMetadata(idOrEmpId, meta)

  // 2. Also attempt DB audit logs store
  try {
    const currentMap = await getEmployeeMetadataMap()
    const existing = currentMap[idOrEmpId] || {}
    currentMap[idOrEmpId] = {
      ...existing,
      ...(meta.branch !== undefined ? { branch: meta.branch || 'Multan' } : {}),
      ...(meta.salary !== undefined ? { salary: meta.salary } : {}),
      ...(meta.joining_date !== undefined ? { joining_date: meta.joining_date || undefined } : {}),
      ...(meta.is_old_staff !== undefined ? { is_old_staff: meta.is_old_staff } : {}),
      ...(meta.leave_quotas !== undefined ? { leave_quotas: meta.leave_quotas } : {}),
    }

    const { createClient: createServerClient } = await import('@/lib/supabase/server')
    const supabase = await createServerClient()
    const { error } = await supabase.from('attendance_audit_logs').insert({
      action: 'EMPLOYEE_METADATA_STORE',
      details: currentMap as any,
    })
    if (error) {
      console.error('Failed to insert employee metadata to attendance_audit_logs:', error.message)
    }
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

async function calculateAllEmployeeUsedLeaves(supabase: any): Promise<Map<string, {
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
    const { data: recs } = await supabase
      .from('attendance_records')
      .select('employee_id, arrival_status, departure_status, raw_punches')

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
}): Promise<Employee[]> {
  try {
    const supabase = createClient()
    let query = supabase.from('employees').select('*').order('employee_id', { ascending: true })

    if (params?.isActiveOnly !== false) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error || !data) {
      console.error('Error fetching employees from Supabase:', error?.message)
      return []
    }

    const [metaMap, usedMap] = await Promise.all([
      getEmployeeMetadataMap(),
      calculateAllEmployeeUsedLeaves(supabase),
    ])

    let result: Employee[] = data.map((emp) => {
      const meta = metaMap[emp.id] || metaMap[emp.employee_id] || {}
      const isOldStaff = meta.is_old_staff !== undefined ? Boolean(meta.is_old_staff) : Boolean((emp as any).is_old_staff)
      const used = usedMap.get(emp.id) || usedMap.get(emp.employee_id) || { annual_leaves: 0, sick_leaves: 0, casual_leaves: 0, wfh_quota: 0, probation_leaves: 0 }

      const initialAnn = meta.leave_quotas?.annual_leaves !== undefined ? Number(meta.leave_quotas.annual_leaves) : (DEFAULT_EMPLOYEE_LEAVE_QUOTAS.annual_leaves ?? 6)
      const initialSick = meta.leave_quotas?.sick_leaves !== undefined ? Number(meta.leave_quotas.sick_leaves) : (DEFAULT_EMPLOYEE_LEAVE_QUOTAS.sick_leaves ?? 7)
      const initialCas = meta.leave_quotas?.casual_leaves !== undefined ? Number(meta.leave_quotas.casual_leaves) : (DEFAULT_EMPLOYEE_LEAVE_QUOTAS.casual_leaves ?? 7)
      const initialWfh = meta.leave_quotas?.wfh_quota !== undefined ? Number(meta.leave_quotas.wfh_quota) : (DEFAULT_EMPLOYEE_LEAVE_QUOTAS.wfh_quota ?? 4)
      const initialProb = isOldStaff ? 0 : (meta.leave_quotas?.probation_leaves !== undefined ? Number(meta.leave_quotas.probation_leaves) : (DEFAULT_EMPLOYEE_LEAVE_QUOTAS.probation_leaves ?? 3))

      return {
        ...emp,
        designation: cleanDesignation(emp.designation),
        branch: meta.branch || emp.branch || 'Multan',
        salary: meta.salary !== undefined && meta.salary !== null ? meta.salary : (emp.salary !== undefined && emp.salary !== null ? emp.salary : null),
        joining_date: isOldStaff ? null : (meta.joining_date || emp.joining_date || emp.created_at),
        is_old_staff: isOldStaff,
        leave_quotas: {
          annual_leaves: Math.max(0, Number((initialAnn - used.annual_leaves).toFixed(2))),
          sick_leaves: Math.max(0, Number((initialSick - used.sick_leaves).toFixed(2))),
          casual_leaves: Math.max(0, Number((initialCas - used.casual_leaves).toFixed(2))),
          wfh_quota: Math.max(0, Number((initialWfh - used.wfh_quota).toFixed(2))),
          probation_leaves: Math.max(0, Number((initialProb - used.probation_leaves).toFixed(2))),
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
    console.error('Exception fetching employees:', err)
    return []
  }
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .or(`id.eq.${id},employee_id.eq.${id}`)
      .single()

    if (error || !data) {
      return null
    }

    const [metaMap, usedMap] = await Promise.all([
      getEmployeeMetadataMap(),
      calculateAllEmployeeUsedLeaves(supabase),
    ])

    const meta = metaMap[data.id] || metaMap[data.employee_id] || {}
    const isOldStaff = meta.is_old_staff !== undefined ? Boolean(meta.is_old_staff) : Boolean((data as any).is_old_staff)
    const used = usedMap.get(data.id) || usedMap.get(data.employee_id) || { annual_leaves: 0, sick_leaves: 0, casual_leaves: 0, wfh_quota: 0, probation_leaves: 0 }

    const initialAnn = meta.leave_quotas?.annual_leaves !== undefined ? Number(meta.leave_quotas.annual_leaves) : (DEFAULT_EMPLOYEE_LEAVE_QUOTAS.annual_leaves ?? 6)
    const initialSick = meta.leave_quotas?.sick_leaves !== undefined ? Number(meta.leave_quotas.sick_leaves) : (DEFAULT_EMPLOYEE_LEAVE_QUOTAS.sick_leaves ?? 7)
    const initialCas = meta.leave_quotas?.casual_leaves !== undefined ? Number(meta.leave_quotas.casual_leaves) : (DEFAULT_EMPLOYEE_LEAVE_QUOTAS.casual_leaves ?? 7)
    const initialWfh = meta.leave_quotas?.wfh_quota !== undefined ? Number(meta.leave_quotas.wfh_quota) : (DEFAULT_EMPLOYEE_LEAVE_QUOTAS.wfh_quota ?? 4)
    const initialProb = isOldStaff ? 0 : (meta.leave_quotas?.probation_leaves !== undefined ? Number(meta.leave_quotas.probation_leaves) : (DEFAULT_EMPLOYEE_LEAVE_QUOTAS.probation_leaves ?? 3))

    return {
      ...data,
      designation: cleanDesignation(data.designation),
      branch: data.branch || meta.branch || 'Multan',
      salary: data.salary !== undefined && data.salary !== null ? data.salary : (meta.salary !== undefined ? meta.salary : null),
      joining_date: isOldStaff ? null : (data.joining_date || meta.joining_date || data.created_at),
      is_old_staff: isOldStaff,
      leave_quotas: {
        annual_leaves: Math.max(0, Number((initialAnn - used.annual_leaves).toFixed(2))),
        sick_leaves: Math.max(0, Number((initialSick - used.sick_leaves).toFixed(2))),
        casual_leaves: Math.max(0, Number((initialCas - used.casual_leaves).toFixed(2))),
        wfh_quota: Math.max(0, Number((initialWfh - used.wfh_quota).toFixed(2))),
        probation_leaves: Math.max(0, Number((initialProb - used.probation_leaves).toFixed(2))),
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
    const supabase = createClient()
    const { data } = await supabase.from('employees').select('employee_id')
    if (data && data.length > 0) {
      for (const emp of data) {
        const match = emp.employee_id.match(/EMP-(\d+)/i)
        if (match) {
          const num = parseInt(match[1], 10)
          if (num > maxSeq) maxSeq = num
        }
      }
    }
  } catch (err) {
    // Ignore DB error
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
  branch?: string | null
  salary?: number | string | null
  joining_date?: string | null
  is_old_staff?: boolean | null
  leave_quotas?: EmployeeLeaveQuotas
}): Promise<{ employee: Employee; warning?: string }> {
  const name = params.name.trim()
  const designation = cleanDesignation(params.designation)
  const branch = params.branch ? params.branch.trim() : 'Multan'
  const salary = params.salary !== undefined && params.salary !== null && params.salary !== '' ? Number(params.salary) : null
  const isOldStaff = Boolean(params.is_old_staff)
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
  const supabase = createClient()
  
  const insertPayload: any = {
    employee_id: employeeId,
    name,
    normalized_name: normalizedName,
    designation,
    branch,
    salary,
    joining_date: joiningDate,
    is_active: true,
  }

  let { data, error } = await supabase
    .from('employees')
    .insert(insertPayload)
    .select()
    .single()

  if (error) {
    const fallbackPayload = {
      employee_id: employeeId,
      name,
      normalized_name: normalizedName,
      designation,
      is_active: true,
    }
    const res = await supabase.from('employees').insert(fallbackPayload).select().single()
    data = res.data
  }

  if (data) {
    await saveEmployeeMetadata(data.id, { branch, salary, joining_date: joiningDate, is_old_staff: isOldStaff, leave_quotas: leaveQuotas })
    await saveEmployeeMetadata(data.employee_id, { branch, salary, joining_date: joiningDate, is_old_staff: isOldStaff, leave_quotas: leaveQuotas })
  }

  if (!data) {
    throw new Error('Failed to create employee in database')
  }

  return { employee: { ...data, branch, salary, joining_date: joiningDate, is_old_staff: isOldStaff, designation, leave_quotas: leaveQuotas }, warning }
}

export async function updateEmployee(
  id: string,
  params: {
    name?: string
    designation?: string
    branch?: string | null
    salary?: number | string | null
    joining_date?: string | null
    is_old_staff?: boolean | null
    is_active?: boolean
    leave_quotas?: EmployeeLeaveQuotas
  }
): Promise<Employee> {
  const supabase = createClient()
  const updateData: any = {
    updated_at: new Date().toISOString(),
  }

  const isOldStaff = params.is_old_staff !== undefined ? Boolean(params.is_old_staff) : undefined

  if (params.name !== undefined) {
    updateData.name = params.name.trim()
    updateData.normalized_name = normalizeEmployeeName(params.name)
  }
  if (params.designation !== undefined) {
    updateData.designation = cleanDesignation(params.designation)
  }
  if (params.branch !== undefined) {
    updateData.branch = params.branch
  }
  if (params.salary !== undefined) {
    updateData.salary = params.salary !== null && params.salary !== '' ? Number(params.salary) : null
  }
  if (params.joining_date !== undefined || isOldStaff !== undefined) {
    updateData.joining_date = isOldStaff ? null : params.joining_date
  }
  if (params.is_active !== undefined) {
    updateData.is_active = params.is_active
  }

  let { data, error } = await supabase
    .from('employees')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    const safeData: any = {
      updated_at: updateData.updated_at,
    }
    if (params.name !== undefined) {
      safeData.name = updateData.name
      safeData.normalized_name = updateData.normalized_name
    }
    if (params.designation !== undefined) safeData.designation = updateData.designation
    if (params.is_active !== undefined) safeData.is_active = updateData.is_active
    const res = await supabase.from('employees').update(safeData).eq('id', id).select().single()
    data = res.data
  }

  const probationEligible = isWithinProbation(isOldStaff ? null : params.joining_date, isOldStaff)

  const finalQuotas = params.leave_quotas
    ? {
        ...params.leave_quotas,
        probation_leaves: probationEligible ? params.leave_quotas.probation_leaves : 0,
      }
    : undefined

  // Persist metadata to DB store
  await saveEmployeeMetadata(id, {
    branch: params.branch,
    salary: params.salary !== undefined ? (params.salary ? Number(params.salary) : null) : undefined,
    joining_date: isOldStaff ? null : params.joining_date,
    is_old_staff: isOldStaff,
    leave_quotas: finalQuotas,
  })
  if (data?.employee_id) {
    await saveEmployeeMetadata(data.employee_id, {
      branch: params.branch,
      salary: params.salary !== undefined ? (params.salary ? Number(params.salary) : null) : undefined,
      joining_date: isOldStaff ? null : params.joining_date,
      is_old_staff: isOldStaff,
      leave_quotas: finalQuotas,
    })
  }

  if (!data) {
    throw new Error('Failed to update employee in database')
  }

  const [allMetaMap, usedMap] = await Promise.all([
    getEmployeeMetadataMap(),
    calculateAllEmployeeUsedLeaves(supabase),
  ])

  const existingMeta = allMetaMap[id] || allMetaMap[data.employee_id] || {}
  const used = usedMap.get(id) || usedMap.get(data.employee_id) || { annual_leaves: 0, sick_leaves: 0, casual_leaves: 0, wfh_quota: 0, probation_leaves: 0 }

  const baseQuotas = existingMeta.leave_quotas || DEFAULT_EMPLOYEE_LEAVE_QUOTAS
  const liveRemQuotas: EmployeeLeaveQuotas = {
    annual_leaves: Math.max(0, Number(((baseQuotas.annual_leaves ?? 6) - used.annual_leaves).toFixed(2))),
    sick_leaves: Math.max(0, Number(((baseQuotas.sick_leaves ?? 7) - used.sick_leaves).toFixed(2))),
    casual_leaves: Math.max(0, Number(((baseQuotas.casual_leaves ?? 7) - used.casual_leaves).toFixed(2))),
    wfh_quota: Math.max(0, Number(((baseQuotas.wfh_quota ?? 4) - used.wfh_quota).toFixed(2))),
    probation_leaves: isOldStaff ? 0 : Math.max(0, Number(((baseQuotas.probation_leaves ?? 3) - used.probation_leaves).toFixed(2))),
  }

  return {
    ...data,
    branch: params.branch !== undefined ? params.branch : (data.branch || 'Multan'),
    salary: params.salary !== undefined ? (params.salary ? Number(params.salary) : null) : (data.salary ?? null),
    joining_date: isOldStaff ? null : (params.joining_date !== undefined ? params.joining_date : (data.joining_date || data.created_at)),
    is_old_staff: isOldStaff !== undefined ? isOldStaff : Boolean(existingMeta.is_old_staff),
    leave_quotas: liveRemQuotas,
  }
}

export async function deleteEmployee(id: string): Promise<void> {
  const supabase = createClient()
  // 1. Delete associated attendance records
  await supabase
    .from('attendance_records')
    .delete()
    .or(`employee_id.eq.${id}`)

  // 2. Delete employee
  const { error } = await supabase.from('employees').delete().or(`id.eq.${id},employee_id.eq.${id}`)
  if (error) {
    throw new Error(error.message || 'Failed to delete employee from database')
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
  const employees = await getEmployees({ isActiveOnly: false })
  const empMap = new Map<string, Employee>()
  employees.forEach((e) => {
    empMap.set(e.id, e)
    empMap.set(e.employee_id, e)
  })

  let allRecords: AttendanceRecord[] = []

  try {
    const supabase = createClient()
    let query = supabase.from('attendance_records').select('*')

    if (params.employeeId && params.employeeId !== 'all') {
      const targetEmp = empMap.get(params.employeeId)
      const empUuid = targetEmp?.id || (params.employeeId.includes('-') && params.employeeId.length > 20 ? params.employeeId : null)
      if (empUuid) {
        query = query.eq('employee_id', empUuid)
      } else {
        query = query.eq('employee_id', params.employeeId)
      }
    }
    if (params.startDate) {
      query = query.gte('attendance_date', params.startDate)
    }
    if (params.endDate) {
      query = query.lte('attendance_date', params.endDate)
    }
    if (params.arrivalStatus && params.arrivalStatus !== 'all') {
      query = query.eq('arrival_status', params.arrivalStatus)
    }
    if (params.departureStatus && params.departureStatus !== 'all') {
      query = query.eq('departure_status', params.departureStatus)
    }

    const { data, error } = await query

    if (!error && data) {
      allRecords = data
    }
  } catch (err) {
    console.error('Error querying attendance records from Supabase:', err)
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

  const holidaysMap = readAllHolidays()

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
    if (r.arrival_status === 'On Time Arrival') onTimeArrivals++
    else if (r.arrival_status === 'Late Arrival') lateArrivals++
    else if (r.arrival_status === 'Missing In Time') missingInTimes++

    if (r.departure_status === 'On Time Departure') onTimeDepartures++
    else if (r.departure_status === 'Early Departure') earlyDepartures++
    else if (r.departure_status === 'Missing Out Time') missingOutTimes++

    totalWorkingMinutes += r.total_working_minutes || 0

    if (r.attendance_date) {
      const cleanDate = r.attendance_date.split('T')[0]
      recordsByDate.set(cleanDate, r)
    }

    // If no explicit startDate & endDate range provided, calculate directly per record:
    if (!params?.startDate || !params?.endDate) {
      const isLeave = isLeaveRecord(r)
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

        const r = recordsByDate.get(dStr)
        const isLeave = isLeaveRecord(r)

        if (isSunday || isGazettedHoliday || isLeave) {
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

  const supabase = createClient()
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
      writeHoliday(d, undefined, false)
    } catch {
      // ignore
    }
  }

  if (payload.length > 0) {
    try {
      if (duplicateStrategy === 'overwrite') {
        const { error } = await supabase.from('attendance_records').upsert(payload, {
          onConflict: 'employee_id,attendance_date',
        })
        if (error) {
          errors.push(error.message)
        } else {
          savedCount = payload.length
        }
      } else {
        const { error } = await supabase.from('attendance_records').insert(payload)
        if (error) {
          // If error is unique constraint violation, try inserting row by row or report
          errors.push(error.message)
        } else {
          savedCount = payload.length
        }
      }
    } catch (err: any) {
      errors.push(err?.message || 'Database error during batch save')
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
  const emp = await getEmployeeById(employeeIdOrUuid)
  const isOldStaff = Boolean(emp?.is_old_staff)
  const joiningDate = isOldStaff ? null : (emp?.joining_date || emp?.created_at || null)
  const quotas: EmployeeLeaveQuotas = emp?.leave_quotas || {
    annual_leaves: 6,
    sick_leaves: 7,
    casual_leaves: 7,
    wfh_quota: 4,
    probation_leaves: isOldStaff ? 0 : 3,
  }

  const supabase = createClient()
  const { data: allRecords } = await supabase
    .from('attendance_records')
    .select('id, attendance_date, arrival_status, departure_status, raw_punches')
    .or(`employee_id.eq.${employeeIdOrUuid}${emp?.id ? `,employee_id.eq.${emp.id}` : ''}${emp?.employee_id ? `,employee_id.eq.${emp.employee_id}` : ''}`)

  const probationDates: string[] = []
  let used_annual = 0
  let used_sick = 0
  let used_casual = 0
  let used_probation = 0
  let used_wfh = 0

  const targetDateStr = targetDate ? targetDate.split('T')[0] : ''
  const targetMonthStr = targetDateStr ? targetDateStr.substring(0, 7) : ''

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

  const hasProbationInTargetMonth = targetMonthStr
    ? probationDates.some((d) => d.startsWith(targetMonthStr))
    : false

  const initial_prob = isOldStaff ? 0 : (quotas.probation_leaves !== undefined ? Number(quotas.probation_leaves) : 3)
  const initial_ann = quotas.annual_leaves !== undefined ? Number(quotas.annual_leaves) : 6
  const initial_sick = quotas.sick_leaves !== undefined ? Number(quotas.sick_leaves) : 7
  const initial_cas = quotas.casual_leaves !== undefined ? Number(quotas.casual_leaves) : 7
  const initial_wfh = quotas.wfh_quota !== undefined ? Number(quotas.wfh_quota) : 4

  return {
    isProbation,
    joiningDate,
    quotas,
    used: {
      probation_leaves: Number(used_probation.toFixed(2)),
      annual_leaves: Number(used_annual.toFixed(2)),
      sick_leaves: Number(used_sick.toFixed(2)),
      casual_leaves: Number(used_casual.toFixed(2)),
      wfh_quota: Number(used_wfh.toFixed(2)),
    },
    remaining: {
      probation_leaves: Math.max(0, Number((initial_prob - used_probation).toFixed(2))),
      annual_leaves: Math.max(0, Number((initial_ann - used_annual).toFixed(2))),
      sick_leaves: Math.max(0, Number((initial_sick - used_sick).toFixed(2))),
      casual_leaves: Math.max(0, Number((initial_cas - used_casual).toFixed(2))),
      wfh_quota: Math.max(0, Number((initial_wfh - used_wfh).toFixed(2))),
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
  const isWfh = leaveOrWfhType === 'Work From Home'

  if (isProbationLeave) {
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
    if (summary.remaining.wfh_quota < requestedValue) {
      throw new Error(`Work From Home (WFH) Quota Exceeded: Only ${summary.remaining.wfh_quota} remaining, but ${requestedValue} day(s) requested.`)
    }
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
  const supabase = createClient()

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
    const { data, error: fetchErr } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    
    if (!fetchErr && data) {
      current = data
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

  const effectiveEmpId = params.employee_id || current.employee_id
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
    formatted = dayOfWeek === 6 ? '04:00' : '08:00'
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

  const { data: updated, error: updateErr } = await supabase
    .from('attendance_records')
    .update(updatedData as any)
    .eq('id', id)
    .select()
    .single()

  if (updateErr || !updated) {
    throw new Error(updateErr?.message || 'Failed to update attendance record in database.')
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
  const supabase = createClient()
  const settings = await getAttendanceSettings()

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

  if (params.employee_id && (isLeave || isWfh)) {
    const leaveTypeToValidate = isWfh ? 'Work From Home' : (params.departure_status || 'Casual Leave')
    const leaveVal = parseLeaveValue(params.notes)
    await validateEmployeeLeaveQuotas(params.employee_id, params.attendance_date, leaveTypeToValidate, undefined, leaveVal)
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
    formatted = dayOfWeek === 6 ? '04:00' : '08:00'
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
    employee_id: params.employee_id,
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

  const { data, error } = await supabase
    .from('attendance_records')
    .upsert(newRecord, { onConflict: 'employee_id,attendance_date' })
    .select()
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'Failed to save attendance record.')
  }

  return data
}

export async function deleteAttendanceRecord(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('attendance_records').delete().eq('id', id)
  if (error) {
    throw new Error(error.message || 'Failed to delete attendance record from database')
  }
}

export async function bulkDeleteAttendanceRecords(params: {
  startDate: string
  endDate: string
  employeeId?: string
}): Promise<{ deletedCount: number }> {
  const supabase = createClient()
  let query = supabase
    .from('attendance_records')
    .delete({ count: 'exact' })
    .gte('attendance_date', params.startDate)
    .lte('attendance_date', params.endDate)

  if (params.employeeId && params.employeeId !== 'all') {
    query = query.eq('employee_id', params.employeeId)
  }

  const { data, error, count } = await query.select('id')

  if (error) {
    throw new Error(error.message || 'Failed to delete attendance records.')
  }

  const deletedCount = count !== null && count !== undefined ? count : (data?.length || 0)
  return { deletedCount }
}

// Deprecated no-op for backward compatibility
export async function syncAttendanceToSupabase(): Promise<{ syncedCount: number; error?: string }> {
  return { syncedCount: 0 }
}
