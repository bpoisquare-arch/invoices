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

interface UploadReportModalProps {
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

export default function UploadReportModal({
  isOpen,
  onClose,
  onUploadSuccess,
}: UploadReportModalProps) {
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

    // Call preview API to analyze Excel rows and detect matches with DB
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('preview', 'true')

      const res = await fetch('/api/reports/import', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to inspect Excel file.')
      }

      setPreviewData(data)
    } catch (err: any) {
      console.error('Preview error:', err)
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

      const res = await fetch('/api/reports/import', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to import student report records to database.')
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="w-[95vw] max-w-xl bg-white border border-slate-200 text-slate-900 p-0 shadow-2xl rounded-2xl overflow-hidden font-sans max-h-[90vh] flex flex-col">
        {/* Header with Premium Navy Gradient */}
        <div className="bg-gradient-to-r from-[#002D42] via-[#003D5C] to-[#00283d] p-5 text-white flex items-center justify-between border-b border-[#002D42] shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-white/10 backdrop-blur-md text-cyan-300 flex items-center justify-center border border-cyan-400/20 shadow-inner shrink-0">
              <UploadCloud className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-extrabold text-white tracking-tight font-['Montserrat']">
                Import Student Excel Report
              </DialogTitle>
              <DialogDescription className="text-xs text-cyan-200/80 mt-0.5">
                Upload Excel sheet, detect matches with live database, and choose import strategy.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Content Body (Scrollable) */}
        <div className="p-6 space-y-4.5 overflow-y-auto flex-1">
          {/* Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isPreviewing && !isUploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
              isDragging
                ? 'border-[#009D9E] bg-cyan-50/50 scale-[0.99]'
                : file
                ? 'border-emerald-500/80 bg-emerald-50/30'
                : 'border-slate-300/80 hover:border-[#009D9E] bg-slate-50/60 hover:bg-slate-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelection(e.target.files[0])
                }
              }}
            />

            {file ? (
              <div className="space-y-2">
                <div className="size-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white mx-auto flex items-center justify-center shadow-md shadow-emerald-500/20">
                  <FileSpreadsheet className="size-5" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-extrabold text-slate-900 truncate max-w-[360px] mx-auto">
                    {file.name}
                  </p>
                  <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                    {(file.size / 1024).toFixed(1)} KB • Click or drop another file to change
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="size-11 rounded-xl bg-cyan-50 text-[#009D9E] mx-auto flex items-center justify-center border border-cyan-200/80 shadow-2xs">
                  <UploadCloud className="size-5" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-slate-800">
                    Click to browse or drag & drop student Excel sheet
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
            <div className="p-4 rounded-xl bg-cyan-50/70 border border-cyan-200 text-slate-700 flex items-center justify-center gap-2.5 text-xs font-semibold animate-pulse">
              <Loader2 className="size-4 animate-spin text-[#009D9E]" />
              <span>Analyzing Excel columns and checking existing live database records...</span>
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
                  <p className="text-lg font-extrabold text-[#003D5C] mt-0.5">{previewData.totalRecords}</p>
                  <p className="text-[10px] text-slate-400 font-medium">In Excel file</p>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/90 text-center">
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Matches DB</p>
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
                <label className="text-xs font-extrabold text-[#003D5C] flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-[#009D9E]" /> Select Import Strategy for Matching Records:
                </label>

                <div className="space-y-2">
                  {/* Option 1: Override */}
                  <label
                    onClick={() => setStrategy('override')}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      strategy === 'override'
                        ? 'border-[#009D9E] bg-cyan-50/70 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="pt-0.5">
                      <div
                        className={`size-4 rounded-full border flex items-center justify-center ${
                          strategy === 'override'
                            ? 'border-[#009D9E] bg-[#009D9E] text-white'
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
                        <Badge className="bg-cyan-100 text-cyan-900 hover:bg-cyan-100 text-[10px] px-2 py-0 font-bold border border-cyan-300">
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
                        <span className="text-xs font-extrabold text-slate-900">
                          Replace Entire Database
                        </span>
                        <Badge className="bg-rose-100 text-rose-900 hover:bg-rose-100 text-[10px] px-2 py-0 font-bold border border-rose-300">
                          Full Reset
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                        Clear previous report table records and replace with the incoming Excel data.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Sample Records Toggle */}
              {previewData.sampleMatches.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                  <button
                    type="button"
                    onClick={() => setShowSampleList(!showSampleList)}
                    className="w-full px-3.5 py-2 flex items-center justify-between text-xs font-semibold text-slate-700 hover:bg-slate-100/70 transition-colors"
                  >
                    <span>Preview sample matching students ({previewData.sampleMatches.length})</span>
                    {showSampleList ? <ChevronUp className="size-3.5 text-slate-500" /> : <ChevronDown className="size-3.5 text-slate-500" />}
                  </button>
                  {showSampleList && (
                    <div className="p-3 border-t border-slate-200 bg-white space-y-1.5 max-h-32 overflow-y-auto text-[11px]">
                      {previewData.sampleMatches.map((m, idx) => (
                        <div key={idx} className="flex items-center justify-between text-slate-700 py-0.5 border-b border-slate-100 last:border-0">
                          <span className="font-bold">{m.student_name}</span>
                          <span className="text-slate-400 font-mono text-[10px]">{m.student_id || 'No ID'} • {m.course || 'Course'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Auto Parsed Columns Guide */}
          {!previewData && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 text-xs text-slate-600 space-y-1">
              <span className="font-bold text-[#003D5C] flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-[#009D9E]" /> Automatically Parsed Columns:
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Sr No, Student Name, Student ID, Agent, Scholarship, Pending Invoices, Pending Amount, Yet to Raised, Intake Date, End Date, Course, Admin/Resource/Tuition Fees, Initial Payment & Total Paid.
              </p>
            </div>
          )}
        </div>

        {/* Footer Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 p-4 bg-slate-50/80 border-t border-slate-200 shrink-0">
          <Button
            type="button"
            variant="outline"
            disabled={isUploading || isPreviewing}
            onClick={handleClose}
            className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            type="button"
            disabled={!file || isUploading || isPreviewing}
            onClick={handleImportConfirm}
            className="bg-gradient-to-r from-[#003D5C] to-[#00283d] hover:from-[#002b42] hover:to-[#001f30] text-white font-bold gap-2 shadow-sm rounded-xl text-xs cursor-pointer border border-cyan-500/20 h-9.5 px-4.5"
          >
            {isUploading ? (
              <>
                <Loader2 className="size-4 animate-spin text-cyan-300" />
                <span>Saving to Live DB...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="size-4 text-cyan-300" />
                <span>Confirm & Import ({strategy})</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
