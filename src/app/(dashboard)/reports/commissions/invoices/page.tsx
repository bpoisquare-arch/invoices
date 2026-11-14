'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  Receipt,
  Search,
  RotateCcw,
  Building2,
  Calendar,
  DollarSign,
  Download,
  Eye,
  FileText,
  FileSpreadsheet,
  CreditCard,
  Banknote,
  Users,
  ChevronRight,
  ChevronDown,
  Layers,
  ArrowLeft,
  CheckCircle2,
  Paperclip,
  ExternalLink,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { CommissionInvoice } from '@/lib/services/commission-invoice.service'
import CommissionInvoiceModal, { CommissionInvoiceModalData } from '@/components/reports/commissions/commission-invoice-modal'
import SlipsPreviewModal from '@/components/reports/slips-preview-modal'
import { downloadCommissionInvoicePdf } from '@/lib/utils/generate-commission-invoice-pdf'

export default function CommissionInvoicesHistoryPage() {
  const [invoices, setInvoices] = useState<CommissionInvoice[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // View Mode: 'list' (Chronological table) vs 'agency' (Grouped accordions)
  const [viewMode, setViewMode] = useState<'list' | 'agency'>('list')

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAgency, setSelectedAgency] = useState<string>('all')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | 'Cash' | 'Bank'>('all')

  // Expanded agency accordions in 'agency' view
  const [expandedAgencies, setExpandedAgencies] = useState<Record<string, boolean>>({})

  // Modal preview state
  const [previewInvoice, setPreviewInvoice] = useState<CommissionInvoiceModalData | null>(null)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)

  // Slips preview modal state (for Bank disbursements)
  const [slipsPreviewOpen, setSlipsPreviewOpen] = useState(false)
  const [selectedSlips, setSelectedSlips] = useState<any[]>([])

  // Download PDF loading state tracker
  const [downloadingRef, setDownloadingRef] = useState<string | null>(null)

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/reports/commissions/invoices')
      const data = await res.json()
      if (data.success && Array.isArray(data.invoices)) {
        setInvoices(data.invoices)
      }
    } catch (err) {
      console.error('Failed to fetch commission invoices:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  // Extract unique agency names for filter dropdown
  const uniqueAgencies = useMemo(() => {
    const set = new Set<string>()
    invoices.forEach((inv) => {
      if (inv.agencyName) set.add(inv.agencyName.trim())
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [invoices])

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (selectedAgency !== 'all') {
        if (inv.agencyName.toLowerCase().trim() !== selectedAgency.toLowerCase().trim()) {
          return false
        }
      }

      if (paymentMethodFilter !== 'all') {
        const method = inv.paymentMethod || 'Cash'
        if (method !== paymentMethodFilter) return false
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const refMatch = (inv.referenceNumber || '').toLowerCase().includes(q)
        const agencyMatch = (inv.agencyName || '').toLowerCase().includes(q)
        const notesMatch = (inv.notes || '').toLowerCase().includes(q)
        const txnMatch = (inv.bankTransactionId || '').toLowerCase().includes(q)
        if (!refMatch && !agencyMatch && !notesMatch && !txnMatch) return false
      }

      return true
    })
  }, [invoices, selectedAgency, paymentMethodFilter, searchQuery])

  // Grouped by Agency
  const groupedByAgency = useMemo(() => {
    const map = new Map<string, CommissionInvoice[]>()

    filteredInvoices.forEach((inv) => {
      const name = inv.agencyName || 'Other'
      if (!map.has(name)) {
        map.set(name, [])
      }
      map.get(name)!.push(inv)
    })

    return Array.from(map.entries())
      .map(([agencyName, items]) => {
        const totalAmount = items.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0)
        return {
          agencyName,
          invoices: items,
          totalAmount: Math.round(totalAmount * 100) / 100,
          count: items.length,
        }
      })
      .sort((a, b) => b.totalAmount - a.totalAmount || a.agencyName.localeCompare(b.agencyName))
  }, [filteredInvoices])

  // KPI Statistics
  const stats = useMemo(() => {
    let totalAmount = 0
    let cashCount = 0
    let cashAmount = 0
    let bankCount = 0
    let bankAmount = 0

    filteredInvoices.forEach((inv) => {
      const amt = Number(inv.totalAmount) || 0
      totalAmount += amt
      const method = inv.paymentMethod || 'Cash'
      if (method === 'Cash') {
        cashCount++
        cashAmount += amt
      } else {
        bankCount++
        bankAmount += amt
      }
    })

    return {
      totalCount: filteredInvoices.length,
      totalAmount: Math.round(totalAmount * 100) / 100,
      cashCount,
      cashAmount: Math.round(cashAmount * 100) / 100,
      bankCount,
      bankAmount: Math.round(bankAmount * 100) / 100,
    }
  }, [filteredInvoices])

  const toggleAgency = (agencyName: string) => {
    setExpandedAgencies((prev) => ({
      ...prev,
      [agencyName]: !prev[agencyName],
    }))
  }

  const expandAll = () => {
    const next: Record<string, boolean> = {}
    groupedByAgency.forEach((g) => {
      next[g.agencyName] = true
    })
    setExpandedAgencies(next)
  }

  const collapseAll = () => {
    setExpandedAgencies({})
  }

  const handleOpenPreview = (inv: CommissionInvoice) => {
    setPreviewInvoice({
      referenceNumber: inv.referenceNumber,
      invoiceDate: inv.invoiceDate,
      agencyName: inv.agencyName,
      amount: inv.totalAmount,
      description: inv.description,
      notes: inv.notes,
    })
    setPreviewModalOpen(true)
  }

  const handleViewSlips = (inv: CommissionInvoice) => {
    if (inv.slips && inv.slips.length > 0) {
      setSelectedSlips(inv.slips)
      setSlipsPreviewOpen(true)
    }
  }

  const handleDownloadInvoicePdf = (inv: CommissionInvoice) => {
    setDownloadingRef(inv.referenceNumber)
    try {
      downloadCommissionInvoicePdf({
        referenceNumber: inv.referenceNumber,
        invoiceDate: inv.invoiceDate,
        dueDate: inv.dueDate,
        agencyName: inv.agencyName,
        amount: inv.totalAmount,
        description: inv.description,
        notes: inv.notes,
      })
    } catch (err) {
      console.warn('Direct jsPDF download failed, falling back to server route:', err)
      try {
        const url = `/api/reports/commissions/invoices/pdf?reference=${encodeURIComponent(inv.referenceNumber)}`
        const link = document.createElement('a')
        link.href = url
        link.download = `Invoice-${inv.referenceNumber}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } catch (fallbackErr) {
        window.open(`/api/reports/commissions/invoices/pdf?reference=${encodeURIComponent(inv.referenceNumber)}`, '_blank')
      }
    } finally {
      setTimeout(() => setDownloadingRef(null), 400)
    }
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-14 font-sans">
      {/* 1. Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-white via-slate-50/70 to-slate-50 border border-slate-200/90 p-5 sm:p-6 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-400" />

        <div className="flex items-center gap-4">
          <Link href="/reports/commissions">
            <Button
              variant="outline"
              size="icon"
              className="size-11 rounded-xl border-slate-300 bg-white hover:bg-slate-100 text-slate-700 shadow-2xs shrink-0 cursor-pointer"
              title="Back to Commissions Ledger"
            >
              <ArrowLeft className="size-5" />
            </Button>
          </Link>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#003D5C] tracking-tight font-['Geist']">
                Commission Invoices History
              </h1>
              <span className="inline-flex items-center gap-1 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-900 border border-emerald-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                <span className="size-1.5 rounded-full bg-emerald-600" />
                AIMT Entity
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Complete audit ledger of all issued commission payout vouchers (CAP-001 onwards), downloadable PDFs, and receipts.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchInvoices()}
            disabled={isLoading}
            className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100 h-9.5 px-3.5 rounded-xl text-xs gap-2 shadow-2xs font-semibold cursor-pointer"
            title="Refresh Invoices"
          >
            <RotateCcw className={`size-3.5 text-emerald-600 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Link href="/reports/commissions">
            <Button
              variant="outline"
              size="sm"
              className="border-cyan-300/80 bg-cyan-50/70 text-[#003D5C] hover:bg-cyan-100/70 h-9.5 px-3.5 rounded-xl text-xs gap-1.5 font-bold cursor-pointer"
            >
              <FileSpreadsheet className="size-3.5 text-[#009D9E]" />
              <span>Back to Ledger</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invoices */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#001724] via-[#002b40] to-[#003D5C] p-5 text-white shadow-md border border-cyan-500/20 group">
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300 bg-cyan-500/20 px-2.5 py-0.5 rounded-full border border-cyan-400/30">
                Invoices Generated
              </span>
              <h3 className="text-2xl font-black tracking-tight text-white mt-2 font-mono">
                {stats.totalCount} Vouchers
              </h3>
              <p className="text-xs text-cyan-100 font-medium mt-1">
                Sequential Series (CAP-001+)
              </p>
            </div>
            <div className="size-12 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 text-cyan-300 flex items-center justify-center shadow-inner">
              <Receipt className="size-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-cyan-100/80">
            <span>Unique Vouchers</span>
            <span className="font-bold text-cyan-300">{groupedByAgency.length} Agencies</span>
          </div>
        </div>

        {/* Total Payout Amount */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#004d40] via-[#00695c] to-[#00897b] p-5 text-white shadow-md border border-teal-400/20 group">
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-200 bg-white/15 px-2.5 py-0.5 rounded-full border border-white/20">
                Total Disbursed
              </span>
              <h3 className="text-2xl font-black tracking-tight text-white mt-2 font-mono">
                ${stats.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-teal-100 font-medium mt-1">
                Gross Disbursed in AUD
              </p>
            </div>
            <div className="size-12 rounded-xl bg-white/15 backdrop-blur-xs border border-white/20 text-emerald-200 flex items-center justify-center shadow-inner">
              <DollarSign className="size-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-[11px] text-teal-100">
            <span>Settled Commission</span>
            <span className="font-bold">100% Reconciled</span>
          </div>
        </div>

        {/* Cash Payouts */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e1b4b] via-[#2e1065] to-[#4c1d95] p-5 text-white shadow-md border border-purple-400/20 group">
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-200 bg-purple-500/25 px-2.5 py-0.5 rounded-full border border-purple-300/30">
                Cash Invoices
              </span>
              <h3 className="text-2xl font-black tracking-tight text-white mt-2 font-mono">
                ${stats.cashAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-purple-200/90 font-medium mt-1">
                {stats.cashCount} Cash Disbursements
              </p>
            </div>
            <div className="size-12 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 text-purple-200 flex items-center justify-center shadow-inner">
              <Banknote className="size-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-purple-200/80">
            <span>Physical Cash Handover</span>
            <span className="font-bold text-purple-300">Voucher Signed</span>
          </div>
        </div>

        {/* Bank Transfers */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#283593] via-[#3949ab] to-[#5c6bc0] p-5 text-white shadow-md border border-indigo-400/20 group">
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-200 bg-white/15 px-2.5 py-0.5 rounded-full border border-white/20">
                Bank Invoices
              </span>
              <h3 className="text-2xl font-black tracking-tight text-white mt-2 font-mono">
                ${stats.bankAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-indigo-100 font-medium mt-1">
                {stats.bankCount} Bank Transfers (with Slips)
              </p>
            </div>
            <div className="size-12 rounded-xl bg-white/15 backdrop-blur-xs border border-white/20 text-white flex items-center justify-center shadow-inner">
              <CreditCard className="size-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-[11px] text-indigo-100">
            <span>Electronic Funds Transfer</span>
            <span className="font-bold">EFT Verified</span>
          </div>
        </div>
      </div>

      {/* 3. Controls & View Switcher */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3.5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* View Mode Toggle */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80 self-start">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-[#003D5C] shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="size-3.5 text-emerald-600" />
              <span>List-wise View</span>
              <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {filteredInvoices.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('agency')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'agency'
                  ? 'bg-white text-[#003D5C] shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="size-3.5 text-[#009D9E]" />
              <span>Agency-wise View</span>
              <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {groupedByAgency.length}
              </span>
            </button>
          </div>

          {/* Expand / Collapse for Agency View */}
          {viewMode === 'agency' && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={expandAll}
                className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer"
              >
                Expand All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={collapseAll}
                className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer"
              >
                Collapse All
              </Button>
            </div>
          )}
        </div>

        {/* Search & Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-100">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search reference (CAP-001), agency, or txn #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-xs bg-slate-50/60 border-slate-300 rounded-xl"
            />
          </div>

          {/* Agency Filter */}
          <div>
            <select
              value={selectedAgency}
              onChange={(e) => setSelectedAgency(e.target.value)}
              className="w-full h-10 px-3 text-xs font-semibold text-slate-800 bg-slate-50/60 border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">All Agencies ({uniqueAgencies.length})</option>
              {uniqueAgencies.map((agency) => (
                <option key={agency} value={agency}>
                  {agency}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method Filter */}
          <div>
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value as any)}
              className="w-full h-10 px-3 text-xs font-semibold text-slate-800 bg-slate-50/60 border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">All Payment Methods</option>
              <option value="Cash">Cash Only</option>
              <option value="Bank">Bank Only (with Slips)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Content Area: List View OR Agency View */}
      {isLoading ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-200">
          <Loader2 className="size-8 animate-spin mx-auto text-emerald-600 mb-3" />
          <p className="text-sm font-semibold text-slate-700">Loading commission invoices...</p>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <div className="size-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Receipt className="size-7 text-emerald-600" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Commission Invoices Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchQuery || selectedAgency !== 'all' || paymentMethodFilter !== 'all'
              ? 'Try adjusting your search query or filters.'
              : 'When you disburse an agency commission with "Save & Generate Invoice", the invoice voucher and record will appear here.'}
          </p>
        </div>
      ) : viewMode === 'list' ? (
        /* ============================================================== */
        /* LIST-WISE CHRONOLOGICAL VIEW                                   */
        /* ============================================================== */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-[#001724] to-[#003D5C] text-white text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Invoice Ref #</th>
                  <th className="py-3.5 px-4">Agency Name</th>
                  <th className="py-3.5 px-4">Invoice Date</th>
                  <th className="py-3.5 px-4">Method</th>
                  <th className="py-3.5 px-4">Bank Ref / Transaction ID</th>
                  <th className="py-3.5 px-4 text-center">Slips</th>
                  <th className="py-3.5 px-4 text-right">Amount ($ AUD)</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredInvoices.map((inv) => {
                  const method = inv.paymentMethod || 'Cash'
                  const slipsCount = inv.slips?.length || 0

                  return (
                    <tr key={inv.id || inv.referenceNumber} className="hover:bg-slate-50/80 transition-colors">
                      {/* Ref Number */}
                      <td className="py-3.5 px-4 font-mono font-extrabold text-[#003D5C]">
                        <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                          {inv.referenceNumber}
                        </span>
                      </td>

                      {/* Agency Name */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <Building2 className="size-3.5 text-slate-400 shrink-0" />
                          <span>{inv.agencyName}</span>
                        </div>
                        {inv.notes && (
                          <div className="text-[10.5px] text-slate-500 font-normal italic mt-0.5 line-clamp-1">
                            {inv.notes}
                          </div>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {inv.invoiceDate}
                      </td>

                      {/* Payment Method */}
                      <td className="py-3.5 px-4">
                        {method === 'Cash' ? (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <Banknote className="size-3 text-emerald-600" />
                            <span>Cash</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                            <CreditCard className="size-3 text-blue-600" />
                            <span>Bank</span>
                          </span>
                        )}
                      </td>

                      {/* Bank Ref / Txn ID */}
                      <td className="py-3.5 px-4 font-mono text-slate-600 text-[11px]">
                        {inv.bankTransactionId ? (
                          <span className="text-slate-800 font-medium">{inv.bankTransactionId}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Slips */}
                      <td className="py-3.5 px-4 text-center">
                        {slipsCount > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleViewSlips(inv)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 hover:bg-teal-100 cursor-pointer"
                            title="View attached slips"
                          >
                            <Paperclip className="size-3 text-teal-600" />
                            <span>{slipsCount} Slips</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                        ${Number(inv.totalAmount || 0).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenPreview(inv)}
                            className="h-8 px-2.5 text-xs text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg gap-1 cursor-pointer"
                            title="Preview Invoice"
                          >
                            <Eye className="size-3.5 text-emerald-600" />
                            <span>Preview</span>
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleDownloadInvoicePdf(inv)}
                            disabled={downloadingRef === inv.referenceNumber}
                            className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg gap-1 cursor-pointer shadow-xs disabled:opacity-50"
                            title="Download PDF"
                          >
                            {downloadingRef === inv.referenceNumber ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Download className="size-3.5" />
                            )}
                            <span>PDF</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ============================================================== */
        /* AGENCY-WISE ACCORDION VIEW                                     */
        /* ============================================================== */
        <div className="space-y-3">
          {groupedByAgency.map((group) => {
            const isExpanded = Boolean(expandedAgencies[group.agencyName])
            return (
              <div
                key={group.agencyName}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs transition-all"
              >
                {/* Agency Header Row */}
                <div
                  onClick={() => toggleAgency(group.agencyName)}
                  className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/80 transition-colors select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                      {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-slate-900 text-base truncate">
                          {group.agencyName}
                        </h3>
                        <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                          {group.count} Invoices
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Latest: {group.invoices[0]?.invoiceDate || '-'} • Ref: {group.invoices[0]?.referenceNumber || '-'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Total Invoiced</div>
                    <div className="font-mono font-black text-emerald-700 text-base sm:text-lg">
                      ${group.totalAmount.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} AUD
                    </div>
                  </div>
                </div>

                {/* Expanded Invoices for this Agency */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50/60 p-3 sm:p-4">
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 text-[10.5px] font-bold uppercase tracking-wider border-b border-slate-200">
                            <th className="py-2.5 px-3">Ref #</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Method</th>
                            <th className="py-2.5 px-3">Bank Ref</th>
                            <th className="py-2.5 px-3 text-center">Slips</th>
                            <th className="py-2.5 px-3 text-right">Amount ($ AUD)</th>
                            <th className="py-2.5 px-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {group.invoices.map((inv) => (
                            <tr key={inv.id || inv.referenceNumber} className="hover:bg-slate-50/70">
                              <td className="py-2.5 px-3 font-mono font-extrabold text-[#003D5C]">
                                {inv.referenceNumber}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-600">
                                {inv.invoiceDate}
                              </td>
                              <td className="py-2.5 px-3">
                                {inv.paymentMethod === 'Bank' ? (
                                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                    Bank
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    Cash
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">
                                {inv.bankTransactionId || '-'}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {inv.slips && inv.slips.length > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => handleViewSlips(inv)}
                                    className="text-[10.5px] font-bold text-teal-700 hover:underline cursor-pointer"
                                  >
                                    {inv.slips.length} Slips
                                  </button>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                ${Number(inv.totalAmount || 0).toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleOpenPreview(inv)}
                                    className="h-7 px-2 text-xs text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                                    title="Preview Invoice"
                                  >
                                    <Eye className="size-3.5 mr-1" />
                                    <span>View</span>
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDownloadInvoicePdf(inv)}
                                    disabled={downloadingRef === inv.referenceNumber}
                                    className="h-7 px-2 text-xs text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                                    title="Download PDF"
                                  >
                                    {downloadingRef === inv.referenceNumber ? (
                                      <Loader2 className="size-3.5 animate-spin" />
                                    ) : (
                                      <Download className="size-3.5 mr-1" />
                                    )}
                                    <span>PDF</span>
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Invoice Preview Modal */}
      {previewInvoice && (
        <CommissionInvoiceModal
          open={previewModalOpen}
          onOpenChange={setPreviewModalOpen}
          data={previewInvoice}
        />
      )}

      {/* Slips Preview Modal */}
      {slipsPreviewOpen && selectedSlips.length > 0 && (
        <SlipsPreviewModal
          isOpen={slipsPreviewOpen}
          onClose={() => setSlipsPreviewOpen(false)}
          slips={selectedSlips}
          initialIndex={0}
          title="Commission Disbursement Slips"
        />
      )}
    </div>
  )
}

