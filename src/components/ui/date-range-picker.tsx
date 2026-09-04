'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface DateRangePickerProps {
  startDate?: string
  endDate?: string
  onStartDateChange?: (date: string) => void
  onEndDateChange?: (date: string) => void
  onRangeChange?: (start: string, end: string) => void
  className?: string
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onRangeChange,
  className,
}: DateRangePickerProps) {
  const [startOpen, setStartOpen] = React.useState(false)
  const [endOpen, setEndOpen] = React.useState(false)

  const handleStartSelect = (d: Date | undefined) => {
    if (d) {
      const formatted = format(d, 'yyyy-MM-dd')
      onStartDateChange?.(formatted)
      if (endDate && onRangeChange) {
        onRangeChange(formatted, endDate)
      }
      setStartOpen(false)
    }
  }

  const handleEndSelect = (d: Date | undefined) => {
    if (d) {
      const formatted = format(d, 'yyyy-MM-dd')
      onEndDateChange?.(formatted)
      if (startDate && onRangeChange) {
        onRangeChange(startDate, formatted)
      }
      setEndOpen(false)
    }
  }

  const displayStart = startDate
    ? format(new Date(startDate + 'T00:00:00'), 'dd/MM/yyyy')
    : ''
  const displayEnd = endDate
    ? format(new Date(endDate + 'T00:00:00'), 'dd/MM/yyyy')
    : ''

  return (
    <div id="date-range-picker" className={cn("flex items-center gap-2", className)}>
      {/* Start Date */}
      <div className="relative flex-1">
        <Popover open={startOpen} onOpenChange={setStartOpen}>
          <PopoverTrigger asChild>
            <div className="relative cursor-pointer group">
              <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none text-slate-400 group-hover:text-slate-600 transition-colors">
                <svg
                  className="w-4 h-4"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 10h16m-8-3V4M7 7V4m10 3V4M5 20h14a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1Zm3-7h.01v.01H8V13Zm4 0h.01v.01H12V13Zm4 0h.01v.01H16V13Zm-8 4h.01v.01H8V17Zm4 0h.01v.01H12V17Zm4 0h.01v.01H16V17Z"
                  />
                </svg>
              </div>
              <input
                id="datepicker-range-start"
                name="start"
                type="text"
                readOnly
                value={displayStart}
                className="block w-full ps-9 pe-3 py-2 bg-slate-50/60 hover:bg-white border border-slate-200 hover:border-[#009D9E] text-slate-900 text-xs font-mono font-medium rounded-lg focus:ring-2 focus:ring-[#003D5C] focus:border-[#003D5C] shadow-2xs placeholder:text-slate-400 cursor-pointer transition-all"
                placeholder="Select date start"
              />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-white border border-slate-200 shadow-xl rounded-xl z-50" align="start">
            <CalendarComponent
              mode="single"
              selected={startDate ? new Date(startDate + 'T00:00:00') : undefined}
              onSelect={handleStartSelect}
            />
          </PopoverContent>
        </Popover>
      </div>

      <span className="text-slate-400 text-xs font-semibold select-none px-1">to</span>

      {/* End Date */}
      <div className="relative flex-1">
        <Popover open={endOpen} onOpenChange={setEndOpen}>
          <PopoverTrigger asChild>
            <div className="relative cursor-pointer group">
              <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none text-slate-400 group-hover:text-slate-600 transition-colors">
                <svg
                  className="w-4 h-4"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 10h16m-8-3V4M7 7V4m10 3V4M5 20h14a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1Zm3-7h.01v.01H8V13Zm4 0h.01v.01H12V13Zm4 0h.01v.01H16V13Zm-8 4h.01v.01H8V17Zm4 0h.01v.01H12V17Zm4 0h.01v.01H16V17Z"
                  />
                </svg>
              </div>
              <input
                id="datepicker-range-end"
                name="end"
                type="text"
                readOnly
                value={displayEnd}
                className="block w-full ps-9 pe-3 py-2 bg-slate-50/60 hover:bg-white border border-slate-200 hover:border-[#009D9E] text-slate-900 text-xs font-mono font-medium rounded-lg focus:ring-2 focus:ring-[#003D5C] focus:border-[#003D5C] shadow-2xs placeholder:text-slate-400 cursor-pointer transition-all"
                placeholder="Select date end"
              />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-white border border-slate-200 shadow-xl rounded-xl z-50" align="start">
            <CalendarComponent
              mode="single"
              selected={endDate ? new Date(endDate + 'T00:00:00') : undefined}
              onSelect={handleEndSelect}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
