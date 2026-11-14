'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DollarSign,
  Building2,
  User,
  Check,
  Loader2,
  Calendar,
  Percent,
  Receipt,
  FileText,
  Wallet,
  Banknote,
  CreditCard,
  Eye,
} from 'lucide-react'
import type { StudentCommissionPayout } from '@/lib/services/agent-payout.service'
import type { AgentCommissionRule } from '@/lib/services/agent-commission.service'
import type { ReportSlip } from '@/types/report-slip.types'
import ManageSlipsSection from '@/components/reports/manage-slips-section'
import CommissionInvoiceModal, { CommissionInvoiceModalData } from './commission-invoice-modal'

interface RecordPayoutModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentData: {
    recordId: string
    studentName: string
    studentId: string
    agentName: string
    feePaid: number
    commissionPayable: number
    rule?: AgentCommissionRule | null
    currentPayout?: StudentCommissionPayout | null
  } | null
  onSaved: (payout: StudentCommissionPayout) => void
}

export default function RecordPayoutModal({
  open,
  onOpenChange,
  studentData,
  onSaved,
}: RecordPayoutModalProps) {
  const [amountPaid, setAmountPaid] = useState<string>('0')
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank'>('Cash')
  const [bankTransactionId, setBankTransactionId] = useState<string>('')
  const [paymentDate, setPaymentDate] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [slips, setSlips] = useState<ReportSlip[]>([])

  // Cash Invoice state
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState<boolean>(false)
  const [generatedInvoiceRef, setGeneratedInvoiceRef] = useState<string>('')
  const [invoiceModalOpen, setInvoiceModalOpen] = useState<boolean>(false)
  const [invoiceModalData, setInvoiceModalData] = useState<CommissionInvoiceModalData | null>(null)

  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (open && studentData) {
      setErrorMsg(null)
      const cur = studentData.currentPayout
      setAmountPaid(String(cur?.commissionPaid ?? 0))
      setPaymentMethod((cur?.paymentMethod as any) || 'Cash')
      setBankTransactionId(cur?.bankTransactionId || '')
      setPaymentDate(cur?.paymentDate ? cur.paymentDate.split('T')[0] : new Date().toISOString().split('T')[0])
      setNotes(cur?.notes ?? '')
      setSlips(cur?.slips || [])
      setGeneratedInvoiceRef(cur?.invoiceReference || '')
      setInvoiceModalData(null)
      setInvoiceModalOpen(false)
    }
  }, [open, studentData])

  if (!studentData) return null

  const payable = studentData.commissionPayable
  const enteredAmount = parseFloat(amountPaid) || 0
  const remaining = Math.max(0, payable - enteredAmount)

  const handleGenerateInvoice = async () => {
    if (enteredAmount <= 0) {
      setErrorMsg('Please enter a valid payout amount before generating invoice.')
      return
    }

    setIsGeneratingInvoice(true)
    setErrorMsg(null)

    try {
      let refToUse = generatedInvoiceRef
      if (!refToUse) {
        const nextRes = await fetch('/api/reports/commissions/invoices?action=next-reference')
        const nextData = await nextRes.json()
        refToUse = nextData.nextReference || 'CAP-001'
      }

      const postRes = await fetch('/api/reports/commissions/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agencyName: studentData.agentName,
          totalAmount: enteredAmount,
          invoiceDate: paymentDate || new Date().toISOString().split('T')[0],
          referenceNumber: refToUse,
          description: `${studentData.agentName} (Student: ${studentData.studentName}) - Paid by AIMT`,
          notes: notes.trim(),
        }),
      })

      const postData = await postRes.json()
      if (!postData.success) {
        throw new Error(postData.error || 'Failed to generate invoice.')
      }

      const invoice = postData.invoice
      setGeneratedInvoiceRef(invoice.referenceNumber)

      setInvoiceModalData({
        referenceNumber: invoice.referenceNumber,
        invoiceDate: invoice.invoiceDate,
        agencyName: invoice.agencyName,
        amount: invoice.totalAmount,
        description: invoice.description,
        notes: invoice.notes,
      })

      setInvoiceModalOpen(true)
    } catch (err: any) {
      console.error('Error generating commission invoice:', err)
      setErrorMsg(err.message || 'Failed to generate invoice.')
    } finally {
      setIsGeneratingInvoice(false)
    }
  }

  const handleSave = async () => {
    setErrorMsg(null)
    const numeric = parseFloat(amountPaid)
    if (isNaN(numeric) || numeric <= 0) {
      setErrorMsg('Please enter a valid payout amount greater than $0.')
      return
    }

    if (paymentMethod === 'Bank' && !bankTransactionId.trim()) {
      setErrorMsg('Please enter a Bank Transaction ID or Reference Number.')
      return
    }

    setIsSaving(true)
    try {
      // 1. Get next invoice reference
      let refToUse = generatedInvoiceRef
      if (!refToUse) {
        const nextRes = await fetch('/api/reports/commissions/invoices?action=next-reference')
        const nextData = await nextRes.json()
        refToUse = nextData.nextReference || 'CAP-001'
      }

      // 2. Persist invoice
      const invRes = await fetch('/api/reports/commissions/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agencyName: studentData.agentName,
          totalAmount: numeric,
          invoiceDate: paymentDate || new Date().toISOString().split('T')[0],
          referenceNumber: refToUse,
          description: `${studentData.agentName} (Student: ${studentData.studentName}) - Paid by AIMT`,
          paymentMethod,
          bankTransactionId: paymentMethod === 'Bank' ? bankTransactionId.trim() : '',
          slips: paymentMethod === 'Bank' ? slips : [],
          notes: notes.trim(),
        }),
      })

      const invData = await invRes.json()
      const savedInvoice = invData.invoice

      // 3. Persist payout
      const finalReference =
        paymentMethod === 'Bank' ? bankTransactionId.trim() : refToUse

      const res = await fetch('/api/reports/commissions/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: studentData.recordId,
          studentId: studentData.studentId,
          studentName: studentData.studentName,
          agentName: studentData.agentName,
          commissionPaid: numeric,
          paymentDate,
          paymentMethod,
          bankTransactionId: paymentMethod === 'Bank' ? bankTransactionId.trim() : '',
          reference: finalReference,
          invoiceReference: refToUse,
          slips: paymentMethod === 'Bank' ? slips : [],
          notes,
        }),
      })

      const data = await res.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to update commission payout.')
      }

      if (savedInvoice) {
        setInvoiceModalData({
          referenceNumber: savedInvoice.referenceNumber,
          invoiceDate: savedInvoice.invoiceDate,
          agencyName: savedInvoice.agencyName,
          amount: savedInvoice.totalAmount,
          description: savedInvoice.description,
          notes: savedInvoice.notes,
        })
        setInvoiceModalOpen(true)
      }

      onSaved(data.payout)
      setTimeout(() => {
        onOpenChange(false)
      }, 700)
    } catch (err: any) {
      console.error('Error saving payout:', err)
      setErrorMsg(err.message || 'Something went wrong.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleQuickPayFull = () => {
    setAmountPaid(String(payable))
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg w-full p-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl max-h-[92vh] flex flex-col font-sans">
          {/* Top Gradient Header */}
          <div className="relative bg-gradient-to-r from-[#002233] via-[#003D5C] to-[#0E3E5B] px-6 py-5 text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-xl bg-[#009D9E]/20 border border-[#81F5F5]/30 flex items-center justify-center text-[#81F5F5] shrink-0">
                <Receipt className="size-5.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#81F5F5] bg-[#81F5F5]/10 px-2 py-0.5 rounded-full border border-[#81F5F5]/20">
                  Agent Commission Payout
                </span>
                <h2 className="text-base font-bold truncate text-white mt-1">
                  {studentData.studentName}
                </h2>
                <p className="text-[11px] text-slate-300 font-mono">
                  ID: {studentData.studentId || 'N/A'} • Agency: {studentData.agentName}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                {errorMsg}
              </div>
            )}

            {/* Student & Commission Summary Cards */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Total Student Fee Paid
                </span>
                <div className="text-sm font-extrabold text-[#003D5C] font-mono mt-0.5">
                  ${studentData.feePaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AUD
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">
                  Commission Payable
                </span>
                <div className="text-sm font-extrabold text-teal-800 font-mono mt-0.5">
                  ${payable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AUD
                </div>
              </div>
            </div>

            {/* Amount & Payment Method Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <DollarSign className="size-3.5 text-emerald-600" />
                    Paid Amount ($ AUD)
                  </label>
                  {payable > 0 && enteredAmount < payable && (
                    <button
                      type="button"
                      onClick={handleQuickPayFull}
                      className="text-[10.5px] font-bold text-teal-700 hover:text-teal-900 underline cursor-pointer"
                    >
                      Full (${payable})
                    </button>
                  )}
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                    $
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="5"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder="0.00"
                    className="h-10 text-sm font-bold pl-7 pr-12 bg-white text-slate-900 border-slate-300 focus:border-teal-500 focus:ring-teal-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-semibold text-slate-400 text-xs">
                    AUD
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Wallet className="size-3.5 text-[#009D9E]" />
                  Payment Method
                </label>
                <div className="relative">
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as 'Cash' | 'Bank')}
                    className="w-full h-10 px-3 pr-8 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 cursor-pointer appearance-none"
                  >
                    <option value="Cash">Cash (Physical Cash Payout)</option>
                    <option value="Bank">Bank (Wire / EFT / Online)</option>
                  </select>
                  <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                    {paymentMethod === 'Cash' ? (
                      <Banknote className="size-4 text-emerald-600" />
                    ) : (
                      <Building2 className="size-4 text-blue-600" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Balance Indicator */}
            <div className="bg-slate-50/90 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Remaining Balance Due:</span>
              <span className={`font-mono font-extrabold text-sm ${remaining > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                ${remaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AUD
              </span>
            </div>

            {/* Payment Date */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Payment Date
              </label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* CASH SPECIFIC */}
            {paymentMethod === 'Cash' && (
              <div className="space-y-3 pt-1 border-t border-slate-200">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                    <FileText className="size-3 text-slate-400" />
                    Disbursement Notes (Optional)
                  </label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Cash settlement to counselor"
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            )}

            {/* BANK SPECIFIC */}
            {paymentMethod === 'Bank' && (
              <div className="space-y-3 pt-1 border-t border-slate-200">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1 mb-1">
                    <CreditCard className="size-3 text-[#009D9E]" />
                    Transaction ID / Bank Reference <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={bankTransactionId}
                    onChange={(e) => setBankTransactionId(e.target.value)}
                    placeholder="e.g. EFT-78192039 / BSB Transfer Ref"
                    className="h-9 text-xs font-mono font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Disbursement Notes (Optional)
                  </label>
                  <Input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Bank transfer ref #TXN-9843"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1 pt-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Receipt className="size-3.5 text-emerald-600" />
                    Payment Slips & Receipts (Max 5)
                  </label>
                  <ManageSlipsSection
                    slips={slips}
                    onChange={setSlips}
                    maxSlips={5}
                    entityLabel="Bank Payout"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="h-9 px-4 text-xs font-semibold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving || enteredAmount <= 0}
              className="bg-gradient-to-r from-[#003D5C] to-[#002233] hover:from-[#00283d] hover:to-[#001724] text-[#81F5F5] font-bold h-9 px-5 rounded-xl text-xs gap-1.5 cursor-pointer shadow-sm border border-cyan-500/20"
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin text-[#81F5F5]" />
                  <span>Saving & Generating...</span>
                </>
              ) : (
                <>
                  <Receipt className="size-3.5 text-[#81F5F5]" />
                  <span>Save & Generate Invoice</span>
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cash Invoice Preview Modal */}
      {invoiceModalData && (
        <CommissionInvoiceModal
          open={invoiceModalOpen}
          onOpenChange={setInvoiceModalOpen}
          data={invoiceModalData}
        />
      )}
    </>
  )
}
