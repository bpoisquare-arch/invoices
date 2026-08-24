'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Company, Template, InvoiceWithDetails, TemplateSnapshot } from '@/lib/supabase/database.types'
import { createInvoice, updateInvoice, generateNextInvoiceNumber, InvoiceItemInput } from '@/lib/services/invoice.service'
import { renderInvoiceWebPreview } from '@/lib/services/template-registry'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Plus,
  Trash2,
  Send,
  Loader2,
  Eye,
  ImageIcon,
  Type,
  Upload,
  Sparkles,
  X,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface InvoiceFormProps {
  mode: 'create' | 'edit'
  company: Company
  template: Template | null
  existingInvoice?: InvoiceWithDetails
}

const CURRENCIES = [
  { code: 'USD', label: 'USD' },
  { code: 'AUD', label: 'AUD' },
  { code: 'PKR', label: 'PKR' },
]

export default function InvoiceForm({
  mode,
  company,
  template,
  existingInvoice,
}: InvoiceFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isAnonymous = Boolean(
    company.prefix === 'ANO' ||
      company.id === 'anonymous-company-id' ||
      company.name.toLowerCase() === 'anonymous' ||
      template?.layout_type === 'anonymous_v1' ||
      existingInvoice?.template_snapshot?.is_anonymous
  )

  const todayStr = new Date().toISOString().split('T')[0]
  const dueStr = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]

  // Header & Branding state for Anonymous mode
  const [headerMode, setHeaderMode] = useState<'logo' | 'text'>(
    existingInvoice?.template_snapshot?.header_mode || 'text'
  )
  const [customLogoUrl, setCustomLogoUrl] = useState<string>(
    existingInvoice?.template_snapshot?.logo_url || ''
  )
  const [customCompanyName, setCustomCompanyName] = useState<string>(
    existingInvoice?.template_snapshot?.company_name || (isAnonymous ? '' : company.name)
  )
  const [customAddress, setCustomAddress] = useState<string>(
    existingInvoice?.template_snapshot?.address || ''
  )
  const [customEmail, setCustomEmail] = useState<string>(
    existingInvoice?.template_snapshot?.email || ''
  )
  const [customPhone, setCustomPhone] = useState<string>(
    existingInvoice?.template_snapshot?.phone || ''
  )
  const [customPaymentDetails, setCustomPaymentDetails] = useState<string>(
    existingInvoice?.template_snapshot?.payment_details || ''
  )
  const [logoSize, setLogoSize] = useState<number>(
    Number(existingInvoice?.template_snapshot?.logo_size) || 60
  )
  const [selectedCurrency, setSelectedCurrency] = useState<string>(
    existingInvoice?.template_snapshot?.currency || template?.currency || company.currency || 'AUD'
  )

  const [customerName, setCustomerName] = useState(
    existingInvoice?.customer_name || ''
  )
  const [invoiceDate, setInvoiceDate] = useState(existingInvoice?.invoice_date || todayStr)
  const [dueDate, setDueDate] = useState(existingInvoice?.due_date || (isAnonymous ? '' : dueStr))

  const [invoiceNumberDisplay, setInvoiceNumberDisplay] = useState<string>(
    existingInvoice?.invoice_number || 'Loading...'
  )

  useEffect(() => {
    if (mode === 'create' && !existingInvoice) {
      generateNextInvoiceNumber(company.id).then((num) => {
        setInvoiceNumberDisplay(num)
      })
    }
  }, [mode, company.id, existingInvoice])

  const initialItems: InvoiceItemInput[] = existingInvoice?.invoice_items?.length
    ? existingInvoice.invoice_items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        amount: i.amount,
      }))
    : [{ description: '', quantity: 1, amount: 0 }]

  const [items, setItems] = useState<InvoiceItemInput[]>(initialItems)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleLogoFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCustomLogoUrl(reader.result)
        setHeaderMode('logo')
      }
    }
    reader.readAsDataURL(file)
  }

  // Items Row Operations
  function handleAddItem() {
    setItems((prev) => [...prev, { description: '', quantity: 1, amount: 0 }])
  }

  function handleRemoveItem(index: number) {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function handleItemChange(index: number, field: keyof InvoiceItemInput, value: any) {
    setItems((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  // Real-time calculation with safe precision decimal arithmetic
  const calculatedItems = items.map((item) => {
    const qty = Number(item.quantity) || 0
    const amt = Number(item.amount) || 0
    const lineTotal = Number((qty * amt).toFixed(2))
    return { ...item, lineTotal }
  })

  const grandTotal = Number(
    calculatedItems.reduce((acc, item) => acc + item.lineTotal, 0).toFixed(2)
  )

  // Live snapshot reflecting real-time updates
  const dynamicSnapshot: TemplateSnapshot = isAnonymous
    ? {
        company_name: customCompanyName.trim(),
        address: customAddress,
        phone: customPhone,
        email: customEmail,
        payment_details: customPaymentDetails,
        currency: selectedCurrency,
        footer_terms: 'Thank you for getting services from us',
        primary_color: '#2563eb',
        logo_url: headerMode === 'logo' ? customLogoUrl || null : null,
        layout_type: 'anonymous_v1',
        header_mode: headerMode,
        bill_to_label: 'Issued to:',
        is_anonymous: true,
        logo_size: logoSize,
      }
    : (existingInvoice?.template_snapshot || {
        company_name: template?.company_name || company.name,
        address: template?.address || '',
        phone: template?.phone || '',
        email: template?.email || '',
        payment_details: template?.payment_details || '',
        currency: selectedCurrency,
        footer_terms: template?.footer_terms || 'Thank you for getting services from us',
        primary_color: '#2563eb',
        logo_url: '/edlink-logo.png',
        layout_type: 'edlink_v1',
        header_mode: 'logo' as const,
        bill_to_label: 'BILL TO',
        is_anonymous: false,
        logo_size: 58,
      })

  // Live preview invoice object updated in real-time
  const livePreviewInvoice: Partial<InvoiceWithDetails> = {
    invoice_number: existingInvoice?.invoice_number || invoiceNumberDisplay,
    customer_name: customerName,
    reference_name: null,
    invoice_date: invoiceDate,
    due_date: dueDate || '',
    total_amount: grandTotal,
    subtotal: grandTotal,
    companies: company,
    templates: template,
    template_snapshot: dynamicSnapshot,
    invoice_items: calculatedItems.map((item, idx) => ({
      id: String(idx),
      invoice_id: 'temp',
      description: item.description,
      quantity: item.quantity,
      amount: item.amount,
      line_total: item.lineTotal,
      created_at: new Date().toISOString(),
    })),
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!customerName.trim()) {
      setError(`Client / Customer name ("${isAnonymous ? 'Issued to:' : 'BILL TO'}") is required.`)
      return
    }
    if (!invoiceDate) {
      setError('Invoice Date is required.')
      return
    }
    if (!isAnonymous && !dueDate) {
      setError('Due Date is required.')
      return
    }
    if (items.some((i) => !i.description.trim())) {
      setError('All invoice items must have a description.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      if (mode === 'create') {
        const newInv = await createInvoice({
          company_id: company.id,
          template_id: template?.id,
          invoice_number: invoiceNumberDisplay !== 'Loading...' ? invoiceNumberDisplay : undefined,
          customer_name: customerName,
          reference_name: null,
          invoice_date: invoiceDate,
          due_date: dueDate || null,
          items,
          custom_company_name: isAnonymous ? customCompanyName : undefined,
          custom_address: isAnonymous ? customAddress : undefined,
          custom_phone: isAnonymous ? customPhone : undefined,
          custom_email: isAnonymous ? customEmail : undefined,
          custom_payment_details: isAnonymous ? customPaymentDetails : undefined,
          custom_logo_url: isAnonymous && headerMode === 'logo' ? customLogoUrl : undefined,
          currency: selectedCurrency,
          header_mode: headerMode,
          bill_to_label: isAnonymous ? 'Issued to:' : 'BILL TO',
          footer_terms: 'Thank you for getting services from us',
          is_anonymous: isAnonymous,
          logo_size: isAnonymous && headerMode === 'logo' ? logoSize : undefined,
        })
        router.push(`/invoices/${newInv.id}/preview`)
      } else if (mode === 'edit' && existingInvoice) {
        await updateInvoice(existingInvoice.id, {
          customer_name: customerName,
          reference_name: null,
          invoice_date: invoiceDate,
          due_date: dueDate || null,
          items,
          custom_company_name: isAnonymous ? customCompanyName : undefined,
          custom_address: isAnonymous ? customAddress : undefined,
          custom_phone: isAnonymous ? customPhone : undefined,
          custom_email: isAnonymous ? customEmail : undefined,
          custom_payment_details: isAnonymous ? customPaymentDetails : undefined,
          custom_logo_url: isAnonymous && headerMode === 'logo' ? customLogoUrl : undefined,
          currency: selectedCurrency,
          header_mode: headerMode,
          bill_to_label: isAnonymous ? 'Issued to:' : 'BILL TO',
          footer_terms: 'Thank you for getting services from us',
          is_anonymous: isAnonymous,
          logo_size: isAnonymous && headerMode === 'logo' ? logoSize : undefined,
        })
        router.push(`/invoices/${existingInvoice.id}/preview`)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save invoice')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto font-sans">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-['Montserrat'] text-xl sm:text-2xl font-bold text-[#003D5C] tracking-tight">
              {mode === 'edit' ? 'Edit Invoice' : 'Generate Invoice'}
            </h1>
            {isAnonymous && (
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1 border border-blue-200">
                <Sparkles className="w-3 h-3" /> Anonymous / Custom Mode
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAnonymous
              ? 'Generate a flexible, one-off invoice with custom logo/text and manual details.'
              : `Create and preview an invoice for ${company.name} clients.`}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            type="button"
            onClick={handleSubmit}
            className="w-full sm:w-auto bg-[#009D9E] hover:bg-[#007A7A] text-white font-bold uppercase text-xs h-10 sm:h-9 gap-2 shadow-xs transition-colors justify-center"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                {mode === 'edit' ? 'UPDATE & SAVE' : 'GENERATE & SAVE'}
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-md">
          {error}
        </div>
      )}

      {/* 2-Column Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Invoice Form Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 0: Custom Header & Sender Details (Only shown in Anonymous mode) */}
          {isAnonymous && (
            <Card className="bg-white border border-[#E2E8F0] shadow-2xs rounded-lg">
              <CardHeader className="py-3 px-4 border-b border-[#E2E8F0] bg-blue-50/40 flex flex-row items-center justify-between">
                <CardTitle className="font-['Montserrat'] text-sm font-bold text-[#003D5C] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#009D9E]" />
                  Company & Header Branding
                </CardTitle>
                <span className="text-[11px] text-slate-500 font-medium">All fields optional</span>
              </CardHeader>
              <CardContent className="space-y-4 p-4 text-xs">
                {/* Header Mode Toggle */}
                <div>
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px] block mb-1.5">
                    Header Branding Type
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setHeaderMode('logo')}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        headerMode === 'logo'
                          ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span>Upload Logo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeaderMode('text')}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        headerMode === 'text'
                          ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Type className="w-4 h-4" />
                      <span>Text Heading</span>
                    </button>
                  </div>
                </div>

                {/* Logo Upload Box (When Logo mode selected) */}
                {headerMode === 'logo' && (
                  <div className="space-y-3">
                    <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-lg space-y-2">
                      <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                        Upload Logo
                      </Label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileUpload}
                        className="hidden"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          className="h-8 text-xs gap-1.5 bg-white border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Upload Logo
                        </Button>
                        {customLogoUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setCustomLogoUrl('')}
                            className="h-8 text-xs text-rose-600 hover:bg-rose-50 gap-1"
                          >
                            <X className="w-3.5 h-3.5" /> Remove
                          </Button>
                        )}
                      </div>
                      {customLogoUrl ? (
                        <div className="mt-2 space-y-2">
                          <div className="p-2 bg-white border border-slate-200 rounded max-w-[200px] h-12 flex items-center justify-start">
                            <img
                              src={customLogoUrl}
                              alt="Custom Logo Preview"
                              className="max-h-full max-w-full object-contain object-left"
                            />
                          </div>

                          {/* Bounded Size Controls */}
                          <div className="pt-2 border-t border-slate-200 space-y-1.5">
                            <div className="flex justify-between items-center text-[11px] font-semibold text-slate-700">
                              <span>Logo Size: {logoSize}px</span>
                              <div className="flex gap-1">
                                {[45, 60, 75, 85].map((s) => (
                                  <button
                                    key={s}
                                    type="button"
                                    onClick={() => setLogoSize(s)}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                                      logoSize === s
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                                  >
                                    {s === 45 ? 'S' : s === 60 ? 'M' : s === 75 ? 'L' : 'XL'}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <input
                              type="range"
                              min="40"
                              max="85"
                              step="5"
                              value={logoSize}
                              onChange={(e) => setLogoSize(Number(e.target.value))}
                              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">No logo uploaded yet</p>
                      )}
                    </div>

                    {/* Optional Company Name for Invoices List (Omitted from printed sheet) */}
                    <div>
                      <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                        Company Name (For Invoice List - Optional)
                      </Label>
                      <Input
                        placeholder="e.g. The Lahori Lounge (for list & search)"
                        value={customCompanyName}
                        onChange={(e) => setCustomCompanyName(e.target.value)}
                        className="mt-1 h-9 text-xs font-semibold"
                      />
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Saved for your Invoices list and search, not printed on the invoice sheet.
                      </span>
                    </div>
                  </div>
                )}

                {/* Company Name (When Text Heading mode is selected) */}
                {headerMode === 'text' && (
                  <div>
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                      Company Name / Heading *
                    </Label>
                    <Input
                      placeholder="Enter company or heading name"
                      value={customCompanyName}
                      onChange={(e) => setCustomCompanyName(e.target.value)}
                      className="mt-1 h-9 text-xs font-semibold"
                    />
                  </div>
                )}

                {/* Sender Address, Email, Phone */}
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Sender Contact Details (Optional)
                  </Label>
                  <Input
                    placeholder="Address (e.g. 100 Main Street, Sydney)"
                    value={customAddress}
                    onChange={(e) => setCustomAddress(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Email (e.g. billing@company.com)"
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Input
                      placeholder="Phone (e.g. +61 400 000 000)"
                      value={customPhone}
                      onChange={(e) => setCustomPhone(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                {/* Payment Instructions / Details */}
                <div className="space-y-1 pt-1 border-t border-slate-100">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Payment Instructions / Bank Details (Optional)
                  </Label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Bank: XYZ Bank, Account No: 1234 5678, BSB: 000-000"
                    value={customPaymentDetails}
                    onChange={(e) => setCustomPaymentDetails(e.target.value)}
                    className="w-full p-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-slate-700 leading-relaxed"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Card 1: Invoice Details */}
          <Card className="bg-white border border-[#E2E8F0] shadow-2xs rounded-lg">
            <CardHeader className="py-4 border-b border-[#E2E8F0]">
              <CardTitle className="font-['Montserrat'] text-base font-bold text-[#003D5C]">
                Invoice Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    INVOICE # (AUTO UNIQUE)
                  </Label>
                  <Input
                    value={invoiceNumberDisplay}
                    disabled
                    className="bg-slate-100 font-mono font-bold text-slate-700 mt-1.5 h-9 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    {isAnonymous ? 'CLIENT / COMPANY (ISSUED TO) *' : 'CLIENT / COMPANY (BILL TO) *'}
                  </Label>
                  <Input
                    placeholder="Client or Customer Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="mt-1.5 h-9 text-xs font-semibold text-slate-900"
                    required
                  />
                </div>
              </div>

              {/* Dates & Currency Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    INVOICE DATE *
                  </Label>
                  <Input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="mt-1.5 h-9 text-xs font-mono"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                      DUE DATE {isAnonymous ? '(OPTIONAL)' : '*'}
                    </Label>
                    {isAnonymous && dueDate && (
                      <button
                        type="button"
                        onClick={() => setDueDate('')}
                        className="text-[10px] text-rose-500 hover:underline font-semibold"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="mt-1.5 h-9 text-xs font-mono"
                    required={!isAnonymous}
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    CURRENCY
                  </Label>
                  <div className="mt-1.5">
                    <Select
                      value={selectedCurrency}
                      onValueChange={(val) => {
                        if (val) setSelectedCurrency(val)
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs font-bold font-mono">
                        <SelectValue placeholder="Currency">
                          {selectedCurrency}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c.code} value={c.code} className="text-xs font-mono font-bold">
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Line Items */}
          <Card className="bg-white border border-[#E2E8F0] shadow-2xs rounded-lg">
            <CardHeader className="py-4 border-b border-[#E2E8F0] flex flex-row items-center justify-between">
              <CardTitle className="font-['Montserrat'] text-base font-bold text-[#003D5C]">
                Line Items
              </CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAddItem}
                className="text-[#009D9E] hover:text-[#007A7A] hover:bg-teal-50 font-bold uppercase text-[11px] gap-1 h-7 p-0 px-2"
              >
                <Plus className="w-3.5 h-3.5" />
                ADD ITEM
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                  <thead>
                    <tr className="bg-[#F8FAFC] text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-[#E2E8F0]">
                      <th className="py-2.5 px-3 w-[55%]">DESCRIPTION</th>
                      <th className="py-2.5 px-2 w-[18%] text-center">QTY</th>
                      <th className="py-2.5 px-2 w-[22%] text-right">AMOUNT ({selectedCurrency})</th>
                      <th className="py-2.5 px-1 w-[5%] text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {calculatedItems.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3">
                          <Input
                            placeholder="Service / Item Description"
                            value={item.description}
                            onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <Input
                            type="number"
                            step="1"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs text-center font-mono"
                          />
                        </td>
                        <td className="py-2 px-2 text-right">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.amount}
                            onChange={(e) => handleItemChange(idx, 'amount', parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs text-right font-mono"
                          />
                        </td>
                        <td className="py-2 px-1 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
                            onClick={() => handleRemoveItem(idx)}
                            disabled={items.length <= 1}
                            title="Delete Row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Calculation Row */}
              <div className="p-3 sm:p-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex justify-between items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  className="gap-1.5 text-[#009D9E] border-[#009D9E]/40 hover:bg-teal-50 font-bold text-xs h-8"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Row
                </Button>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Total Amount Due
                  </span>
                  <span className="font-mono text-xl sm:text-2xl font-extrabold text-[#003D5C] block">
                    {grandTotal.toFixed(2)} <span className="text-xs font-sans text-slate-500">{selectedCurrency}</span>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Permanent Live Sheet Preview (7 cols) */}
        <div className="lg:col-span-7 sticky top-4">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-[#009D9E]" />
              LIVE PREVIEW SHEET
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              Updates in real-time as you type
            </span>
          </div>

          <div className="bg-slate-100 p-2 sm:p-4 rounded-xl border border-slate-200 shadow-inner flex justify-center overflow-x-auto">
            {renderInvoiceWebPreview(livePreviewInvoice, dynamicSnapshot)}
          </div>
        </div>
      </div>
    </div>
  )
}
