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
} from 'lucide-react'
import type { StudentCommissionPayout } from '@/lib/services/agent-payout.service'
import type { AgentCommissionRule } from '@/lib/services/agent-commission.service'

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
  const [notes, setNotes] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (open && studentData) {
      setErrorMsg(null)
      setAmountPaid(String(studentData.currentPayout?.commissionPaid ?? 0))
      setNotes(studentData.currentPayout?.notes ?? '')
    }
  }, [open, studentData])

  if (!studentData) return null

  const payable = studentData.commissionPayable
  const enteredAmount = parseFloat(amountPaid) || 0
  const remaining = Math.max(0, payable - enteredAmount)

  const handleSave = async () => {
    setErrorMsg(null)
    const numeric = parseFloat(amountPaid)
    if (isNaN(numeric) || numeric < 0) {
      setErrorMsg('Please enter a valid non-negative amount.')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/reports/commissions/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: studentData.recordId,
          studentId: studentData.studentId,
          studentName: studentData.studentName,
          agentName: studentData.agentName,
          commissionPaid: numeric,
          notes,
        }),
      })

      const data = await res.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to update commission payout.')
      }

      onSaved(data.payout)
      onOpenChange(false)
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full p-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Top Gradient Header */}
        <div className="relative bg-gradient-to-r from-[#002233] via-[#003D5C] to-[#0E3E5B] px-6 py-5 text-white">
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

        <div className="p-6 space-y-4">
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

          {/* Input: Commission Paid to Agent */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <DollarSign className="size-3.5 text-emerald-600" />
                Commission Paid to Agent ($ AUD)
              </label>
              {payable > 0 && enteredAmount < payable && (
                <button
                  type="button"
                  onClick={handleQuickPayFull}
                  className="text-[11px] font-bold text-teal-700 hover:text-teal-900 underline cursor-pointer"
                >
                  Mark Full Paid (${payable})
                </button>
              )}
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                $
              </span>
              <Input
                type="number"
                min="0"
                step="5"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder="0.00"
                className="h-11 text-base font-bold pl-8 pr-14 bg-white text-slate-900 border-slate-300 focus:border-teal-500 focus:ring-teal-500"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-semibold text-slate-400 text-xs">
                AUD
              </span>
            </div>
          </div>

          {/* Dynamic Balance Indicator */}
          <div className="bg-slate-50/90 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">Remaining Balance Due:</span>
            <span className={`font-mono font-extrabold text-sm ${remaining > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
              ${remaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AUD
            </span>
          </div>

          {/* Payment Notes */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <FileText className="size-3 text-slate-400" />
              Payment Reference / Notes (Optional)
            </label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Bank transfer ref #TXN-9843, partial installment"
              className="h-9 text-xs"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
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
            disabled={isSaving}
            className="bg-gradient-to-r from-[#003D5C] to-[#002233] hover:from-[#00283d] hover:to-[#001724] text-[#81F5F5] font-bold h-9 px-5 rounded-xl text-xs gap-1.5 cursor-pointer shadow-sm border border-cyan-500/20"
          >
            {isSaving ? (
              <>
                <Loader2 className="size-3.5 animate-spin text-[#81F5F5]" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="size-3.5 text-[#81F5F5]" />
                <span>Save Payout</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

