'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Download,
  RotateCcw,
  Loader2,
  GraduationCap,
  PlusCircle,
  UploadCloud,
} from 'lucide-react'
import ReportStatsCards from '@/components/reports/report-stats-cards'
import ReportDataTable from '@/components/reports/report-data-table'
import ReportRecordDetailModal from '@/components/reports/report-record-detail-modal'
import AddReportEntryModal from '@/components/reports/add-report-entry-modal'
import UploadReportModal from '@/components/reports/upload-report-modal'
import type { AimtReportRecord } from '@/lib/supabase/database.types'
import { useAuthRole } from '@/lib/hooks/use-auth-role'

export default function StudentReportsPage() {
  const { isViewer } = useAuthRole()
  // Main Data States
  const [records, setRecords] = useState<AimtReportRecord[]>([])
  const [availableAgents, setAvailableAgents] = useState<string[]>([])
  const [availableIntakes, setAvailableIntakes] = useState<string[]>([])

  // Loading States
  const [isLoadingRecords, setIsLoadingRecords] = useState(true)
  const [isExporting, setIsExporting] = useState(false)

  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Modal States
  const [isAddEntryModalOpen, setIsAddEntryModalOpen] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<AimtReportRecord | null>(null)
  const [detailModalRecord, setDetailModalRecord] = useState<AimtReportRecord | null>(null)

  // Filtered records state for accurate export & dynamic overview calculation
  const [filteredRecords, setFilteredRecords] = useState<AimtReportRecord[]>([])

  // Dynamically calculate overview stats from filteredRecords (or all records if unfiltered)
  const activeStats = React.useMemo(() => {
    if (records.length === 0) {
      return {
        totalStudents: 0,
        totalPendingAmount: 0,
        pendingInvoicesCount: 0,
        totalYetToRaised: 0,
      }
    }

    const currentList = filteredRecords

    let totalPendingAmount = 0
    let pendingInvoicesCount = 0
    let totalYetToRaised = 0

    currentList.forEach((r) => {
      // Pending amount
      const pAmt =
        typeof r.pending_amount === 'number'
          ? r.pending_amount
          : parseFloat(String(r.pending_amount || '0').replace(/[^0-9.-]+/g, '')) || 0
      totalPendingAmount += pAmt

      // Pending invoices count
      if (
        r.pending_invoice &&
        r.pending_invoice !== '-' &&
        r.pending_invoice !== '0' &&
        r.pending_invoice !== ''
      ) {
        pendingInvoicesCount++
      }

      // Yet to raised
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

  // Fetch Live Database Report Records
  const fetchRecords = useCallback(async () => {
    setIsLoadingRecords(true)
    try {
      const res = await fetch(`/api/reports?pageSize=1000&t=${Date.now()}`, {
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
      console.error('Failed to load report records:', err)
    } finally {
      setIsLoadingRecords(false)
    }
  }, [])

  // Initial Load
  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  // Handle Create / Edit Success from Modal
  const handleRecordSaved = async (savedRecord: AimtReportRecord, isEdit: boolean) => {
    await fetchRecords()
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
    await fetchRecords()
  }

  // Handle Bulk Delete Selected Records directly from live database
  const handleBulkDelete = async (ids: string[]) => {
    if (ids.length === 0) return
    const res = await fetch('/api/reports/records', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
    const data = await res.json()
    if (!data.success) {
      throw new Error(data.error || 'Failed to delete selected student records.')
    }

    setSelectedIds([])
    // Refresh active data from live database
    await fetchRecords()
  }

  // Handle Export to Excel (exports selected rows, or current filtered view, or all records)
  const handleExportToExcel = async (customRows?: AimtReportRecord[]) => {
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

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-14 font-sans">
      {/* 1. Premium Classic Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-white via-slate-50/70 to-slate-50 border border-slate-200/90 p-5 sm:p-6 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#003D5C] via-[#009D9E] to-cyan-400" />
        
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-gradient-to-br from-[#003D5C] to-[#002233] text-cyan-300 flex items-center justify-center shadow-md shadow-[#003D5C]/20 shrink-0 border border-cyan-500/20">
            <GraduationCap className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#003D5C] tracking-tight font-['Geist']">
                Student Report Management
              </h1>
              <span className="inline-flex items-center gap-1 bg-gradient-to-r from-cyan-50 to-teal-50 text-cyan-900 border border-cyan-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                <span className="size-1.5 rounded-full bg-cyan-600" />
                AIMT Entity
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Real-time student fee tracking, pending invoice management, live ledger, and Excel reports.
            </p>
          </div>
        </div>

        {/* Action Buttons Group */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Refresh Data */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchRecords()}
            disabled={isLoadingRecords}
            className="border-slate-300/90 bg-white text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 h-9.5 px-3.5 rounded-xl text-xs gap-2 shadow-2xs font-semibold cursor-pointer transition-all"
            title="Refresh database records"
          >
            <RotateCcw className={`size-3.5 text-[#009D9E] ${isLoadingRecords ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </Button>

          {/* Import Excel - Temporarily Hidden */}
          {/* {!isViewer && (
            <Button
              size="sm"
              onClick={() => setIsUploadModalOpen(true)}
              className="bg-gradient-to-r from-[#003D5C] to-[#002233] hover:from-[#002233] hover:to-[#001520] text-cyan-300 h-9.5 px-4 rounded-xl text-xs gap-2 shadow-2xs font-extrabold cursor-pointer transition-all border border-cyan-500/20"
              title="Import AIMT student Excel report into database"
            >
              <UploadCloud className="size-4 text-cyan-300" />
              <span>Import Excel</span>
            </Button>
          )} */}
        </div>
      </div>

      {/* 2. Top Metrics / KPI Cards (Dynamically synced with filters) */}
      <ReportStatsCards
        totalStudents={activeStats.totalStudents}
        totalPendingAmount={activeStats.totalPendingAmount}
        pendingInvoicesCount={activeStats.pendingInvoicesCount}
        totalYetToRaised={activeStats.totalYetToRaised}
        selectedCount={selectedIds.length}
      />

      {/* 3. Interactive Data Table (Light Theme with core columns & actions) */}
      <ReportDataTable
        records={records}
        isLoading={isLoadingRecords}
        selectedIds={selectedIds}
        onSelectChange={setSelectedIds}
        onViewRecord={(record) => setDetailModalRecord(record)}
        onImportExcel={undefined}
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
          <AddReportEntryModal
            isOpen={isAddEntryModalOpen}
            onClose={() => {
              setIsAddEntryModalOpen(false)
              setEditingRecord(null)
            }}
            onSuccess={handleRecordSaved}
            editRecord={editingRecord}
          />

          <UploadReportModal
            isOpen={isUploadModalOpen}
            onClose={() => setIsUploadModalOpen(false)}
            onUploadSuccess={async () => {
              await fetchRecords()
            }}
          />
        </>
      )}

      <ReportRecordDetailModal
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

