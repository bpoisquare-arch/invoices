export interface EmployeeMetadata {
  branch?: string | null
  salary?: number | null
  joining_date?: string | null
  name?: string
  designation?: string
  is_active?: boolean
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

export function readAllEmployeeMetadata(): Record<string, EmployeeMetadata> {
  const tools = getFsAndPath()
  const filePath = getFilePath()
  if (!tools || !filePath) return {}

  try {
    if (!tools.fs.existsSync(filePath)) {
      const dir = tools.path.dirname(filePath)
      if (!tools.fs.existsSync(dir)) {
        tools.fs.mkdirSync(dir, { recursive: true })
      }
      tools.fs.writeFileSync(filePath, JSON.stringify({}, null, 2), 'utf-8')
      return {}
    }
    const raw = tools.fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw || '{}')
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
    name?: string
    designation?: string
    is_active?: boolean
  }
): void {
  const tools = getFsAndPath()
  const filePath = getFilePath()
  if (!tools || !filePath) return

  try {
    const dir = tools.path.dirname(filePath)
    if (!tools.fs.existsSync(dir)) {
      tools.fs.mkdirSync(dir, { recursive: true })
    }
    const all = readAllEmployeeMetadata()
    const existing = all[idOrEmpId] || {}

    const updated: EmployeeMetadata = {
      ...existing,
      ...(meta.branch !== undefined ? { branch: meta.branch } : {}),
      ...(meta.salary !== undefined ? { salary: meta.salary } : {}),
      ...(meta.joining_date !== undefined ? { joining_date: meta.joining_date } : {}),
      ...(meta.name !== undefined ? { name: meta.name } : {}),
      ...(meta.designation !== undefined ? { designation: meta.designation } : {}),
      ...(meta.is_active !== undefined ? { is_active: meta.is_active } : {}),
    }

    all[idOrEmpId] = updated
    tools.fs.writeFileSync(filePath, JSON.stringify(all, null, 2), 'utf-8')
  } catch (err) {
    console.error('Error writing employee metadata file:', err)
  }
}
