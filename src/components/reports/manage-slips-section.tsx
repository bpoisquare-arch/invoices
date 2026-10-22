'use client'

import React, { useRef, useState, useEffect, useCallback } from 'react'
import {
  Upload,
  FileText,
  Eye,
  Trash2,
  Loader2,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Download,
} from 'lucide-react'
import type { ReportSlip } from '@/types/report-slip.types'
import {
  createReportSlipFromFile,
  createReportSlipFromClipboardBlob,
  formatFileSize,
  downloadReportSlip,
  createBlobUrlFromSlip,
} from '@/lib/utils/slip-compression'
import SlipsPreviewModal from './slips-preview-modal'

interface ManageSlipsSectionProps {
  slips: ReportSlip[]
  onChange: (slips: ReportSlip[]) => void
  maxSlips?: number
  disabled?: boolean
  entityLabel?: string
}

export default function ManageSlipsSection({
  slips = [],
  onChange,
  maxSlips = 10,
  disabled = false,
  entityLabel,
}: ManageSlipsSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropzoneRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isCompressing, setIsCompressing] = useState(false)
  const [compressionStatus, setCompressionStatus] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewIndex, setPreviewIndex] = useState(0)

  // Process uploaded files with compression
  const processFiles = useCallback(
    async (fileList: FileList | File[]) => {
      if (disabled) return
      setErrorMsg(null)
      const currentCount = slips.length
      const incoming = Array.from(fileList)

      if (currentCount + incoming.length > maxSlips) {
        setErrorMsg(`Maximum ${maxSlips} slips allowed. You currently have ${currentCount}.`)
        return
      }

      setIsCompressing(true)
      const newSlips: ReportSlip[] = []

      try {
        for (let i = 0; i < incoming.length; i++) {
          const file = incoming[i]
          setCompressionStatus(`Compressing ${file.name} (${i + 1}/${incoming.length})...`)
          try {
            const slip = await createReportSlipFromFile(file)
            newSlips.push(slip)
          } catch (fileErr: any) {
            console.error('File compression error:', fileErr)
            setErrorMsg(fileErr?.message || `Failed to process ${file.name}`)
          }
        }

        if (newSlips.length > 0) {
          onChange([...slips, ...newSlips])
        }
      } finally {
        setIsCompressing(false)
        setCompressionStatus(null)
      }
    },
    [disabled, maxSlips, onChange, slips]
  )

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (disabled) return

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files)
    }
  }

  // Handle File Input Change
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(e.target.files)
      e.target.value = ''
    }
  }

  // Handle Clipboard Paste (Ctrl+V)
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (disabled || isCompressing) return
      const items = e.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile()
          if (blob) {
            if (slips.length >= maxSlips) {
              setErrorMsg(`Maximum ${maxSlips} receipts allowed.`)
              return
            }

            e.preventDefault()
            setIsCompressing(true)
            setCompressionStatus('Compressing pasted clipboard image...')
            try {
              const slip = await createReportSlipFromClipboardBlob(blob)
              onChange([...slips, slip])
            } catch (err: any) {
              setErrorMsg(err?.message || 'Failed to paste image.')
            } finally {
              setIsCompressing(false)
              setCompressionStatus(null)
            }
            break
          }
        }
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [disabled, isCompressing, maxSlips, onChange, slips])

  const handleDeleteSlip = (indexToDelete: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (disabled) return
    const updated = slips.filter((_, idx) => idx !== indexToDelete)
    onChange(updated)
  }

  const handlePreviewSlip = (indexToPreview: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setPreviewIndex(indexToPreview)
    setPreviewOpen(true)
  }

  return (
    <div className="space-y-3.5 pt-1">
      {/* 1. Header Row */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-extrabold uppercase tracking-wider text-slate-800 text-[11px] sm:text-xs">
          MANAGE SLIPS / RECEIPTS ({slips.length}/{maxSlips})
        </span>
        <span className="text-[10.5px] font-medium text-slate-400">
          PDF (up to 30MB) • JPG / PNG (up to 10MB)
        </span>
      </div>

      {/* 2. Upload Dropzone Box */}
      <div
        ref={dropzoneRef}
        onClick={() => !disabled && !isCompressing && fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer select-none ${
          disabled
            ? 'opacity-60 cursor-not-allowed bg-slate-50 border-slate-200'
            : isDragging
            ? 'border-emerald-500 bg-emerald-50/80 scale-[1.01]'
            : 'border-slate-200/90 hover:border-emerald-400 bg-slate-50/50 hover:bg-emerald-50/20'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="application/pdf,image/png,image/jpeg,image/webp,image/jpg"
          onChange={handleFileInputChange}
          disabled={disabled || isCompressing}
          className="hidden"
        />

        {isCompressing ? (
          <div className="flex flex-col items-center justify-center py-2 space-y-2">
            <Loader2 className="size-8 animate-spin text-emerald-600" />
            <p className="text-xs font-bold text-emerald-800">
              {compressionStatus || 'Compressing slip file...'}
            </p>
            <span className="text-[10.5px] text-slate-500">
              Optimizing file size to preserve database speed & storage.
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-1.5">
            {/* Circular Green Upload Icon */}
            <div className="size-11 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-1 shadow-xs">
              <Upload className="size-5 stroke-[2.2]" />
            </div>

            <p className="text-xs sm:text-[13px] font-extrabold text-slate-800">
              Add More Slips (Click, Drag & Drop, or Paste image Ctrl+V)
            </p>

            <p className="text-[11px] text-slate-500 max-w-md">
              Attach up to 10 receipts • Paste copied images directly • Click Preview on any slip
            </p>
          </div>
        )}
      </div>

      {/* Error Message if any */}
      {errorMsg && (
        <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
          <AlertCircle className="size-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 3. Attached Slips Section */}
      {slips.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-slate-800 text-[11px]">
              Attached Slips ({slips.length})
            </span>
            <span className="text-[11px] font-bold text-emerald-700">
              Open in new tab or download any attachment
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {slips.map((slip, idx) => {
              const isPdf = slip.type === 'pdf'
              const displayName =
                slip.name.length > 18 ? `${slip.name.substring(0, 15)}...` : slip.name

              return (
                <div
                  key={slip.id || idx}
                  onClick={(e) => handlePreviewSlip(idx, e)}
                  className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs hover:border-emerald-400 hover:shadow-xs transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Icon / Thumbnail Box */}
                    {isPdf ? (
                      <div className="size-10 rounded-lg bg-rose-50 border border-rose-100 flex flex-col items-center justify-center text-rose-600 shrink-0">
                        <FileText className="size-4.5" />
                        <span className="text-[8px] font-extrabold tracking-tighter uppercase text-rose-700">
                          PDF
                        </span>
                      </div>
                    ) : (
                      <div className="size-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center shrink-0">
                        <img
                          src={slip.data}
                          alt={slip.name}
                          className="size-full object-cover"
                        />
                      </div>
                    )}

                    {/* Slip Details & Badges */}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate" title={slip.name}>
                        #{idx + 1}. {displayName}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {isPdf ? (
                          <span className="bg-rose-100 text-rose-700 text-[9.5px] font-extrabold px-1.5 py-0.2 rounded">
                            PDF
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-800 text-[9.5px] font-extrabold px-1.5 py-0.2 rounded">
                            IMAGE
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-medium">Saved</span>
                        {slip.compressedSize ? (
                          <span className="text-[9.5px] text-slate-400 font-mono">
                            • {formatFileSize(slip.compressedSize)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions: Open in new tab, Download & Trash */}
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        try {
                          const blobUrl = createBlobUrlFromSlip(slip)
                          window.open(blobUrl, '_blank')
                        } catch {
                          window.open(slip.data, '_blank')
                        }
                      }}
                      title="Open in new tab"
                      className="size-7 rounded-lg text-slate-400 hover:text-[#00BF8F] hover:bg-emerald-50 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <ExternalLink className="size-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        downloadReportSlip(slip)
                      }}
                      title="Download slip"
                      className="size-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Download className="size-3.5" />
                    </button>

                    {!disabled && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSlip(idx, e)}
                        title="Remove slip"
                        className="size-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 4. Full Preview Modal */}
      <SlipsPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        slips={slips}
        initialIndex={previewIndex}
        title={entityLabel ? `${entityLabel} Supporting Slips / Receipts` : 'Supporting Slips / Receipts'}
      />
    </div>
  )
}
