'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AIMTPayslip,
  aimtPayslipService,
  formatCurrency,
} from '@/lib/services/aimt-payslip.service'
import AIMTPayslipPDFTemplate from '@/components/pdf/aimt-payslip-pdf-template'
import AIMTPayslipWebPreview from '@/components/payslips/aimt-payslip-web-preview'
import { pdf } from '@react-pdf/renderer'
import {
  Search,
  Plus,
  RefreshCw,
  MoreVertical,
  Download,
  Edit2,
  Trash2,
  GraduationCap,
  Calendar,
  Filter,
  FileText,
  AlertTriangle,
  Loader2,
  Eye,
  X,
  Printer,
} from 'lucide-react'

type FilterPeriod = 'all' | 'today' | '7days' | '30days' | 'month'

export default function AIMTPayslipList() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [payslips, setPayslips] = useState<AIMTPayslip[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterPeriod>('all')

  // Fixed Floating Menu state (detached from table overflow)
  const [menuState, setMenuState] = useState<{
    id: string
    item: AIMTPayslip
    top: number
    right: number
  } | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  // Preview modal state
  const [previewTarget, setPreviewTarget] = useState<AIMTPayslip | null>(null)

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<AIMTPayslip | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await aimtPayslipService.getAll()
      setPayslips(data)
    } catch (err) {
      console.error('Failed to load payslips:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    loadData()
  }, [])

  // Close floating dropdown on outside click or resize
  useEffect(() => {
    function handleClose(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (target.closest('.floating-dropdown-menu') || target.closest('.menu-trigger-button')) {
        return
      }
      setMenuState(null)
    }
    document.addEventListener('mousedown', handleClose)
    window.addEventListener('resize', () => setMenuState(null))
    return () => {
      document.removeEventListener('mousedown', handleClose)
      window.removeEventListener('resize', () => setMenuState(null))
    }
  }, [])

  // Filter and search logic
  const filteredPayslips = useMemo(() => {
    return payslips.filter((item) => {
      // 1. Search Query
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        (item.employee_name && item.employee_name.toLowerCase().includes(q)) ||
        (item.pay_period_start && item.pay_period_start.toLowerCase().includes(q)) ||
        (item.payment_date && item.payment_date.toLowerCase().includes(q)) ||
        (item.id && item.id.toLowerCase().includes(q))

      if (!matchesSearch) return false

      // 2. Period Filter
      if (activeFilter === 'all') return true

      const itemDate = new Date(item.created_at || Date.now())
      const now = new Date()

      if (activeFilter === 'today') {
        return itemDate.toDateString() === now.toDateString()
      }
      if (activeFilter === '7days') {
        const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24)
        return diffDays <= 7
      }
      if (activeFilter === '30days') {
        const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24)
        return diffDays <= 30
      }
      if (activeFilter === 'month') {
        return (
          itemDate.getMonth() === now.getMonth() &&
          itemDate.getFullYear() === now.getFullYear()
        )
      }

      return true
    })
  }, [payslips, searchQuery, activeFilter])

  // Download PDF Action
  const handleDownload = async (item: AIMTPayslip) => {
    setDownloadingId(item.id)
    const safeName = (item.employee_name || 'AIMT-Employee')
      .trim()
      .replace(/[/\\?%*:|"<>]/g, '')
      .replace(/\s+/g, '_')
    const fileName = `AIMT_Payslip_${safeName}.pdf`

    try {
      // 1. Primary & Fastest: Server streaming endpoint
      try {
        const res = await fetch('/api/payslips-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        })

        if (res.ok) {
          const blob = await res.blob()
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = fileName
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
          return
        }
      } catch (serverErr) {
        console.warn('Server streaming failed, trying client renderer:', serverErr)
      }

      // 2. Fallback: Client-side @react-pdf/renderer with timeout
      const doc = <AIMTPayslipPDFTemplate payslip={item} />
      const blobPromise = pdf(doc).toBlob()
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('PDF generation timed out')), 4000)
      )
      const blob = await Promise.race([blobPromise, timeoutPromise])
      if (blob && blob.size > 0) {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('Error generating PDF:', err)
      alert('Failed to download PDF. Please try again.')
    } finally {
      setDownloadingId(null)
      setMenuState(null)
    }
  }

  // Delete Action
  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await aimtPayslipService.delete(deleteTarget.id)
      setPayslips((prev) => prev.filter((p) => p.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      console.error('Error deleting payslip:', err)
      alert('Failed to delete payslip.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div suppressHydrationWarning className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#001E2F] border border-white/10 p-5 rounded-2xl text-white shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="size-11 rounded-xl bg-[#0E3E5B] border border-white/20 flex items-center justify-center text-[#81F5F5] shadow-inner">
            <GraduationCap className="size-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-['Montserrat']">
              AIMT Employee Payslips
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Search, preview, manage, and export AIMT College payslips.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer border border-white/10 disabled:opacity-50"
          >
            <RefreshCw className={`size-4 text-[#81F5F5] ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            href="/payslips/new"
            className="flex items-center gap-1.5 px-4 py-2 bg-[#81F5F5] hover:bg-[#6be0e0] text-[#002020] rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md cursor-pointer"
          >
            <Plus className="size-4 text-[#002020] stroke-[3]" />
            <span>CREATE PAYSLIP</span>
          </Link>
        </div>
      </div>

      {/* 2. Search & Filter Ribbon */}
      <div className="bg-[#001E2F] border border-white/10 p-4 rounded-2xl shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
        {/* Search Bar */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Employee Name or Date..."
            className="w-full bg-[#001724] border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#81F5F5]/50 transition-all"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          <div className="flex items-center gap-1 text-xs font-semibold text-slate-400 mr-1 shrink-0">
            <Filter className="size-3.5" />
            <span>FILTER:</span>
          </div>

          {[
            { id: 'all', label: 'All Time' },
            { id: 'today', label: 'Today' },
            { id: '7days', label: 'Last 7 Days' },
            { id: '30days', label: 'Last 30 Days' },
            { id: 'month', label: 'This Month' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id as FilterPeriod)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                activeFilter === tab.id
                  ? 'bg-[#0E3E5B] text-[#81F5F5] border border-[#81F5F5]/40 shadow-sm'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Payslips Table */}
      <div className="bg-[#001E2F] border border-white/10 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-200">
            <thead className="bg-[#001724] text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/10">
              <tr>
                <th className="py-3.5 px-4">EMPLOYEE NAME</th>
                <th className="py-3.5 px-4">PAY PERIOD</th>
                <th className="py-3.5 px-4">PAYMENT DATE</th>
                <th className="py-3.5 px-4 text-right">ORDINARY HOURS</th>
                <th className="py-3.5 px-4 text-right">TOTAL EARNINGS</th>
                <th className="py-3.5 px-4 text-right">PAYG TAX</th>
                <th className="py-3.5 px-4 text-right">NET PAY</th>
                <th className="py-3.5 px-4 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="size-6 animate-spin text-[#81F5F5]" />
                      <span className="text-xs">Loading AIMT payslips...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredPayslips.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <FileText className="size-10 text-slate-600" />
                      <div>
                        <div className="font-semibold text-slate-300 text-sm">
                          No payslips found
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {searchQuery
                            ? 'Try adjusting your search or filter criteria.'
                            : 'Click Create Payslip above to generate the first payslip.'}
                        </div>
                      </div>
                      {!searchQuery && (
                        <Link
                          href="/payslips/new"
                          className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0E3E5B] hover:bg-[#15537a] text-[#81F5F5] rounded-lg text-xs font-bold border border-[#81F5F5]/30 transition-all"
                        >
                          <Plus className="size-3.5" />
                          <span>Generate First Payslip</span>
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPayslips.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-white/[0.03] transition-colors group"
                  >
                    {/* Employee Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white tracking-tight">
                        {item.employee_name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-normal">
                        {item.address_line_2 || item.address_line_1 || 'AIMT Staff'}
                      </div>
                    </td>

                    {/* Pay Period */}
                    <td className="py-3.5 px-4 text-slate-300 font-mono text-xs">
                      {item.pay_period_start} - {item.pay_period_end}
                    </td>

                    {/* Payment Date */}
                    <td className="py-3.5 px-4 text-slate-300 font-mono text-xs">
                      {item.payment_date}
                    </td>

                    {/* Hours */}
                    <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                      {item.ordinary_hours || '0'}
                    </td>

                    {/* Total Earnings */}
                    <td className="py-3.5 px-4 text-right font-bold text-slate-200">
                      {formatCurrency(item.total_earnings)}
                    </td>

                    {/* PAYG Tax */}
                    <td className="py-3.5 px-4 text-right font-bold text-amber-400/90">
                      {formatCurrency(item.tax_amount)}
                    </td>

                    {/* Net Pay */}
                    <td className="py-3.5 px-4 text-right font-bold text-[#81F5F5]">
                      {formatCurrency(item.net_pay)}
                    </td>

                    {/* Actions: Quick Preview & 3-Dot Dropdown */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Quick View Button */}
                        <button
                          type="button"
                          onClick={() => setPreviewTarget(item)}
                          title="Preview Payslip"
                          className="size-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-[#81F5F5] transition-colors cursor-pointer"
                        >
                          <Eye className="size-4" />
                        </button>

                        {/* 3-Dots Menu Trigger */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (menuState?.id === item.id) {
                              setMenuState(null)
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect()
                              setMenuState({
                                id: item.id,
                                item,
                                top: rect.bottom + 6,
                                right: window.innerWidth - rect.right,
                              })
                            }
                          }}
                          title="More options"
                          className={`menu-trigger-button size-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                            menuState?.id === item.id
                              ? 'bg-[#0E3E5B] text-[#81F5F5]'
                              : 'hover:bg-white/10 text-slate-400 hover:text-white'
                          }`}
                        >
                          <MoreVertical className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Detached Floating Dropdown Menu (Fixed outside table overflow) */}
      {menuState && (
        <div
          style={{
            top: `${menuState.top}px`,
            right: `${menuState.right}px`,
          }}
          onClick={(e) => e.stopPropagation()}
          className="floating-dropdown-menu fixed w-48 rounded-xl bg-[#001724] border border-slate-700 text-slate-100 shadow-2xl p-1.5 z-[9999] animate-in fade-in-0 zoom-in-95"
        >
          {/* Preview Payslip */}
          <button
            type="button"
            onClick={() => {
              const target = menuState.item
              setMenuState(null)
              setPreviewTarget(target)
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-200 hover:bg-[#0E3E5B] hover:text-[#81F5F5] transition-colors cursor-pointer text-left"
          >
            <Eye className="size-3.5 text-[#81F5F5]" />
            <span>Preview Payslip</span>
          </button>

          {/* Download PDF */}
          <button
            type="button"
            onClick={() => {
              const target = menuState.item
              setMenuState(null)
              handleDownload(target)
            }}
            disabled={downloadingId === menuState.item.id}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-200 hover:bg-[#0E3E5B] hover:text-[#81F5F5] transition-colors cursor-pointer text-left"
          >
            <Download className="size-3.5 text-[#81F5F5]" />
            <span>
              {downloadingId === menuState.item.id ? 'Exporting...' : 'Download PDF'}
            </span>
          </button>

          {/* Edit Payslip */}
          <button
            type="button"
            onClick={() => {
              const target = menuState.item
              setMenuState(null)
              router.push(`/payslips/${target.id}/edit`)
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-200 hover:bg-[#0E3E5B] hover:text-white transition-colors cursor-pointer text-left"
          >
            <Edit2 className="size-3.5 text-slate-400" />
            <span>Edit Payslip</span>
          </button>

          <div className="h-px bg-white/10 my-1" />

          {/* Delete Payslip */}
          <button
            type="button"
            onClick={() => {
              const target = menuState.item
              setMenuState(null)
              setDeleteTarget(target)
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors cursor-pointer text-left"
          >
            <Trash2 className="size-3.5 text-red-400" />
            <span>Delete Payslip</span>
          </button>
        </div>
      )}


      {/* 4. Full Payslip Preview Modal */}
      {previewTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-6 animate-in fade-in overflow-y-auto">
          <div className="bg-[#001E2F] border border-white/20 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#001724]">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-[#0E3E5B] flex items-center justify-center text-[#81F5F5]">
                  <Eye className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Payslip Preview &bull; {previewTarget.employee_name}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Period: {previewTarget.pay_period_start} - {previewTarget.pay_period_end} | Payment Date: {previewTarget.payment_date}
                  </p>
                </div>
              </div>

              {/* Action Buttons in Modal Header */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(previewTarget)}
                  disabled={downloadingId === previewTarget.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#81F5F5] hover:bg-[#6be0e0] text-[#002020] rounded-xl text-xs font-bold transition-all shadow cursor-pointer disabled:opacity-50"
                >
                  <Download className="size-3.5 text-[#002020] stroke-[2.5]" />
                  <span>{downloadingId === previewTarget.id ? 'Exporting...' : 'Download PDF'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => router.push(`/payslips/${previewTarget.id}/edit`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-white/10"
                >
                  <Edit2 className="size-3.5 text-slate-300" />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewTarget(null)}
                  className="size-8 rounded-xl bg-white/5 hover:bg-white/15 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer border border-white/10 ml-2"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Modal Body: Render live web preview component */}
            <div className="p-4 sm:p-6 overflow-y-auto bg-slate-900/60 flex justify-center">
              <div className="w-full">
                <AIMTPayslipWebPreview payslip={previewTarget} />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-white/10 bg-[#001724] flex justify-between items-center text-xs text-slate-400">
              <span>AIMT College Document &bull; Official Payslip Record</span>
              <button
                type="button"
                onClick={() => setPreviewTarget(null)}
                className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-slate-200 rounded-lg font-semibold transition-colors cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#001E2F] border border-white/20 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="size-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="size-5 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Delete Payslip</h3>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              Are you sure you want to delete the payslip for{' '}
              <strong className="text-white">{deleteTarget.employee_name}</strong> (Pay Date:{' '}
              {deleteTarget.payment_date})? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

