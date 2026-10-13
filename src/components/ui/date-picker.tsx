'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface DatePickerProps {
  value?: string
  onChange?: (date: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  dateFormat?: string
  id?: string
  name?: string
  clearable?: boolean
  minYear?: number
  maxYear?: number
}

/**
 * Converts various date formats (DD/MM/YYYY, DD/MM/YY, ISO, etc.) to YYYY-MM-DD
 * required by HTML5 <input type="date" />
 */
function toISODate(str?: string | null): string {
  if (!str || !str.trim()) return ''
  const cleaned = str.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned
  }
  const dmy = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
  if (dmy) {
    const day = dmy[1].padStart(2, '0')
    const month = dmy[2].padStart(2, '0')
    let year = dmy[3]
    if (year.length === 2) {
      const yNum = parseInt(year, 10)
      year = String(yNum >= 50 ? 1900 + yNum : 2000 + yNum)
    }
    return `${year}-${month}-${day}`
  }
  const d = new Date(cleaned)
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  return ''
}

export function DatePicker({
  value = '',
  onChange,
  className,
  disabled = false,
  id,
  name,
}: DatePickerProps) {
  const isoValue = React.useMemo(() => toISODate(value), [value])

  return (
    <Input
      id={id}
      name={name}
      type="date"
      value={isoValue}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.value)}
      className={cn(
        'h-9 text-xs font-mono font-medium text-slate-900 bg-white border border-slate-200 rounded-xl shadow-2xs focus:border-[#009D9E] focus:ring-1 focus:ring-[#009D9E]',
        className
      )}
    />
  )
}

export default DatePicker
