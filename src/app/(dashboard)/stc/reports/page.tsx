'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  RotateCcw,
  GraduationCap,
  PlusCircle,
  UploadCloud,
  FileSpreadsheet,
} from 'lucide-react'
import StcReportStatsCards from '@/components/stc-reports/stc-report-stats-cards'
import StcReportDataTable from '@/components/stc-reports/stc-report-data-table'
import StcReportRecordDetailModal from '@/components/stc-reports/stc-report-record-detail-modal'
import StcAddReportEntryModal from '@/components/stc-reports/stc-add-report-entry-modal'
import StcUploadReportModal from '@/components/stc-reports/stc-upload-report-modal'
import type { StcReportRecord, StcReportImport } from '@/lib/supabase/database.types'
import { useAuthRole } from '@/lib/hooks/use-auth-role'

export default function StcReportsPage() {
  const { isViewer } = useAuthRole()

  // Main Data States
  const [records, setRecords] = useState<StcReportRecord[]>([])
  const [availableAgents, setAvailableAgents] = useState<string[]>([])
  const [availableIntakes, setAvailableIntakes] = useState<string[]>([])
  const [imports, setImports] = useState<StcReportImport[]>([])
  const [activeImportId, setActiveImportId] = useState<string | null>(null)

  // Loading States
  const [isLoadingRecords, setIsLoadingRecords] = useState(true)
  const [isLoadingImports, setIsLoadingImports] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Modal States
  const [isAddEntryModalOpen, setIsAddEntryModalOpen] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<StcReportRecord | null>(null)
  const [detailModalRecord, setDetailModalRecord] = useState<StcReportRecord | null>(null)

  // Filtered records state for accurate export & dynamic overview calculation
  const [filteredRecords, setFilteredRecords] = useState<StcReportRecord[]>([])

  // Overview stats calculation
  const activeStats = useMemo(() => {
    if (records.length === 0) {
      return {
        totalStudents: 0,
        totalPendingAmount: 0,
        pendingInvoicesCount: 0,
        totalYetToRaised: 0,
      }
    }

    const currentList = filteredRecords.length > 0 ? filteredRecords : records

    let totalPendingAmount = 0
    let pendingInvoicesCount = 0
    let totalYetToRaised = 0

    currentList.forEach((r) => {
      const pAmt =
        typeof r.pending_amount === 'number'
          ? r.pending_amount
          : parseFloat(String(r.pending_amount || '0').replace(/[^0-9.-]+/g, '')) || 0
      totalPendingAmount += pAmt

      if (
        r.pending_invoice &&
        r.pending_invoice !== '-' &&
        r.pending_invoice !== '0' &&
        r.pending_invoice !== ''
      ) {
        pendingInvoicesCount++
      }

      const yAmt =
        typeof r.yet_to_raised === 'number'
          ? r.yet_to_raised
          : parseFloat(String(r.yet_to_raised || '0').replace(/[^0-9.-]+/g, '')) || 0
      totalYetToRaised += yAmt
    })

    return {
      totalStudents: currentList.length,
      totalPendingAmount: Math.round(totalPendingAmount * 100) / 100,
      pendingInvoicesCount,
      totalYetToRaised: Math.round(totalYetToRaised * 100) / 100,
    }
  }, [filteredRecords, records])

  // Fetch Live Database STC Report Records
  const fetchRecords = useCallback(async (importIdFilter?: string | null) => {
    setIsLoadingRecords(true)
    try {
      const filterParam = importIdFilter ? `&importId=${importIdFilter}` : ''
      const res = await fetch(`/api/stc/reports?pageSize=1000${filterParam}&t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      })
      const data = await res.json()

      if (data.success && Array.isArray(data.records)) {
        setRecords(data.records)
        setFilteredRecords(data.records)
        setAvailableAgents(data.availableAgents || [])
        setAvailableIntakes(data.availableIntakes || [])
      } else {
        setRecords([])
        setFilteredRecords([])
      }
    } catch (err) {
      console.error('Failed to load STC report records:', err)
    } finally {
      setIsLoadingRecords(false)
    }
  }, [])

  // Fetch STC Import History
  const fetchImports = useCallback(async () => {
    setIsLoadingImports(true)
    try {
      const res = await fetch(`/api/stc/reports?type=imports&t=${Date.now()}`, {
        cache: 'no-store',
      })
      const data = await res.json()
      if (data.success && Array.isArray(data.imports)) {
        setImports(data.imports)
      }
    } catch (err) {
      console.error('Failed to load STC import history:', err)
    } finally {
      setIsLoadingImports(false)
    }
  }, [])

  useEffect(() => {
    fetchRecords(activeImportId)
    fetchImports()
  }, [fetchRecords, fetchImports, activeImportId])

  // Record Saved Success
  const handleRecordSaved = async () => {
    await fetchRecords(activeImportId)
  }

  // Delete Single Record
  const handleDeleteRecord = async (record: StcReportRecord) => {
    const res = await fetch(`/api/stc/reports/records?id=${record.id}`, {
      method: 'DELETE',
    })
    const data = await res.json()
    if (!data.success) {
      throw new Error(data.error || 'Failed to delete student record.')
    }
    await fetchRecords(activeImportId)
  }

  // Bulk Delete Selected Records
  const handleBulkDelete = async (ids: string[]) => {
    if (ids.length === 0) return
    const res = await fetch('/api/stc/reports/records', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
    const data = await res.json()
    if (!data.success) {
      throw new Error(data.error || 'Failed to delete selected student records.')
    }
    setSelectedIds([])
    await fetchRecords(activeImportId)
  }

  // Delete Import Batch
  const handleDeleteImport = async (id: string) => {
    const res = await fetch(`/api/stc/reports/${id}`, {
      method: 'DELETE',
    })
    const data = await res.json()
    if (!data.success) {
      throw new Error(data.error || 'Failed to delete import batch.')
    }
    if (activeImportId === id) {
      setActiveImportId(null)
    }
    await fetchImports()
    await fetchRecords(null)
  }

  // Export to Excel
  const handleExportToExcel = async (customRows?: StcReportRecord[]) => {
    const exportRows = customRows || (
      selectedIds.length > 0
        ? records.filter((r) => selectedIds.includes(r.id))
        : (filteredRecords.length > 0 ? filteredRecords : records)
    )

    if (exportRows.length === 0) {
      alert('No records available to export.')
      return
    }

    try {
      setIsExporting(true)
      const res = await fetch('/api/stc/reports/export', {
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
      a.download = `STC_Student_Report_${new Date().toISOString().split('T')[0]}.xlsx`
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

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-14 font-sans">
      {/* 1. Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-white via-slate-50/70 to-slate-50 border border-slate-200/90 p-5 sm:p-6 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00BF8F] via-[#008f6b] to-emerald-400" />
        
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-gradient-to-br from-[#00BF8F] to-[#001E2F] text-white flex items-center justify-center shadow-md shadow-[#00BF8F]/20 shrink-0 border border-[#00BF8F]/30">
            <GraduationCap className="size-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#001E2F] tracking-tight">
                Student Report Management
              </h1>
              <span className="inline-flex items-center gap-1 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-900 border border-emerald-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                <span className="size-1.5 rounded-full bg-[#00BF8F]" />
                States College Australia
              </span>
              {activeImportId && (
                <Badge
                  variant="outline"
                  onClick={() => setActiveImportId(null)}
                  className="cursor-pointer border-emerald-300 bg-emerald-50 text-emerald-800 text-[10px] font-bold hover:bg-emerald-100"
                  title="Click to clear batch filter"
                >
                  Filtered by Batch ✕
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Real-time student fee tracking, pending invoice management, live ledger, and Excel reports for States College.
            </p>
          </div>
        </div>

        {/* Action Buttons Group */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Refresh Data */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchRecords(activeImportId)
              fetchImports()
            }}
            disabled={isLoadingRecords}
            className="border-slate-300/90 bg-white text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 h-9.5 px-3.5 rounded-xl text-xs gap-2 shadow-2xs font-semibold cursor-pointer transition-all"
            title="Refresh database records"
          >
            <RotateCcw className={`size-3.5 text-[#00BF8F] ${isLoadingRecords ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </Button>

          {/* Import Excel */}
          {!isViewer && (
            <Button
              size="sm"
              onClick={() => setIsUploadModalOpen(true)}
              className="bg-gradient-to-r from-[#00BF8F] to-[#008f6b] hover:from-[#008f6b] hover:to-[#006e52] text-[#001E2F] h-9.5 px-4 rounded-xl text-xs gap-2 shadow-2xs font-extrabold cursor-pointer transition-all border border-emerald-400/20"
              title="Import STC student Excel report into database"
            >
              <UploadCloud className="size-4 text-[#001E2F]" />
              <span>Import Excel</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. Top Metrics / KPI Cards */}
      <StcReportStatsCards
        totalStudents={activeStats.totalStudents}
        totalPendingAmount={activeStats.totalPendingAmount}
        pendingInvoicesCount={activeStats.pendingInvoicesCount}
        totalYetToRaised={activeStats.totalYetToRaised}
        selectedCount={selectedIds.length}
      />

      {/* 3. Interactive Data Table */}
      <StcReportDataTable
        records={records}
        isLoading={isLoadingRecords}
        selectedIds={selectedIds}
        onSelectChange={setSelectedIds}
        onViewRecord={(record) => setDetailModalRecord(record)}
        onImportExcel={isViewer ? undefined : () => setIsUploadModalOpen(true)}
        onAddEntry={
          isViewer
            ? undefined
            : () => {
                setEditingRecord(null)
                setIsAddEntryModalOpen(true)
              }
        }
        onEditRecord={
          isViewer
            ? undefined
            : (record) => {
                setEditingRecord(record)
                setIsAddEntryModalOpen(true)
              }
        }
        onDeleteRecord={isViewer ? undefined : handleDeleteRecord}
        onDeleteSelected={isViewer ? undefined : handleBulkDelete}
        availableAgents={availableAgents}
        availableIntakes={availableIntakes}
        onExportFiltered={handleExportToExcel}
        onFilteredRecordsChange={setFilteredRecords}
      />

      {/* 4. Modals */}
      {!isViewer && (
        <>
          <StcAddReportEntryModal
            isOpen={isAddEntryModalOpen}
            onClose={() => {
              setIsAddEntryModalOpen(false)
              setEditingRecord(null)
            }}
            onSuccess={handleRecordSaved}
            editRecord={editingRecord}
            activeImportId={activeImportId}
          />

          <StcUploadReportModal
            isOpen={isUploadModalOpen}
            onClose={() => setIsUploadModalOpen(false)}
            onUploadSuccess={async () => {
              await fetchRecords(activeImportId)
              await fetchImports()
            }}
          />

        </>
      )}

      <StcReportRecordDetailModal
        isOpen={Boolean(detailModalRecord)}
        onClose={() => setDetailModalRecord(null)}
        record={detailModalRecord}
        onEdit={
          isViewer
            ? undefined
            : (record) => {
                setDetailModalRecord(null)
                setEditingRecord(record)
                setIsAddEntryModalOpen(true)
              }
        }
      />
    </div>
  )
}
