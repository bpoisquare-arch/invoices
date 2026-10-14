import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats any date string, number, or Date object to DD/MM/YY format.
 * 100% safe against timezone offset bugs and invalid values.
 */
export function formatToDDMMYY(val?: string | number | null | Date): string {
  if (!val && val !== 0) return '-'
  if (typeof val === 'string') {
    const s = val.trim()
    if (!s || s === '-' || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') return '-'

    // 1. Match YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
    const ymdMatch = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
    if (ymdMatch) {
      const year = ymdMatch[1].slice(-2)
      const month = ymdMatch[2].padStart(2, '0')
      const day = ymdMatch[3].padStart(2, '0')
      return `${day}/${month}/${year}`
    }

    // 2. Match DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const dmy4Match = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/)
    if (dmy4Match) {
      const day = dmy4Match[1].padStart(2, '0')
      const month = dmy4Match[2].padStart(2, '0')
      const year = dmy4Match[3].slice(-2)
      return `${day}/${month}/${year}`
    }

    // 3. Match DD/MM/YY or DD-MM-YY or DD.MM.YY
    const dmy2Match = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})$/)
    if (dmy2Match) {
      const day = dmy2Match[1].padStart(2, '0')
      const month = dmy2Match[2].padStart(2, '0')
      const year = dmy2Match[3]
      return `${day}/${month}/${year}`
    }

    // 4. Excel serial number as string
    if (/^\d{5}$/.test(s)) {
      const num = parseInt(s, 10)
      const d = new Date((num - 25569) * 86400 * 1000)
      if (!isNaN(d.getTime())) {
        const day = String(d.getUTCDate()).padStart(2, '0')
        const month = String(d.getUTCMonth() + 1).padStart(2, '0')
        const year = String(d.getUTCFullYear()).slice(-2)
        return `${day}/${month}/${year}`
      }
    }

    // 5. Fallback Date parse
    const parsed = new Date(s)
    if (!isNaN(parsed.getTime())) {
      const day = String(parsed.getDate()).padStart(2, '0')
      const month = String(parsed.getMonth() + 1).padStart(2, '0')
      const year = String(parsed.getFullYear()).slice(-2)
      return `${day}/${month}/${year}`
    }

    return s
  }

  if (typeof val === 'number') {
    // Excel serial number
    if (val > 20000 && val < 60000) {
      const d = new Date((val - 25569) * 86400 * 1000)
      if (!isNaN(d.getTime())) {
        const day = String(d.getUTCDate()).padStart(2, '0')
        const month = String(d.getUTCMonth() + 1).padStart(2, '0')
        const year = String(d.getUTCFullYear()).slice(-2)
        return `${day}/${month}/${year}`
      }
    }
  }

  if (val instanceof Date && !isNaN(val.getTime())) {
    const day = String(val.getDate()).padStart(2, '0')
    const month = String(val.getMonth() + 1).padStart(2, '0')
    const year = String(val.getFullYear()).slice(-2)
    return `${day}/${month}/${year}`
  }

  return '-'
}
