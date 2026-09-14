import fs from 'fs'
import path from 'path'

export interface EmployeeAdjustment {
  id: string
  employee_id: string
  month_year: string // format: "YYYY-MM", e.g. "2026-09"
  amount: number
  notes?: string
  created_at: string
  updated_at: string
}

const ADJUSTMENTS_FILE = path.join(process.cwd(), 'data', 'employee_adjustments.json')

let inMemoryAdjustments: EmployeeAdjustment[] | null = null

function readAdjustmentsFile(): EmployeeAdjustment[] {
  try {
    if (!fs.existsSync(ADJUSTMENTS_FILE)) {
      return []
    }
    const raw = fs.readFileSync(ADJUSTMENTS_FILE, 'utf-8')
    return JSON.parse(raw) || []
  } catch (error) {
    console.error('Error reading adjustments file:', error)
    return []
  }
}

function writeAdjustmentsFile(adjustments: EmployeeAdjustment[]): void {
  try {
    const dir = path.dirname(ADJUSTMENTS_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(ADJUSTMENTS_FILE, JSON.stringify(adjustments, null, 2), 'utf-8')
  } catch (error) {
    // Silent ignore on serverless read-only filesystem
  }
}

export async function getAllAdjustments(): Promise<EmployeeAdjustment[]> {
  const fileAdjs = readAdjustmentsFile()

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    // 1. Try dedicated employee_adjustments table first
    const { data: dbRows, error: tableError } = await supabase
      .from('employee_adjustments')
      .select('*')

    if (!tableError && Array.isArray(dbRows) && dbRows.length > 0) {
      const map = new Map<string, EmployeeAdjustment>()
      fileAdjs.forEach((a) => {
        const key = `${a.employee_id}_${a.month_year}`.toLowerCase()
        map.set(key, a)
      })
      dbRows.forEach((a: any) => {
        const key = `${a.employee_id}_${a.month_year}`.toLowerCase()
        map.set(key, {
          id: a.id,
          employee_id: a.employee_id,
          month_year: a.month_year,
          amount: Number(a.amount) || 0,
          notes: a.notes || '',
          created_at: a.created_at,
          updated_at: a.updated_at,
        })
      })
      const merged = Array.from(map.values())
      inMemoryAdjustments = merged
      return merged
    }

    // 2. Fallback to audit logs if table is empty
    const { data, error } = await supabase
      .from('attendance_audit_logs')
      .select('details')
      .eq('action', 'EMPLOYEE_ADJUSTMENTS_STORE')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (data && data.details && Array.isArray(data.details)) {
      const dbAdjs = data.details as unknown as EmployeeAdjustment[]
      const map = new Map<string, EmployeeAdjustment>()
      fileAdjs.forEach((a) => {
        const key = `${a.employee_id}_${a.month_year}`.toLowerCase()
        map.set(key, a)
      })
      dbAdjs.forEach((a) => {
        const key = `${a.employee_id}_${a.month_year}`.toLowerCase()
        map.set(key, a)
      })
      const merged = Array.from(map.values())
      inMemoryAdjustments = merged
      return merged
    }
  } catch (err) {
    console.error('Error fetching employee adjustments from database:', err)
  }

  return inMemoryAdjustments || fileAdjs
}

export async function getEmployeeAdjustment(
  employeeId: string,
  monthYear: string
): Promise<EmployeeAdjustment | null> {
  const adjustments = await getAllAdjustments()
  const found = adjustments.find(
    (a) =>
      (a.employee_id === employeeId || a.employee_id.toLowerCase() === employeeId.toLowerCase()) &&
      a.month_year === monthYear
  )
  return found || null
}

export async function setEmployeeAdjustment(params: {
  employeeId: string
  monthYear: string
  amount: number
  notes?: string
}): Promise<EmployeeAdjustment> {
  const adjustments = await getAllAdjustments()
  const index = adjustments.findIndex(
    (a) =>
      (a.employee_id === params.employeeId || a.employee_id.toLowerCase() === params.employeeId.toLowerCase()) &&
      a.month_year === params.monthYear
  )

  const now = new Date().toISOString()
  let result: EmployeeAdjustment

  if (index >= 0) {
    result = {
      ...adjustments[index],
      amount: Math.max(0, Number(params.amount) || 0),
      notes: params.notes || '',
      updated_at: now,
    }
    adjustments[index] = result
  } else {
    result = {
      id: `adj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      employee_id: params.employeeId,
      month_year: params.monthYear,
      amount: Math.max(0, Number(params.amount) || 0),
      notes: params.notes || '',
      created_at: now,
      updated_at: now,
    }
    adjustments.push(result)
  }

  inMemoryAdjustments = adjustments
  writeAdjustmentsFile(adjustments)

  // Persist to Supabase Database (both dedicated table and audit log)
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    await supabase.from('employee_adjustments').upsert({
      id: result.id,
      employee_id: result.employee_id,
      month_year: result.month_year,
      amount: result.amount,
      notes: result.notes || '',
      updated_at: now,
    }, { onConflict: 'employee_id,month_year' })

    await supabase.from('attendance_audit_logs').insert({
      action: 'EMPLOYEE_ADJUSTMENTS_STORE',
      details: adjustments as any,
    })
  } catch (err) {
    console.error('Error in setEmployeeAdjustment db write:', err)
  }

  return result
}

export async function getAdjustmentsForMonth(monthYear: string): Promise<EmployeeAdjustment[]> {
  const adjustments = await getAllAdjustments()
  return adjustments.filter((a) => a.month_year === monthYear)
}

export async function getEmployeeAllAdjustments(employeeId: string): Promise<EmployeeAdjustment[]> {
  const adjustments = await getAllAdjustments()
  const target = (employeeId || '').toLowerCase().trim()
  return adjustments
    .filter((a) => (a.employee_id || '').toLowerCase().trim() === target)
    .sort((a, b) => b.month_year.localeCompare(a.month_year))
}

export async function deleteEmployeeAdjustment(
  employeeId: string,
  monthYear: string
): Promise<boolean> {
  const adjustments = await getAllAdjustments()
  const targetEmp = (employeeId || '').toLowerCase().trim()
  const targetMonth = (monthYear || '').trim()

  const filtered = adjustments.filter(
    (a) =>
      !((a.employee_id || '').toLowerCase().trim() === targetEmp && (a.month_year || '').trim() === targetMonth)
  )

  if (filtered.length === adjustments.length) {
    return false
  }

  inMemoryAdjustments = filtered
  writeAdjustmentsFile(filtered)

  // Persist deletion to Supabase Database
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    await supabase
      .from('employee_adjustments')
      .delete()
      .eq('employee_id', employeeId)
      .eq('month_year', monthYear)

    await supabase.from('attendance_audit_logs').insert({
      action: 'EMPLOYEE_ADJUSTMENTS_STORE',
      details: filtered as any,
    })
  } catch (err) {
    console.error('Error in deleteEmployeeAdjustment db write:', err)
  }

  return true
}
