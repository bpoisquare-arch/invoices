'use client'

import React from 'react'
import { SlidersHorizontal, Check } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface ColumnOption {
  id: string
  label: string
  isVisible: boolean
  disabled?: boolean
}

export interface DataTableViewOptionsProps {
  columns: ColumnOption[]
  onToggleColumn: (columnId: string) => void
  onResetAll?: () => void
  align?: 'start' | 'center' | 'end'
  className?: string
  buttonClassName?: string
  title?: string
}

export function DataTableViewOptions({
  columns,
  onToggleColumn,
  onResetAll,
  align = 'end',
  className,
  buttonClassName,
  title = 'Toggle columns',
}: DataTableViewOptionsProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-9 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border-slate-300 shadow-2xs gap-2 px-3 rounded-lg flex items-center select-none cursor-pointer transition-colors',
            buttonClassName
          )}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />
          <span>View</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        sideOffset={6}
        className={cn(
          'w-48 p-1.5 rounded-xl border border-slate-200 bg-white shadow-lg text-slate-900 z-50',
          className
        )}
      >
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-xs font-semibold text-slate-700">{title}</span>
          {onResetAll && (
            <button
              type="button"
              onClick={onResetAll}
              className="text-[10px] text-[#009D9E] hover:underline font-semibold cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
        <div className="h-px bg-slate-100 my-1" />
        <div className="space-y-0.5 max-h-64 overflow-y-auto">
          {columns.map((col) => (
            <button
              key={col.id}
              type="button"
              disabled={col.disabled}
              onClick={() => onToggleColumn(col.id)}
              className={cn(
                'w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors text-left cursor-pointer select-none',
                col.disabled
                  ? 'opacity-50 cursor-not-allowed text-slate-400'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <span className="truncate pr-2">{col.label}</span>
              <Check
                className={cn(
                  'w-4 h-4 text-slate-900 stroke-[2.5] shrink-0 transition-opacity',
                  col.isVisible ? 'opacity-100' : 'opacity-0'
                )}
              />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default DataTableViewOptions
