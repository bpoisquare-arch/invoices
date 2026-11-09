'use client'

import React from 'react'
import { DAYS_OF_WEEK, DEFAULT_WORK_DAYS, DayOfWeek } from '@/types/database.types'
import { CalendarDays, Check, Sparkles } from 'lucide-react'

interface WorkingDaysSelectorProps {
  value?: string[]
  onChange: (days: string[]) => void
  disabled?: boolean
}

export function WorkingDaysSelector({
  value = DEFAULT_WORK_DAYS,
  onChange,
  disabled = false,
}: WorkingDaysSelectorProps) {
  const currentDays = Array.isArray(value) && value.length > 0 ? value : DEFAULT_WORK_DAYS

  const toggleDay = (day: string) => {
    if (disabled) return
    if (currentDays.includes(day)) {
      // Don't allow unselecting all days (must have at least 1 day)
      if (currentDays.length <= 1) return
      onChange(currentDays.filter((d) => d !== day))
    } else {
      // Keep order of DAYS_OF_WEEK
      const updated = [...currentDays, day]
      const sorted = DAYS_OF_WEEK.filter((d) => updated.includes(d))
      onChange(sorted as unknown as string[])
    }
  }

  const applyPreset = (preset: 'standard' | 'fiveDay' | 'fridayOnly' | 'all') => {
    if (disabled) return
    if (preset === 'standard') {
      onChange([...DEFAULT_WORK_DAYS])
    } else if (preset === 'fiveDay') {
      onChange(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'])
    } else if (preset === 'fridayOnly') {
      onChange(['Friday'])
    } else if (preset === 'all') {
      onChange([...DAYS_OF_WEEK])
    }
  }

  return (
    <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-slate-200/90 text-slate-800">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-bold text-[#003D5C] uppercase tracking-wider flex items-center gap-1.5">
          <CalendarDays className="size-3.5 text-[#009D9E]" />
          <span>Working Days Schedule</span>
        </label>
        <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-[#002D42] text-white">
          {currentDays.length} Day{currentDays.length !== 1 ? 's' : ''} / Week
        </span>
      </div>

      {/* 7 Day Pills */}
      <div className="grid grid-cols-7 gap-1.5 pt-1">
        {DAYS_OF_WEEK.map((day) => {
          const isSelected = currentDays.includes(day)
          const isWeekend = day === 'Saturday' || day === 'Sunday'
          return (
            <button
              key={day}
              type="button"
              disabled={disabled}
              onClick={() => toggleDay(day)}
              className={`py-1.5 px-1 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer border select-none ${
                isSelected
                  ? 'bg-[#002D42] text-white border-[#002D42] shadow-2xs hover:bg-[#003d59]'
                  : isWeekend
                  ? 'bg-amber-50/70 text-slate-400 border-amber-200/60 hover:border-amber-300 hover:text-slate-600'
                  : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600'
              }`}
              title={`${day}: Click to toggle working / off day`}
            >
              <span>{day.slice(0, 3)}</span>
              {isSelected ? (
                <Check className="size-3 text-cyan-300 stroke-[3]" />
              ) : (
                <span className="text-[9px] uppercase font-semibold text-slate-400">Off</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Quick 1-Click Presets */}
      <div className="flex items-center justify-between gap-2 pt-1 flex-wrap text-[11px]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Presets:
          </span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => applyPreset('standard')}
            className="px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-slate-300 text-slate-600 font-semibold cursor-pointer text-[10px]"
            title="Monday to Saturday (6-day standard week)"
          >
            Regular (Mon–Sat)
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => applyPreset('fiveDay')}
            className="px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-slate-300 text-slate-600 font-semibold cursor-pointer text-[10px]"
            title="Monday to Friday (Saturday off)"
          >
            5-Day (Mon–Fri)
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => applyPreset('fridayOnly')}
            className="px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-slate-300 text-slate-600 font-semibold cursor-pointer text-[10px]"
            title="Friday only (Part-time)"
          >
            Friday Only
          </button>
        </div>
      </div>

      <p className="text-[10px] text-slate-500 leading-tight">
        Unselected days will be treated as scheduled <strong className="text-slate-700">"Off Days"</strong> (no absent penalties or salary deduction). Default: Mon–Sat.
      </p>
    </div>
  )
}

