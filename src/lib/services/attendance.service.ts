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
} from './attendance-calculator'

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
// 2. EMPLOYEE SERVICES
// ----------------------------------------------------

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

    let result = data
    if (params?.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim()
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.employee_id.toLowerCase().includes(q) ||
          e.designation.toLowerCase().includes(q)
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

    return data
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

export async function createEmployee(params: {
  name: string
  designation: string
}): Promise<{ employee: Employee; warning?: string }> {
  const name = params.name.trim()
  const designation = params.designation.trim()
  const normalizedName = normalizeEmployeeName(name)

  if (!name) throw new Error('Employee name is required.')
  if (!designation) throw new Error('Designation is required.')

  const dupCheck = await checkDuplicateEmployeeName(name)
  let warning: string | undefined
  if (dupCheck.exists) {
    warning = `Warning: An employee named "${name}" already exists (${dupCheck.employees[0].employee_id}). A new distinct employee ID has been generated.`
  }

  const employeeId = await generateNextEmployeeId()
  const supabase = createClient()
  const { data, error } = await supabase
    .from('employees')
    .insert({
      employee_id: employeeId,
      name,
      normalized_name: normalizedName,
      designation,
      is_active: true,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create employee in database')
  }

  return { employee: data, warning }
}

export async function updateEmployee(
  id: string,
  params: {
    name?: string
    designation?: string
    is_active?: boolean
  }
): Promise<Employee> {
  const supabase = createClient()
  const updateData: any = {
    updated_at: new Date().toISOString(),
  }

  if (params.name !== undefined) {
    updateData.name = params.name.trim()
    updateData.normalized_name = normalizeEmployeeName(params.name)
  }
  if (params.designation !== undefined) {
    updateData.designation = params.designation.trim()
  }
  if (params.is_active !== undefined) {
    updateData.is_active = params.is_active
  }

  const { data, error } = await supabase
    .from('employees')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'Failed to update employee in database')
  }

  return data
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
      query = query.eq('employee_id', params.employeeId)
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

    if (params.employeeId && params.employeeId !== 'all' && rec.employee_id !== params.employeeId) {
      return false
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

  const recordsWithEmp: AttendanceRecordWithEmployee[] = pagedRecords.map((r) => ({
    ...r,
    employee: empMap.get(r.employee_id) || null,
    raw_punches_parsed: Array.isArray(r.raw_punches) ? (r.raw_punches as unknown as RawPunch[]) : [],
  }))

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

  for (const r of records) {
    if (r.arrival_status === 'On Time Arrival') onTimeArrivals++
    else if (r.arrival_status === 'Late Arrival') lateArrivals++
    else if (r.arrival_status === 'Missing In Time') missingInTimes++

    if (r.departure_status === 'On Time Departure') onTimeDepartures++
    else if (r.departure_status === 'Early Departure') earlyDepartures++
    else if (r.departure_status === 'Missing Out Time') missingOutTimes++

    totalWorkingMinutes += r.total_working_minutes || 0
  }

  const totalDays = records.length
  const totalHours = Math.floor(totalWorkingMinutes / 60)
  const totalMins = totalWorkingMinutes % 60
  const formattedTotalHours = `${totalHours}h ${totalMins}m`

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
  duplicateStrategy: 'skip' | 'overwrite' = 'skip'
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

/**
 * Updates an attendance record's in/out times and date, recalculating statuses on the server
 */
export async function updateAttendanceRecord(
  id: string,
  params: {
    in_time?: string | null
    out_time?: string | null
    attendance_date?: string
  }
): Promise<AttendanceRecord> {
  const supabase = createClient()
  const { data: current, error: fetchErr } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchErr || !current) {
    throw new Error('Attendance record not found in database.')
  }

  const settings = await getAttendanceSettings()

  const dateToUse = params.attendance_date !== undefined ? params.attendance_date : current.attendance_date
  const inTimeToUse = params.in_time !== undefined ? params.in_time : current.in_time
  const outTimeToUse = params.out_time !== undefined ? params.out_time : current.out_time

  const parsedDate = parseDateString(dateToUse)
  const dayOfWeek = parsedDate ? parsedDate.dayOfWeek : 1
  const dayName = parsedDate ? parsedDate.dayName : current.day_of_week

  // Calculate new arrival, departure, working duration
  const arrivalStatus = calculateArrivalStatus(inTimeToUse, dayOfWeek, settings)
  const departureStatus = calculateDepartureStatus(outTimeToUse, dayOfWeek, settings)
  const { totalMinutes, formatted } = calculateWorkingDuration(inTimeToUse, outTimeToUse)

  const updatedData = {
    attendance_date: dateToUse,
    day_of_week: dayName,
    in_time: inTimeToUse,
    out_time: outTimeToUse,
    arrival_status: arrivalStatus,
    departure_status: departureStatus,
    total_working_minutes: totalMinutes,
    total_working_hours_formatted: formatted,
    updated_at: new Date().toISOString(),
  }

  const { data: updated, error: updateErr } = await supabase
    .from('attendance_records')
    .update(updatedData)
    .eq('id', id)
    .select()
    .single()

  if (updateErr || !updated) {
    throw new Error(updateErr?.message || 'Failed to update attendance record in database.')
  }

  return updated
}

export async function deleteAttendanceRecord(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('attendance_records').delete().eq('id', id)
  if (error) {
    throw new Error(error.message || 'Failed to delete attendance record from database')
  }
}

// Deprecated no-op for backward compatibility
export async function syncAttendanceToSupabase(): Promise<{ syncedCount: number; error?: string }> {
  return { syncedCount: 0 }
}
