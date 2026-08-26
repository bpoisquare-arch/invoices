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
import { Label } from '@/components/ui/label'
import { Sparkles, DollarSign, Loader2, Save, AlertCircle, CheckCircle2 } from 'lucide-react'

interface EmployeeCommissionModalProps {
  isOpen: boolean
  onClose: () => void
  employee: {
    id: string
    name: string
    employee_id?: string
    designation?: string
    salary?: number | null
  } | null
  month: string // e.g. "2026-08"
  currentCommission: number
  currentNotes?: string
  onSaveSuccess: (updatedCommission: { amount: number; notes: string }) => void
}

export default function EmployeeCommissionModal({
  isOpen,
  onClose,
  employee,
  month,
  currentCommission,
  currentNotes = '',
  onSaveSuccess,
}: EmployeeCommissionModalProps) {
  const [amount, setAmount] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setAmount(currentCommission ? String(currentCommission) : '0')
      setNotes(currentNotes || '')
      setError(null)
    }
  }, [isOpen, currentCommission, currentNotes])

  if (!employee) return null

  const numAmount = Math.max(0, parseFloat(amount) || 0)
  const baseSalary = employee.salary || 0
  const totalWithCommission = baseSalary + numAmount

  // Format month for display (e.g. "2026-08" -> "August 2026")
  let monthLabel = month
  try {
    const [y, m] = month.split('-')
    const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1)
    monthLabel = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' })
  } catch (e) {
    monthLabel = month
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSaving(true)

    try {
      const res = await fetch('/api/attendance/commissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee.id,
          month,
          amount: numAmount,
          notes: notes.trim(),
        }),
      })

      const data = await res.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to save commission.')
      }

      onSaveSuccess({
        amount: numAmount,
        notes: notes.trim(),
      })
      onClose()
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-2xl rounded-2xl p-6">
        <DialogHeader className="border-b border-slate-100 pb-4">
          <DialogTitle className="text-lg font-bold text-[#003D5C] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Monthly Employee Commission
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Set or update monthly bonus & commission for <strong className="text-slate-700">{monthLabel}</strong>.
          </p>
        </DialogHeader>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 py-1">
          {/* Employee & Month Info Box */}
          <div className="bg-slate-50 border border-slate-200/70 p-3.5 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#003D5C] text-[#81F5F5] font-bold text-sm flex items-center justify-center shadow-2xs">
                {employee.name?.charAt(0) || 'E'}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{employee.name}</p>
                <p className="text-xs text-slate-500 font-mono">{employee.employee_id || 'N/A'}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-bold px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300/80 rounded-md">
                {monthLabel}
              </span>
            </div>
          </div>

          {/* Commission Amount Input */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Commission Amount (PKR)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                PKR
              </span>
              <Input
                type="number"
                min="0"
                step="100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 15000"
                className="pl-13 text-sm font-bold font-mono border-slate-200 h-11 focus:border-[#009D9E]"
                required
                autoFocus
              />
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Enter the total commission / bonus earned by the employee in {monthLabel}.
            </p>
          </div>

          {/* Commission Notes / Reason */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Note / Reason (Optional)
            </Label>
            <Input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Sales target bonus, performance incentive"
              className="text-xs border-slate-200 h-9"
            />
          </div>

          {/* Live Salary Calculation Preview */}
          <div className="bg-gradient-to-br from-slate-50 to-emerald-50/40 border border-slate-200/80 rounded-xl p-4 space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Salary Breakdown Preview ({monthLabel})
            </p>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Base Salary:</span>
                <span className="font-mono font-bold text-slate-800">
                  PKR {baseSalary.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-amber-700 font-semibold">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Monthly Commission:
                </span>
                <span className="font-mono font-bold">
                  + PKR {numAmount.toLocaleString()}
                </span>
              </div>
              <div className="border-t border-slate-200/80 pt-2 flex items-center justify-between font-bold">
                <span className="text-slate-900">Total Monthly Payable:</span>
                <span className="text-emerald-700 text-sm font-mono font-extrabold">
                  PKR {totalWithCommission.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
              className="text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-[#003D5C] hover:bg-[#002B40] text-white text-xs font-bold uppercase tracking-wider gap-1.5 shadow-sm"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Commission
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
