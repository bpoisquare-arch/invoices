'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, RotateCcw } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface DatePickerProps {
  value?: string
  onChange?: (date: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  dateFormat?: string // date-fns format, default 'dd/MM/yy'
  id?: string
  name?: string
  clearable?: boolean
  minYear?: number
  maxYear?: number
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

/**
 * Parses date strings in various formats:
 * - dd/MM/yy (e.g. 21/09/26 or 15/03/98)
 * - dd/MM/yyyy (e.g. 21/09/2026 or 15/03/1998)
 * - yyyy-MM-dd (e.g. 2026-09-21)
 */
function parseDateString(str: string): Date | undefined {
  if (!str || !str.trim()) return undefined
  const cleaned = str.trim()

  // 1. Match dd/MM/yy (e.g. 15/03/98 or 21/09/26)
  const dmy2 = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/)
  if (dmy2) {
    const day = parseInt(dmy2[1], 10)
    const month = parseInt(dmy2[2], 10) - 1
    let year = parseInt(dmy2[3], 10)
    year = year >= 50 ? 1900 + year : 2000 + year
    const d = new Date(year, month, day)
    if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
      return d
    }
  }

  // 2. Match dd/MM/yyyy
  const dmy4 = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmy4) {
    const day = parseInt(dmy4[1], 10)
    const month = parseInt(dmy4[2], 10) - 1
    const year = parseInt(dmy4[3], 10)
    const d = new Date(year, month, day)
    if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
      return d
    }
  }

  // 3. Match yyyy-MM-dd
  const ymd = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (ymd) {
    const year = parseInt(ymd[1], 10)
    const month = parseInt(ymd[2], 10) - 1
    const day = parseInt(ymd[3], 10)
    const d = new Date(year, month, day)
    if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
      return d
    }
  }

  const fallback = new Date(cleaned)
  if (!isNaN(fallback.getTime())) return fallback

  return undefined
}

export function DatePicker({
  value = '',
  onChange,
  placeholder = 'DD/MM/YY',
  className,
  disabled = false,
  dateFormat = 'dd/MM/yy',
  id,
  name,
  clearable = true,
  minYear = 1940,
  maxYear = 2045,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const selectedDate = React.useMemo(() => {
    return parseDateString(value)
  }, [value])

  const [displayYear, setDisplayYear] = React.useState<number>(() => {
    return selectedDate ? selectedDate.getFullYear() : new Date().getFullYear()
  })

  const [displayMonth, setDisplayMonth] = React.useState<number>(() => {
    return selectedDate ? selectedDate.getMonth() : new Date().getMonth()
  })

  // Sync calendar view when value changes or popover opens
  React.useEffect(() => {
    if (open) {
      if (selectedDate) {
        setDisplayYear(selectedDate.getFullYear())
        setDisplayMonth(selectedDate.getMonth())
      } else {
        const today = new Date()
        setDisplayYear(today.getFullYear())
        setDisplayMonth(today.getMonth())
      }
    }
  }, [open, selectedDate])

  const displayInputValue = React.useMemo(() => {
    if (!value) return ''
    if (selectedDate) {
      return format(selectedDate, dateFormat)
    }
    return value
  }, [value, selectedDate, dateFormat])

  const handleSelectDay = (day: number) => {
    const dateObj = new Date(displayYear, displayMonth, day)
    const formatted = format(dateObj, dateFormat)
    onChange?.(formatted)
    setOpen(false)
  }

  const handlePrevMonth = () => {
    if (displayMonth === 0) {
      setDisplayMonth(11)
      setDisplayYear((y) => Math.max(minYear, y - 1))
    } else {
      setDisplayMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (displayMonth === 11) {
      setDisplayMonth(0)
      setDisplayYear((y) => Math.min(maxYear, y + 1))
    } else {
      setDisplayMonth((m) => m + 1)
    }
  }

  const handleSelectToday = () => {
    const today = new Date()
    const formatted = format(today, dateFormat)
    onChange?.(formatted)
    setDisplayYear(today.getFullYear())
    setDisplayMonth(today.getMonth())
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange?.('')
  }

  // Generate years list
  const yearsList = React.useMemo(() => {
    const years: number[] = []
    for (let y = maxYear; y >= minYear; y--) {
      years.push(y)
    }
    return years
  }, [minYear, maxYear])

  // Calendar Grid Calculation
  const calendarDays = React.useMemo(() => {
    const firstDayIndex = new Date(displayYear, displayMonth, 1).getDay() // 0 = Sun
    const totalDaysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate()
    const prevMonthDays = new Date(displayYear, displayMonth, 0).getDate()

    const days: Array<{
      day: number
      isCurrentMonth: boolean
      isSelected: boolean
      isToday: boolean
    }> = []

    // 1. Previous month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        isSelected: false,
        isToday: false,
      })
    }

    // 2. Current month days
    const today = new Date()
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const isSel = Boolean(
        selectedDate &&
          selectedDate.getDate() === d &&
          selectedDate.getMonth() === displayMonth &&
          selectedDate.getFullYear() === displayYear
      )
      const isTod =
        today.getDate() === d &&
        today.getMonth() === displayMonth &&
        today.getFullYear() === displayYear

      days.push({
        day: d,
        isCurrentMonth: true,
        isSelected: isSel,
        isToday: isTod,
      })
    }

    // 3. Next month leading days to complete row grid (multiples of 7)
    const remaining = 7 - (days.length % 7)
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        days.push({
          day: i,
          isCurrentMonth: false,
          isSelected: false,
          isToday: false,
        })
      }
    }

    return days
  }, [displayYear, displayMonth, selectedDate])

  return (
    <Popover open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
      <PopoverTrigger asChild>
        <div
          id={id}
          className={cn(
            'group relative flex items-center w-full h-8.5 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-xs font-mono transition-all',
            'hover:border-cyan-500 hover:bg-slate-50/50 cursor-pointer',
            'focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500',
            disabled && 'opacity-50 pointer-events-none bg-slate-100',
            className
          )}
        >
          <CalendarIcon className="size-3.5 text-cyan-600 mr-2 shrink-0 group-hover:text-cyan-700 transition-colors" />

          <input
            type="text"
            name={name}
            readOnly
            disabled={disabled}
            value={displayInputValue}
            placeholder={placeholder}
            className="w-full bg-transparent text-xs text-slate-900 placeholder:text-slate-400 font-mono outline-none cursor-pointer"
          />

          {clearable && displayInputValue && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors shrink-0"
              title="Clear date"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      </PopoverTrigger>

      <PopoverContent
        className="w-72 p-3 bg-white border border-slate-200 shadow-2xl rounded-2xl z-50 text-slate-900"
        align="start"
      >
        {/* Month & Year Direct Selector Header */}
        <div className="flex items-center justify-between gap-1 mb-3 pb-2 border-b border-slate-100">
          {/* Previous Month Button */}
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Previous Month"
          >
            <ChevronLeft className="size-4" />
          </button>

          {/* Month & Year Dropdowns Group */}
          <div className="flex items-center gap-1.5">
            {/* Month Select */}
            <select
              value={displayMonth}
              onChange={(e) => setDisplayMonth(Number(e.target.value))}
              className="h-7 px-1.5 text-xs font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx}>
                  {name}
                </option>
              ))}
            </select>

            {/* Year Select */}
            <select
              value={displayYear}
              onChange={(e) => setDisplayYear(Number(e.target.value))}
              className="h-7 px-1.5 text-xs font-bold font-mono text-cyan-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              {yearsList.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Next Month Button */}
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Next Month"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {DAYS_OF_WEEK.map((d) => (
            <div
              key={d}
              className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-0.5"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {calendarDays.map((item, idx) => {
            if (!item.isCurrentMonth) {
              return (
                <div
                  key={idx}
                  className="size-7 flex items-center justify-center text-[11px] text-slate-300 select-none font-mono"
                >
                  {item.day}
                </div>
              )
            }

            return (
              <button
                type="button"
                key={idx}
                onClick={() => handleSelectDay(item.day)}
                className={cn(
                  'size-7 rounded-lg text-xs font-mono font-medium flex items-center justify-center transition-all cursor-pointer',
                  item.isSelected
                    ? 'bg-[#003D5C] text-white font-bold shadow-xs'
                    : item.isToday
                    ? 'bg-cyan-50 text-cyan-800 font-bold border border-cyan-300 hover:bg-cyan-100'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                {item.day}
              </button>
            )
          })}
        </div>

        {/* Footer Quick Actions */}
        <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100 text-[11px]">
          <button
            type="button"
            onClick={handleSelectToday}
            className="text-cyan-700 hover:text-cyan-900 font-bold hover:underline cursor-pointer"
          >
            Today
          </button>
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange?.('')
                setOpen(false)
              }}
              className="text-rose-600 hover:text-rose-700 font-semibold hover:underline cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default DatePicker
