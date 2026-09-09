import fs from 'fs'
import path from 'path'

export interface EmployeeDeduction {
  id: string
  employee_id: string
  month_year: string // format: "YYYY-MM", e.g. "2026-08"
  amount: number
  note_type?: string // e.g. "Previous Deduction", "Late penalty", "Advance", "Tax"
  notes?: string
  created_at: string
  updated_at: string
}

const DEDUCTIONS_FILE = path.join(process.cwd(), 'data', 'employee_deductions.json')

let inMemoryDeductions: EmployeeDeduction[] | null = null

function readDeductionsFile(): EmployeeDeduction[] {
  try {
    if (!fs.existsSync(DEDUCTIONS_FILE)) {
      return []
    }
    const raw = fs.readFileSync(DEDUCTIONS_FILE, 'utf-8')
    return JSON.parse(raw) || []
  } catch (error) {
    console.error('Error reading deductions file:', error)
    return []
  }
}

function writeDeductionsFile(deductions: EmployeeDeduction[]): void {
  try {
    const dir = path.dirname(DEDUCTIONS_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(DEDUCTIONS_FILE, JSON.stringify(deductions, null, 2), 'utf-8')
  } catch (error) {
    // Silent ignore on serverless read-only filesystem
  }
}

export async function getAllDeductions(): Promise<EmployeeDeduction[]> {
  const fileDeductions = readDeductionsFile()

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('attendance_audit_logs')
      .select('details')
      .eq('action', 'EMPLOYEE_DEDUCTIONS_STORE')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      console.warn('Database deductions fetch warning:', error.message)
    }

    if (data && data.details && Array.isArray(data.details)) {
      const dbDeductions = data.details as unknown as EmployeeDeduction[]
      // Merge: DB deductions take precedence
      const map = new Map<string, EmployeeDeduction>()
      fileDeductions.forEach((d) => {
        const key = `${d.employee_id}_${d.month_year}`.toLowerCase()
        map.set(key, d)
      })
      dbDeductions.forEach((d) => {
        const key = `${d.employee_id}_${d.month_year}`.toLowerCase()
        map.set(key, d)
      })
      const merged = Array.from(map.values())
      inMemoryDeductions = merged
      return merged
    }
  } catch (err) {
    console.error('Error fetching employee deductions from database:', err)
  }

  return inMemoryDeductions || fileDeductions
}

export async function getEmployeeDeduction(
  employeeId: string,
  monthYear: string
): Promise<EmployeeDeduction | null> {
  const deductions = await getAllDeductions()
  const found = deductions.find(
    (d) =>
      (d.employee_id === employeeId || d.employee_id.toLowerCase() === employeeId.toLowerCase()) &&
      d.month_year === monthYear
  )
  return found || null
}

export async function setEmployeeDeduction(params: {
  employeeId: string
  monthYear: string
  amount: number
  noteType?: string
  notes?: string
}): Promise<EmployeeDeduction> {
  const deductions = await getAllDeductions()
  const index = deductions.findIndex(
    (d) =>
      (d.employee_id === params.employeeId || d.employee_id.toLowerCase() === params.employeeId.toLowerCase()) &&
      d.month_year === params.monthYear
  )

  const now = new Date().toISOString()
  let result: EmployeeDeduction

  const noteTypeVal = params.noteType || params.notes || 'Other Deduction'

  if (index >= 0) {
    result = {
      ...deductions[index],
      amount: Math.max(0, Number(params.amount) || 0),
      note_type: noteTypeVal,
      notes: noteTypeVal,
      updated_at: now,
    }
    deductions[index] = result
  } else {
    result = {
      id: `ded_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      employee_id: params.employeeId,
      month_year: params.monthYear,
      amount: Math.max(0, Number(params.amount) || 0),
      note_type: noteTypeVal,
      notes: noteTypeVal,
      created_at: now,
      updated_at: now,
    }
    deductions.push(result)
  }

  inMemoryDeductions = deductions
  writeDeductionsFile(deductions)

  // Persist to Supabase Database
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { error } = await supabase.from('attendance_audit_logs').insert({
      action: 'EMPLOYEE_DEDUCTIONS_STORE',
      details: deductions as any,
    })

    if (error) {
      console.error('Failed to insert employee deductions to attendance_audit_logs:', error.message)
    }
  } catch (err) {
    console.error('Error in setEmployeeDeduction db write:', err)
  }

  return result
}

export async function getDeductionsForMonth(monthYear: string): Promise<EmployeeDeduction[]> {
  const deductions = await getAllDeductions()
  return deductions.filter((d) => d.month_year === monthYear)
}

export async function getEmployeeAllDeductions(employeeId: string): Promise<EmployeeDeduction[]> {
  const deductions = await getAllDeductions()
  const target = (employeeId || '').toLowerCase().trim()
  return deductions
    .filter((d) => (d.employee_id || '').toLowerCase().trim() === target)
    .sort((a, b) => b.month_year.localeCompare(a.month_year))
}

export async function deleteEmployeeDeduction(
  employeeId: string,
  monthYear: string
): Promise<boolean> {
  const deductions = await getAllDeductions()
  const targetEmp = (employeeId || '').toLowerCase().trim()
  const targetMonth = (monthYear || '').trim()

  const filtered = deductions.filter(
    (d) =>
      !((d.employee_id || '').toLowerCase().trim() === targetEmp && (d.month_year || '').trim() === targetMonth)
  )

  if (filtered.length === deductions.length) {
    return false
  }

  inMemoryDeductions = filtered
  writeDeductionsFile(filtered)

  // Persist deletion to Supabase Database
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { error } = await supabase.from('attendance_audit_logs').insert({
      action: 'EMPLOYEE_DEDUCTIONS_STORE',
      details: filtered as any,
    })

    if (error) {
      console.error('Failed to update employee deductions after delete in attendance_audit_logs:', error.message)
    }
  } catch (err) {
    console.error('Error in deleteEmployeeDeduction db write:', err)
  }

  return true
}
