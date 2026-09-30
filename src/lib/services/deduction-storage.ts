import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'

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
    const dbRows = await prisma.employeeDeduction.findMany()

    if (Array.isArray(dbRows) && dbRows.length > 0) {
      const map = new Map<string, EmployeeDeduction>()
      fileDeductions.forEach((d) => {
        const key = `${d.employee_id}_${d.month_year}`.toLowerCase()
        map.set(key, d)
      })
      dbRows.forEach((d: any) => {
        const key = `${d.employeeId}_${d.monthYear}`.toLowerCase()
        map.set(key, {
          id: d.id,
          employee_id: d.employeeId,
          month_year: d.monthYear,
          amount: Number(d.amount) || 0,
          note_type: d.noteType || d.notes || 'Other Deduction',
          notes: d.notes || d.noteType || 'Other Deduction',
          created_at: d.createdAt instanceof Date ? d.createdAt.toISOString() : String(d.createdAt),
          updated_at: d.updatedAt instanceof Date ? d.updatedAt.toISOString() : String(d.updatedAt),
        })
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

  try {
    await prisma.employeeDeduction.upsert({
      where: {
        employeeId_monthYear: {
          employeeId: result.employee_id,
          monthYear: result.month_year,
        },
      },
      update: {
        amount: result.amount,
        noteType: result.note_type,
        notes: result.notes || '',
      },
      create: {
        id: result.id,
        employeeId: result.employee_id,
        monthYear: result.month_year,
        amount: result.amount,
        noteType: result.note_type,
        notes: result.notes || '',
      },
    })
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

  try {
    await prisma.employeeDeduction.deleteMany({
      where: {
        employeeId: employeeId,
        monthYear: monthYear,
      },
    })
  } catch (err) {
    console.error('Error in deleteEmployeeDeduction db write:', err)
  }

  return true
}
