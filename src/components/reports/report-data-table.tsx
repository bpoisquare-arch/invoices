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
  onEditRecord?: (record: AimtReportRecord) => void
  onDeleteRecord?: (record: AimtReportRecord) => Promise<void>
  onDeleteSelected?: (ids: string[]) => Promise<void>
  availableAgents?: string[]
  availableIntakes?: string[]
  onExportFiltered?: (exportRows: AimtReportRecord[]) => void
  onFilteredRecordsChange?: (filtered: AimtReportRecord[]) => void
}

type SortField = 'sr_no' | 'student_name' | 'pending_invoice' | 'pending_amount' | 'yet_to_raised' | 'course'
type SortOrder = 'asc' | 'desc'

export default function ReportDataTable({
  records,
  isLoading = false,
  selectedIds,
  onSelectChange,
  onViewRecord,
  onAddEntry,
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
  const [sortField, setSortField] = useState<SortField>('sr_no')
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
          r.phone_no?.toLowerCase().includes(q)
        )
      })
    }

    // 2. Student ID Status Filter
    if (selectedStatus !== 'all') {
      list = list.filter((r) => r.status?.toLowerCase().trim() === selectedStatus.toLowerCase().trim())
    }

    // 3. Document Type Filter
    if (selectedDocument !== 'all') {
      list = list.filter((r) => r.document?.toLowerCase().trim() === selectedDocument.toLowerCase().trim())
    }

    // 4. Sorting
    list.sort((a, b) => {
      let aVal: any = a[sortField] ?? ''
      let bVal: any = b[sortField] ?? ''

      if (sortField === 'pending_amount' || sortField === 'sr_no') {
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
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
        {/* Left: Search filter input with full remaining width */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            placeholder="Filter students, agents, courses, IDs..."
            className="w-full pl-9.5 pr-4 bg-slate-50/80 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl text-xs h-10 focus-visible:ring-1 focus-visible:ring-cyan-500 shadow-2xs font-medium"
          />
        </div>

        {/* Right: Separate Status & Document Type Filter Dropdowns + Actions */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* 1. Student ID Status Filter */}
          <div className="relative flex items-center min-w-[145px]">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value)
                setCurrentPage(1)
              }}
              className={`w-full h-10 pl-3 pr-8 text-xs font-semibold rounded-xl cursor-pointer focus:outline-none focus:ring-1 focus:ring-cyan-500 shadow-2xs transition-all appearance-none border ${
                selectedStatus !== 'all'
                  ? 'border-cyan-400 bg-cyan-50 text-cyan-950 font-bold'
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
              className={`w-full h-10 pl-3 pr-8 text-xs font-semibold rounded-xl cursor-pointer focus:outline-none focus:ring-1 focus:ring-cyan-500 shadow-2xs transition-all appearance-none border ${
                selectedDocument !== 'all'
                  ? 'border-cyan-400 bg-cyan-50 text-cyan-950 font-bold'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <option value="all">Document: All</option>
              <option value="CoE">Document: CoE</option>
              <option value="VoE">Document: VoE</option>
              <option value="Offer Letter">Document: Offer Letter</option>
              {availableDocuments
                .filter((d) => !['CoE', 'VoE', 'Offer Letter'].includes(d))
                .map((d) => (
                  <option key={d} value={d}>
                    Document: {d}
                  </option>
                ))}
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
              className="h-10 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl cursor-pointer font-semibold shrink-0"
              title="Reset search & filters"
            >
              <RotateCcw className="size-3.5 mr-1" />
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
            className="border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 h-10 px-3.5 rounded-xl text-xs gap-1.5 shadow-2xs font-semibold cursor-pointer shrink-0"
            title="Export filtered records to Excel"
          >
            <Download className="size-3.5 text-emerald-700" />
            <span className="hidden sm:inline">Export ({filteredRecords.length})</span>
          </Button>

          {/* Add Entry Button */}
          {onAddEntry && (
            <Button
              size="sm"
              onClick={onAddEntry}
              className="bg-[#003D5C] hover:bg-[#002b42] text-white h-10 px-4 rounded-xl text-xs font-bold gap-1.5 shadow-xs transition-all cursor-pointer shrink-0"
            >
              <PlusCircle className="size-4 text-cyan-300" />
              <span>Add Entry</span>
            </Button>
          )}
        </div>
      </div>

      {/* Selection Action Banner */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#003D5C]/5 border border-[#003D5C]/15 rounded-xl text-xs text-slate-800 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#003D5C]">{selectedIds.length}</span>
            <span>student record(s) selected</span>
            {selectedIds.length < filteredRecords.length && (
              <button
                type="button"
                onClick={() => onSelectChange(filteredRecords.map((r) => r.id))}
                className="ml-2 font-bold text-cyan-800 hover:underline cursor-pointer"
              >
                Select all {filteredRecords.length} records in this view
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSelectChange([])}
              className="font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Clear selection
            </button>
            {onDeleteSelected && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setIsBulkDeleteOpen(true)}
                className="h-7.5 px-3 text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg gap-1 shadow-2xs cursor-pointer"
              >
                <Trash2 className="size-3" />
                <span>Delete Selected ({selectedIds.length})</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Main Table Card (Clean Light Aesthetic) */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            {/* Table Header: Exactly SR NO, STUDENT NAME, PENDING INV, PENDING AMOUNT, YET TO RAISED, COURSE, Actions */}
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider select-none">
                {/* Checkbox Header */}
                <th className="p-3.5 w-10 text-center">
                  <Checkbox
                    checked={allCurrentPageSelected}
                    onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                    aria-label="Select all"
                    className="border-slate-300 data-[state=checked]:bg-[#003D5C] data-[state=checked]:text-white"
                  />
                </th>

                {/* 1. Sr No */}
                <th
                  onClick={() => toggleSort('sr_no')}
                  className="p-3.5 w-16 cursor-pointer hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Sr No</span>
                    <ArrowUpDown className="size-3 text-slate-400" />
                  </div>
                </th>

                {/* 2. Student Name */}
                <th
                  onClick={() => toggleSort('student_name')}
                  className="p-3.5 min-w-[220px] cursor-pointer hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Student Name</span>
                    <ArrowUpDown className="size-3 text-slate-400" />
                  </div>
                </th>

                {/* 3. Pending Invoice */}
                <th
                  onClick={() => toggleSort('pending_invoice')}
                  className="p-3.5 w-32 text-center cursor-pointer hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Pending Inv</span>
                    <ArrowUpDown className="size-3 text-slate-400" />
                  </div>
                </th>

                {/* 4. Pending Amount */}
                <th
                  onClick={() => toggleSort('pending_amount')}
                  className="p-3.5 min-w-[140px] text-right cursor-pointer hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Pending Amount</span>
                    <ArrowUpDown className="size-3 text-slate-400" />
                  </div>
                </th>

                {/* 5. Yet to Raised */}
                <th
                  onClick={() => toggleSort('yet_to_raised')}
                  className="p-3.5 min-w-[130px] text-center cursor-pointer hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Yet to Raised</span>
                    <ArrowUpDown className="size-3 text-slate-400" />
                  </div>
                </th>

                {/* 6. Course */}
                <th
                  onClick={() => toggleSort('course')}
                  className="p-3.5 min-w-[260px] cursor-pointer hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Course</span>
                    <ArrowUpDown className="size-3 text-slate-400" />
                  </div>
                </th>

                {/* Actions column */}
                <th className="p-3.5 w-12 text-center"></th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="size-6 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
                      <span className="font-medium">Loading student report records...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <GraduationCap className="size-10 text-slate-300" />
                      <span className="font-bold text-slate-700 text-sm">No student records found</span>
                      <span className="text-xs text-slate-500 max-w-sm">
                        {searchTerm || selectedStatus !== 'all' || selectedDocument !== 'all'
                          ? 'Try adjusting your search query or filters.'
                          : 'Use "+ Add Entry" to add student records.'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((record, index) => {
                  const isSelected = selectedIds.includes(record.id)
                  const srNoDisplay = record.sr_no || (currentPage - 1) * pageSize + index + 1

                  return (
                    <tr
                      key={record.id}
                      className={`transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-50/70 hover:bg-cyan-50'
                          : 'hover:bg-slate-50/80 bg-white'
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

                      {/* 1. Sr No */}
                      <td className="p-3.5 font-mono text-slate-500 text-xs font-semibold">
                        {srNoDisplay}
                      </td>

                      {/* 2. Student Name */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                          <span>{record.student_name}</span>
                        </div>
                        {record.student_id && (
                          <span className="text-[10px] font-mono text-cyan-700 font-semibold block mt-0.5">
                            {record.student_id}
                          </span>
                        )}
                      </td>

                      {/* 3. Pending Invoice */}
                      <td className="p-3.5 text-center">
                        {record.pending_invoice ? (
                          <span className="inline-flex items-center justify-center size-6 rounded-md bg-rose-50 text-rose-700 font-bold border border-rose-200">
                            {record.pending_invoice}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* 4. Pending Amount */}
                      <td className="p-3.5 text-right font-mono font-bold text-amber-600 text-[13px]">
                        {record.pending_amount > 0 ? (
                          formatAUD(record.pending_amount)
                        ) : (
                          <span className="text-slate-400 font-normal">$0</span>
                        )}
                      </td>

                      {/* 5. Yet to Raised */}
                      <td className="p-3.5 text-center">
                        {record.yet_to_raised && record.yet_to_raised !== '-' ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-mono font-semibold px-2 py-0.5">
                            {record.yet_to_raised}
                          </Badge>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* 6. Course */}
                      <td className="p-3.5 max-w-[280px]">
                        <span className="truncate block font-medium text-slate-800" title={record.course || ''}>
                          {record.course || '-'}
                        </span>
                      </td>

                      {/* Row Actions Menu (3 Dots) */}
                      <td
                        className="p-3.5 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger className="size-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors focus:outline-none cursor-pointer">
                            <MoreHorizontal className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-44 bg-white border border-slate-200 text-slate-800 p-1.5 rounded-xl shadow-xl z-50"
                          >
                            {/* Option 1: View All Details */}
                            <DropdownMenuItem
                              onClick={() => onViewRecord(record)}
                              className="text-xs flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-slate-100 text-slate-800 font-medium"
                            >
                              <Eye className="size-3.5 text-cyan-600" />
                              <span>View All Details</span>
                            </DropdownMenuItem>

                            {/* Option 2: Edit Record */}
                            {onEditRecord && (
                              <DropdownMenuItem
                                onClick={() => onEditRecord(record)}
                                className="text-xs flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-slate-100 text-slate-800 font-medium"
                              >
                                <Edit2 className="size-3.5 text-blue-600" />
                                <span>Edit Entry</span>
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator className="bg-slate-100 my-1" />

                            {/* Option 3: Copy Name */}
                            <DropdownMenuItem
                              onClick={() => copyToClipboard(record.student_name)}
                              className="text-xs flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-slate-100 text-slate-600"
                            >
                              <Copy className="size-3.5 text-slate-400" />
                              <span>Copy Name</span>
                            </DropdownMenuItem>

                            {/* Option 4: Delete Record */}
                            {onDeleteRecord && (
                              <>
                                <DropdownMenuSeparator className="bg-slate-100 my-1" />
                                <DropdownMenuItem
                                  onClick={() => setRecordToDelete(record)}
                                  className="text-xs flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-rose-50 text-rose-600 font-semibold"
                                >
                                  <Trash2 className="size-3.5 text-rose-600" />
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
          <div className="px-4 py-2 bg-cyan-50/70 border-t border-cyan-100 flex items-center justify-between text-xs text-cyan-900 font-medium">
            <div className="flex items-center gap-2">
              <span className="font-bold">{selectedIds.length}</span> of {totalRows} row(s) selected
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelectChange([])}
              className="h-6 px-2 text-[11px] text-cyan-700 hover:text-cyan-900 hover:bg-cyan-100/60 font-semibold cursor-pointer"
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
