import fs from 'fs'
import path from 'path'

export interface EmployeeCommission {
  id: string
  employee_id: string
  month_year: string // format: "YYYY-MM", e.g. "2026-08"
  amount: number
  notes?: string
  created_at: string
  updated_at: string
}

const COMMISSIONS_FILE = path.join(process.cwd(), 'data', 'employee_commissions.json')

let inMemoryCommissions: EmployeeCommission[] | null = null

function readCommissionsFile(): EmployeeCommission[] {
  try {
    if (!fs.existsSync(COMMISSIONS_FILE)) {
      return []
    }
    const raw = fs.readFileSync(COMMISSIONS_FILE, 'utf-8')
    return JSON.parse(raw) || []
  } catch (error) {
    console.error('Error reading commissions file:', error)
    return []
  }
}

function writeCommissionsFile(commissions: EmployeeCommission[]): void {
  try {
    const dir = path.dirname(COMMISSIONS_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(COMMISSIONS_FILE, JSON.stringify(commissions, null, 2), 'utf-8')
  } catch (error) {
    // Silent ignore on serverless read-only filesystem (e.g. Vercel)
  }
}

export async function getAllCommissions(): Promise<EmployeeCommission[]> {
  const fileComms = readCommissionsFile()

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('attendance_audit_logs')
      .select('details')
      .eq('action', 'EMPLOYEE_COMMISSIONS_STORE')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      console.warn('Database commissions fetch warning:', error.message)
    }

    if (data && data.details && Array.isArray(data.details)) {
      const dbComms = data.details as unknown as EmployeeCommission[]
      // Merge: DB commissions take precedence
      const map = new Map<string, EmployeeCommission>()
      fileComms.forEach((c) => {
        const key = `${c.employee_id}_${c.month_year}`.toLowerCase()
        map.set(key, c)
      })
      dbComms.forEach((c) => {
        const key = `${c.employee_id}_${c.month_year}`.toLowerCase()
        map.set(key, c)
      })
      const merged = Array.from(map.values())
      inMemoryCommissions = merged
      return merged
    }
  } catch (err) {
    console.error('Error fetching employee commissions from database:', err)
  }

  return inMemoryCommissions || fileComms
}

export async function getEmployeeCommission(
  employeeId: string,
  monthYear: string
): Promise<EmployeeCommission | null> {
  const commissions = await getAllCommissions()
  const found = commissions.find(
    (c) =>
      (c.employee_id === employeeId || c.employee_id.toLowerCase() === employeeId.toLowerCase()) &&
      c.month_year === monthYear
  )
  return found || null
}

export async function setEmployeeCommission(params: {
  employeeId: string
  monthYear: string
  amount: number
  notes?: string
}): Promise<EmployeeCommission> {
  const commissions = await getAllCommissions()
  const index = commissions.findIndex(
    (c) =>
      (c.employee_id === params.employeeId || c.employee_id.toLowerCase() === params.employeeId.toLowerCase()) &&
      c.month_year === params.monthYear
  )

  const now = new Date().toISOString()
  let result: EmployeeCommission

  if (index >= 0) {
    result = {
      ...commissions[index],
      amount: Math.max(0, Number(params.amount) || 0),
      notes: params.notes || '',
      updated_at: now,
    }
    commissions[index] = result
  } else {
    result = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      employee_id: params.employeeId,
      month_year: params.monthYear,
      amount: Math.max(0, Number(params.amount) || 0),
      notes: params.notes || '',
      created_at: now,
      updated_at: now,
    }
    commissions.push(result)
  }

  inMemoryCommissions = commissions
  writeCommissionsFile(commissions)

  // Persist to Supabase Database
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { error } = await supabase.from('attendance_audit_logs').insert({
      action: 'EMPLOYEE_COMMISSIONS_STORE',
      details: commissions as any,
    })

    if (error) {
      console.error('Failed to insert employee commissions to attendance_audit_logs:', error.message)
    }
  } catch (err) {
    console.error('Error in setEmployeeCommission db write:', err)
  }

  return result
}

export async function getCommissionsForMonth(monthYear: string): Promise<EmployeeCommission[]> {
  const commissions = await getAllCommissions()
  return commissions.filter((c) => c.month_year === monthYear)
}

export async function getEmployeeAllCommissions(employeeId: string): Promise<EmployeeCommission[]> {
  const commissions = await getAllCommissions()
  const target = (employeeId || '').toLowerCase().trim()
  return commissions
    .filter((c) => (c.employee_id || '').toLowerCase().trim() === target)
    .sort((a, b) => b.month_year.localeCompare(a.month_year))
}

export async function deleteEmployeeCommission(
  employeeId: string,
  monthYear: string
): Promise<boolean> {
  const commissions = await getAllCommissions()
  const targetEmp = (employeeId || '').toLowerCase().trim()
  const targetMonth = (monthYear || '').trim()

  const filtered = commissions.filter(
    (c) =>
      !((c.employee_id || '').toLowerCase().trim() === targetEmp && (c.month_year || '').trim() === targetMonth)
  )

  if (filtered.length === commissions.length) {
    return false // Nothing deleted
  }

  inMemoryCommissions = filtered
  writeCommissionsFile(filtered)

  // Persist deletion to Supabase Database
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { error } = await supabase.from('attendance_audit_logs').insert({
      action: 'EMPLOYEE_COMMISSIONS_STORE',
      details: filtered as any,
    })

    if (error) {
      console.error('Failed to update employee commissions after delete in attendance_audit_logs:', error.message)
    }
  } catch (err) {
    console.error('Error in deleteEmployeeCommission db write:', err)
  }

  return true
}


