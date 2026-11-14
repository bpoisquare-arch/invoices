'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DollarSign,
  Building2,
  Calendar,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Users,
  Wallet,
  ArrowRight,
  Info,
  CreditCard,
  Banknote,
  FileText,
  Eye,
  Download,
} from 'lucide-react'
import type { StudentCommissionPayout, AgencyPayoutLog } from '@/lib/services/agent-payout.service'
import type { ReportSlip } from '@/types/report-slip.types'
import ManageSlipsSection from '@/components/reports/manage-slips-section'
import CommissionInvoiceModal, { CommissionInvoiceModalData } from './commission-invoice-modal'

export interface AgencyPayoutStudentItem {
  recordId: string
  studentId?: string | null
  studentName?: string
  payable: number
  currentlyPaid: number
}

interface RecordAgencyPayoutModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agencyData: {
    agentName: string
    studentsCount: number
    totalPayable: number
    totalPaid: number
    balanceDue: number
    students: AgencyPayoutStudentItem[]
  } | null
  onSaved: (updatedPayouts: Record<string, StudentCommissionPayout>, payoutLog?: AgencyPayoutLog) => void
}

export default function RecordAgencyPayoutModal({
  open,
  onOpenChange,
  agencyData,
  onSaved,
}: RecordAgencyPayoutModalProps) {
  const [amount, setAmount] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank'>('Cash')
  const [paymentDate, setPaymentDate] = useState<string>('')
  const [bankTransactionId, setBankTransactionId] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [slips, setSlips] = useState<ReportSlip[]>([])

  // State to hold newly generated invoice for preview & download
  const [invoiceModalOpen, setInvoiceModalOpen] = useState<boolean>(false)
  const [invoiceModalData, setInvoiceModalData] = useState<CommissionInvoiceModalData | null>(null)

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Initialize modal form when opened
  useEffect(() => {
    if (open && agencyData) {
      setErrorMsg(null)
      setSuccessMsg(null)
      const bal = Math.max(0, agencyData.balanceDue)
      setAmount(bal > 0 ? String(bal) : '')
      const today = new Date().toISOString().split('T')[0]
      setPaymentDate(today)
      setPaymentMethod('Cash')
      setBankTransactionId('')
      setNotes('')
      setSlips([])
      setInvoiceModalData(null)
      setInvoiceModalOpen(false)
    }
  }, [open, agencyData])

  if (!agencyData) return null

  const numAmount = parseFloat(amount) || 0
  const remainingAfterPayment = Math.max(0, Math.round((agencyData.balanceDue - numAmount) * 100) / 100)

  const handleQuickFillBalance = () => {
    setAmount(String(agencyData.balanceDue))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (numAmount <= 0) {
      setErrorMsg('Please enter a disbursement amount greater than $0.')
      return
    }

    if (paymentMethod === 'Bank' && !bankTransactionId.trim()) {
      setErrorMsg('Please provide a Bank Transaction ID or Reference Number for bank disbursement.')
      return
    }

    setIsSubmitting(true)
    try {
      const finalReference =
        paymentMethod === 'Bank' ? bankTransactionId.trim() : 'Cash Payout'

      const res = await fetch('/api/reports/commissions/payouts/agency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: agencyData.agentName,
          amount: numAmount,
          paymentDate,
          paymentMethod,
          bankTransactionId: paymentMethod === 'Bank' ? bankTransactionId.trim() : '',
          reference: finalReference,
          slips: paymentMethod === 'Bank' ? slips : [],
          notes: notes.trim(),
          students: agencyData.students,
        }),
      })

      const data = await res.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to record agency payout')
      }

      setSuccessMsg(`Disbursement saved and Invoice ${data.invoice?.referenceNumber || ''} generated successfully!`)

      // Prepare invoice modal data for instant preview & download
      if (data.invoice) {
        setInvoiceModalData({
          referenceNumber: data.invoice.referenceNumber,
          invoiceDate: data.invoice.invoiceDate || paymentDate,
          agencyName: data.invoice.agencyName || agencyData.agentName,
          amount: data.invoice.totalAmount || numAmount,
          description: data.invoice.description,
          notes: data.invoice.notes,
        })
        setInvoiceModalOpen(true)
      }

      if (data.updatedPayouts) {
        onSaved(data.updatedPayouts, data.payoutLog)
      }

      // Close the payout input form after short notification so user focuses on previewing/downloading invoice
      setTimeout(() => {
        onOpenChange(false)
      }, 700)
    } catch (err: any) {
      console.error('Error submitting agency payout:', err)
      setErrorMsg(err.message || 'Something went wrong while processing disbursement.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const initials = agencyData.agentName
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl w-full p-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl font-sans max-h-[92vh] flex flex-col">
          {/* Top Header */}
          <div className="relative bg-gradient-to-r from-[#001724] via-[#002b40] to-[#003D5C] px-6 py-5 text-white shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="size-12 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 font-extrabold text-sm shrink-0 shadow-inner">
                {initials || 'AG'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-300 bg-cyan-500/20 px-2.5 py-0.5 rounded-full border border-cyan-400/30">
                    Bulk Agency Disbursement
                  </span>
                  <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                    <Users className="size-3 text-cyan-300" />
                    {agencyData.studentsCount} Students Enrolled
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold truncate text-white mt-1" title={agencyData.agentName}>
                  {agencyData.agentName}
                </h2>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4.5 overflow-y-auto flex-1">
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-bold flex items-center gap-2">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Agency Financial Overview Summary */}
            <div className="grid grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Payable</div>
                <div className="text-sm font-extrabold text-[#003D5C] font-mono mt-0.5">
                  ${agencyData.totalPayable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Already Paid</div>
                <div className="text-sm font-bold text-emerald-700 font-mono mt-0.5">
                  ${agencyData.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Balance Due</div>
                <div className="text-sm font-extrabold text-amber-700 font-mono mt-0.5">
                  ${agencyData.balanceDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Row 1: Amount & Payment Method Dropdown Side by Side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Disbursement Amount Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="size-3.5 text-[#009D9E]" />
                    Amount ($ AUD) <span className="text-rose-500">*</span>
                  </label>
                  {agencyData.balanceDue > 0 && (
                    <button
                      type="button"
                      onClick={handleQuickFillBalance}
                      className="text-[10.5px] font-bold text-cyan-700 hover:text-cyan-900 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Sparkles className="size-3 text-cyan-600" />
                      <span>Full Balance</span>
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
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 5000.00"
                    className="h-11 text-base font-extrabold font-mono bg-white text-slate-900 pl-7 pr-12 border-slate-300 focus:border-[#009D9E] focus:ring-[#009D9E]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-semibold text-slate-400 text-xs">
                    AUD
                  </span>
                </div>
              </div>

              {/* Payment Method Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Wallet className="size-3.5 text-[#009D9E]" />
                  Payment Method <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as 'Cash' | 'Bank')}
                    className="w-full h-11 px-3.5 pr-9 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#009D9E] focus:ring-1 focus:ring-[#009D9E] cursor-pointer shadow-2xs appearance-none transition-all"
                  >
                    <option value="Cash">Cash (Physical Cash Payout)</option>
                    <option value="Bank">Bank (Wire / EFT / Online Transfer)</option>
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 flex items-center gap-1">
                    {paymentMethod === 'Cash' ? (
                      <Banknote className="size-4 text-emerald-600" />
                    ) : (
                      <Building2 className="size-4 text-blue-600" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Remaining Balance Indicator Banner */}
            <div className="bg-slate-100/70 p-2.5 rounded-lg border border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
              <span>Remaining Agency Balance After Payment:</span>
              <span className={`font-mono font-bold ${remainingAfterPayment === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                ${remainingAfterPayment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AUD
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
                className="h-10 text-xs font-medium [color-scheme:light]"
              />
            </div>

            {/* CASH FIELDS */}
            {paymentMethod === 'Cash' && (
              <div className="space-y-3 pt-1 border-t border-slate-200/80">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Disbursement Notes (Optional)
                  </label>
                  <Input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Monthly agency commission cash settlement"
                    className="h-10 text-xs"
                  />
                </div>
              </div>
            )}

            {/* BANK FIELDS & SLIP UPLOAD */}
            {paymentMethod === 'Bank' && (
              <div className="space-y-4 pt-1 border-t border-slate-200/80">
                {/* Transaction ID / Bank Reference */}
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                    <CreditCard className="size-3.5 text-[#009D9E]" />
                    Transaction ID / Bank Reference <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={bankTransactionId}
                    onChange={(e) => setBankTransactionId(e.target.value)}
                    placeholder="e.g. EFT-78192039 / BSB Transfer Ref"
                    className="h-10 text-xs font-mono font-medium"
                  />
                </div>

                {/* Disbursement Notes */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Disbursement Notes (Optional)
                  </label>
                  <Input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Monthly agency commission settlement"
                    className="h-10 text-xs"
                  />
                </div>

                {/* Slip Upload Section (Up to 5 receipts, matching 2nd screenshot) */}
                <div className="space-y-1.5 pt-1">
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

            {/* Auto Distribution Info */}
            <div className="p-3 bg-cyan-50/60 border border-cyan-200/70 rounded-xl text-[11px] text-cyan-950 flex items-start gap-2">
              <Info className="size-4 text-cyan-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5 leading-relaxed">
                <span className="font-bold">One-Click Auto Distribution & Invoice:</span>
                <p className="text-slate-600">
                  Clicking <strong>Save & Generate Invoice</strong> will automatically disburse the amount across enrolled students under <strong className="text-slate-900">{agencyData.agentName}</strong> and immediately generate the downloadable invoice voucher.
                </p>
              </div>
            </div>

            {/* Footer Buttons */}
            <DialogFooter className="pt-2 gap-2 sm:gap-0 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="h-10 px-4 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || numAmount <= 0}
                className="bg-gradient-to-r from-[#003D5C] to-[#002233] hover:from-[#00283d] hover:to-[#001724] text-[#81F5F5] font-bold h-10 px-5 rounded-xl text-xs gap-2 cursor-pointer shadow-md border border-cyan-500/20 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin text-[#81F5F5]" />
                    <span>Saving & Generating Invoice...</span>
                  </>
                ) : (
                  <>
                    <Receipt className="size-4 text-[#81F5F5]" />
                    <span>Save & Generate Invoice {numAmount > 0 ? `($${numAmount.toLocaleString()})` : ''}</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invoice Preview & Download Modal */}
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
