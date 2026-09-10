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
} from 'lucide-react'
import type { AimtReportRecord } from '@/lib/supabase/database.types'

interface ReportDataTableProps {
  records: AimtReportRecord[]
  isLoading?: boolean
  selectedIds: string[]
  onSelectChange: (ids: string[]) => void
  onViewRecord: (record: AimtReportRecord) => void
  onEditRecord?: (record: AimtReportRecord) => void
  onDeleteRecord?: (record: AimtReportRecord) => Promise<void>
  availableAgents: string[]
  availableIntakes: string[]
  onExportFiltered?: () => void
}

type SortField = 'sr_no' | 'student_name' | 'agent' | 'pending_invoice' | 'pending_amount' | 'yet_to_raised' | 'intake' | 'course'
type SortOrder = 'asc' | 'desc'

export default function ReportDataTable({
  records,
  isLoading = false,
  selectedIds,
  onSelectChange,
  onViewRecord,
  onEditRecord,
  onDeleteRecord,
  availableAgents,
  availableIntakes,
  onExportFiltered,
}: ReportDataTableProps) {
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<string>('all')
  const [selectedIntake, setSelectedIntake] = useState<string>('all')

  // Sorting State
  const [sortField, setSortField] = useState<SortField>('sr_no')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(25)

  // Delete Confirmation State
  const [recordToDelete, setRecordToDelete] = useState<AimtReportRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Format Currency
  const formatAUD = (amount: number | null | undefined) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      maximumFractionDigits: 0,
    }).format(amount || 0)
  }

  // Light Agency Badge Colors
  function getAgentBadgeColor(agentName: string | null) {
    if (!agentName) return 'bg-slate-100 text-slate-600 border-slate-200'
    const a = agentName.toLowerCase()
    if (a.includes('edlink')) return 'bg-cyan-50 text-cyan-800 border-cyan-200'
    if (a.includes('abc') || a.includes('overseas')) return 'bg-indigo-50 text-indigo-800 border-indigo-200'
    if (a.includes('nexgen')) return 'bg-amber-50 text-amber-800 border-amber-200'
    if (a.includes('brightpath')) return 'bg-teal-50 text-teal-800 border-teal-200'
    if (a.includes('abdul') || a.includes('education')) return 'bg-emerald-50 text-emerald-800 border-emerald-200'
    if (a.includes('sanguine')) return 'bg-purple-50 text-purple-800 border-purple-200'
    if (a.includes('grace')) return 'bg-sky-50 text-sky-800 border-sky-200'
    return 'bg-blue-50 text-blue-800 border-blue-200'
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
          r.agent?.toLowerCase().includes(q) ||
          r.course?.toLowerCase().includes(q) ||
          r.student_id?.toLowerCase().includes(q) ||
          r.intake?.toLowerCase().includes(q) ||
          r.email_id?.toLowerCase().includes(q) ||
          r.phone_no?.toLowerCase().includes(q)
        )
      })
    }

    // 2. Agent Filter
    if (selectedAgent !== 'all') {
      list = list.filter((r) => r.agent === selectedAgent)
    }

    // 3. Intake Filter
    if (selectedIntake !== 'all') {
      list = list.filter((r) => r.intake === selectedIntake)
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
  }, [records, searchTerm, selectedAgent, selectedIntake, sortField, sortOrder])

  // Pagination calculation
  const totalRows = filteredRecords.length
  const totalPages = pageSize === -1 ? 1 : Math.ceil(totalRows / pageSize) || 1
  const paginatedRecords = useMemo(() => {
    if (pageSize === -1) return filteredRecords
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

  return (
    <div className="w-full space-y-4">
      {/* Top Controls Bar (Light Theme) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
        {/* Left: Search filter input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            placeholder="Filter students, agents, courses, IDs..."
            className="pl-9 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl text-xs h-9.5 focus-visible:ring-1 focus-visible:ring-cyan-500"
          />
        </div>

        {/* Right: Filter dropdowns */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Agent Filter */}
          {availableAgents.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer focus:outline-none shadow-2xs">
                <Building2 className="size-3.5 text-cyan-600" />
                <span className="truncate max-w-[120px]">
                  {selectedAgent === 'all' ? 'All Agents' : selectedAgent}
                </span>
                <ChevronDown className="size-3 text-slate-400" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-white border border-slate-200 text-slate-800 p-1 rounded-xl shadow-xl max-h-64 overflow-y-auto"
              >
                <DropdownMenuLabel className="text-[10px] text-slate-400 uppercase tracking-wider px-2 py-1">
                  Filter by Agent
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedAgent('all')
                    setCurrentPage(1)
                  }}
                  className={`text-xs px-2.5 py-1.5 rounded-lg cursor-pointer ${
                    selectedAgent === 'all' ? 'bg-cyan-50 text-cyan-900 font-bold' : 'text-slate-700'
                  }`}
                >
                  All Agents ({records.length})
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-100 my-1" />
                {availableAgents.map((agent) => (
                  <DropdownMenuItem
                    key={agent}
                    onClick={() => {
                      setSelectedAgent(agent)
                      setCurrentPage(1)
                    }}
                    className={`text-xs px-2.5 py-1.5 rounded-lg cursor-pointer ${
                      selectedAgent === agent ? 'bg-cyan-50 text-cyan-900 font-bold' : 'text-slate-700'
                    }`}
                  >
                    {agent}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Intake Filter */}
          {availableIntakes.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer focus:outline-none shadow-2xs">
                <Calendar className="size-3.5 text-cyan-600" />
                <span className="truncate max-w-[110px]">
                  {selectedIntake === 'all' ? 'All Intakes' : selectedIntake}
                </span>
                <ChevronDown className="size-3 text-slate-400" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 bg-white border border-slate-200 text-slate-800 p-1 rounded-xl shadow-xl max-h-64 overflow-y-auto"
              >
                <DropdownMenuLabel className="text-[10px] text-slate-400 uppercase tracking-wider px-2 py-1">
                  Filter by Intake Date
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedIntake('all')
                    setCurrentPage(1)
                  }}
                  className={`text-xs px-2.5 py-1.5 rounded-lg cursor-pointer ${
                    selectedIntake === 'all' ? 'bg-cyan-50 text-cyan-900 font-bold' : 'text-slate-700'
                  }`}
                >
                  All Intakes
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-100 my-1" />
                {availableIntakes.map((intake) => (
                  <DropdownMenuItem
                    key={intake}
                    onClick={() => {
                      setSelectedIntake(intake)
                      setCurrentPage(1)
                    }}
                    className={`text-xs px-2.5 py-1.5 rounded-lg cursor-pointer ${
                      selectedIntake === intake ? 'bg-cyan-50 text-cyan-900 font-bold' : 'text-slate-700'
                    }`}
                  >
                    {intake}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Reset Filters button if active */}
          {(searchTerm || selectedAgent !== 'all' || selectedIntake !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('')
                setSelectedAgent('all')
                setSelectedIntake('all')
                setCurrentPage(1)
              }}
              className="h-9 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl"
              title="Reset search & filters"
            >
              <RotateCcw className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Main Table Card (Clean Light Aesthetic) */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            {/* Table Header: Exactly the 8 required columns + checkbox + actions */}
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
                  className="p-3.5 min-w-[200px] cursor-pointer hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Student Name</span>
                    <ArrowUpDown className="size-3 text-slate-400" />
                  </div>
                </th>

                {/* 3. Agent */}
                <th
                  onClick={() => toggleSort('agent')}
                  className="p-3.5 min-w-[160px] cursor-pointer hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Agent</span>
                    <ArrowUpDown className="size-3 text-slate-400" />
                  </div>
                </th>

                {/* 4. Pending Invoice */}
                <th
                  onClick={() => toggleSort('pending_invoice')}
                  className="p-3.5 w-28 text-center cursor-pointer hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Pending Inv</span>
                    <ArrowUpDown className="size-3 text-slate-400" />
                  </div>
                </th>

                {/* 5. Pending Amount */}
                <th
                  onClick={() => toggleSort('pending_amount')}
                  className="p-3.5 min-w-[130px] text-right cursor-pointer hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Pending Amount</span>
                    <ArrowUpDown className="size-3 text-slate-400" />
                  </div>
                </th>

                {/* 6. Yet to Raised */}
                <th
                  onClick={() => toggleSort('yet_to_raised')}
                  className="p-3.5 min-w-[120px] text-center cursor-pointer hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Yet to Raised</span>
                    <ArrowUpDown className="size-3 text-slate-400" />
                  </div>
                </th>

                {/* 7. Intake */}
                <th
                  onClick={() => toggleSort('intake')}
                  className="p-3.5 min-w-[110px] cursor-pointer hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Intake</span>
                    <ArrowUpDown className="size-3 text-slate-400" />
                  </div>
                </th>

                {/* 8. Course */}
                <th
                  onClick={() => toggleSort('course')}
                  className="p-3.5 min-w-[220px] cursor-pointer hover:text-slate-900 transition-colors"
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
                  <td colSpan={10} className="text-center py-16 text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="size-6 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
                      <span className="font-medium">Loading student report records...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-16 text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <GraduationCap className="size-10 text-slate-300" />
                      <span className="font-bold text-slate-700 text-sm">No student records found</span>
                      <span className="text-xs text-slate-500 max-w-sm">
                        {searchTerm || selectedAgent !== 'all' || selectedIntake !== 'all'
                          ? 'Try adjusting your search query or filters.'
                          : 'Use "+ Add Entry" or "Import Excel" to add student records.'}
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

                      {/* 3. Agent */}
                      <td className="p-3.5">
                        {record.agent ? (
                          <Badge
                            className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${getAgentBadgeColor(
                              record.agent
                            )}`}
                          >
                            {record.agent}
                          </Badge>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* 4. Pending Invoice */}
                      <td className="p-3.5 text-center">
                        {record.pending_invoice ? (
                          <span className="inline-flex items-center justify-center size-6 rounded-md bg-rose-50 text-rose-700 font-bold border border-rose-200">
                            {record.pending_invoice}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* 5. Pending Amount */}
                      <td className="p-3.5 text-right font-mono font-bold text-amber-600 text-[13px]">
                        {record.pending_amount > 0 ? (
                          formatAUD(record.pending_amount)
                        ) : (
                          <span className="text-slate-400 font-normal">$0</span>
                        )}
                      </td>

                      {/* 6. Yet to Raised */}
                      <td className="p-3.5 text-center">
                        {record.yet_to_raised && record.yet_to_raised !== '-' ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-mono font-semibold px-2 py-0.5">
                            {record.yet_to_raised}
                          </Badge>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* 7. Intake */}
                      <td className="p-3.5 font-mono text-slate-700 text-xs">
                        {record.intake || '-'}
                      </td>

                      {/* 8. Course */}
                      <td className="p-3.5 max-w-[260px]">
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
                            {/* Option 1: View Details */}
                            <DropdownMenuItem
                              onClick={() => onViewRecord(record)}
                              className="text-xs flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-slate-100 text-slate-800 font-medium"
                            >
                              <Eye className="size-3.5 text-cyan-600" />
                              <span>View Details</span>
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

        {/* Table Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          {/* Selected Rows Info */}
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-700">
              {selectedIds.length} of {totalRows} row(s) selected
            </span>

            {/* Rows Per Page selector */}
            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-[11px] text-slate-500">Show:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 shadow-2xs"
              >
                <option value={10}>10 rows</option>
                <option value={25}>25 rows</option>
                <option value={50}>50 rows</option>
                <option value={100}>100 rows</option>
                <option value={-1}>All rows</option>
              </select>
            </div>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 mr-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="h-8 px-3 border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 rounded-lg text-xs"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              className="h-8 px-3 border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 rounded-lg text-xs"
            >
              Next
            </Button>
          </div>
        </div>
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
    </div>
  )
}
