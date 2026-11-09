'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  LahoriLoungePayslip,
  lahoriLoungePayslipService,
  formatCurrency,
} from '@/lib/services/lahori-lounge-payslip.service'
import LahoriLoungePayslipPDFTemplate from '@/components/pdf/lahori-lounge-payslip-pdf-template'
import LahoriLoungePayslipWebPreview from '@/components/payslips/lahori-lounge-payslip-web-preview'
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
  FileText,
  AlertTriangle,
  Loader2,
  Eye,
  X,
  Printer,
  UtensilsCrossed,
} from 'lucide-react'

import { useAuthRole } from '@/lib/hooks/use-auth-role'
import TablePagination from '@/components/ui/table-pagination'

type FilterPeriod = 'all' | 'today' | '7days' | '30days' | 'month'

export default function LahoriLoungePayslipList() {
  const router = useRouter()
  const { isViewer } = useAuthRole()
  const [mounted, setMounted] = useState(false)
  const [payslips, setPayslips] = useState<LahoriLoungePayslip[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterPeriod>('all')

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Fixed Floating Menu state
  const [menuState, setMenuState] = useState<{
    id: string
    item: LahoriLoungePayslip
    top: number
    right: number
  } | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  // Preview modal state
  const [previewTarget, setPreviewTarget] = useState<LahoriLoungePayslip | null>(null)

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<LahoriLoungePayslip | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await lahoriLoungePayslipService.getAll()
      setPayslips(data)
    } catch (err) {
      console.error('Failed to load Lahori Lounge payslips:', err)
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
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        (item.employee_name && item.employee_name.toLowerCase().includes(q)) ||
        (item.pay_period_start && item.pay_period_start.toLowerCase().includes(q)) ||
        (item.payment_date && item.payment_date.toLowerCase().includes(q)) ||
        (item.id && item.id.toLowerCase().includes(q))

      if (!matchesSearch) return false

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

  const totalEntries = filteredPayslips.length
  const startIndex = (currentPage - 1) * pageSize
  const paginatedPayslips = filteredPayslips.slice(startIndex, startIndex + pageSize)

  // Download PDF Action
  const handleDownload = async (item: LahoriLoungePayslip) => {
    setDownloadingId(item.id)
    const safeName = (item.employee_name || 'LahoriLounge-Employee')
      .trim()
      .replace(/[/\\?%*:|"<>]/g, '')
      .replace(/\s+/g, '_')
    const fileName = `Lahori_Lounge_Payslip_${safeName}.pdf`

    try {
      const doc = <LahoriLoungePayslipPDFTemplate payslip={item} />
      const blobPromise = pdf(doc).toBlob()
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('PDF generation timed out')), 6000)
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
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const ok = await lahoriLoungePayslipService.delete(deleteTarget.id)
      if (ok.success) {
        setPayslips((prev) => prev.filter((p) => p.id !== deleteTarget.id))
        setDeleteTarget(null)
      } else {
        alert(ok.error || 'Failed to delete payslip')
      }
    } catch (err) {
      console.error('Error deleting payslip:', err)
      alert('Failed to delete payslip. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  // Trigger floating action dropdown positioned relative to button viewport
  const openActionMenu = (e: React.MouseEvent<HTMLButtonElement>, item: LahoriLoungePayslip) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setMenuState({
      id: item.id,
      item,
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    })
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16 font-sans">
      {/* 1. Header Toolbar */}
      <div className="bg-[#001724] border-b border-white/10 px-4 sm:px-8 py-5 shadow-md sticky top-0 z-20">
        <div className="max-w-[1720px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 border border-white/20 shadow-md">
              <img
                src="/Lahori Lounge.png"
                alt="The Lahori Lounge Logo"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-['Montserrat']">
                  The Lahori Lounge Payslips
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#0E3E5B] text-[#81F5F5] uppercase tracking-wider border border-[#81F5F5]/30">
                  TLL
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Generate, manage, preview, and download replica payroll payslips for The Lahori Lounge.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors cursor-pointer"
              title="Refresh Records"
            >
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {!isViewer && (
              <Link
                href="/lahori-lounge/payslips/new"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-[#81F5F5] hover:bg-[#5ce1e6] text-[#001724] transition-all shadow-md cursor-pointer hover:shadow-cyan-500/20"
              >
                <Plus className="size-4 text-[#001724]" />
                <span>Generate Payslip</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Container */}
      <div className="max-w-[1720px] mx-auto px-4 sm:px-8 pt-6 space-y-5">
        {/* Search & Quick Period Filter Bar */}
        <div className="bg-[#001E2F] border border-white/10 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-2.5 size-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Search by employee name, pay date, or period..."
              className="w-full bg-[#001724] border border-slate-700 rounded-lg pl-9 pr-3.5 py-2 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#81F5F5] focus:border-[#81F5F5] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'all', label: 'All Payslips' },
              { id: 'today', label: 'Today' },
              { id: '7days', label: 'Last 7 Days' },
              { id: '30days', label: 'Last 30 Days' },
              { id: 'month', label: 'This Month' },
            ].map((f) => {
              const active = activeFilter === f.id
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setActiveFilter(f.id as FilterPeriod)
                    setCurrentPage(1)
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    active
                      ? 'bg-[#0E3E5B] text-[#81F5F5] border border-[#81F5F5]/40 shadow-xs'
                      : 'bg-[#001724] text-slate-400 hover:text-white border border-slate-700/80'
                  }`}
                >
                  {f.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* 3. Table Container */}
        <div className="bg-[#001E2F] border border-white/10 rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto min-h-[360px]">
            <table className="w-full text-left text-xs sm:text-sm text-slate-200">
              <thead className="bg-[#001724] text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Employee Details</th>
                  <th className="py-3 px-4">Pay Period</th>
                  <th className="py-3 px-4">Payment Date</th>
                  <th className="py-3 px-4 text-right">Ordinary Hours</th>
                  <th className="py-3 px-4 text-right">Gross Total</th>
                  <th className="py-3 px-4 text-right">Tax Deduction</th>
                  <th className="py-3 px-4 text-right">Net Pay</th>
                  <th className="py-3 px-4 text-center w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="size-6 text-[#81F5F5] animate-spin" />
                        <span className="text-xs font-medium">Loading The Lahori Lounge payslips...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedPayslips.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                        <div className="size-12 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center mb-1">
                          <FileText className="size-6" />
                        </div>
                        <span className="text-sm font-bold text-white">No Payslips Found</span>
                        <p className="text-xs text-slate-400 text-center">
                          {searchQuery
                            ? `No payslip records matching "${searchQuery}". Try a different keyword.`
                            : 'No payslips generated for The Lahori Lounge yet. Click "Generate Payslip" to create your first official payslip.'}
                        </p>
                        {!isViewer && !searchQuery && (
                          <Link
                            href="/lahori-lounge/payslips/new"
                            className="mt-3 px-4 py-2 text-xs font-bold rounded-lg bg-[#81F5F5] text-[#001724] hover:bg-[#5ce1e6] transition-all"
                          >
                            Generate First Payslip
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedPayslips.map((item) => {
                    const isRowDownloading = downloadingId === item.id
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-[#0E3E5B]/40 transition-colors group"
                      >
                        {/* Employee Details */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-white text-sm group-hover:text-[#81F5F5] transition-colors">
                            {item.employee_name || 'Unnamed Employee'}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>{item.pay_frequency || 'Fortnightly'}</span>
                            <span>•</span>
                            <span>{item.employment_basis || 'Full-time'}</span>
                          </div>
                        </td>

                        {/* Pay Period */}
                        <td className="py-3 px-4 font-mono text-xs text-slate-300">
                          {item.pay_period_start} – {item.pay_period_end}
                        </td>

                        {/* Payment Date */}
                        <td className="py-3 px-4 font-mono text-xs text-slate-300">
                          {item.payment_date || '-'}
                        </td>

                        {/* Ordinary Hours */}
                        <td className="py-3 px-4 text-right font-mono text-xs text-slate-300">
                          {Number(item.ordinary_hours || 0).toFixed(1)} hrs
                        </td>

                        {/* Gross Total */}
                        <td className="py-3 px-4 text-right font-mono font-semibold text-white">
                          {formatCurrency(item.total_earnings || item.wages_total || 0)}
                        </td>

                        {/* Tax Deduction */}
                        <td className="py-3 px-4 text-right font-mono text-rose-400">
                          -${Number(item.tax_total || item.tax_amount || 0).toFixed(2)}
                        </td>

                        {/* Net Pay */}
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 text-sm">
                          {formatCurrency(item.net_pay || 0)}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setPreviewTarget(item)}
                              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                              title="Instant Live Preview"
                            >
                              <Eye className="size-4 text-[#81F5F5]" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownload(item)}
                              disabled={isRowDownloading}
                              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                              title="Download PDF"
                            >
                              {isRowDownloading ? (
                                <Loader2 className="size-4 animate-spin text-[#81F5F5]" />
                              ) : (
                                <Download className="size-4" />
                              )}
                            </button>

                            {!isViewer && (
                              <button
                                type="button"
                                onClick={(e) => openActionMenu(e, item)}
                                className="menu-trigger-button p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                                title="More options"
                              >
                                <MoreVertical className="size-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {!loading && filteredPayslips.length > 0 && (
            <TablePagination
              totalEntries={totalEntries}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              theme="dark"
            />
          )}
        </div>
      </div>

      {/* 4. Detached Floating Dropdown Menu */}
      {menuState && (
        <div
          style={{ top: `${menuState.top}px`, right: `${menuState.right}px` }}
          className="floating-dropdown-menu fixed w-48 rounded-xl bg-[#001E2F] border border-slate-700 text-slate-100 shadow-2xl p-1 z-50 animate-in fade-in-0 zoom-in-95"
        >
          <button
            type="button"
            onClick={() => {
              setPreviewTarget(menuState.item)
              setMenuState(null)
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-[#0E3E5B] hover:text-[#81F5F5] text-slate-200 transition-colors text-left cursor-pointer"
          >
            <Eye className="size-3.5 text-[#81F5F5]" />
            <span>View Preview</span>
          </button>

          <button
            type="button"
            onClick={() => handleDownload(menuState.item)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-[#0E3E5B] hover:text-[#81F5F5] text-slate-200 transition-colors text-left cursor-pointer"
          >
            <Download className="size-3.5 text-slate-400" />
            <span>Download Official PDF</span>
          </button>

          {!isViewer && (
            <>
              <Link
                href={`/lahori-lounge/payslips/${menuState.item.id}/edit`}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-[#0E3E5B] hover:text-[#81F5F5] text-slate-200 transition-colors text-left"
              >
                <Edit2 className="size-3.5 text-slate-400" />
                <span>Edit Payslip</span>
              </Link>

              <div className="my-1 border-t border-slate-700/60" />

              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(menuState.item)
                  setMenuState(null)
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors text-left cursor-pointer"
              >
                <Trash2 className="size-3.5" />
                <span>Delete Payslip</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* 5. Live Preview Modal */}
      {previewTarget && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in-0 duration-200">
          <div className="bg-[#001724] border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-[#001E2F]">
              <div className="flex items-center gap-2.5">
                <FileText className="size-4 text-[#81F5F5]" />
                <h3 className="text-sm font-bold text-white font-['Montserrat']">
                  The Lahori Lounge Payslip Preview — {previewTarget.employee_name}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(previewTarget)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#81F5F5] text-[#001724] hover:bg-[#5ce1e6] transition-all cursor-pointer"
                >
                  <Download className="size-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTarget(null)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Modal Content Web Preview */}
            <div className="p-4 sm:p-6 overflow-y-auto bg-slate-900/60 flex justify-center">
              <LahoriLoungePayslipWebPreview payslip={previewTarget} />
            </div>
          </div>
        </div>
      )}

      {/* 6. Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in-0 duration-200">
          <div className="bg-[#001E2F] border border-slate-700 rounded-2xl max-w-md w-full p-6 text-slate-100 shadow-2xl space-y-4">
            <div className="size-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <AlertTriangle className="size-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-white font-['Montserrat']">
                Delete Payslip Record?
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to delete the payslip for{' '}
                <strong className="text-white">{deleteTarget.employee_name}</strong> (Pay Period:{' '}
                {deleteTarget.pay_period_start} – {deleteTarget.pay_period_end})?
                This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                {deleting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
                <span>{deleting ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

