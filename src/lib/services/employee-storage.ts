import { EmployeeLeaveQuotas } from '@/lib/supabase/database.types'

export interface EmployeeMetadata {
  branch?: string | null
  salary?: number | null
  joining_date?: string | null
  is_old_staff?: boolean | null
  name?: string
  designation?: string
  email?: string | null
  is_active?: boolean
  leave_quotas?: EmployeeLeaveQuotas
}

function getFsAndPath() {
  if (typeof window !== 'undefined') return null
  try {
    const fs = require('fs')
    const path = require('path')
    return { fs, path }
  } catch {
    return null
  }
}

function getFilePath(): string | null {
  const tools = getFsAndPath()
  if (!tools) return null
  return tools.path.join(process.cwd(), 'data', 'employees_metadata.json')
}

// In-memory caches to reduce DB roundtrips and ensure instant synchronization
let inMemoryEmployeeMeta: Record<string, EmployeeMetadata> | null = null
let inMemoryHolidays: Record<string, string> | null = null

export function readAllEmployeeMetadata(): Record<string, EmployeeMetadata> {
  if (inMemoryEmployeeMeta) {
    return { ...inMemoryEmployeeMeta }
  }

  const tools = getFsAndPath()
  const filePath = getFilePath()
  if (!tools || !filePath) return {}

  try {
    if (!tools.fs.existsSync(filePath)) {
      const dir = tools.path.dirname(filePath)
      if (!tools.fs.existsSync(dir)) {
        tools.fs.mkdirSync(dir, { recursive: true })
      }
      try {
        tools.fs.writeFileSync(filePath, JSON.stringify({}, null, 2), 'utf-8')
      } catch {
        // Read-only filesystem ignore
      }
      return {}
    }
    const raw = tools.fs.readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(raw || '{}')
    inMemoryEmployeeMeta = parsed
    return parsed
  } catch (err) {
    console.error('Error reading employee metadata file:', err)
    return {}
  }
}

export function writeEmployeeMetadata(
  idOrEmpId: string,
  meta: {
    branch?: string | null
    salary?: number | null
    joining_date?: string | null
    is_old_staff?: boolean | null
    name?: string
    designation?: string
    email?: string | null
    is_active?: boolean
    leave_quotas?: EmployeeLeaveQuotas
  }
): void {
  const all = inMemoryEmployeeMeta ? { ...inMemoryEmployeeMeta } : readAllEmployeeMetadata()
  const existing = all[idOrEmpId] || {}

  const updated: EmployeeMetadata = {
    ...existing,
    ...(meta.branch !== undefined ? { branch: meta.branch } : {}),
    ...(meta.salary !== undefined ? { salary: meta.salary } : {}),
    ...(meta.joining_date !== undefined ? { joining_date: meta.joining_date } : {}),
    ...(meta.is_old_staff !== undefined ? { is_old_staff: meta.is_old_staff } : {}),
    ...(meta.name !== undefined ? { name: meta.name } : {}),
    ...(meta.designation !== undefined ? { designation: meta.designation } : {}),
    ...(meta.email !== undefined ? { email: meta.email } : {}),
    ...(meta.is_active !== undefined ? { is_active: meta.is_active } : {}),
    ...(meta.leave_quotas !== undefined ? { leave_quotas: meta.leave_quotas } : {}),
  }

  all[idOrEmpId] = updated
  inMemoryEmployeeMeta = all

  const tools = getFsAndPath()
  const filePath = getFilePath()
  if (!tools || !filePath) return

  try {
    const dir = tools.path.dirname(filePath)
    if (!tools.fs.existsSync(dir)) {
      tools.fs.mkdirSync(dir, { recursive: true })
    }
    tools.fs.writeFileSync(filePath, JSON.stringify(all, null, 2), 'utf-8')
  } catch (err) {
    // Silent ignore on serverless read-only filesystem (e.g. Vercel)
  }
}

function getHolidaysFilePath(): string | null {
  const tools = getFsAndPath()
  if (!tools) return null
  return tools.path.join(process.cwd(), 'data', 'gazetted_holidays.json')
}

export function readAllHolidays(): Record<string, string> {
  if (inMemoryHolidays) {
    return { ...inMemoryHolidays }
  }

  const tools = getFsAndPath()
  const filePath = getHolidaysFilePath()
  if (!tools || !filePath) return {}

  try {
    if (!tools.fs.existsSync(filePath)) {
      const dir = tools.path.dirname(filePath)
      if (!tools.fs.existsSync(dir)) {
        tools.fs.mkdirSync(dir, { recursive: true })
      }
      try {
        tools.fs.writeFileSync(filePath, JSON.stringify({}, null, 2), 'utf-8')
      } catch {
        // Read-only filesystem ignore
      }
      return {}
    }
    const raw = tools.fs.readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(raw || '{}')
    inMemoryHolidays = parsed
    return parsed
  } catch (err) {
    console.error('Error reading holidays file:', err)
    return {}
  }
}

export function writeHoliday(date: string, name?: string, isHoliday: boolean = true): Record<string, string> {
  const all = inMemoryHolidays ? { ...inMemoryHolidays } : readAllHolidays()
  if (isHoliday) {
    all[date] = name && name.trim() ? name.trim() : 'Gazetted Holiday'
  } else {
    delete all[date]
  }
  inMemoryHolidays = all

  const tools = getFsAndPath()
  const filePath = getHolidaysFilePath()
  if (!tools || !filePath) return all

  try {
    const dir = tools.path.dirname(filePath)
    if (!tools.fs.existsSync(dir)) {
      tools.fs.mkdirSync(dir, { recursive: true })
    }
    tools.fs.writeFileSync(filePath, JSON.stringify(all, null, 2), 'utf-8')
  } catch (err) {
    // Silent ignore on serverless read-only filesystem (e.g. Vercel)
  }
  return all
}

// ----------------------------------------------------
// ASYNC DATABASE-BACKED METADATA & HOLIDAYS HANDLERS
// ----------------------------------------------------

export async function getGazettedHolidays(): Promise<Record<string, string>> {
  const fileHolidays = readAllHolidays()

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    // 1. Try dedicated gazetted_holidays table first
    const { data: dbRows, error: tableError } = await supabase
      .from('gazetted_holidays')
      .select('*')

    if (!tableError && Array.isArray(dbRows) && dbRows.length > 0) {
      const holidaysMap: Record<string, string> = { ...fileHolidays }
      for (const row of dbRows) {
        if (row.date) {
          holidaysMap[row.date] = row.name || 'Gazetted Holiday'
        }
      }
      inMemoryHolidays = holidaysMap
      return holidaysMap
    }

    // 2. Fallback to audit logs if table is empty or not yet migrated
    const { data, error } = await supabase
      .from('attendance_audit_logs')
      .select('details')
      .eq('action', 'GAZETTED_HOLIDAYS_STORE')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (data && data.details && typeof data.details === 'object') {
      const dbHolidays = data.details as Record<string, string>
      inMemoryHolidays = { ...fileHolidays, ...dbHolidays }
      return inMemoryHolidays
    }
  } catch (err) {
    console.error('Error fetching gazetted holidays from database:', err)
  }

  return inMemoryHolidays || fileHolidays
}

export async function saveGazettedHoliday(
  date: string,
  name?: string,
  isHoliday: boolean = true
): Promise<Record<string, string>> {
  // 1. Fetch current holidays from DB / memory
  const currentMap = await getGazettedHolidays()
  const updatedMap = { ...currentMap }

  const holidayName = name && name.trim() ? name.trim() : 'Gazetted Holiday'

  if (isHoliday) {
    updatedMap[date] = holidayName
  } else {
    delete updatedMap[date]
  }

  inMemoryHolidays = updatedMap
  writeHoliday(date, name, isHoliday)

  // 2. Persist to Supabase Database (both dedicated table & audit log for backward compatibility)
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    if (isHoliday) {
      await supabase.from('gazetted_holidays').upsert({
        date,
        name: holidayName,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'date' })
    } else {
      await supabase.from('gazetted_holidays').delete().eq('date', date)
    }

    await supabase.from('attendance_audit_logs').insert({
      action: 'GAZETTED_HOLIDAYS_STORE',
      details: updatedMap as any,
    })
  } catch (err) {
    console.error('Error in saveGazettedHoliday db write:', err)
  }

  return updatedMap
}



