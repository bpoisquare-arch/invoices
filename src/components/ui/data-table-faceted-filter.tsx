'use client'

import React from 'react'
import { Filter, Check } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface FacetedFilterOption {
  id: string
  label: string
  count?: number
  icon?: React.ReactNode
  colorDot?: string
  isSelected: boolean
}

export interface DataTableFacetedFilterProps {
  title: string
  icon?: React.ReactNode
  options: FacetedFilterOption[]
  onToggleOption: (id: string) => void
  onClear?: () => void
  align?: 'start' | 'center' | 'end'
  className?: string
  buttonClassName?: string
}

export function DataTableFacetedFilter({
  title,
  icon,
  options,
  onToggleOption,
  onClear,
  align = 'end',
  className,
  buttonClassName,
}: DataTableFacetedFilterProps) {
  const selectedCount = options.filter((o) => o.isSelected).length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-9 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border-slate-300 shadow-2xs gap-2 px-3 rounded-lg flex items-center select-none cursor-pointer transition-colors',
            selectedCount > 0 && 'border-[#009D9E]/60 bg-[#009D9E]/5 text-[#007A7A]',
            buttonClassName
          )}
        >
          {icon || <Filter className="w-3.5 h-3.5 text-slate-600" />}
          <span>{title}</span>
          {selectedCount > 0 && (
            <span className="ml-0.5 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-[#009D9E] text-white">
              {selectedCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        sideOffset={6}
        className={cn(
          'w-56 p-1.5 rounded-xl border border-slate-200 bg-white shadow-lg text-slate-900 z-50',
          className
        )}
      >
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-xs font-semibold text-slate-700">{title}</span>
          {selectedCount > 0 && onClear && (
            <button
              type="button"
              onClick={onClear}
              className="text-[10px] text-rose-600 hover:text-rose-700 hover:underline font-semibold cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
        <div className="h-px bg-slate-100 my-1" />
        <div className="space-y-0.5 max-h-64 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onToggleOption(option.id)}
              className={cn(
                'w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors text-left cursor-pointer select-none',
                option.isSelected
                  ? 'bg-slate-100/90 text-slate-900 font-semibold'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <div className="flex items-center gap-2 truncate pr-2">
                {option.colorDot && (
                  <span className={cn('w-2 h-2 rounded-full shrink-0', option.colorDot)} />
                )}
                {option.icon}
                <span className="truncate">{option.label}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                {option.count !== undefined && (
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-slate-200/80 text-slate-600">
                    {option.count}
                  </span>
                )}
                <Check
                  className={cn(
                    'w-4 h-4 text-slate-900 stroke-[2.5] transition-opacity',
                    option.isSelected ? 'opacity-100' : 'opacity-0'
                  )}
                />
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default DataTableFacetedFilter
