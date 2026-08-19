'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Company, Template, InvoiceWithDetails } from '@/lib/supabase/database.types'
import { createInvoice, updateInvoice, generateNextInvoiceNumber, InvoiceItemInput } from '@/lib/services/invoice.service'
import { renderInvoiceWebPreview } from '@/lib/services/template-registry'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, Copy, Save, ArrowLeft, Loader2, Calendar, Eye, Send } from 'lucide-react'

interface InvoiceFormProps {
  mode: 'create' | 'edit'
  company: Company
  template: Template | null
  existingInvoice?: InvoiceWithDetails
}

export default function InvoiceForm({
  mode,
  company,
  template,
  existingInvoice,
}: InvoiceFormProps) {
  const router = useRouter()

  const todayStr = new Date().toISOString().split('T')[0]
  const dueStr = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]

  const [customerName, setCustomerName] = useState(
    existingInvoice?.customer_name || ''
  )
  const [referenceName, setReferenceName] = useState(existingInvoice?.reference_name || '')
  const [invoiceDate, setInvoiceDate] = useState(existingInvoice?.invoice_date || todayStr)
  const [dueDate, setDueDate] = useState(existingInvoice?.due_date || dueStr)

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

  const currency = template?.currency || company.currency || 'AUD'

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

  // Live preview invoice object updated in real-time
  const livePreviewInvoice: Partial<InvoiceWithDetails> = {
    invoice_number: existingInvoice?.invoice_number || invoiceNumberDisplay,
    customer_name: customerName,
    reference_name: referenceName,
    invoice_date: invoiceDate,
    due_date: dueDate,
    total_amount: grandTotal,
    subtotal: grandTotal,
    companies: company,
    templates: template,
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
      setError('Customer name ("Bill To") is required.')
      return
    }
    if (!invoiceDate || !dueDate) {
      setError('Invoice Date and Due Date are required.')
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
          reference_name: referenceName || null,
          invoice_date: invoiceDate,
          due_date: dueDate,
          items,
        })
        router.push(`/invoices/${newInv.id}/preview`)
      } else if (mode === 'edit' && existingInvoice) {
        await updateInvoice(existingInvoice.id, {
          customer_name: customerName,
          reference_name: referenceName || null,
          invoice_date: invoiceDate,
          due_date: dueDate,
          items,
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
      {/* Top Bar matching Image 2 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="font-['Montserrat'] text-2xl font-bold text-[#003D5C] tracking-tight">
            Generate Invoice
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create and preview an invoice for {company.name} clients.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={handleSubmit}
            className="bg-[#009D9E] hover:bg-[#007A7A] text-white font-bold uppercase text-xs h-9 gap-2 shadow-xs transition-colors"
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
                GENERATE & SAVE
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

      {/* 2-Column Split Layout matching Image 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Invoice Form Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
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
                    CLIENT / COMPANY (BILL TO) *
                  </Label>
                  <Input
                    placeholder="Patrick Emmanuel Chukwunyere"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="mt-1.5 h-9 text-xs font-semibold text-slate-900"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    DATE (Mini Calendar) *
                  </Label>
                  <div className="relative mt-1.5">
                    <Input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="h-9 text-xs font-mono pr-8"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    DUE DATE (Mini Calendar) *
                  </Label>
                  <div className="relative mt-1.5">
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="h-9 text-xs font-mono pr-8"
                      required
                    />
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
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-[#E2E8F0]">
                      <th className="py-2.5 px-3 w-[55%]">DESCRIPTION</th>
                      <th className="py-2.5 px-2 w-[18%] text-center">QTY</th>
                      <th className="py-2.5 px-2 w-[22%] text-right">AMOUNT ({currency})</th>
                      <th className="py-2.5 px-1 w-[5%] text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {calculatedItems.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3">
                          <Input
                            placeholder="Admission Process ( Services Charges )"
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
              <div className="p-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex justify-between items-center">
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
                  <span className="font-mono text-2xl font-extrabold text-[#003D5C] block">
                    {grandTotal.toFixed(2)} <span className="text-xs font-sans text-slate-500">{currency}</span>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Permanent Live Sheet Preview (7 cols) matching Image 2 */}
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

          <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 shadow-inner flex justify-center overflow-x-auto">
            {renderInvoiceWebPreview(livePreviewInvoice, livePreviewInvoice.template_snapshot)}
          </div>
        </div>
      </div>
    </div>
  )
}
