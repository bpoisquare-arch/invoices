'use client'

import React, { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Search,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Eye,
  Edit2,
  Trash2,
  Copy,
  Download,
  Filter,
  Layers,
  GraduationCap,
  Building2,
  Calendar,
  Check,
  RotateCcw,
  AlertTriangle,
  Loader2,
  PlusCircle,
  UploadCloud,
} from 'lucide-react'
import type { AimtReportRecord } from '@/lib/supabase/database.types'
import TablePagination from '@/components/ui/table-pagination'

interface ReportDataTableProps {
  records: AimtReportRecord[]
  isLoading?: boolean
  selectedIds: string[]
  onSelectChange: (ids: string[]) => void
  onViewRecord: (record: AimtReportRecord) => void
  onAddEntry?: () => void
  onImportExcel?: () => void
  onEditRecord?: (record: AimtReportRecord) => void
  onDeleteRecord?: (record: AimtReportRecord) => Promise<void>
  onDeleteSelected?: (ids: string[]) => Promise<void>
  availableAgents?: string[]
  availableIntakes?: string[]
  onExportFiltered?: (exportRows: AimtReportRecord[]) => void
  onFilteredRecordsChange?: (filtered: AimtReportRecord[]) => void
}

type SortField = 'student_name' | 'pending_invoice' | 'pending_amount' | 'yet_to_raised' | 'course' | 'intake' | 'end_date'
type SortOrder = 'asc' | 'desc'

function parseDateValue(val: string | null | undefined): number {
  if (!val || typeof val !== 'string') return 0
  const trimmed = val.trim()
  if (!trimmed || trimmed === '-') return 0

  // match DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const ddmmyyyy = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/)
  if (ddmmyyyy) {
    const d = parseInt(ddmmyyyy[1], 10)
    const m = parseInt(ddmmyyyy[2], 10) - 1
    const y = parseInt(ddmmyyyy[3], 10)
    return new Date(y, m, d).getTime() || 0
  }

  // match YYYY-MM-DD
  const yyyymmdd = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/)
  if (yyyymmdd) {
    const y = parseInt(yyyymmdd[1], 10)
    const m = parseInt(yyyymmdd[2], 10) - 1
    const d = parseInt(yyyymmdd[3], 10)
    return new Date(y, m, d).getTime() || 0
  }

  const parsed = Date.parse(trimmed)
  return isNaN(parsed) ? 0 : parsed
}

export default function ReportDataTable({
  records,
  isLoading = false,
  selectedIds,
  onSelectChange,
  onViewRecord,
  onAddEntry,
  onImportExcel,
  onEditRecord,
  onDeleteRecord,
  onDeleteSelected,
  onExportFiltered,
  onFilteredRecordsChange,
}: ReportDataTableProps) {
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedDocument, setSelectedDocument] = useState<string>('all')

  // Sorting State
  const [sortField, setSortField] = useState<SortField>('student_name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(10)

  // Delete Confirmation State
  const [recordToDelete, setRecordToDelete] = useState<AimtReportRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Bulk Delete State
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  // Compute available document types dynamically
  const availableDocuments = useMemo(() => {
    const set = new Set<string>(['CoE', 'VoE', 'Offer Letter'])
    records.forEach((r) => {
      if (r.document && r.document.trim()) {
        set.add(r.document.trim())
      }
    })
    return Array.from(set)
  }, [records])

  // Format Currency
  const formatAUD = (amount: number | null | undefined) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      maximumFractionDigits: 0,
    }).format(amount || 0)
  }

  // Filter & Sort Pipeline
  const filteredRecords = useMemo(() => {
    let list = [...records]

    // 1. Text Search Filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim()
      list = list.filter((r) => {
        return (
          r.student_name?.toLowerCase().includes(q) ||
          r.course?.toLowerCase().includes(q) ||
          r.student_id?.toLowerCase().includes(q) ||
          r.document?.toLowerCase().includes(q) ||
          r.status?.toLowerCase().includes(q) ||
          r.agent?.toLowerCase().includes(q) ||
          r.email_id?.toLowerCase().includes(q) ||
          r.phone_no?.toLowerCase().includes(q) ||
          r.remarks?.toLowerCase().includes(q) ||
          ((r as any).follow_up && String((r as any).follow_up).toLowerCase().includes(q)) ||
          ((r.extra_data as any)?.follow_up && String((r.extra_data as any).follow_up).toLowerCase().includes(q))
        )
      })
    }

    // 2. Student ID Status Filter
    if (selectedStatus !== 'all') {
      list = list.filter((r) => r.status?.toLowerCase().trim() === selectedStatus.toLowerCase().trim())
    }

    // 3. Document Type Filter
    if (selectedDocument !== 'all') {
      list = list.filter((r) => {
        const doc = (r.document || '').toLowerCase().trim()
        if (selectedDocument === 'CoE') return doc.includes('coe')
        if (selectedDocument === 'VoE') return doc.includes('voe')
        if (selectedDocument === 'Offer Letter') return doc.includes('offer')
        return doc === selectedDocument.toLowerCase().trim()
      })
    }

    // 4. Sorting
    list.sort((a, b) => {
      if (sortField === 'intake' || sortField === 'end_date') {
        const aDate = parseDateValue(a[sortField])
        const bDate = parseDateValue(b[sortField])
        if (aDate && bDate) {
          return sortOrder === 'asc' ? aDate - bDate : bDate - aDate
        }
        if (aDate && !bDate) return sortOrder === 'asc' ? -1 : 1
        if (!aDate && bDate) return sortOrder === 'asc' ? 1 : -1
        const aStr = String(a[sortField] || '').toLowerCase()
        const bStr = String(b[sortField] || '').toLowerCase()
        return sortOrder === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
      }

      let aVal: any = a[sortField] ?? ''
      let bVal: any = b[sortField] ?? ''

      if (sortField === 'pending_amount') {
        aVal = Number(aVal) || 0
        bVal = Number(bVal) || 0
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
      }

      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return list
  }, [records, searchTerm, selectedStatus, selectedDocument, sortField, sortOrder])

  // Notify parent of filtered records
  React.useEffect(() => {
    onFilteredRecordsChange?.(filteredRecords)
  }, [filteredRecords, onFilteredRecordsChange])

  // Pagination calculation
  const totalRows = filteredRecords.length
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredRecords.slice(start, start + pageSize)
  }, [filteredRecords, currentPage, pageSize])

  // Selection Logic
  const allCurrentPageSelected =
    paginatedRecords.length > 0 && paginatedRecords.every((r) => selectedIds.includes(r.id))

  function handleSelectAll(checked: boolean) {
    if (checked) {
      const pageIds = paginatedRecords.map((r) => r.id)
      const merged = Array.from(new Set([...selectedIds, ...pageIds]))
      onSelectChange(merged)
    } else {
      const pageIds = paginatedRecords.map((r) => r.id)
      const remaining = selectedIds.filter((id) => !pageIds.includes(id))
      onSelectChange(remaining)
    }
  }

  function handleSelectRow(id: string, checked: boolean) {
    if (checked) {
      onSelectChange([...selectedIds, id])
    } else {
      onSelectChange(selectedIds.filter((item) => item !== id))
    }
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
  }

  const handleConfirmDelete = async () => {
    if (!recordToDelete || !onDeleteRecord) return
    setIsDeleting(true)
    try {
      await onDeleteRecord(recordToDelete)
      setRecordToDelete(null)
    } catch (err: any) {
      alert(err.message || 'Failed to delete record.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0 || !onDeleteSelected) return
    setIsBulkDeleting(true)
    try {
      await onDeleteSelected(selectedIds)
      setIsBulkDeleteOpen(false)
    } catch (err: any) {
      alert(err.message || 'Failed to delete selected records.')
    } finally {
      setIsBulkDeleting(false)
    }
  }

  const hasActiveFilters = Boolean(searchTerm.trim() || selectedStatus !== 'all' || selectedDocument !== 'all')

  return (
    <div className="w-full space-y-4">
      {/* Top Controls Bar with Filters */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-gradient-to-r from-white via-slate-50/60 to-slate-50 p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        {/* Left: Search filter input with full remaining width */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#009D9E]" />
          <Input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            placeholder="Search student name, ID, agent, course, document..."
            className="w-full pl-10 pr-4 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl text-xs h-10 focus-visible:ring-2 focus-visible:ring-[#009D9E]/30 focus-visible:border-[#009D9E] shadow-2xs font-medium transition-all"
          />
        </div>

        {/* Right: Separate Status & Document Type Filter Dropdowns + Actions */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* 1. Student ID Status Filter */}
          <div className="relative flex items-center min-w-[145px]">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value)
                setCurrentPage(1)
              }}
              className={`w-full h-10 pl-3.5 pr-8 text-xs font-semibold rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#009D9E]/30 shadow-2xs transition-all appearance-none border ${
                selectedStatus !== 'all'
                  ? 'border-[#009D9E] bg-cyan-50/80 text-[#003D5C] font-bold'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <option value="all">Status: All</option>
              <option value="Current">Status: Current</option>
              <option value="Future">Status: Future</option>
              <option value="Cancelled">Status: Cancelled</option>
              <option value="Completed">Status: Completed</option>
              <option value="Deferred">Status: Deferred</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* 2. Document Type Filter */}
          <div className="relative flex items-center min-w-[155px]">
            <select
              value={selectedDocument}
              onChange={(e) => {
                setSelectedDocument(e.target.value)
                setCurrentPage(1)
              }}
              className={`w-full h-10 pl-3.5 pr-8 text-xs font-semibold rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#009D9E]/30 shadow-2xs transition-all appearance-none border ${
                selectedDocument !== 'all'
                  ? 'border-[#009D9E] bg-cyan-50/80 text-[#003D5C] font-bold'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <option value="all">Document: All</option>
              <option value="CoE">Document: CoE</option>
              <option value="VoE">Document: VoE</option>
              <option value="Offer Letter">Document: Offer Letter</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Reset Filters button if any filter is active */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('')
                setSelectedStatus('all')
                setSelectedDocument('all')
                setCurrentPage(1)
              }}
              className="h-10 px-3 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl cursor-pointer font-bold shrink-0"
              title="Reset search & filters"
            >
              <RotateCcw className="size-3.5 mr-1 text-rose-500" />
              <span>Reset</span>
            </Button>
          )}

          {/* Bulk Delete Selected Button */}
          {selectedIds.length > 0 && onDeleteSelected && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBulkDeleteOpen(true)}
              className="border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-400 h-10 px-3.5 rounded-xl text-xs gap-1.5 shadow-2xs font-bold cursor-pointer shrink-0 animate-in fade-in"
              title="Delete all selected student records directly from live database"
            >
              <Trash2 className="size-3.5 text-rose-600" />
              <span>Delete ({selectedIds.length})</span>
            </Button>
          )}

          {/* Export Filtered button in Table Controls */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExportFiltered?.(filteredRecords)}
            disabled={filteredRecords.length === 0}
            className="border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-800 hover:from-emerald-100 hover:to-teal-100 hover:border-emerald-400 h-10 px-4 rounded-xl text-xs gap-2 shadow-2xs font-bold cursor-pointer shrink-0 transition-all"
            title="Export filtered records to Excel"
          >
            <Download className="size-4 text-emerald-600" />
            <span className="hidden sm:inline">Export Excel ({filteredRecords.length})</span>
          </Button>

          {/* Import Excel Button in Table Controls - Temporarily Hidden */}
          {/* {onImportExcel && (
            <Button
              variant="outline"
              size="sm"
              onClick={onImportExcel}
              className="border-cyan-300/90 bg-gradient-to-r from-cyan-50 to-teal-50 text-[#003D5C] hover:bg-cyan-100/70 hover:border-cyan-400 h-10 px-4 rounded-xl text-xs gap-2 shadow-2xs font-bold cursor-pointer shrink-0 transition-all"
              title="Import student Excel report"
            >
              <UploadCloud className="size-4 text-[#009D9E]" />
              <span className="hidden sm:inline">Import Excel</span>
            </Button>
          )} */}

          {/* Add Entry Button */}
          {onAddEntry && (
            <Button
              size="sm"
              onClick={onAddEntry}
              className="bg-gradient-to-r from-[#003D5C] to-[#002b42] hover:from-[#002b42] hover:to-[#001f30] text-white h-10 px-4.5 rounded-xl text-xs font-bold gap-2 shadow-sm transition-all cursor-pointer shrink-0 border border-cyan-500/20"
            >
              <PlusCircle className="size-4 text-cyan-300" />
              <span>Add Entry</span>
            </Button>
          )}
        </div>
      </div>

      {/* Selection Action Banner */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-gradient-to-r from-cyan-50 via-teal-50/60 to-cyan-50 border border-cyan-200/80 rounded-2xl text-xs text-slate-800 animate-in fade-in shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center size-5 rounded-full bg-[#003D5C] text-white text-[10px] font-bold">
              {selectedIds.length}
            </span>
            <span className="font-semibold text-[#003D5C]">
              student record(s) selected
            </span>
            {selectedIds.length < filteredRecords.length && (
              <button
                type="button"
                onClick={() => onSelectChange(filteredRecords.map((r) => r.id))}
                className="ml-2 font-bold text-[#009D9E] hover:text-[#007A7A] hover:underline cursor-pointer transition-colors"
              >
                Select all {filteredRecords.length} records in this view
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onSelectChange([])}
              className="font-bold text-slate-500 hover:text-slate-800 cursor-pointer transition-colors"
            >
              Clear selection
            </button>
            {onDeleteSelected && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setIsBulkDeleteOpen(true)}
                className="h-8 px-3.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl gap-1.5 shadow-2xs cursor-pointer"
              >
                <Trash2 className="size-3.5" />
                <span>Delete Selected ({selectedIds.length})</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Main Table Card (Classic Deep Navy Header & Polished Rows) */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            {/* Table Header: Exactly STUDENT NAME, PENDING INV, PENDING AMOUNT, YET TO RAISED, COURSE, INTAKE DATE, END DATE, Actions */}
            <thead>
              <tr className="bg-[#002D42] text-white text-[11px] font-bold uppercase tracking-wider select-none border-b border-[#002D42]">
                {/* Checkbox Header */}
                <th className="p-3.5 w-10 text-center">
                  <Checkbox
                    checked={allCurrentPageSelected}
                    onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                    aria-label="Select all"
                    className="border-slate-400/80 data-[state=checked]:bg-cyan-400 data-[state=checked]:text-[#002D42] data-[state=checked]:border-cyan-400"
                  />
                </th>

                {/* 1. Student Name */}
                <th
                  onClick={() => toggleSort('student_name')}
                  className="p-3.5 min-w-[200px] cursor-pointer hover:text-cyan-300 transition-colors group select-none"
                  title="Sort by Student Name"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Student Name</span>
                    {sortField === 'student_name' ? (
                      sortOrder === 'asc' ? (
                        <ArrowUp className="size-3.5 text-cyan-300 stroke-[2.5]" />
                      ) : (
                        <ArrowDown className="size-3.5 text-cyan-300 stroke-[2.5]" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3 text-cyan-400/40 group-hover:text-cyan-300" />
                    )}
                  </div>
                </th>

                {/* 2. Pending Invoice */}
                <th
                  onClick={() => toggleSort('pending_invoice')}
                  className="p-3.5 w-28 text-center cursor-pointer hover:text-cyan-300 transition-colors group select-none"
                  title="Sort by Pending Invoice"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Pending Inv</span>
                    {sortField === 'pending_invoice' ? (
                      sortOrder === 'asc' ? (
                        <ArrowUp className="size-3.5 text-cyan-300 stroke-[2.5]" />
                      ) : (
                        <ArrowDown className="size-3.5 text-cyan-300 stroke-[2.5]" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3 text-cyan-400/40 group-hover:text-cyan-300" />
                    )}
                  </div>
                </th>

                {/* 3. Pending Amount */}
                <th
                  onClick={() => toggleSort('pending_amount')}
                  className="p-3.5 min-w-[130px] text-right cursor-pointer hover:text-cyan-300 transition-colors group select-none font-mono"
                  title="Sort by Pending Amount"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Pending Amount</span>
                    {sortField === 'pending_amount' ? (
                      sortOrder === 'asc' ? (
                        <ArrowUp className="size-3.5 text-cyan-300 stroke-[2.5]" />
                      ) : (
                        <ArrowDown className="size-3.5 text-cyan-300 stroke-[2.5]" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3 text-cyan-400/40 group-hover:text-cyan-300" />
                    )}
                  </div>
                </th>

                {/* 4. Yet to Raised */}
                <th
                  onClick={() => toggleSort('yet_to_raised')}
                  className="p-3.5 min-w-[120px] text-center cursor-pointer hover:text-cyan-300 transition-colors group select-none"
                  title="Sort by Yet to Raised"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Yet to Raised</span>
                    {sortField === 'yet_to_raised' ? (
                      sortOrder === 'asc' ? (
                        <ArrowUp className="size-3.5 text-cyan-300 stroke-[2.5]" />
                      ) : (
                        <ArrowDown className="size-3.5 text-cyan-300 stroke-[2.5]" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3 text-cyan-400/40 group-hover:text-cyan-300" />
                    )}
                  </div>
                </th>

                {/* 5. Course */}
                <th
                  onClick={() => toggleSort('course')}
                  className="p-3.5 min-w-[220px] cursor-pointer hover:text-cyan-300 transition-colors group select-none"
                  title="Sort by Course"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Course</span>
                    {sortField === 'course' ? (
                      sortOrder === 'asc' ? (
                        <ArrowUp className="size-3.5 text-cyan-300 stroke-[2.5]" />
                      ) : (
                        <ArrowDown className="size-3.5 text-cyan-300 stroke-[2.5]" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3 text-cyan-400/40 group-hover:text-cyan-300" />
                    )}
                  </div>
                </th>

                {/* 6. Intake Date */}
                <th
                  onClick={() => toggleSort('intake')}
                  className="p-3.5 min-w-[120px] cursor-pointer hover:text-cyan-300 transition-colors group select-none"
                  title="Sort by Intake Date"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Intake Date</span>
                    {sortField === 'intake' ? (
                      sortOrder === 'asc' ? (
                        <ArrowUp className="size-3.5 text-cyan-300 stroke-[2.5]" />
                      ) : (
                        <ArrowDown className="size-3.5 text-cyan-300 stroke-[2.5]" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3 text-cyan-400/40 group-hover:text-cyan-300" />
                    )}
                  </div>
                </th>

                {/* 7. Course End Date */}
                <th
                  onClick={() => toggleSort('end_date')}
                  className="p-3.5 min-w-[130px] cursor-pointer hover:text-cyan-300 transition-colors group select-none"
                  title="Sort by Course End Date"
                >
                  <div className="flex items-center gap-1.5">
                    <span>End Date</span>
                    {sortField === 'end_date' ? (
                      sortOrder === 'asc' ? (
                        <ArrowUp className="size-3.5 text-cyan-300 stroke-[2.5]" />
                      ) : (
                        <ArrowDown className="size-3.5 text-cyan-300 stroke-[2.5]" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3 text-cyan-400/40 group-hover:text-cyan-300" />
                    )}
                  </div>
                </th>

                {/* Actions column */}
                <th className="p-3.5 w-12 text-center"></th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-200/70 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2.5">
                      <div className="size-7 border-3 border-[#009D9E] border-t-transparent rounded-full animate-spin" />
                      <span className="font-semibold text-slate-700">Loading student report records...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2.5">
                      <div className="size-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                        <GraduationCap className="size-7" />
                      </div>
                      <span className="font-extrabold text-slate-800 text-sm">No student records found</span>
                      <span className="text-xs text-slate-500 max-w-sm">
                        {searchTerm || selectedStatus !== 'all' || selectedDocument !== 'all'
                          ? 'Try adjusting your search query or filters.'
                          : 'Use "+ Add Entry" to create a new student record.'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((record, index) => {
                  const isSelected = selectedIds.includes(record.id)

                  return (
                    <tr
                      key={record.id}
                      className={`transition-colors cursor-pointer border-b border-slate-200/70 ${
                        isSelected
                          ? 'bg-cyan-100/90 hover:bg-cyan-100 text-slate-900'
                          : index % 2 === 1
                          ? 'bg-slate-100 hover:bg-cyan-50/70'
                          : 'bg-white hover:bg-cyan-50/70'
                      }`}
                      onClick={() => onViewRecord(record)}
                    >
                      {/* Checkbox */}
                      <td
                        className="p-3.5 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectRow(record.id, Boolean(checked))}
                          aria-label={`Select student ${record.student_name}`}
                          className="border-slate-300 data-[state=checked]:bg-[#003D5C] data-[state=checked]:text-white"
                        />
                      </td>

                      {/* 1. Student Name */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-full bg-gradient-to-br from-[#003D5C]/15 to-[#009D9E]/25 text-[#003D5C] font-extrabold text-xs flex items-center justify-center shrink-0 border border-cyan-500/20 shadow-2xs">
                            {record.student_name?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                              <span>{record.student_name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {record.student_id && (
                                <span className="text-[10px] font-mono text-[#003D5C] font-extrabold bg-cyan-50 px-1.5 py-0.2 rounded border border-cyan-200">
                                  {record.student_id}
                                </span>
                              )}
                              {record.status && (
                                <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                                  record.status.toLowerCase() === 'current'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : record.status.toLowerCase() === 'future'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : record.status.toLowerCase() === 'cancelled'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>
                                  {record.status}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3. Pending Invoice */}
                      <td className="p-3.5 text-center">
                        {record.pending_invoice && record.pending_invoice !== '-' && record.pending_invoice !== '0' ? (
                          <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded-md bg-rose-50 text-rose-700 font-extrabold border border-rose-200 text-xs font-mono shadow-2xs">
                            {record.pending_invoice}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-bold">-</span>
                        )}
                      </td>

                      {/* 4. Pending Amount */}
                      <td className="p-3.5 text-right font-mono font-extrabold text-amber-600 text-[13px]">
                        {record.pending_amount > 0 ? (
                          formatAUD(record.pending_amount)
                        ) : (
                          <span className="text-slate-400 font-normal">$0</span>
                        )}
                      </td>

                      {/* 5. Yet to Raised */}
                      <td className="p-3.5 text-center">
                        {record.yet_to_raised && record.yet_to_raised !== '-' ? (
                          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[11px] font-mono font-bold px-2 py-0.5 shadow-2xs">
                            {record.yet_to_raised}
                          </Badge>
                        ) : (
                          <span className="text-slate-400 font-bold">-</span>
                        )}
                      </td>

                      {/* 6. Course */}
                      <td className="p-3.5 max-w-[260px]">
                        <span className="truncate block font-semibold text-slate-800" title={record.course || ''}>
                          {record.course || '-'}
                        </span>
                        {record.agent && (
                          <span className="text-[10px] text-slate-500 truncate block mt-0.5">
                            Agent: {record.agent}
                          </span>
                        )}
                      </td>

                      {/* 7. Intake Date */}
                      <td className="p-3.5 whitespace-nowrap">
                        {record.intake && record.intake !== '-' ? (
                          <span className="inline-flex items-center gap-1.5 font-mono text-slate-700 font-bold text-xs bg-slate-200/60 px-2 py-0.5 rounded border border-slate-300/60">
                            <Calendar className="size-3 text-[#009D9E] shrink-0" />
                            <span>{record.intake}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">-</span>
                        )}
                      </td>

                      {/* 8. Course End Date */}
                      <td className="p-3.5 whitespace-nowrap">
                        {record.end_date && record.end_date !== '-' ? (
                          <span className="inline-flex items-center gap-1.5 font-mono text-slate-700 font-bold text-xs bg-slate-200/60 px-2 py-0.5 rounded border border-slate-300/60">
                            <Calendar className="size-3 text-amber-600 shrink-0" />
                            <span>{record.end_date}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">-</span>
                        )}
                      </td>

                      {/* Row Actions Menu (3 Dots) */}
                      <td
                        className="p-3.5 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger className="size-8 rounded-lg hover:bg-slate-200/70 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors focus:outline-none cursor-pointer border border-transparent hover:border-slate-200">
                            <MoreHorizontal className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-48 bg-white border border-slate-200 text-slate-800 p-1.5 rounded-xl shadow-xl z-50 animate-in fade-in-0 zoom-in-95"
                          >
                            {/* Option 1: View All Details */}
                            <DropdownMenuItem
                              onClick={() => onViewRecord(record)}
                              className="text-xs flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-cyan-50 hover:text-[#003D5C] text-slate-800 font-semibold transition-colors"
                            >
                              <Eye className="size-4 text-[#009D9E]" />
                              <span>View All Details</span>
                            </DropdownMenuItem>

                            {/* Option 2: Edit Record */}
                            {onEditRecord && (
                              <DropdownMenuItem
                                onClick={() => onEditRecord(record)}
                                className="text-xs flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-blue-50 hover:text-blue-700 text-slate-800 font-semibold transition-colors"
                              >
                                <Edit2 className="size-4 text-blue-600" />
                                <span>Edit Entry</span>
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator className="bg-slate-100 my-1" />

                            {/* Option 3: Copy Name */}
                            <DropdownMenuItem
                              onClick={() => copyToClipboard(record.student_name)}
                              className="text-xs flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-100 text-slate-600 font-medium transition-colors"
                            >
                              <Copy className="size-4 text-slate-400" />
                              <span>Copy Student Name</span>
                            </DropdownMenuItem>

                            {/* Option 4: Delete Record */}
                            {onDeleteRecord && (
                              <>
                                <DropdownMenuSeparator className="bg-slate-100 my-1" />
                                <DropdownMenuItem
                                  onClick={() => setRecordToDelete(record)}
                                  className="text-xs flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-rose-50 text-rose-600 font-bold transition-colors"
                                >
                                  <Trash2 className="size-4 text-rose-600" />
                                  <span>Delete Entry</span>
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Selected Rows Ribbon (if any selected) */}
        {selectedIds.length > 0 && (
          <div className="px-5 py-2.5 bg-cyan-50/80 border-t border-cyan-100 flex items-center justify-between text-xs text-cyan-900 font-medium">
            <div className="flex items-center gap-2">
              <span className="font-bold">{selectedIds.length}</span> of {totalRows} row(s) selected
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelectChange([])}
              className="h-6.5 px-2.5 text-[11px] text-cyan-800 hover:text-cyan-950 hover:bg-cyan-100 font-bold cursor-pointer rounded-lg"
            >
              Deselect all
            </Button>
          </div>
        )}

        <TablePagination
          totalEntries={totalRows}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          theme="light"
        />
      </div>

      {/* Delete Record Confirmation Dialog */}
      <Dialog
        open={Boolean(recordToDelete)}
        onOpenChange={(open) => !open && !isDeleting && setRecordToDelete(null)}
      >
        <DialogContent className="w-[95vw] max-w-md bg-white border border-slate-200 text-slate-900 p-6 shadow-2xl rounded-2xl">
          <DialogHeader className="space-y-2">
            <div className="size-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
              <AlertTriangle className="size-6" />
            </div>
            <DialogTitle className="text-base font-bold text-slate-900">
              Delete Student Entry?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Are you sure you want to delete the record for{' '}
              <span className="font-bold text-slate-800">
                {recordToDelete?.student_name}
              </span>{' '}
              {recordToDelete?.student_id && `(${recordToDelete?.student_id})`} from the database? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setRecordToDelete(null)}
              className="border-slate-200 bg-white text-slate-700 hover:bg-slate-100 rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-xs"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Deleting from Database...</span>
                </>
              ) : (
                <>
                  <Trash2 className="size-3.5" />
                  <span>Delete Record</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Records Confirmation Dialog */}
      <Dialog
        open={isBulkDeleteOpen}
        onOpenChange={(open) => !open && !isBulkDeleting && setIsBulkDeleteOpen(false)}
      >
        <DialogContent className="w-[95vw] max-w-md bg-white border border-slate-200 text-slate-900 p-6 shadow-2xl rounded-2xl">
          <DialogHeader className="space-y-2">
            <div className="size-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
              <AlertTriangle className="size-6" />
            </div>
            <DialogTitle className="text-base font-bold text-slate-900">
              Delete {selectedIds.length} Selected Entries?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to permanently delete all{' '}
              <span className="font-bold text-rose-700">{selectedIds.length}</span> selected student
              record(s) from the live database server? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isBulkDeleting}
              onClick={() => setIsBulkDeleteOpen(false)}
              className="border-slate-200 bg-white text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-medium cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isBulkDeleting}
              onClick={handleConfirmBulkDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-xs cursor-pointer"
            >
              {isBulkDeleting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Deleting from Database...</span>
                </>
              ) : (
                <>
                  <Trash2 className="size-3.5" />
                  <span>Delete {selectedIds.length} Records</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
