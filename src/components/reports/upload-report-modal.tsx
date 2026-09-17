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
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, X, Sparkles } from 'lucide-react'

interface UploadReportModalProps {
  isOpen: boolean
  onClose: () => void
  onUploadSuccess: (data: any) => void
}

export default function UploadReportModal({
  isOpen,
  onClose,
  onUploadSuccess,
}: UploadReportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileSelection(selectedFile: File) {
    setError(null)
    const validExts = ['.xlsx', '.xls', '.csv']
    const hasValidExt = validExts.some((ext) => selectedFile.name.toLowerCase().endsWith(ext))
    if (!hasValidExt) {
      setError('Please upload a valid Excel (.xlsx, .xls) or CSV file.')
      return
    }
    setFile(selectedFile)
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

  async function handleUpload() {
    if (!file) {
      setError('Please select an Excel file first.')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/reports/import', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload and parse the Excel file.')
      }

      onUploadSuccess(data)
      setFile(null)
      onClose()
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'An error occurred during file upload.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isUploading) {
          setFile(null)
          setError(null)
          onClose()
        }
      }}
    >
      <DialogContent className="w-[95vw] max-w-lg bg-white border border-slate-200/90 text-slate-900 p-0 shadow-2xl rounded-2xl overflow-hidden font-sans">
        {/* Header with Navy Gradient */}
        <div className="bg-gradient-to-r from-[#002D42] via-[#003D5C] to-[#00283d] p-5 text-white flex items-center justify-between border-b border-[#002D42]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-white/10 backdrop-blur-md text-cyan-300 flex items-center justify-center border border-cyan-400/20 shadow-inner shrink-0">
              <UploadCloud className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-extrabold text-white tracking-tight font-['Montserrat']">
                Upload Student Excel Report
              </DialogTitle>
              <DialogDescription className="text-xs text-cyan-200/80 mt-0.5">
                Automatically extract student invoices, courses, agents & amounts.
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
              isDragging
                ? 'border-[#009D9E] bg-cyan-50/50 scale-[0.99]'
                : file
                ? 'border-emerald-500 bg-emerald-50/40'
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
              <div className="space-y-2.5">
                <div className="size-13 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white mx-auto flex items-center justify-center shadow-md shadow-emerald-500/20">
                  <FileSpreadsheet className="size-6" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-slate-900 truncate max-w-[320px]">
                    {file.name}
                  </p>
                  <p className="text-xs text-emerald-700 font-semibold mt-0.5">
                    {(file.size / 1024).toFixed(1)} KB • Ready to process
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="size-13 rounded-2xl bg-cyan-50 text-[#009D9E] mx-auto flex items-center justify-center border border-cyan-200/80 shadow-2xs">
                  <UploadCloud className="size-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Click to browse or drag & drop spreadsheet
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Supports Microsoft Excel (.xlsx, .xls) and CSV
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Error notice */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0 text-rose-600" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Info note */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 text-xs text-slate-600 space-y-1">
            <span className="font-bold text-[#003D5C] flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-[#009D9E]" /> Automatically Parsed Columns:
            </span>
            <p className="text-[11.5px] text-slate-500 leading-relaxed">
              Sr No, Student Name, Agent, Pending Invoice, Pending Amount, Yet to Raised, Intake Date, and Course.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 p-4.5 bg-slate-50/80 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            disabled={isUploading}
            onClick={onClose}
            className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            type="button"
            disabled={!file || isUploading}
            onClick={handleUpload}
            className="bg-[#003D5C] hover:bg-[#002b42] text-white font-bold gap-2 shadow-sm rounded-xl text-xs cursor-pointer border border-cyan-500/20"
          >
            {isUploading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Processing & Saving to DB...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="size-4 text-cyan-300" />
                <span>Process & Import</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
