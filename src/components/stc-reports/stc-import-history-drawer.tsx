'use client'

import React, { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Trash2,
  CheckCircle,
  Clock,
  Layers,
  Loader2,
  Eye,
} from 'lucide-react'
import type { StcReportImport } from '@/lib/supabase/database.types'

interface StcImportHistoryDrawerProps {
  isOpen: boolean
  onClose: () => void
  imports: StcReportImport[]
  activeImportId?: string | null
  onSelectImport: (importBatch: StcReportImport) => void
  onDeleteImport?: (id: string) => Promise<void>
  isLoading?: boolean
}

export default function StcImportHistoryDrawer({
  isOpen,
  onClose,
  imports,
  activeImportId,
  onSelectImport,
  onDeleteImport,
  isLoading = false,
}: StcImportHistoryDrawerProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  function formatDateTime(dateStr: string) {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  function formatFileSize(bytes: number) {
    if (!bytes || bytes === 0) return '0 KB'
    const k = 1024
    if (bytes < k) return `${bytes} B`
    if (bytes < k * k) return `${(bytes / k).toFixed(1)} KB`
    return `${(bytes / (k * k)).toFixed(1)} MB`
  }

  async function handleDownloadOriginal(importItem: StcReportImport) {
    try {
      setDownloadingId(importItem.id)
      const res = await fetch(`/api/stc/reports/${importItem.id}/download`)
      if (!res.ok) {
        throw new Error('Failed to download original file.')
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = importItem.file_name || 'STC_Student_Report.xlsx'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      alert(err.message || 'Download failed.')
    } finally {
      setDownloadingId(null)
    }
  }

  async function handleDelete(id: string, fileName: string) {
    if (!onDeleteImport) return
    if (!confirm(`Are you sure you want to delete "${fileName}" and all its records from the database?`)) return
    try {
      setDeletingId(id)
      await onDeleteImport(id)
    } catch (err: any) {
      alert(err.message || 'Delete failed.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md md:max-w-lg p-0 flex flex-col bg-slate-50">
        <SheetHeader className="p-5 bg-gradient-to-r from-[#001E2F] to-[#0E3E5B] text-white border-b border-[#001E2F]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-white/10 backdrop-blur-md text-[#00BF8F] flex items-center justify-center font-bold border border-[#00BF8F]/30 shadow-inner">
              <FileSpreadsheet className="size-5" />
            </div>
            <div>
              <SheetTitle className="text-lg font-extrabold text-white tracking-tight">
                STC Import History
              </SheetTitle>
              <SheetDescription className="text-xs text-slate-300 font-medium">
                Review past Excel uploads, download original files, or roll back batches
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-500">
              <Loader2 className="size-6 animate-spin text-[#00BF8F]" />
              <span className="text-xs font-semibold">Loading import history...</span>
            </div>
          ) : imports.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-52 text-center p-6 bg-white rounded-2xl border border-dashed border-slate-200">
              <FileSpreadsheet className="size-10 text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-700">No Import History</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Uploaded STC Excel reports will appear here with original download archives.
              </p>
            </div>
          ) : (
            imports.map((item) => {
              const isActive = activeImportId === item.id
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all bg-white ${
                    isActive
                      ? 'border-[#00BF8F] shadow-sm ring-1 ring-[#00BF8F]/30'
                      : 'border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {item.file_name}
                        </span>
                        {isActive && (
                          <Badge className="bg-emerald-100 text-emerald-900 text-[10px] px-1.5 py-0 font-bold border-emerald-300">
                            Active Filter
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1 font-medium">
                          <Calendar className="size-3 text-slate-400" />
                          {formatDateTime(item.uploaded_at)}
                        </span>
                        <span>•</span>
                        <span className="font-medium">{formatFileSize(item.file_size)}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-100 text-[11px]">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Records</span>
                          <span className="font-bold text-slate-800">{item.total_records}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Pending</span>
                          <span className="font-bold text-amber-600 font-mono">
                            ${Number(item.total_pending_amount || 0).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Yet to Raised</span>
                          <span className="font-bold text-slate-800 font-mono">
                            ${Number(item.total_yet_to_raised || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2 mt-3.5 pt-2 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onSelectImport(item)
                        onClose()
                      }}
                      className="text-[11px] font-bold h-7 px-2.5 rounded-lg border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer"
                    >
                      <Eye className="size-3 mr-1 text-[#00BF8F]" />
                      <span>{isActive ? 'Selected' : 'View Records'}</span>
                    </Button>

                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={downloadingId === item.id}
                        onClick={() => handleDownloadOriginal(item)}
                        className="text-[11px] font-bold h-7 px-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                        title="Download original uploaded Excel file"
                      >
                        {downloadingId === item.id ? (
                          <Loader2 className="size-3 animate-spin text-[#00BF8F]" />
                        ) : (
                          <Download className="size-3 mr-1 text-[#00BF8F]" />
                        )}
                        <span>Download</span>
                      </Button>

                      {onDeleteImport && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={deletingId === item.id}
                          onClick={() => handleDelete(item.id, item.file_name)}
                          className="text-[11px] font-bold h-7 px-2 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                          title="Delete import batch and all its records"
                        >
                          {deletingId === item.id ? (
                            <Loader2 className="size-3 animate-spin text-rose-600" />
                          ) : (
                            <Trash2 className="size-3 text-rose-500" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
