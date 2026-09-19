'use client'

import React, { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  SkipForward,
  Trash2,
  Users,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface StcUploadReportModalProps {
  isOpen: boolean
  onClose: () => void
  onUploadSuccess: (data: any) => void
}

interface PreviewData {
  fileName: string
  fileSize: number
  totalRecords: number
  matchingCount: number
  newCount: number
  sampleMatches: { student_name: string; student_id?: string | null; course?: string | null }[]
  sampleNew: { student_name: string; student_id?: string | null; course?: string | null }[]
  totalPendingAmount: number
  totalYetToRaised: number
}

export default function StcUploadReportModal({
  isOpen,
  onClose,
  onUploadSuccess,
}: StcUploadReportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [strategy, setStrategy] = useState<'override' | 'skip' | 'replace'>('override')
  const [showSampleList, setShowSampleList] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const formatAUD = (val: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      maximumFractionDigits: 0,
    }).format(val || 0)
  }

  async function handleFileSelection(selectedFile: File) {
    setError(null)
    setPreviewData(null)
    const validExts = ['.xlsx', '.xls', '.csv']
    const hasValidExt = validExts.some((ext) => selectedFile.name.toLowerCase().endsWith(ext))
    if (!hasValidExt) {
      setError('Please upload a valid Excel (.xlsx, .xls) or CSV file.')
      return
    }

    setFile(selectedFile)
    setIsPreviewing(true)

    // Call preview API to analyze Excel rows and detect matches with STC DB
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('preview', 'true')

      const res = await fetch('/api/stc/reports/import', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to inspect STC Excel file.')
      }

      setPreviewData(data)
    } catch (err: any) {
      console.error('STC preview error:', err)
      setError(err.message || 'Error previewing Excel contents.')
    } finally {
      setIsPreviewing(false)
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0])
    }
  }

  async function handleImportConfirm() {
    if (!file) {
      setError('Please select an Excel file first.')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('duplicateStrategy', strategy)

      const res = await fetch('/api/stc/reports/import', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to import STC student records to database.')
      }

      onUploadSuccess(data)
      handleClose()
    } catch (err: any) {
      console.error('Import error:', err)
      setError(err.message || 'An error occurred during database import.')
    } finally {
      setIsUploading(false)
    }
  }

  function handleClose() {
    if (isUploading) return
    setFile(null)
    setPreviewData(null)
    setError(null)
    setShowSampleList(false)
    setStrategy('override')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isUploading && handleClose()}>
      <DialogContent className="w-[96vw] max-w-2xl bg-white border border-slate-200/90 text-slate-900 p-0 overflow-hidden shadow-2xl rounded-2xl flex flex-col font-sans">
        {/* Modal Header */}
        <div className="relative bg-gradient-to-r from-[#001E2F] via-[#0E3E5B] to-[#00BF8F]/40 p-5 sm:p-6 text-white flex items-center justify-between shrink-0 border-b border-[#001E2F]">
          <div className="flex items-center gap-3.5">
            <div className="size-11 rounded-2xl bg-white/10 backdrop-blur-md text-[#00BF8F] flex items-center justify-center font-bold border border-[#00BF8F]/30 shadow-inner">
              <UploadCloud className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Import STC Excel Sheet
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-300 font-medium mt-0.5">
                States College Australia • Live Database Sync & Duplicate Resolution
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Drag & Drop Upload Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-[#00BF8F] bg-emerald-50/50 scale-[0.99]'
                : file
                ? 'border-[#00BF8F]/70 bg-emerald-50/20'
                : 'border-slate-200 hover:border-[#00BF8F]/50 hover:bg-slate-50/70'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileSelection(e.target.files[0])
                }
              }}
              className="hidden"
            />

            {file ? (
              <div className="flex items-center justify-center gap-3">
                <div className="size-10 rounded-xl bg-emerald-100 text-[#00BF8F] flex items-center justify-center">
                  <FileSpreadsheet className="size-5" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-900 truncate max-w-[280px] sm:max-w-md">
                    {file.name}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {(file.size / 1024).toFixed(1)} KB • Click to choose different file
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="size-10 rounded-full bg-slate-100 text-slate-500 mx-auto flex items-center justify-center">
                  <UploadCloud className="size-5" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-slate-800">
                    Click to browse or drag & drop STC student Excel sheet
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Supports Microsoft Excel (.xlsx, .xls) and CSV
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Loading Preview Analysis */}
          {isPreviewing && (
            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-slate-700 flex items-center justify-center gap-2.5 text-xs font-semibold animate-pulse">
              <Loader2 className="size-4 animate-spin text-[#00BF8F]" />
              <span>Analyzing STC Excel columns and checking existing live database records...</span>
            </div>
          )}

          {/* Error Notice */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0 text-rose-600" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Preview Analysis Results */}
          {previewData && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
              {/* Summary Stats Grid */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Rows</p>
                  <p className="text-lg font-extrabold text-[#001E2F] mt-0.5">{previewData.totalRecords}</p>
                  <p className="text-[10px] text-slate-400 font-medium">In Excel file</p>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/90 text-center">
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Matches STC DB</p>
                  <p className="text-lg font-extrabold text-amber-900 mt-0.5">{previewData.matchingCount}</p>
                  <p className="text-[10px] text-amber-700/80 font-medium">Already exists</p>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/90 text-center">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">New Students</p>
                  <p className="text-lg font-extrabold text-emerald-900 mt-0.5">{previewData.newCount}</p>
                  <p className="text-[10px] text-emerald-700/80 font-medium">Ready to add</p>
                </div>
              </div>

              {/* Duplicate Handling Strategies (Radio Selection) */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-[#001E2F] flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-[#00BF8F]" /> Select Import Strategy for Matching Records:
                </label>

                <div className="space-y-2">
                  {/* Option 1: Override */}
                  <label
                    onClick={() => setStrategy('override')}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      strategy === 'override'
                        ? 'border-[#00BF8F] bg-emerald-50/70 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="pt-0.5">
                      <div
                        className={`size-4 rounded-full border flex items-center justify-center ${
                          strategy === 'override'
                            ? 'border-[#00BF8F] bg-[#00BF8F] text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {strategy === 'override' && <Check className="size-2.5 stroke-[3]" />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-slate-900">
                          Override / Update Matches
                        </span>
                        <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100 text-[10px] px-2 py-0 font-bold border border-emerald-300">
                          Recommended
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                        Update existing matching student records with new values from Excel, and insert any new students.
                      </p>
                    </div>
                  </label>

                  {/* Option 2: Skip */}
                  <label
                    onClick={() => setStrategy('skip')}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      strategy === 'skip'
                        ? 'border-amber-500 bg-amber-50/60 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="pt-0.5">
                      <div
                        className={`size-4 rounded-full border flex items-center justify-center ${
                          strategy === 'skip'
                            ? 'border-amber-500 bg-amber-500 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {strategy === 'skip' && <Check className="size-2.5 stroke-[3]" />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-slate-900">
                          Skip Matching Records
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                        Keep existing database records completely untouched. Only insert new non-matching student rows.
                      </p>
                    </div>
                  </label>

                  {/* Option 3: Replace All */}
                  <label
                    onClick={() => setStrategy('replace')}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      strategy === 'replace'
                        ? 'border-rose-500 bg-rose-50/60 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="pt-0.5">
                      <div
                        className={`size-4 rounded-full border flex items-center justify-center ${
                          strategy === 'replace'
                            ? 'border-rose-500 bg-rose-500 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {strategy === 'replace' && <Check className="size-2.5 stroke-[3]" />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-rose-700">
                          Replace All Previous Records
                        </span>
                        <Badge variant="destructive" className="text-[10px] px-2 py-0 font-bold">
                          Danger
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                        Wipes out existing STC report records and replaces them completely with the newly uploaded Excel sheet.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Sample Matches Dropdown Preview */}
              {previewData.matchingCount > 0 && previewData.sampleMatches.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/40">
                  <button
                    type="button"
                    onClick={() => setShowSampleList(!showSampleList)}
                    className="w-full flex items-center justify-between p-3 text-xs font-bold text-slate-700 hover:bg-slate-100/70 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Users className="size-3.5 text-amber-600" />
                      <span>Preview Matching Students ({previewData.sampleMatches.length} sample of {previewData.matchingCount})</span>
                    </span>
                    {showSampleList ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  </button>

                  {showSampleList && (
                    <div className="p-3 pt-0 space-y-1.5 border-t border-slate-100">
                      {previewData.sampleMatches.map((m, idx) => (
                        <div key={idx} className="text-[11px] bg-white p-2 rounded-lg border border-slate-200/80 flex items-center justify-between">
                          <span className="font-bold text-slate-900">{m.student_name}</span>
                          <span className="text-slate-500">{m.student_id ? `ID: ${m.student_id}` : 'No ID'} • {m.course || 'No Course'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={handleClose}
            className="text-xs font-bold h-9 px-4 rounded-xl border-slate-300 hover:bg-slate-100 cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={!previewData || isUploading || isPreviewing}
            onClick={handleImportConfirm}
            className="bg-[#00BF8F] hover:bg-[#008f6b] text-[#001E2F] text-xs font-extrabold h-9 px-5 rounded-xl gap-2 shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Importing to Live DB...</span>
              </>
            ) : (
              <>
                <span>Commit {previewData?.totalRecords || ''} Records</span>
                <ArrowRight className="size-3.5" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
