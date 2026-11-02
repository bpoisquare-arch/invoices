import fs from 'fs'
import path from 'path'
import { EMPLOYEE_DESIGNATIONS } from '@/lib/constants/designations'
import { readAllEmployeeMetadata } from './employee-storage'

function getFsAndPath() {
  if (typeof window !== 'undefined') return null
  try {
    const fsMod = require('fs')
    const pathMod = require('path')
    return { fs: fsMod, path: pathMod }
  } catch {
    return null
  }
}

function getFilePath(): string | null {
  const tools = getFsAndPath()
  if (!tools) return null
  return tools.path.join(process.cwd(), 'data', 'custom_designations.json')
}

let inMemoryCustomDesignations: string[] | null = null

export function readCustomDesignations(): string[] {
  if (inMemoryCustomDesignations) {
    return [...inMemoryCustomDesignations]
  }

  const tools = getFsAndPath()
  const filePath = getFilePath()
  if (!tools || !filePath) return []

  try {
    if (!tools.fs.existsSync(filePath)) {
      const dir = tools.path.dirname(filePath)
      if (!tools.fs.existsSync(dir)) {
        tools.fs.mkdirSync(dir, { recursive: true })
      }
      try {
        tools.fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf-8')
      } catch {
        // Read-only filesystem ignore
      }
      inMemoryCustomDesignations = []
      return []
    }

    const raw = tools.fs.readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(raw || '[]')
    if (Array.isArray(parsed)) {
      inMemoryCustomDesignations = parsed.map((s) => String(s).trim()).filter(Boolean)
      return [...inMemoryCustomDesignations]
    }
  } catch (err) {
    console.error('Error reading custom designations file:', err)
  }

  inMemoryCustomDesignations = []
  return []
}

export function writeCustomDesignations(list: string[]): void {
  inMemoryCustomDesignations = list
  const tools = getFsAndPath()
  const filePath = getFilePath()
  if (!tools || !filePath) return

  try {
    const dir = tools.path.dirname(filePath)
    if (!tools.fs.existsSync(dir)) {
      tools.fs.mkdirSync(dir, { recursive: true })
    }
    tools.fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf-8')
  } catch (err) {
    // Silent ignore on serverless read-only filesystem
  }
}

export async function getAllDesignations(): Promise<string[]> {
  const custom = readCustomDesignations()
  const set = new Set<string>()

  // 1. Base standard designations
  EMPLOYEE_DESIGNATIONS.forEach((d) => {
    if (d && d.trim()) set.add(d.trim())
  })

  // 2. Custom designations saved by users
  custom.forEach((d) => {
    if (d && d.trim()) set.add(d.trim())
  })

  // 3. Any designations already used by employees in metadata
  try {
    const meta = readAllEmployeeMetadata()
    Object.values(meta).forEach((emp) => {
      if (emp?.designation && emp.designation.trim()) {
        set.add(emp.designation.trim())
      }
    })
  } catch {
    // Ignore
  }

  // 4. Also check Prisma DB employees if available
  try {
    const { prisma } = await import('@/lib/prisma')
    const dbEmployees = await prisma.employee.findMany({
      select: { designation: true },
      distinct: ['designation'],
    })
    dbEmployees.forEach((e) => {
      if (e.designation && e.designation.trim()) {
        set.add(e.designation.trim())
      }
    })
  } catch {
    // Database may be offline or in file-only mode
  }

  return Array.from(set).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  )
}

export async function addCustomDesignation(
  name: string
): Promise<{ success: boolean; designations: string[]; added?: string; error?: string }> {
  const trimmed = (name || '').trim()
  if (!trimmed) {
    return {
      success: false,
      designations: await getAllDesignations(),
      error: 'Designation name is required.',
    }
  }

  const all = await getAllDesignations()
  const existing = all.find((d) => d.toLowerCase() === trimmed.toLowerCase())
  if (existing) {
    return {
      success: true,
      designations: all,
      added: existing,
    }
  }

  const custom = readCustomDesignations()
  custom.push(trimmed)
  writeCustomDesignations(custom)

  const updatedAll = await getAllDesignations()
  return {
    success: true,
    designations: updatedAll,
    added: trimmed,
  }
}
