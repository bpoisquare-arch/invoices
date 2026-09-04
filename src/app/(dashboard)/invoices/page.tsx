'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { InvoiceWithDetails, Company } from '@/lib/supabase/database.types'
import {
  getInvoices,
  duplicateInvoice,
  InvoiceFilterParams,
  syncLocalInvoicesToSupabase,
} from '@/lib/services/invoice.service'
import { getCompanies } from '@/lib/services/company.service'
import { renderInvoicePDFDocument } from '@/lib/services/template-registry'
import { pdf } from '@react-pdf/renderer'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  FileText,
  FilePlus,
  Search,
  Filter,
  Eye,
  Edit,
  Copy,
  Trash2,
  Download,
  MoreVertical,
  Loader2,
  RefreshCw,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CheckCircle2,
  Building2,
  Receipt,
  Plus,
  TrendingUp,
} from 'lucide-react'
import RenameInvoiceDialog from '@/components/invoices/rename-invoice-dialog'
import DeleteInvoiceDialog from '@/components/invoices/delete-invoice-dialog'

export default function InvoicesPage() {
  const router = useRouter()

  // State
  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  // Filters State
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedCompany, setSelectedCompany] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | '30days' | 'this_month' | 'last_month' | 'this_year' | 'custom'>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'number' | 'amount_desc' | 'amount_asc'>('newest')
  const [page, setPage] = useState(1)
  const pageSize = 20

  // Dialog State
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithDetails | null>(null)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setPage(1)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchQuery])

  const [activeEntity, setActiveEntity] = useState<string>('edlink-pk')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('active_entity') || 'edlink-pk'
      setActiveEntity(stored)
    }
  }, [])

  // Load companies dropdown
  useEffect(() => {
    getCompanies(true).then(setCompanies).catch(console.error)
  }, [])

  // Fetch invoices on filter/page change
  async function loadInvoices() {
    try {
      setIsLoading(true)
      const currentEntity = (typeof window !== 'undefined' ? localStorage.getItem('active_entity') : activeEntity) || 'edlink-pk'
      const params: InvoiceFilterParams = {
        search: debouncedSearch,
        companyId: selectedCompany,
        entityType: currentEntity === 'edlink-au' ? 'edlink-au' : 'edlink-pk',
        dateFilter,
        startDate: dateFilter === 'custom' ? startDate : undefined,
        endDate: dateFilter === 'custom' ? endDate : undefined,
        sortBy,
        page,
        pageSize,
      }
      const res = await getInvoices(params)
      setInvoices(res.invoices)
      setTotalCount(res.totalCount)
    } catch (err) {
      console.error('Error fetching invoices:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadInvoices()
  }, [debouncedSearch, selectedCompany, dateFilter, startDate, endDate, sortBy, page, activeEntity])

  function handleResetFilters() {
    setSearchQuery('')
    setSelectedCompany('all')
    setDateFilter('all')
    setStartDate('')
    setEndDate('')
    setSortBy('newest')
    setPage(1)
  }

  async function handleDuplicate(inv: InvoiceWithDetails) {
    try {
      setIsLoading(true)
      const newInv = await duplicateInvoice(inv.id)
      router.push(`/invoices/${newInv.id}/edit`)
    } catch (err: any) {
      alert(err?.message || 'Failed to duplicate invoice')
      setIsLoading(false)
    }
  }

  async function handleDownloadPDF(inv: InvoiceWithDetails) {
    try {
      setDownloadingId(inv.id)
      const doc = renderInvoicePDFDocument(inv, inv.template_snapshot)
      const blob = await pdf(doc).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Invoice-${inv.invoice_number || 'EDL'}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      window.open(`/api/pdf/${inv.id}`, '_blank')
    } finally {
      setDownloadingId(null)
    }
  }

  const isEdLinkAu = activeEntity === 'edlink-au'
  const isEdLinkPk = !isEdLinkAu
  const quickGenerateHref = isEdLinkAu ? '/invoices/new?company=edlink' : '/invoices/new?company=anonymous'

  const totalPages = Math.ceil(totalCount / pageSize) || 1

  return (
    <div className="space-y-6 max-w-full mx-auto font-sans">
      {/* Overview Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#003D5C] tracking-tight">
            Overview ({isEdLinkAu ? 'EdLink Australia' : 'EdLink Pakistan'})
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your enterprise billing operations.
          </p>
        </div>
        <Link href={quickGenerateHref} className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto bg-[#009D9E] hover:bg-[#007A7A] text-white px-6 py-3 font-bold uppercase tracking-wider text-xs gap-2 shadow-xs transition-colors justify-center">
            <Plus className="w-4 h-4" />
            QUICK GENERATE INVOICE
          </Button>
        </Link>
      </div>

      {/* Metrics Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {/* Card 1: Total Companies */}
        <Card className="bg-white border border-[#E2E8F0] shadow-2xs p-5 sm:p-6 flex flex-col justify-between rounded-lg">
          <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Companies
            </span>
            <div className="p-2 bg-[#13557A]/10 rounded-lg text-[#003D5C]">
              <Building2 className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="font-['Montserrat'] text-3xl sm:text-4xl font-extrabold text-slate-900">
              {companies.filter((c) => {
                const isAnon = c.prefix === 'ANO' || c.name.toLowerCase() === 'anonymous'
                if (isEdLinkPk) return isAnon
                if (isEdLinkAu) return !isAnon
                return true
              }).length}
            </div>
            <div className="flex items-center text-[#92CA37] mt-2 text-xs font-semibold">
              <TrendingUp className="w-4 h-4 mr-1 text-[#92CA37] shrink-0" />
              <span className="truncate">Active Billing Entities</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Total Invoices */}
        <Card className="bg-white border border-[#E2E8F0] shadow-2xs p-5 sm:p-6 flex flex-col justify-between rounded-lg">
          <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Invoices
            </span>
            <div className="p-2 bg-[#13557A]/10 rounded-lg text-[#003D5C]">
              <Receipt className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="font-['Montserrat'] text-3xl sm:text-4xl font-extrabold text-slate-900">
              {totalCount}
            </div>
            <div className="flex items-center text-[#92CA37] mt-2 text-xs font-semibold">
              <TrendingUp className="w-4 h-4 mr-1 text-[#92CA37] shrink-0" />
              <span className="truncate">Lifetime Generated Invoices</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters Controls Box */}
      <Card className="shadow-xs border-slate-200 p-3.5 sm:p-4 space-y-3 sm:space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4 items-center">
          {/* Multi-field Instant Search */}
          <div className="sm:col-span-2 lg:col-span-6 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input
              placeholder="Search by Invoice #, Customer, Reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-xs"
            />
          </div>

          {/* Company Filter */}
          <div className="sm:col-span-1 lg:col-span-3">
            {(() => {
              const matched = companies.find((c) => c.id === selectedCompany)
              const companyDisplay = selectedCompany === 'all' || !matched ? 'All Companies' : `${matched.name} (${matched.prefix})`
              return (
                <Select value={selectedCompany} onValueChange={(val) => { if (val) setSelectedCompany(val); setPage(1); }}>
                  <SelectTrigger className="h-10 text-xs w-full">
                    <SelectValue placeholder="All Companies">
                      {companyDisplay}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="min-w-[240px]">
                    <SelectItem value="all">All Companies</SelectItem>
                    {companies
                      .filter((c) => {
                        const isAnon = c.prefix === 'ANO' || c.name.toLowerCase() === 'anonymous'
                        if (isEdLinkPk) return isAnon
                        if (isEdLinkAu) return !isAnon
                        return true
                      })
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} ({c.prefix})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )
            })()}
          </div>

          {/* Sort By */}
          <div className="sm:col-span-1 lg:col-span-3">
            {(() => {
              const SORT_MAP: Record<string, string> = {
                newest: 'Newest First',
                oldest: 'Oldest First',
                number: 'Invoice Number',
                amount_desc: 'Amount: High to Low',
                amount_asc: 'Amount: Low to High',
              }
              const sortDisplay = SORT_MAP[sortBy] || 'Newest First'
              return (
                <Select value={sortBy} onValueChange={(val: any) => { if (val) setSortBy(val); setPage(1); }}>
                  <SelectTrigger className="h-10 text-xs w-full">
                    <SelectValue placeholder="Sort By">
                      {sortDisplay}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="min-w-[190px]">
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="number">Invoice Number</SelectItem>
                    <SelectItem value="amount_desc">Amount: High to Low</SelectItem>
                    <SelectItem value="amount_asc">Amount: Low to High</SelectItem>
                  </SelectContent>
                </Select>
              )
            })()}
          </div>
        </div>

        {/* Date Filters Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="font-semibold text-slate-500 flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" /> Date:
            </span>

            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: '7days', label: 'Last 7 Days' },
              { id: '30days', label: 'Last 30 Days' },
              { id: 'this_month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
              { id: 'this_year', label: 'This Year' },
              { id: 'custom', label: 'Custom Range' },
            ].map((df) => (
              <Button
                key={df.id}
                type="button"
                variant={dateFilter === df.id ? 'default' : 'outline'}
                size="sm"
                className={`h-7 px-2.5 text-xs ${dateFilter === df.id ? 'bg-slate-900 text-white' : 'text-slate-600'
                  }`}
                onClick={() => { setDateFilter(df.id as any); setPage(1); }}
              >
                {df.label}
              </Button>
            ))}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="h-7 text-xs text-slate-500 hover:text-slate-900 gap-1.5 self-start sm:self-auto"
          >
            <RefreshCw className="w-3 h-3" />
            Reset Filters
          </Button>
        </div>

        {/* Custom Date Range Picker */}
        {dateFilter === 'custom' && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-600 w-12 sm:w-auto">From:</span>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                className="h-8 text-xs w-full sm:w-40"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-600 w-12 sm:w-auto">To:</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                className="h-8 text-xs w-full sm:w-40"
              />
            </div>
          </div>
        )}
      </Card>

      {/* Invoices Table List */}
      <Card className="shadow-xs border-slate-200">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span>Loading invoices...</span>
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-8 sm:p-12 text-center text-slate-500 space-y-3">
              <FileText className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No invoices found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery || selectedCompany !== 'all' || dateFilter !== 'all'
                  ? 'No invoices match your active search or filter criteria.'
                  : 'No invoices have been generated yet.'}
              </p>
              {searchQuery || selectedCompany !== 'all' || dateFilter !== 'all' ? (
                <Button variant="outline" size="sm" onClick={handleResetFilters}>
                  Clear Filters
                </Button>
              ) : (
                <Link href="/invoices/select-company">
                  <Button size="sm" className="bg-blue-600 text-white gap-2">
                    <FilePlus className="w-4 h-4" />
                    Generate First Invoice
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200">
                    <th className="py-3.5 px-4 sm:px-6">Invoice Number</th>
                    <th className="py-3.5 px-4 sm:px-6">Company</th>
                    <th className="py-3.5 px-4 sm:px-6">Customer Name</th>
                    <th className="py-3.5 px-4 sm:px-6">Invoice Date</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Total Amount</th>
                    <th className="py-3.5 px-4 sm:px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => {
                    const rawName = inv.template_snapshot?.company_name || inv.companies?.name || 'Company'
                    const compName = rawName === 'EdLink Pakistan' ? 'EdLink Australia' : rawName
                    const compLogo = inv.template_snapshot?.logo_url || inv.companies?.logo_url || (compName.toLowerCase().includes('edlink') || compName.toLowerCase().includes('australia') ? '/edlink-logo.png' : compName.toLowerCase().includes('aimt') ? '/aimt-logo.png' : null)
                    const curr = inv.template_snapshot?.currency || inv.companies?.currency || 'AUD'

                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Invoice Number */}
                        <td className="py-4 px-4 sm:px-6">
                          <Link
                            href={`/invoices/${inv.id}/preview`}
                            className="font-bold text-blue-600 hover:underline block"
                          >
                            {inv.invoice_number}
                          </Link>
                          {inv.reference_name && (
                            <span className="text-[11px] text-slate-500 block mt-0.5 truncate max-w-[200px]">
                              Ref: {inv.reference_name}
                            </span>
                          )}
                        </td>

                        {/* Company */}
                        <td className="py-4 px-4 sm:px-6 text-slate-700 font-medium">
                          <div className="flex items-center gap-2">
                            {compLogo ? (
                              <div className="h-6 w-12 rounded bg-slate-50 border border-slate-200 p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
                                <img
                                  src={compLogo}
                                  alt={compName}
                                  className="max-h-full max-w-full object-contain"
                                />
                              </div>
                            ) : (
                              <div className="p-1 rounded bg-blue-50 text-blue-600 shrink-0">
                                <Building2 className="w-3.5 h-3.5" />
                              </div>
                            )}
                            <span className="truncate max-w-[150px]">{compName}</span>
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="py-4 px-4 sm:px-6 text-slate-900 font-bold">
                          {inv.customer_name}
                        </td>

                        {/* Date */}
                        <td className="py-4 px-4 sm:px-6 text-slate-600 whitespace-nowrap">
                          {inv.invoice_date}
                        </td>

                        {/* Total Amount */}
                        <td className="py-4 px-4 sm:px-6 text-right font-extrabold text-slate-900 text-sm whitespace-nowrap">
                          {Number(inv.total_amount).toFixed(2)}{' '}
                          <span className="text-[10px] text-slate-500 font-semibold">{curr}</span>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 sm:px-6">
                          <div className="flex items-center justify-center gap-1">
                            <Link href={`/invoices/${inv.id}/preview`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-slate-600 hover:text-blue-600"
                                title="Preview Invoice"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>

                            <Link href={`/invoices/${inv.id}/edit`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-slate-600 hover:text-blue-600"
                                title="Edit Invoice"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </Link>

                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={downloadingId === inv.id}
                              onClick={() => handleDownloadPDF(inv)}
                              className="h-8 w-8 p-0 text-slate-600 hover:text-emerald-600"
                              title="Download PDF"
                            >
                              {downloadingId === inv.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedInvoice(inv)
                                setDeleteDialogOpen(true)
                              }}
                              className="h-8 w-8 p-0 text-slate-600 hover:text-rose-600"
                              title="Delete Invoice"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Server-side Pagination Footer */}
          {totalCount > 0 && (
            <div className="px-4 sm:px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 text-center sm:text-left">
              <div>
                Showing <span className="font-bold text-slate-900">{(page - 1) * pageSize + 1}</span> to{' '}
                <span className="font-bold text-slate-900">{Math.min(page * pageSize, totalCount)}</span> of{' '}
                <span className="font-bold text-slate-900">{totalCount}</span> invoices
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  className="h-8 gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <span className="font-semibold text-slate-700 px-2">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  className="h-8 gap-1"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Modals */}
      <RenameInvoiceDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        invoice={selectedInvoice}
        onSuccess={loadInvoices}
      />

      <DeleteInvoiceDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        invoice={selectedInvoice}
        onSuccess={loadInvoices}
      />
    </div>
  )
}
