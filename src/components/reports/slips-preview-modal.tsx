'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  FileText,
  ExternalLink,
  Download,
  Image as ImageIcon,
  Check,
  X,
  FileCheck,
} from 'lucide-react'
import type { ReportSlip } from '@/types/report-slip.types'
import {
  formatFileSize,
  downloadReportSlip,
  createBlobUrlFromSlip,
} from '@/lib/utils/slip-compression'
import PdfSlipPreview from './pdf-slip-preview'

interface SlipsPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  slips: ReportSlip[]
  initialIndex?: number
  title?: string
}

export default function SlipsPreviewModal({
  isOpen,
  onClose,
  slips,
  initialIndex = 0,
  title = 'Supporting Slips / Receipts',
}: SlipsPreviewModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(initialIndex)

  useEffect(() => {
    if (initialIndex >= 0 && initialIndex < slips.length) {
      setSelectedIndex(initialIndex)
    } else {
      setSelectedIndex(0)
    }
  }, [initialIndex, slips])

  if (!isOpen || slips.length === 0) return null

  const currentSlip = slips[selectedIndex] || slips[0]
  if (!currentSlip) return null

  const isCurrentPdf = currentSlip.type === 'pdf'

  const handleOpenInNewTab = () => {
    try {
      const blobUrl = createBlobUrlFromSlip(currentSlip)
      window.open(blobUrl, '_blank')
    } catch {
      window.open(currentSlip.data, '_blank')
    }
  }

  const handleDownload = () => {
    downloadReportSlip(currentSlip)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[96vw] max-w-4xl max-h-[95vh] bg-white border border-slate-200/90 text-slate-900 p-5 sm:p-6 overflow-y-auto shadow-2xl rounded-3xl font-sans">
        {/* 1. Header with title & index counter */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/60 shadow-2xs">
              <FileCheck className="size-4.5" />
            </div>
            <DialogTitle className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
              {title} ({slips.length})
            </DialogTitle>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Viewing slip #{selectedIndex + 1} of {slips.length}
          </span>
        </div>

        {/* 2. Main Large Preview Viewer Box */}
        <div className="mt-4 border border-slate-200/90 bg-slate-50/60 rounded-2xl overflow-hidden shadow-xs">
          {/* Document Content View */}
          <div className="w-full bg-slate-100 flex items-center justify-center min-h-[350px] sm:min-h-[500px] max-h-[560px] overflow-auto p-2 sm:p-4">
            {isCurrentPdf ? (
              <PdfSlipPreview
                dataUrl={currentSlip.data}
                fileName={currentSlip.name}
                onOpenNewTab={handleOpenInNewTab}
                onDownload={handleDownload}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-2">
                <img
                  src={currentSlip.data}
                  alt={currentSlip.name}
                  className="max-h-[480px] w-auto max-w-full rounded-xl shadow-md border border-slate-200/80 object-contain bg-white"
                />
              </div>
            )}
          </div>

          {/* Action Toolbar Below Preview */}
          <div className="bg-white p-3.5 sm:p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              {isCurrentPdf ? (
                <div className="flex items-center gap-2 text-rose-600">
                  <span className="bg-rose-100 text-rose-700 size-6 rounded-lg flex items-center justify-center font-extrabold text-[10px]">
                    PDF
                  </span>
                  <span>PDF Slip #{selectedIndex + 1} of {slips.length}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-emerald-700">
                  <span className="bg-emerald-100 text-emerald-700 size-6 rounded-lg flex items-center justify-center font-extrabold text-[10px]">
                    IMG
                  </span>
                  <span>Image Slip #{selectedIndex + 1} of {slips.length}</span>
                </div>
              )}
              <span className="text-slate-400 font-normal">
                • {formatFileSize(currentSlip.compressedSize || currentSlip.originalSize || (currentSlip as any).fileSize || 0)}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                onClick={handleOpenInNewTab}
                className="bg-[#00BF8F] hover:bg-[#00A87D] text-white font-bold text-xs h-9 px-4 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-all active:scale-95"
              >
                <ExternalLink className="size-3.5" />
                <span>Open {isCurrentPdf ? 'PDF' : 'Image'} in New Tab</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleDownload}
                className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs h-9 px-4 rounded-xl shadow-2xs cursor-pointer flex items-center gap-1.5 transition-all"
              >
                <Download className="size-3.5 text-slate-600" />
                <span>Download</span>
              </Button>
            </div>
          </div>
        </div>

        {/* 3. Below Preview: SELECT SLIP Selector Cards */}
        <div className="mt-5 space-y-2.5">
          <h4 className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
            SELECT SLIP ({slips.length} ATTACHED)
          </h4>

          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {slips.map((slip, idx) => {
              const isSelected = idx === selectedIndex
              const isPdf = slip.type === 'pdf'

              return (
                <button
                  key={slip.id || idx}
                  type="button"
                  onClick={() => setSelectedIndex(idx)}
                  className={`relative shrink-0 flex flex-col items-center justify-center p-2.5 rounded-2xl transition-all cursor-pointer min-w-[90px] h-[78px] text-center ${
                    isSelected
                      ? 'border-2 border-emerald-500 bg-emerald-50/50 shadow-sm ring-2 ring-emerald-500/20'
                      : 'border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs'
                  }`}
                >
                  {/* Active dot indicator on top-right */}
                  {isSelected && (
                    <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-emerald-500" />
                  )}

                  {isPdf ? (
                    <div className="flex flex-col items-center gap-1">
                      <div className="size-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                        <FileText className="size-4.5" />
                      </div>
                      <span className="text-[10.5px] font-extrabold text-rose-700">
                        PDF #{idx + 1}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <div className="size-8 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
                        <img
                          src={slip.data}
                          alt={slip.name}
                          className="size-full object-cover"
                        />
                      </div>
                      <span className="text-[10.5px] font-extrabold text-emerald-800">
                        IMG #{idx + 1}
                      </span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* 4. Footer with Close View button */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs h-9 px-6 rounded-xl cursor-pointer"
          >
            Close View
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
