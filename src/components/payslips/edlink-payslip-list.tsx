'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  EdlinkPayslip,
  edlinkPayslipService,
  formatCurrency,
} from '@/lib/services/edlink-payslip.service'
import EdLinkPayslipPDFTemplate from '@/components/pdf/edlink-payslip-pdf-template'
import EdLinkPayslipWebPreview from '@/components/payslips/edlink-payslip-web-preview'
import { pdf } from '@react-pdf/renderer'
import {
  Search,
  Plus,
  RefreshCw,
  MoreVertical,
  Download,
  Edit2,
  Trash2,
  Calendar,
  Filter,
  FileText,
  AlertTriangle,
  Loader2,
  Eye,
  X,
  Printer,
  Building2,
} from 'lucide-react'

type FilterPeriod = 'all' | 'today' | '7days' | '30days' | 'month'

export default function EdLinkPayslipList() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [payslips, setPayslips] = useState<EdlinkPayslip[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterPeriod>('all')

  // Fixed Floating Menu state (detached from table overflow)
  const [menuState, setMenuState] = useState<{
    id: string
    item: EdlinkPayslip
    top: number
    right: number
  } | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  // Preview modal state
  const [previewTarget, setPreviewTarget] = useState<EdlinkPayslip | null>(null)

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<EdlinkPayslip | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await edlinkPayslipService.getAll()
      setPayslips(data)
    } catch (err) {
      console.error('Failed to load EdLink payslips:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    loadData()

    // Real-time subscription to database changes
    const unsubscribe = edlinkPayslipService.subscribeToChanges(() => {
      loadData()
    })

    return () => {
      unsubscribe()
    }
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
  const handleDownload = async (item: EdlinkPayslip) => {
    setDownloadingId(item.id)
    const safeName = (item.employee_name || 'EdLink-Employee')
      .trim()
      .replace(/[/\\?%*:|"<>]/g, '')
      .replace(/\s+/g, '_')
    const fileName = `EdLink_Payslip_${safeName}.pdf`

    try {
      // 1. Primary & Fastest: Server streaming endpoint
      try {
        const res = await fetch('/api/edlink-payslips-pdf', {
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
      const doc = <EdLinkPayslipPDFTemplate payslip={item} />
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
      const res = await edlinkPayslipService.delete(deleteTarget.id)
      if (res.success) {
        setPayslips((prev) => prev.filter((p) => p.id !== deleteTarget.id))
        setDeleteTarget(null)
      } else {
        alert(res.error || 'Failed to delete payslip from database.')
      }
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
            <Building2 className="size-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-['Montserrat']">
              EdLink Australia Employee Payslips
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Search, preview, manage, and export EdLink Australia payslips (Real-time DB synced).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer border border-white/10 disabled:opacity-50"
          >
            <RefreshCw className={`size-4 text-[#81F5F5] ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            href="/edlink/payslips/new"
            className="flex items-center gap-1.5 px-4 py-2 bg-[#81F5F5] hover:bg-[#6be0e0] text-[#002020] rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md cursor-pointer"
          >
            <Plus className="size-4 text-[#002020] stroke-[3]" />
            <span>Generate Payslip</span>
          </Link>
        </div>
      </div>

      {/* 2. Filter & Search Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-[#001E2F]/60 border border-white/10 p-3.5 rounded-2xl">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by employee name, dates, reference..."
            className="w-full bg-[#001724] border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#81F5F5]/50"
          />
        </div>

        {/* Period Filter Tabs */}
        <div className="flex items-center gap-1 bg-[#001724] border border-white/10 p-1 rounded-xl overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeFilter === 'all'
                ? 'bg-[#0E3E5B] text-[#81F5F5] shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('today')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeFilter === 'today'
                ? 'bg-[#0E3E5B] text-[#81F5F5] shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('7days')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeFilter === '7days'
                ? 'bg-[#0E3E5B] text-[#81F5F5] shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Last 7 Days
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('30days')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeFilter === '30days'
                ? 'bg-[#0E3E5B] text-[#81F5F5] shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Last 30 Days
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('month')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeFilter === 'month'
                ? 'bg-[#0E3E5B] text-[#81F5F5] shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            This Month
          </button>
        </div>
      </div>

      {/* 3. Table View */}
      <div className="bg-[#001E2F] border border-white/10 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="size-8 animate-spin text-[#81F5F5]" />
            <span className="text-sm text-slate-300">Loading payslips from live database...</span>
          </div>
        ) : filteredPayslips.length === 0 ? (
          <div className="text-center py-20 px-4 space-y-4">
            <div className="size-16 rounded-2xl bg-white/5 border border-white/10 mx-auto flex items-center justify-center text-slate-400">
              <FileText className="size-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">No EdLink Payslips Found</h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md mx-auto">
                {searchQuery || activeFilter !== 'all'
                  ? 'No payslips match your search or filter criteria. Try clearing filters.'
                  : 'Get started by generating your first EdLink Australia employee payslip.'}
              </p>
            </div>
            <Link
              href="/edlink/payslips/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#81F5F5] text-[#002020] rounded-xl text-xs sm:text-sm font-bold shadow-md cursor-pointer hover:bg-[#6be0e0]"
            >
              <Plus className="size-4" />
              <span>Create Payslip</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-[#001724]/80 text-slate-300 uppercase tracking-wider text-[11px] font-bold">
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Pay Period</th>
                  <th className="py-3.5 px-4">Payment Date</th>
                  <th className="py-3.5 px-4 text-right">Total Earnings</th>
                  <th className="py-3.5 px-4 text-right">PAYG Tax</th>
                  <th className="py-3.5 px-4 text-right">Net Pay</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {filteredPayslips.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-white/[0.03] transition-colors group cursor-default"
                  >
                    {/* Employee */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white group-hover:text-[#81F5F5] transition-colors">
                        {item.employee_name || 'Unnamed Employee'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {item.paid_by_name || 'EdLink Australia'}
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

                    {/* Total Earnings */}
                    <td className="py-3.5 px-4 text-right font-bold text-slate-100">
                      {formatCurrency(item.total_earnings || 0)}
                    </td>

                    {/* PAYG Tax */}
                    <td className="py-3.5 px-4 text-right font-bold text-amber-400/90">
                      {formatCurrency(item.tax_amount || 0)}
                    </td>

                    {/* Net Pay */}
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-400 text-sm">
                      {formatCurrency(item.net_pay || 0)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPreviewTarget(item)}
                          className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="View Preview"
                        >
                          <Eye className="size-4 text-[#81F5F5]" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownload(item)}
                          disabled={downloadingId === item.id}
                          className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                          title="Download PDF"
                        >
                          {downloadingId === item.id ? (
                            <Loader2 className="size-4 animate-spin text-[#81F5F5]" />
                          ) : (
                            <Download className="size-4 text-slate-300" />
                          )}
                        </button>

                        <Link
                          href={`/edlink/payslips/${item.id}/edit`}
                          className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Edit Payslip"
                        >
                          <Edit2 className="size-4 text-slate-300" />
                        </Link>

                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          className="p-1.5 hover:bg-rose-500/20 rounded-lg text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Delete Payslip"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Preview Modal */}
      {previewTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-[#001724] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#001E2F]">
              <div className="flex items-center gap-2">
                <FileText className="size-5 text-[#81F5F5]" />
                <span className="font-bold text-white text-sm sm:text-base">
                  Payslip Preview - {previewTarget.employee_name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(previewTarget)}
                  disabled={downloadingId === previewTarget.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#81F5F5] hover:bg-[#6be0e0] text-[#002020] rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Download className="size-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTarget(null)}
                  className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#001724]">
              <div className="max-w-[820px] mx-auto shadow-2xl">
                <EdLinkPayslipWebPreview payslip={previewTarget} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#001E2F] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl text-white">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="size-10 rounded-xl bg-rose-500/15 flex items-center justify-center border border-rose-500/30">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Delete Payslip</h3>
                <p className="text-xs text-slate-400">This action will delete permanently from database.</p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/5 rounded-xl p-3.5 text-xs space-y-1.5 text-slate-300">
              <div>
                <span className="text-slate-400">Employee: </span>
                <span className="font-bold text-white">{deleteTarget.employee_name}</span>
              </div>
              <div>
                <span className="text-slate-400">Period: </span>
                <span className="font-mono text-slate-200">
                  {deleteTarget.pay_period_start} - {deleteTarget.pay_period_end}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Net Pay: </span>
                <span className="font-bold text-emerald-400">
                  {formatCurrency(deleteTarget.net_pay || 0)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-md disabled:opacity-50"
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
