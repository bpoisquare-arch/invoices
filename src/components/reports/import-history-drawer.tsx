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
  ExternalLink,
  Eye,
} from 'lucide-react'
import type { AimtReportImport } from '@/lib/supabase/database.types'

interface ImportHistoryDrawerProps {
  isOpen: boolean
  onClose: () => void
  imports: AimtReportImport[]
  activeImportId?: string | null
  onSelectImport: (importBatch: AimtReportImport) => void
  onDeleteImport?: (id: string) => Promise<void>
  isLoading?: boolean
}

export default function ImportHistoryDrawer({
  isOpen,
  onClose,
  imports,
  activeImportId,
  onSelectImport,
  onDeleteImport,
  isLoading = false,
}: ImportHistoryDrawerProps) {
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

  async function handleDownloadOriginal(importItem: AimtReportImport) {
    try {
      setDownloadingId(importItem.id)
      const res = await fetch(`/api/reports/${importItem.id}/download`)
      if (!res.ok) {
        throw new Error('Failed to download original file.')
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = importItem.file_name || 'AIMT_Student_Report.xlsx'
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
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl bg-white border-l border-slate-200/90 text-slate-900 p-0 flex flex-col h-full shadow-2xl z-50 font-sans"
      >
        {/* Header */}
        <div className="p-5 border-b border-[#002D42] bg-gradient-to-r from-[#002D42] to-[#003D5C] text-white shrink-0">
          <SheetHeader>
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-white/10 text-cyan-300 flex items-center justify-center border border-cyan-400/20 shadow-inner">
                <Clock className="size-5" />
              </div>
              <div>
                <SheetTitle className="text-base sm:text-lg font-extrabold text-white tracking-tight font-['Montserrat']">
                  Excel Import History
                </SheetTitle>
                <SheetDescription className="text-xs text-cyan-200/80 mt-0.5">
                  Track uploaded batches & download exact original Excel files
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/50">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-2.5">
              <Loader2 className="size-7 animate-spin text-[#009D9E]" />
              <span className="text-xs font-semibold text-slate-700">Loading import history from database...</span>
            </div>
          ) : imports.length === 0 ? (
            <div className="text-center py-16 text-slate-500 border-2 border-dashed border-slate-200 rounded-2xl p-8 bg-white shadow-2xs">
              <div className="size-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
                <FileSpreadsheet className="size-7" />
              </div>
              <p className="text-sm font-bold text-slate-800">No Excel Files Uploaded Yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Upload your first student report Excel file to see its history here.
              </p>
            </div>
          ) : (
            imports.map((item) => {
              const isActive = activeImportId === item.id
              const isDeleting = deletingId === item.id
              const isDownloading = downloadingId === item.id

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isActive
                      ? 'bg-cyan-50/80 border-[#009D9E] shadow-sm'
                      : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`size-10 rounded-xl flex items-center justify-center shrink-0 border ${
                          isActive
                            ? 'bg-[#003D5C] text-cyan-300 border-[#003D5C] shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <FileSpreadsheet className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-bold text-slate-900 truncate max-w-[240px]">
                            {item.file_name}
                          </h4>
                          {isActive && (
                            <span className="bg-[#003D5C] text-cyan-300 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                              Active View
                            </span>
                          )}
                        </div>

                        {/* Metadata row */}
                        <div className="flex items-center gap-2.5 mt-1.5 text-[11px] text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1 text-slate-700 font-mono font-medium">
                            <Calendar className="size-3 text-slate-400" />
                            {formatDateTime(item.uploaded_at)}
                          </span>
                          <span>•</span>
                          <span className="font-bold text-[#003D5C]">
                            {item.total_records.toLocaleString()} Records
                          </span>
                          <span>•</span>
                          <span className="font-mono text-slate-500">{formatFileSize(item.file_size)}</span>
                        </div>

                        {/* Financial summary row */}
                        <div className="mt-2 flex items-center gap-3 text-[11.5px]">
                          <span className="text-slate-600 font-medium">
                            Pending:{' '}
                            <span className="font-extrabold text-amber-600 font-mono">
                              ${item.total_pending_amount?.toLocaleString() || '0'}
                            </span>
                          </span>
                          {item.uploaded_by && (
                            <span className="text-slate-400 text-[10px] truncate max-w-[140px]">
                              by {item.uploaded_by}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      variant={isActive ? 'default' : 'outline'}
                      onClick={() => {
                        onSelectImport(item)
                        onClose()
                      }}
                      className={`h-8.5 text-xs font-bold gap-1.5 rounded-xl cursor-pointer ${
                        isActive
                          ? 'bg-[#003D5C] text-white hover:bg-[#002b42]'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Eye className="size-3.5" />
                      {isActive ? 'Currently Viewing' : 'View in Table'}
                    </Button>

                    <div className="flex items-center gap-1.5">
                      {/* Download original raw file */}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isDownloading}
                        onClick={() => handleDownloadOriginal(item)}
                        className="h-8.5 text-xs border-emerald-200 bg-emerald-50/60 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300 gap-1.5 rounded-xl font-bold cursor-pointer"
                        title="Download the exact original Excel file uploaded"
                      >
                        {isDownloading ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Download className="size-3.5 text-emerald-600" />
                        )}
                        <span>Original File</span>
                      </Button>

                      {/* Delete batch */}
                      {onDeleteImport && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isDeleting}
                          onClick={() => handleDelete(item.id, item.file_name)}
                          className="h-8.5 size-8.5 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl cursor-pointer"
                          title="Delete import batch"
                        >
                          {isDeleting ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="size-3.5" />
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
