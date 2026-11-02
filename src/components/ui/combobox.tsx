"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search, X, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export interface ComboboxOption {
  value: string
  label: string
}

interface SearchableComboboxProps {
  options: ComboboxOption[]
  value: string
  onSelect: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  triggerClassName?: string
  popoverWidth?: string
  prefix?: string
  allowAddNew?: boolean
  addNewText?: string
  onAddNew?: (searchQuery?: string) => void
}

export function SearchableCombobox({
  options,
  value,
  onSelect,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  className,
  triggerClassName,
  popoverWidth = "w-[240px]",
  prefix,
  allowAddNew = false,
  addNewText = "+ Add New",
  onAddNew,
}: SearchableComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  const selectedOption = React.useMemo(() => {
    return options.find((opt) => opt.value === value)
  }, [options, value])

  const filteredOptions = React.useMemo(() => {
    if (!search.trim()) return options
    const query = search.toLowerCase()
    return options.filter((opt) => opt.label.toLowerCase().includes(query))
  }, [options, search])

  React.useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
    } else {
      setSearch("")
    }
  }, [open])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-expanded={open}
          className={cn(
            "flex h-9.5 w-full items-center justify-between rounded-lg border border-slate-300 bg-slate-50/50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100/70 hover:border-[#009D9E]/60 focus:outline-none focus:ring-2 focus:ring-[#009D9E]/20 focus:border-[#009D9E] disabled:cursor-not-allowed disabled:opacity-50 select-none",
            triggerClassName
          )}
        >
          <span className="truncate">
            {prefix && !(selectedOption ? selectedOption.label : placeholder).toLowerCase().startsWith(prefix.toLowerCase())
              ? `${prefix}${selectedOption ? selectedOption.label : placeholder}`
              : selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-1.5 h-3.5 w-3.5 shrink-0 opacity-50 text-slate-500" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className={cn("p-1.5 shadow-xl rounded-xl border border-slate-200 bg-white/95 backdrop-blur-md", popoverWidth, className)}
      >
        <div className="space-y-1.5">
          {/* Search Header */}
          <div className="relative flex items-center px-2 py-1 border-b border-slate-100 pb-1.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-slate-400 mr-2" />
            <input
              ref={inputRef}
              type="text"
              className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 outline-none font-medium"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto space-y-0.5 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="py-2.5 px-2 text-center text-xs space-y-2">
                <div className="text-slate-400 font-medium">{emptyText}</div>
                {allowAddNew && onAddNew && (
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      onAddNew(search.trim())
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#008080] font-semibold text-xs border border-teal-200 transition-colors shadow-2xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{search.trim() ? `Add "${search.trim()}"` : addNewText}</span>
                  </button>
                )}
              </div>
            ) : (
              <>
                {filteredOptions.map((option) => {
                  const isSelected = option.value === value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onSelect(option.value)
                        setOpen(false)
                      }}
                      className={cn(
                        "relative flex w-full cursor-pointer items-center justify-between rounded-lg py-2 px-2.5 text-xs font-medium transition-colors text-left select-none",
                        isSelected
                          ? "bg-teal-100/70 text-[#003D5C] font-bold"
                          : "text-slate-700 hover:bg-teal-50/80 hover:text-[#003D5C]"
                      )}
                    >
                      <span className="truncate">{option.label}</span>
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 shrink-0 text-[#009D9E] stroke-[2.5]" />
                      )}
                    </button>
                  )
                })}

                {/* If searching and no exact match, offer to add what was typed */}
                {allowAddNew && onAddNew && search.trim() && !options.some((o) => o.label.toLowerCase() === search.trim().toLowerCase()) && (
                  <div className="pt-1 mt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false)
                        onAddNew(search.trim())
                      }}
                      className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-teal-50/70 hover:bg-teal-100 text-[#008080] font-medium text-xs border border-teal-100 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">Add &ldquo;{search.trim()}&rdquo;</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Persistent Footer Button for Add New */}
          {allowAddNew && onAddNew && (
            <div className="pt-1.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  onAddNew(search.trim() || undefined)
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-[#008080] hover:text-[#005a5a] hover:bg-teal-50/70 rounded-md transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{addNewText}</span>
              </button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
