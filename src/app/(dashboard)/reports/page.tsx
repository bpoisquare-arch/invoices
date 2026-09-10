'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FileSpreadsheet,
  UploadCloud,
  Clock,
  Download,
  RotateCcw,
  Loader2,
  FileCheck2,
  AlertCircle,
  GraduationCap,
  PlusCircle,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import ReportStatsCards from '@/components/reports/report-stats-cards'
import ReportDataTable from '@/components/reports/report-data-table'
import UploadReportModal from '@/components/reports/upload-report-modal'
import ImportHistoryDrawer from '@/components/reports/import-history-drawer'
import ReportRecordDetailModal from '@/components/reports/report-record-detail-modal'
import AddReportEntryModal from '@/components/reports/add-report-entry-modal'
import type { AimtReportImport, AimtReportRecord } from '@/lib/supabase/database.types'

export default function StudentReportsPage() {
  // Main Data States
  const [records, setRecords] = useState<AimtReportRecord[]>([])
  const [imports, setImports] = useState<AimtReportImport[]>([])
  const [activeImport, setActiveImport] = useState<AimtReportImport | null>(null)
  const [availableAgents, setAvailableAgents] = useState<string[]>([])
  const [availableIntakes, setAvailableIntakes] = useState<string[]>([])

  // Loading States
  const [isLoadingRecords, setIsLoadingRecords] = useState(true)
  const [isLoadingImports, setIsLoadingImports] = useState(true)
  const [isExporting, setIsExporting] = useState(false)

  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Modal / Drawer States
  const [isAddEntryModalOpen, setIsAddEntryModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<AimtReportRecord | null>(null)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false)
  const [detailModalRecord, setDetailModalRecord] = useState<AimtReportRecord | null>(null)

  // Summary Metrics State
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalPendingAmount: 0,
    pendingInvoicesCount: 0,
    totalYetToRaised: 0,
  })

  // 1. Fetch Import Batches History
  const fetchImports = useCallback(async () => {
    setIsLoadingImports(true)
    try {
      const res = await fetch('/api/reports?type=imports&entity=aimt')
      const data = await res.json()
      if (data.success && Array.isArray(data.imports)) {
        setImports(data.imports)
        return data.imports
      }
    } catch (err) {
      console.error('Failed to load imports history:', err)
    } finally {
      setIsLoadingImports(false)
    }
    return []
  }, [])

  // 2. Fetch Records for a given import ID (or default latest)
  const fetchRecords = useCallback(async (importId?: string) => {
    setIsLoadingRecords(true)
    try {
      const url = importId
        ? `/api/reports?importId=${importId}&pageSize=1000`
        : '/api/reports?pageSize=1000'
      const res = await fetch(url)
      const data = await res.json()

      if (data.success && Array.isArray(data.records)) {
        setRecords(data.records)
        setAvailableAgents(data.availableAgents || [])
        setAvailableIntakes(data.availableIntakes || [])

        // Count pending invoices
        const pendingInvsCount = data.records.filter(
          (r: AimtReportRecord) =>
            r.pending_invoice &&
            r.pending_invoice !== '-' &&
            r.pending_invoice !== '0' &&
            r.pending_invoice !== ''
        ).length

        setStats({
          totalStudents: data.totalCount || data.records.length,
          totalPendingAmount: data.totalPendingAmount || 0,
          pendingInvoicesCount: pendingInvsCount,
          totalYetToRaised: data.totalYetToRaised || 0,
        })
      } else {
        setRecords([])
        setStats({
          totalStudents: 0,
          totalPendingAmount: 0,
          pendingInvoicesCount: 0,
          totalYetToRaised: 0,
        })
      }
    } catch (err) {
      console.error('Failed to load report records:', err)
    } finally {
      setIsLoadingRecords(false)
    }
  }, [])

  // Initial Load
  useEffect(() => {
    async function init() {
      const allImports = await fetchImports()
      if (allImports.length > 0) {
        setActiveImport(allImports[0])
        await fetchRecords(allImports[0].id)
      } else {
        await fetchRecords()
      }
    }
    init()
  }, [fetchImports, fetchRecords])

  // Handle Switch Active Import Batch
  const handleSelectImport = (batch: AimtReportImport) => {
    setActiveImport(batch)
    setSelectedIds([])
    fetchRecords(batch.id)
  }

  // Handle Delete Import Batch
  const handleDeleteImport = async (id: string) => {
    const res = await fetch(`/api/reports/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!data.success) {
      throw new Error(data.error || 'Failed to delete import batch')
    }

    const updatedImports = await fetchImports()
    if (activeImport?.id === id) {
      if (updatedImports.length > 0) {
        setActiveImport(updatedImports[0])
        fetchRecords(updatedImports[0].id)
      } else {
        setActiveImport(null)
        setRecords([])
        setStats({ totalStudents: 0, totalPendingAmount: 0, pendingInvoicesCount: 0, totalYetToRaised: 0 })
      }
    }
  }

  // Handle Upload Success
  const handleUploadSuccess = async (uploadRes: any) => {
    const updatedImports = await fetchImports()
    if (updatedImports.length > 0) {
      const newActive = updatedImports.find((i: AimtReportImport) => i.id === uploadRes.importId) || updatedImports[0]
      setActiveImport(newActive)
      fetchRecords(newActive.id)
    }
  }

  // Handle Create / Edit Success from Modal
  const handleRecordSaved = async (savedRecord: AimtReportRecord, isEdit: boolean) => {
    if (activeImport) {
      await fetchRecords(activeImport.id)
    } else {
      const allImports = await fetchImports()
      if (allImports.length > 0) {
        setActiveImport(allImports[0])
        await fetchRecords(allImports[0].id)
      } else {
        await fetchRecords()
      }
    }
    await fetchImports()
  }

  // Handle Delete Single Record
  const handleDeleteRecord = async (record: AimtReportRecord) => {
    const res = await fetch(`/api/reports/records?id=${record.id}`, {
      method: 'DELETE',
    })
    const data = await res.json()
    if (!data.success) {
      throw new Error(data.error || 'Failed to delete student record.')
    }

    // Refresh active data
    if (activeImport) {
      await fetchRecords(activeImport.id)
    } else {
      await fetchRecords()
    }
    await fetchImports()
  }

  // Handle Export to Excel
  const handleExportToExcel = async () => {
    if (records.length === 0) {
      alert('No records available to export.')
      return
    }

    try {
      setIsExporting(true)
      const exportRows =
        selectedIds.length > 0
          ? records.filter((r) => selectedIds.includes(r.id))
          : records

      const res = await fetch('/api/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: exportRows }),
      })

      if (!res.ok) {
        throw new Error('Export request failed.')
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `AIMT_Student_Report_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      console.error('Export error:', err)
      alert(err.message || 'Failed to export Excel report.')
    } finally {
      setIsExporting(false)
    }
  }

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

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-14">
      {/* 1. Light Theme Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="size-11 rounded-2xl bg-[#003D5C] text-cyan-300 flex items-center justify-center shadow-xs shrink-0">
            <GraduationCap className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-['Montserrat']">
                Student Report Management
              </h1>
              <Badge className="bg-cyan-50 text-cyan-800 border-cyan-200 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
                AIMT College
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Direct database student invoices, fee tracking, real-time entries & exports
            </p>
          </div>
        </div>

        {/* Action Buttons Group */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* 1. ADD ENTRY BUTTON (Prominent on Left of actions group) */}
          <Button
            size="sm"
            onClick={() => {
              setEditingRecord(null)
              setIsAddEntryModalOpen(true)
            }}
            className="bg-[#003D5C] hover:bg-[#002b42] text-white h-9 px-4 rounded-xl text-xs font-bold gap-2 shadow-xs transition-all cursor-pointer"
          >
            <PlusCircle className="size-4 text-cyan-300" />
            <span>Add Entry</span>
          </Button>

          {/* 2. Upload Excel Modal Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsUploadModalOpen(true)}
            className="border-slate-200 bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 h-9 px-3.5 rounded-xl text-xs font-semibold gap-1.5 shadow-2xs cursor-pointer"
          >
            <UploadCloud className="size-4 text-cyan-600" />
            <span>Import Excel</span>
          </Button>

          {/* 3. Import History */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsHistoryDrawerOpen(true)}
            className="border-slate-200 bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 h-9 px-3.5 rounded-xl text-xs font-semibold gap-1.5 shadow-2xs"
          >
            <Clock className="size-3.5 text-cyan-600" />
            <span>Import History</span>
            {imports.length > 0 && (
              <span className="size-5 rounded-full bg-cyan-100 text-cyan-800 text-[10px] font-bold flex items-center justify-center">
                {imports.length}
              </span>
            )}
          </Button>

          {/* 4. Export to Excel */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportToExcel}
            disabled={isExporting || records.length === 0}
            className="border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 h-9 px-3.5 rounded-xl text-xs gap-1.5 shadow-2xs font-semibold"
          >
            {isExporting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            <span>Export Excel</span>
          </Button>

          {/* 5. Refresh Data */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (activeImport) fetchRecords(activeImport.id)
              else fetchRecords()
              fetchImports()
            }}
            disabled={isLoadingRecords}
            className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 h-9 px-3 rounded-xl text-xs gap-1.5 shadow-2xs"
            title="Refresh database records"
          >
            <RotateCcw className={`size-3.5 ${isLoadingRecords ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* 2. Active Batch Info Banner (Light Theme) */}
      {activeImport && (
        <div className="bg-cyan-50/60 border border-cyan-200/80 rounded-2xl p-3.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-7 rounded-lg bg-cyan-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <FileCheck2 className="size-4" />
            </div>
            <div className="text-xs truncate">
              <span className="text-slate-500 font-medium">Active File Batch: </span>
              <span className="font-bold text-slate-900 font-mono">{activeImport.file_name}</span>
              <span className="text-slate-500 ml-2 text-[11px]">
                (Uploaded {formatDateTime(activeImport.uploaded_at)})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsHistoryDrawerOpen(true)}
              className="h-7 text-xs text-cyan-800 hover:text-cyan-900 hover:bg-cyan-100/60 px-2.5 rounded-lg font-semibold"
            >
              <span>Switch Batch</span>
              <ChevronRight className="size-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* 3. Top Metrics / KPI Cards (Light Theme) */}
      <ReportStatsCards
        totalStudents={stats.totalStudents}
        totalPendingAmount={stats.totalPendingAmount}
        pendingInvoicesCount={stats.pendingInvoicesCount}
        totalYetToRaised={stats.totalYetToRaised}
        selectedCount={selectedIds.length}
      />

      {/* 4. Interactive Data Table (Light Theme with 8 core columns & actions) */}
      <ReportDataTable
        records={records}
        isLoading={isLoadingRecords}
        selectedIds={selectedIds}
        onSelectChange={setSelectedIds}
        onViewRecord={(record) => setDetailModalRecord(record)}
        onEditRecord={(record) => {
          setEditingRecord(record)
          setIsAddEntryModalOpen(true)
        }}
        onDeleteRecord={handleDeleteRecord}
        availableAgents={availableAgents}
        availableIntakes={availableIntakes}
        onExportFiltered={handleExportToExcel}
      />

      {/* 5. Modals & Drawers */}
      <AddReportEntryModal
        isOpen={isAddEntryModalOpen}
        onClose={() => {
          setIsAddEntryModalOpen(false)
          setEditingRecord(null)
        }}
        onSuccess={handleRecordSaved}
        editRecord={editingRecord}
        activeImportId={activeImport?.id}
      />

      <UploadReportModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      <ImportHistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        imports={imports}
        activeImportId={activeImport?.id}
        onSelectImport={handleSelectImport}
        onDeleteImport={handleDeleteImport}
        isLoading={isLoadingImports}
      />

      <ReportRecordDetailModal
        isOpen={Boolean(detailModalRecord)}
        onClose={() => setDetailModalRecord(null)}
        record={detailModalRecord}
        onEdit={(record) => {
          setDetailModalRecord(null)
          setEditingRecord(record)
          setIsAddEntryModalOpen(true)
        }}
      />
    </div>
  )
}
