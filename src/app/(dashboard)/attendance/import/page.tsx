'use client'

import React, { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Calendar,
  Clock,
  ArrowRight,
  RefreshCw,
  Download,
  AlertCircle,
  HelpCircle,
  Layers,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  UserX,
  FileCheck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ParsedAttendancePreviewItem,
  ExcelImportParseResult,
} from '@/lib/services/attendance-calculator'
import * as XLSX from 'xlsx'

export default function ExcelImportPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [parseResult, setParseResult] = useState<ExcelImportParseResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Column mapping state
  const [nameCol, setNameCol] = useState('')
  const [timeCol, setTimeCol] = useState('')
  const [stateCol, setStateCol] = useState('')

  // Preview filtering tab
  const [previewTab, setPreviewTab] = useState<
    'all' | 'matched' | 'ambiguous' | 'unmatched' | 'duplicate' | 'sunday'
  >('all')

  // Ambiguous resolutions: Map of previewItem.key -> employeeId
  const [ambiguousResolutions, setAmbiguousResolutions] = useState<Record<string, string>>({})

  // Duplicate strategy
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'overwrite'>('skip')

  // Commit / Import Execution
  const [isCommitting, setIsCommitting] = useState(false)
  const [importSummary, setImportSummary] = useState<{
    totalSubmitted: number
    savedCount: number
    skippedDuplicates: number
    skippedInvalidOrSunday: number
    errors: string[]
  } | null>(null)

  // Handle File Selection
  const handleFileChange = async (selectedFile: File) => {
    setFile(selectedFile)
    setErrorMessage(null)
    setParseResult(null)
    setImportSummary(null)
    setAmbiguousResolutions({})

    await parseFile(selectedFile)
  }

  // Parse file with optional column mapping
  const parseFile = async (
    fileToParse: File,
    mappingOverride?: { nameCol?: string; timeCol?: string; stateCol?: string }
  ) => {
    setIsParsing(true)
    setErrorMessage(null)

    try {
      const formData = new FormData()
      formData.append('file', fileToParse)
      if (mappingOverride) {
        formData.append('columnMapping', JSON.stringify(mappingOverride))
      }

      const res = await fetch('/api/attendance/import', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to parse Excel file.')
      }

      setParseResult(data)
      setNameCol(data.detectedColumns.nameColumn)
      setTimeCol(data.detectedColumns.timeColumn)
      setStateCol(data.detectedColumns.stateColumn)
    } catch (err: any) {
      setErrorMessage(err.message || 'Error processing Excel file.')
    } finally {
      setIsParsing(false)
    }
  }

  const handleApplyMapping = () => {
    if (!file) return
    parseFile(file, { nameCol, timeCol, stateCol })
  }

  // Ambiguous select change
  const handleResolveAmbiguous = (itemKey: string, employeeId: string) => {
    setAmbiguousResolutions((prev) => ({
      ...prev,
      [itemKey]: employeeId,
    }))
  }

  // Filter preview items for active tab
  const displayedPreviewItems = (parseResult?.previewItems || []).filter((item) => {
    if (previewTab === 'all') return true
    if (previewTab === 'matched') return item.matchStatus === 'MATCHED' && !item.isDuplicateExisting
    if (previewTab === 'ambiguous') return item.matchStatus === 'AMBIGUOUS'
    if (previewTab === 'unmatched') return item.matchStatus === 'UNMATCHED'
    if (previewTab === 'duplicate') return item.isDuplicateExisting
    if (previewTab === 'sunday') return item.isSundaySkipped
    return true
  })

  // Commit valid items
  const handleCommitImport = async () => {
    if (!parseResult) return
    setIsCommitting(true)
    setErrorMessage(null)

    try {
      // Build items with resolved IDs
      const itemsToCommit = parseResult.previewItems
        .filter((item) => {
          if (item.matchStatus === 'MATCHED') return true
          if (item.matchStatus === 'AMBIGUOUS' && ambiguousResolutions[item.key]) return true
          return false
        })
        .map((item) => ({
          ...item,
          resolvedEmployeeId: ambiguousResolutions[item.key] || item.employee?.id,
        }))

      if (itemsToCommit.length === 0) {
        throw new Error('No matched or resolved records available to import.')
      }

      const res = await fetch('/api/attendance/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'commit',
          items: itemsToCommit,
          duplicateStrategy,
        }),
      })

      const data = await res.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to save attendance records.')
      }

      setImportSummary(data.summary)
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving imported records.')
    } finally {
      setIsCommitting(false)
    }
  }

  // Download error report
  const handleDownloadErrorReport = () => {
    if (!parseResult || !parseResult.errorDetails || parseResult.errorDetails.length === 0) {
      alert('No errors to export.')
      return
    }

    const ws = XLSX.utils.json_to_sheet(parseResult.errorDetails)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Import Errors')
    XLSX.writeFile(wb, `attendance_import_errors_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-['Montserrat'] text-2xl font-bold text-[#003D5C] tracking-tight">
            Excel Attendance Import
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Safe, name-matched Excel attendance import with interactive preview, duplicate detection, and Sunday skipping.
          </p>
        </div>
        <Link href="/attendance/records">
          <Button variant="outline" className="text-xs font-bold uppercase tracking-wider text-slate-700 border-slate-300">
            View All Records
          </Button>
        </Link>
      </div>

      {/* Matching Rule Alert Note */}
      <div className="bg-cyan-50/70 border border-cyan-200/80 rounded-xl p-4 flex items-start gap-3 text-xs text-cyan-900">
        <ShieldCheck className="w-5 h-5 text-[#009D9E] shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Deterministic Matching Key:</span> Attendance rows are matched{' '}
          <span className="font-bold underline">ONLY against existing Employee Names</span> (case-insensitive & trimmed).
          Employee ID is NOT used for Excel matching. Sunday records are automatically skipped and reported.
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-4 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Step 1: Upload Card (If no parse result or re-uploading) */}
      <Card className="bg-white border border-slate-200/90 shadow-2xs rounded-xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 pb-3">
          <CardTitle className="text-sm font-bold text-[#003D5C] flex items-center gap-2">
            <Upload className="w-4 h-4 text-[#009D9E]" />
            1. Select Attendance Excel File (.xlsx, .xls)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileChange(e.dataTransfer.files[0])
              }
            }}
            className="border-2 border-dashed border-slate-200 hover:border-[#009D9E] bg-slate-50/60 hover:bg-slate-50/90 rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center"
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx, .xls"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileChange(e.target.files[0])
                }
              }}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-[#009D9E]/10 text-[#009D9E] flex items-center justify-center mb-3">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">
              {file ? file.name : 'Click to browse or drag & drop Excel file here'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Supports Microsoft Excel (.xlsx, .xls) with columns: <span className="font-mono">Name</span>,{' '}
              <span className="font-mono">Time</span>, <span className="font-mono">State</span>
            </p>

            {isParsing && (
              <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-[#009D9E]">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Parsing spreadsheet and matching employee names...
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Step 2 & 3: Preview and Confirmation (When parsed) */}
      {parseResult && !importSummary && (
        <div className="space-y-6">
          {/* Column Mapping Bar */}
          <Card className="bg-white border border-slate-200/90 shadow-2xs rounded-xl p-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Detected Column Mapping
                </p>
                <p className="text-[11px] text-slate-400">
                  Verify or adjust the column headers found in your Excel spreadsheet.
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-500">Name:</span>
                  <Select value={nameCol} onValueChange={(val) => setNameCol(val || '')}>
                    <SelectTrigger className="text-xs h-8 border-slate-200 min-w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {parseResult.detectedColumns.availableColumns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-500">Time:</span>
                  <Select value={timeCol} onValueChange={(val) => setTimeCol(val || '')}>
                    <SelectTrigger className="text-xs h-8 border-slate-200 min-w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {parseResult.detectedColumns.availableColumns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-500">State:</span>
                  <Select value={stateCol} onValueChange={(val) => setStateCol(val || '')}>
                    <SelectTrigger className="text-xs h-8 border-slate-200 min-w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {parseResult.detectedColumns.availableColumns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleApplyMapping}
                  className="text-xs font-bold h-8"
                >
                  Re-parse with Mapping
                </Button>
              </div>
            </div>
          </Card>

          {/* KPI Summary Bento */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* 1. Total Raw Rows */}
            <div className="bg-white border border-slate-200/80 rounded-lg p-3 shadow-2xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Rows</p>
              <p className="text-xl font-bold text-slate-800 mt-0.5">{parseResult.stats.totalRows}</p>
            </div>

            {/* 2. Matched */}
            <div className="bg-white border border-emerald-200/80 rounded-lg p-3 shadow-2xs bg-emerald-50/20">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Matched Days</p>
              <p className="text-xl font-bold text-emerald-600 mt-0.5">{parseResult.stats.matchedCount}</p>
            </div>

            {/* 3. Sunday Skipped */}
            <div className="bg-white border border-slate-200/80 rounded-lg p-3 shadow-2xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sunday Skipped</p>
              <p className="text-xl font-bold text-slate-700 mt-0.5">{parseResult.stats.sundaySkippedCount}</p>
            </div>

            {/* 4. Ambiguous Matches */}
            <div className="bg-white border border-amber-200/80 rounded-lg p-3 shadow-2xs bg-amber-50/20">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Ambiguous Matches</p>
              <p className="text-xl font-bold text-amber-600 mt-0.5">{parseResult.stats.ambiguousCount}</p>
            </div>

            {/* 5. Unmatched Employees */}
            <div className="bg-white border border-rose-200/80 rounded-lg p-3 shadow-2xs bg-rose-50/20">
              <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Unmatched Names</p>
              <p className="text-xl font-bold text-rose-600 mt-0.5">{parseResult.stats.unmatchedCount}</p>
            </div>

            {/* 6. Existing Duplicates */}
            <div className="bg-white border border-blue-200/80 rounded-lg p-3 shadow-2xs bg-blue-50/20">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Existing Duplicates</p>
              <p className="text-xl font-bold text-blue-600 mt-0.5">{parseResult.stats.duplicateCount}</p>
            </div>
          </div>

          {/* Unmatched / Ambiguous Warning Alerts */}
          {parseResult.unmatchedNames.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-800 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-rose-900">
                <UserX className="w-4 h-4 text-rose-600" />
                Unmatched Employee Names ({parseResult.unmatchedNames.length}):
              </p>
              <p>
                The following names in Excel do not exist in your employee directory:{' '}
                <span className="font-semibold">{parseResult.unmatchedNames.join(', ')}</span>.
                These records will NOT be imported automatically. Please create these employees in the Employees section first.
              </p>
            </div>
          )}

          {parseResult.ambiguousNames.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Ambiguous Matches ({parseResult.ambiguousNames.length}):
              </p>
              <p>
                Multiple employees exist with name:{' '}
                <span className="font-semibold">{parseResult.ambiguousNames.join(', ')}</span>.
                Please select the intended Employee ID in the preview table below before importing.
              </p>
            </div>
          )}

          {/* Pre-Import Preview Table */}
          <div className="bg-white border border-slate-200/90 rounded-xl shadow-2xs overflow-hidden">
            {/* Tab Filter Header */}
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setPreviewTab('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    previewTab === 'all'
                      ? 'bg-[#003D5C] text-white shadow-xs'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  All ({parseResult.previewItems.length})
                </button>
                <button
                  onClick={() => setPreviewTab('matched')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    previewTab === 'matched'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  Ready ({parseResult.stats.matchedCount})
                </button>
                {parseResult.stats.ambiguousCount > 0 && (
                  <button
                    onClick={() => setPreviewTab('ambiguous')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                      previewTab === 'ambiguous'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-amber-700 hover:bg-amber-50'
                    }`}
                  >
                    Ambiguous ({parseResult.stats.ambiguousCount})
                  </button>
                )}
                {parseResult.stats.unmatchedCount > 0 && (
                  <button
                    onClick={() => setPreviewTab('unmatched')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                      previewTab === 'unmatched'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-rose-700 hover:bg-rose-50'
                    }`}
                  >
                    Unmatched ({parseResult.stats.unmatchedCount})
                  </button>
                )}
                {parseResult.stats.duplicateCount > 0 && (
                  <button
                    onClick={() => setPreviewTab('duplicate')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                      previewTab === 'duplicate'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-blue-700 hover:bg-blue-50'
                    }`}
                  >
                    Duplicates ({parseResult.stats.duplicateCount})
                  </button>
                )}
              </div>

              {parseResult.errorDetails.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadErrorReport}
                  className="text-xs font-bold text-slate-700 border-slate-200 gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-[#009D9E]" />
                  Download Problem Report ({parseResult.errorDetails.length})
                </Button>
              )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 sticky top-0 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider z-10">
                  <tr>
                    <th className="py-3 px-4">Excel Employee Name</th>
                    <th className="py-3 px-4">Matched Employee ID</th>
                    <th className="py-3 px-4">Date & Day</th>
                    <th className="py-3 px-4">In Time</th>
                    <th className="py-3 px-4">Arrival Status</th>
                    <th className="py-3 px-4">Out Time</th>
                    <th className="py-3 px-4">Departure Status</th>
                    <th className="py-3 px-4">Working Time</th>
                    <th className="py-3 px-4">Match Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {displayedPreviewItems.map((item) => (
                    <tr
                      key={item.key}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        item.matchStatus === 'UNMATCHED'
                          ? 'bg-rose-50/30'
                          : item.matchStatus === 'AMBIGUOUS'
                          ? 'bg-amber-50/30'
                          : item.isDuplicateExisting
                          ? 'bg-blue-50/30'
                          : ''
                      }`}
                    >
                      {/* Name */}
                      <td className="py-3 px-4 font-bold text-slate-900">{item.rawEmployeeName}</td>

                      {/* Matched ID */}
                      <td className="py-3 px-4 font-mono font-semibold">
                        {item.matchStatus === 'MATCHED' ? (
                          <span className="text-[#003D5C]">{item.employee?.employee_id}</span>
                        ) : item.matchStatus === 'AMBIGUOUS' ? (
                          <Select
                            value={ambiguousResolutions[item.key] || ''}
                            onValueChange={(val) => handleResolveAmbiguous(item.key, val || '')}
                          >
                            <SelectTrigger className="h-7 text-[11px] border-amber-300 w-36">
                              <SelectValue placeholder="Select Employee" />
                            </SelectTrigger>
                            <SelectContent>
                              {item.candidates?.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.employee_id} ({c.designation})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-slate-400 italic">Not in DB</span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800">{item.date}</span>
                        <span className="block text-[11px] text-slate-400">{item.dayName}</span>
                      </td>

                      {/* In Time */}
                      <td className="py-3 px-4 font-mono font-medium">{item.inTime || '--'}</td>

                      {/* Arrival Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            item.arrivalStatus === 'On Time Arrival'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.arrivalStatus === 'Late Arrival'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.arrivalStatus}
                        </span>
                      </td>

                      {/* Out Time */}
                      <td className="py-3 px-4 font-mono font-medium">{item.outTime || '--'}</td>

                      {/* Departure Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            item.departureStatus === 'On Time Departure'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.departureStatus === 'Early Departure'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.departureStatus}
                        </span>
                      </td>

                      {/* Working Time */}
                      <td className="py-3 px-4 font-mono font-bold">{item.totalWorkingHoursFormatted}</td>

                      {/* Match Status Tag */}
                      <td className="py-3 px-4">
                        {item.matchStatus === 'MATCHED' && !item.isDuplicateExisting && (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Matched
                          </span>
                        )}
                        {item.matchStatus === 'MATCHED' && item.isDuplicateExisting && (
                          <span className="inline-flex items-center gap-1 text-blue-700 font-bold text-[11px]">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Duplicate Date
                          </span>
                        )}
                        {item.matchStatus === 'AMBIGUOUS' && (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-[11px]">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Ambiguous
                          </span>
                        )}
                        {item.matchStatus === 'UNMATCHED' && (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-bold text-[11px]">
                            <XCircle className="w-3.5 h-3.5" />
                            Unmatched
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Import Controls & Confirmation Box */}
          <div className="bg-[#001E2F] text-slate-100 rounded-xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
            <div className="space-y-2">
              <h3 className="font-['Montserrat'] text-base font-bold text-[#CAE6FF]">
                Ready to Import Validated Attendance Records?
              </h3>
              <p className="text-xs text-slate-300">
                Only matched employees and resolved ambiguous rows will be inserted into the database. Unmatched rows will be skipped safely.
              </p>

              {/* Duplicate Strategy Option */}
              <div className="flex items-center gap-4 pt-2">
                <span className="text-xs font-semibold text-slate-300">If record already exists:</span>
                <label className="flex items-center gap-1.5 text-xs text-slate-200 cursor-pointer">
                  <input
                    type="radio"
                    name="dupStrategy"
                    value="skip"
                    checked={duplicateStrategy === 'skip'}
                    onChange={() => setDuplicateStrategy('skip')}
                    className="accent-[#009D9E]"
                  />
                  <span>Skip existing</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-200 cursor-pointer">
                  <input
                    type="radio"
                    name="dupStrategy"
                    value="overwrite"
                    checked={duplicateStrategy === 'overwrite'}
                    onChange={() => setDuplicateStrategy('overwrite')}
                    className="accent-[#009D9E]"
                  />
                  <span>Overwrite / Update existing</span>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Button
                variant="outline"
                onClick={() => {
                  setParseResult(null)
                  setFile(null)
                }}
                className="text-xs font-bold text-slate-300 border-slate-700 hover:bg-slate-800"
              >
                Cancel / Re-upload
              </Button>

              <Button
                onClick={handleCommitImport}
                disabled={isCommitting || parseResult.stats.matchedCount === 0}
                className="bg-[#009D9E] hover:bg-[#007A7A] text-white px-6 py-3 font-bold uppercase tracking-wider text-xs gap-2 shadow-sm transition-colors"
              >
                {isCommitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Saving Records...
                  </>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4" />
                    Confirm & Save to Database
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 5: Post-Import Summary Screen */}
      {importSummary && (
        <Card className="bg-white border border-slate-200 shadow-lg rounded-xl overflow-hidden p-8 text-center max-w-2xl mx-auto space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h3 className="font-['Montserrat'] text-2xl font-extrabold text-[#003D5C]">
              Import Completed Successfully!
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Attendance records have been processed and safely stored into the database.
            </p>
          </div>

          {/* Metrics Breakdown Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Submitted</p>
              <p className="text-lg font-bold text-slate-800 mt-0.5">{importSummary.totalSubmitted}</p>
            </div>
            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
              <p className="text-[10px] text-emerald-600 font-bold uppercase">Imported</p>
              <p className="text-lg font-bold text-emerald-700 mt-0.5">{importSummary.savedCount}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
              <p className="text-[10px] text-blue-600 font-bold uppercase">Duplicates Skipped</p>
              <p className="text-lg font-bold text-blue-700 mt-0.5">{importSummary.skippedDuplicates}</p>
            </div>
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
              <p className="text-[10px] text-amber-600 font-bold uppercase">Sunday / Skipped</p>
              <p className="text-lg font-bold text-amber-700 mt-0.5">
                {parseResult?.stats.sundaySkippedCount || 0}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setFile(null)
                setParseResult(null)
                setImportSummary(null)
              }}
              className="text-xs font-bold uppercase tracking-wider"
            >
              Import Another File
            </Button>

            <Link href="/attendance/records">
              <Button className="bg-[#009D9E] hover:bg-[#007A7A] text-white text-xs font-bold uppercase tracking-wider gap-2">
                View Attendance Records
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  )
}
