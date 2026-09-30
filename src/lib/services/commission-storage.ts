import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'

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
    // Silent ignore
  }
}

export async function getAllCommissions(): Promise<EmployeeCommission[]> {
  const fileComms = readCommissionsFile()

  try {
    const dbRows = await prisma.employeeCommission.findMany()

    if (Array.isArray(dbRows) && dbRows.length > 0) {
      const map = new Map<string, EmployeeCommission>()
      fileComms.forEach((c) => {
        const key = `${c.employee_id}_${c.month_year}`.toLowerCase()
        map.set(key, c)
      })
      dbRows.forEach((c: any) => {
        const key = `${c.employeeId}_${c.monthYear}`.toLowerCase()
        map.set(key, {
          id: c.id,
          employee_id: c.employeeId,
          month_year: c.monthYear,
          amount: Number(c.amount) || 0,
          notes: c.notes || '',
          created_at: c.createdAt instanceof Date ? c.createdAt.toISOString() : String(c.createdAt),
          updated_at: c.updatedAt instanceof Date ? c.updatedAt.toISOString() : String(c.updatedAt),
        })
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

  try {
    await prisma.employeeCommission.upsert({
      where: {
        employeeId_monthYear: {
          employeeId: result.employee_id,
          monthYear: result.month_year,
        },
      },
      update: {
        amount: result.amount,
        notes: result.notes || '',
      },
      create: {
        id: result.id,
        employeeId: result.employee_id,
        monthYear: result.month_year,
        amount: result.amount,
        notes: result.notes || '',
      },
    })
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
    return false
  }

  inMemoryCommissions = filtered
  writeCommissionsFile(filtered)

  try {
    await prisma.employeeCommission.deleteMany({
      where: {
        employeeId: employeeId,
        monthYear: monthYear,
      },
    })
  } catch (err) {
    console.error('Error in deleteEmployeeCommission db write:', err)
  }

  return true
}
