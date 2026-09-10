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
  onDeleteImport: (id: string) => Promise<void>
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
        className="w-full sm:max-w-xl bg-white border-l border-slate-200 text-slate-900 p-0 flex flex-col h-full shadow-2xl z-50"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 shrink-0">
          <SheetHeader>
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center border border-cyan-200">
                <Clock className="size-5" />
              </div>
              <div>
                <SheetTitle className="text-base font-bold text-slate-900 tracking-tight font-['Montserrat']">
                  Excel Import History
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500">
                  Track uploaded batches & download exact original Excel files
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-2">
              <Loader2 className="size-6 animate-spin text-cyan-600" />
              <span className="text-xs">Loading import history from database...</span>
            </div>
          ) : imports.length === 0 ? (
            <div className="text-center py-16 text-slate-500 border border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50/50">
              <FileSpreadsheet className="size-10 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No Excel Files Uploaded Yet</p>
              <p className="text-xs text-slate-500 mt-1">
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
                  className={`p-4 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-cyan-50/70 border-cyan-300 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`size-9 rounded-lg flex items-center justify-center shrink-0 border ${
                          isActive
                            ? 'bg-cyan-600 text-white border-cyan-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <FileSpreadsheet className="size-4.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-bold text-slate-900 truncate max-w-[240px]">
                            {item.file_name}
                          </h4>
                          {isActive && (
                            <Badge className="bg-cyan-600 text-white text-[9px] font-bold px-1.5 py-0">
                              Active View
                            </Badge>
                          )}
                        </div>

                        {/* Metadata row */}
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1 text-slate-700 font-mono">
                            <Calendar className="size-3 text-slate-400" />
                            {formatDateTime(item.uploaded_at)}
                          </span>
                          <span>•</span>
                          <span className="font-semibold text-cyan-800">
                            {item.total_records.toLocaleString()} Records
                          </span>
                          <span>•</span>
                          <span>{formatFileSize(item.file_size)}</span>
                        </div>

                        {/* Financial summary row */}
                        <div className="mt-2 flex items-center gap-3 text-[11px]">
                          <span className="text-slate-600">
                            Pending:{' '}
                            <span className="font-bold text-amber-600 font-mono">
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
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      variant={isActive ? 'default' : 'outline'}
                      onClick={() => {
                        onSelectImport(item)
                        onClose()
                      }}
                      className={`h-8 text-xs font-semibold gap-1.5 rounded-lg ${
                        isActive
                          ? 'bg-[#003D5C] text-white hover:bg-[#002b42]'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
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
                        className="h-8 text-xs border-slate-200 bg-white text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 gap-1.5 rounded-lg"
                        title="Download the exact original Excel file uploaded"
                      >
                        {isDownloading ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Download className="size-3.5" />
                        )}
                        <span>Original File</span>
                      </Button>

                      {/* Delete batch */}
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isDeleting}
                        onClick={() => handleDelete(item.id, item.file_name)}
                        className="h-8 size-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                        title="Delete import batch"
                      >
                        {isDeleting ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                      </Button>
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
