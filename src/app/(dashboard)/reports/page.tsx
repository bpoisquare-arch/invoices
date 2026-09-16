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
} from 'lucide-react'
import ReportStatsCards from '@/components/reports/report-stats-cards'
import ReportDataTable from '@/components/reports/report-data-table'
import ReportRecordDetailModal from '@/components/reports/report-record-detail-modal'
import AddReportEntryModal from '@/components/reports/add-report-entry-modal'
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
  const [editingRecord, setEditingRecord] = useState<AimtReportRecord | null>(null)
  const [detailModalRecord, setDetailModalRecord] = useState<AimtReportRecord | null>(null)

  // Filtered records state for accurate export
  const [filteredRecords, setFilteredRecords] = useState<AimtReportRecord[]>([])

  // Summary Metrics State
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalPendingAmount: 0,
    pendingInvoicesCount: 0,
    totalYetToRaised: 0,
  })

  // Fetch Live Database Report Records
  const fetchRecords = useCallback(async () => {
    setIsLoadingRecords(true)
    try {
      const res = await fetch('/api/reports?pageSize=1000')
      const data = await res.json()

      if (data.success && Array.isArray(data.records)) {
        setRecords(data.records)
        setFilteredRecords(data.records)
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
        setFilteredRecords([])
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
    <div className="space-y-6 max-w-[1600px] mx-auto pb-14">
      {/* 1. Light Theme Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="size-11 rounded-2xl bg-[#003D5C] text-cyan-300 flex items-center justify-center shadow-xs shrink-0">
            <GraduationCap className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-['Geist']">
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
          {/* Refresh Data */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchRecords()}
            disabled={isLoadingRecords}
            className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 h-9 px-3 rounded-xl text-xs gap-1.5 shadow-2xs font-medium"
            title="Refresh database records"
          >
            <RotateCcw className={`size-3.5 ${isLoadingRecords ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* 2. Top Metrics / KPI Cards (Light Theme) */}
      <ReportStatsCards
        totalStudents={stats.totalStudents}
        totalPendingAmount={stats.totalPendingAmount}
        pendingInvoicesCount={stats.pendingInvoicesCount}
        totalYetToRaised={stats.totalYetToRaised}
        selectedCount={selectedIds.length}
      />

      {/* 3. Interactive Data Table (Light Theme with core columns & actions) */}
      <ReportDataTable
        records={records}
        isLoading={isLoadingRecords}
        selectedIds={selectedIds}
        onSelectChange={setSelectedIds}
        onViewRecord={(record) => setDetailModalRecord(record)}
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
        <AddReportEntryModal
          isOpen={isAddEntryModalOpen}
          onClose={() => {
            setIsAddEntryModalOpen(false)
            setEditingRecord(null)
          }}
          onSuccess={handleRecordSaved}
          editRecord={editingRecord}
        />
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

