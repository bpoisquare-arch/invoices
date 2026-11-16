'use client'

import React from 'react'
import { format } from 'date-fns'
import { CalendarDays, Check, RotateCcw } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export interface MonthToggleSelectorProps {
  startMonth?: string // YYYY-MM
  endMonth?: string // YYYY-MM
  excludedMonths: string[] // Array of YYYY-MM
  onChange: (excludedMonths: string[]) => void
}

export function getMonthsBetween(startMonthStr?: string, endMonthStr?: string): string[] {
  if (!startMonthStr || !endMonthStr || startMonthStr.length !== 7 || endMonthStr.length !== 7) {
    return []
  }
  const [sy, sm] = startMonthStr.split('-').map(Number)
  const [ey, em] = endMonthStr.split('-').map(Number)
  if (isNaN(sy) || isNaN(sm) || isNaN(ey) || isNaN(em)) return []

  const startIdx = sy * 12 + (sm - 1)
  const endIdx = ey * 12 + (em - 1)
  if (endIdx < startIdx) return [startMonthStr]

  const months: string[] = []
  for (let idx = startIdx; idx <= endIdx; idx++) {
    const y = Math.floor(idx / 12)
    const m = (idx % 12) + 1
    months.push(`${y}-${m < 10 ? '0' : ''}${m}`)
  }
  return months
}

export function formatMonthToggleLabel(monthKey: string): string {
  try {
    const [y, m] = monthKey.split('-').map(Number)
    if (isNaN(y) || isNaN(m)) return monthKey
    const d = new Date(y, m - 1, 1)
    return format(d, 'MMM yyyy')
  } catch {
    return monthKey
  }
}

export default function MonthToggleSelector({
  startMonth,
  endMonth,
  excludedMonths = [],
  onChange,
}: MonthToggleSelectorProps) {
  const months = React.useMemo(() => {
    return getMonthsBetween(startMonth, endMonth)
  }, [startMonth, endMonth])

  if (months.length === 0) {
    return null
  }

  const excludedSet = new Set(excludedMonths)
  const activeCount = months.filter((m) => !excludedSet.has(m)).length
  const skippedCount = months.length - activeCount

  const handleToggle = (monthKey: string) => {
    const isCurrentlyActive = !excludedSet.has(monthKey)
    if (isCurrentlyActive) {
      // Prevent excluding all months; at least 1 month must remain active
      if (activeCount <= 1) {
        return
      }
      onChange([...excludedMonths, monthKey])
    } else {
      onChange(excludedMonths.filter((m) => m !== monthKey))
    }
  }

  const handleResetAll = () => {
    // Keep only exclusions that aren't in current months, or clear all
    onChange([])
  }

  return (
    <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-lg space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="w-4 h-4 text-[#009D9E]" />
          <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px]">
            Schedule Months
          </Label>
          <span className="text-[11px] font-semibold text-slate-500">
            ({activeCount} of {months.length} Active{skippedCount > 0 ? `, ${skippedCount} Skipped` : ''})
          </span>
        </div>

        {skippedCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetAll}
            className="h-6 text-[11px] font-semibold text-[#009D9E] hover:text-[#007A7B] hover:bg-[#009D9E]/10 px-2 py-0 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Include All Months
          </Button>
        )}
      </div>

      <p className="text-[10px] text-slate-500 leading-normal">
        Click on any month to skip or include it in the installment schedule. Unselected months will be omitted from the table, and the total fee will be divided equally among the remaining active months.
      </p>

      {/* Month Toggle Buttons */}
      <div className="flex flex-wrap gap-2 pt-0.5">
        {months.map((monthKey) => {
          const isActive = !excludedSet.has(monthKey)
          const label = formatMonthToggleLabel(monthKey)

          return (
            <button
              key={monthKey}
              type="button"
              onClick={() => handleToggle(monthKey)}
              title={
                isActive
                  ? activeCount <= 1
                    ? 'At least one month must remain active'
                    : `Click to skip ${label}`
                  : `Click to include ${label}`
              }
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer select-none ${
                isActive
                  ? 'bg-[#009D9E] text-white border-[#009D9E] shadow-2xs hover:bg-[#008687] hover:border-[#008687]'
                  : 'bg-white text-slate-400 border-dashed border-slate-300 hover:bg-slate-100 hover:text-slate-600 hover:border-slate-400'
              }`}
            >
              {isActive ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{label}</span>
                </>
              ) : (
                <>
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-rose-100 text-rose-600 px-1 py-0.5 rounded-xs leading-none">
                    SKIP
                  </span>
                  <span className="line-through decoration-rose-400">{label}</span>
                </>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
