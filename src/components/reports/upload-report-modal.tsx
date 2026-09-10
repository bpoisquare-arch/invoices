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
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react'

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
      <DialogContent className="w-[95vw] max-w-lg bg-white border border-slate-200 text-slate-900 p-6 shadow-2xl rounded-2xl">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2 font-['Montserrat']">
            <div className="size-8 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center border border-cyan-200">
              <UploadCloud className="size-4.5" />
            </div>
            Upload Student Excel Report
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Upload student spreadsheet to automatically extract pending invoices, courses, agents & amounts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-7 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
              isDragging
                ? 'border-cyan-500 bg-cyan-50/50 scale-[0.99]'
                : file
                ? 'border-emerald-500 bg-emerald-50/50'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50'
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
                <div className="size-12 rounded-2xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center border border-emerald-200 shadow-xs">
                  <FileSpreadsheet className="size-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 truncate max-w-[320px]">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {(file.size / 1024).toFixed(1)} KB • Click to choose another file
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="size-12 rounded-2xl bg-cyan-50 text-cyan-700 mx-auto flex items-center justify-center border border-cyan-200/80 shadow-xs">
                  <UploadCloud className="size-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Click to browse or drag & drop file here
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Supports Microsoft Excel (.xlsx, .xls) and CSV
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Error notice */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Info note */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
            <span className="font-bold text-slate-800 block">
              💡 Extracted 8 Columns for Data Table:
            </span>
            <p>
              Sr No, Student Name, Agent, Pending Invoice, Pending Amount, Yet to Raised, Intake, Course.
            </p>
            <p className="text-slate-500 text-[10px]">
              The original file is stored in the database for exact downloads at any time.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            disabled={isUploading}
            onClick={onClose}
            className="border-slate-200 bg-white text-slate-700 hover:bg-slate-100 rounded-xl text-xs"
          >
            Cancel
          </Button>

          <Button
            type="button"
            disabled={!file || isUploading}
            onClick={handleUpload}
            className="bg-[#003D5C] hover:bg-[#002b42] text-white font-bold gap-1.5 shadow-sm rounded-xl text-xs cursor-pointer"
          >
            {isUploading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Processing & Saving to DB...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="size-4" />
                <span>Process & Import</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
