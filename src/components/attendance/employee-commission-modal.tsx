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
import {
  Sparkles,
  DollarSign,
  Loader2,
  Save,
  AlertCircle,
  Calendar,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react'

const MONTH_NAMES = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
]

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
  onSaveSuccess: (updatedCommission: { month: string; amount: number; notes: string }) => void
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
  // Parse incoming month prop into year and month parts
  const parseMonthStr = (mStr: string) => {
    if (mStr && mStr.includes('-')) {
      const parts = mStr.split('-')
      return { year: parts[0], month: parts[1].padStart(2, '0') }
    }
    const now = new Date()
    return {
      year: String(now.getFullYear()),
      month: String(now.getMonth() + 1).padStart(2, '0'),
    }
  }

  const initial = parseMonthStr(month)
  const [selectedYear, setSelectedYear] = useState<string>(initial.year)
  const [selectedMonthNum, setSelectedMonthNum] = useState<string>(initial.month)
  const [amount, setAmount] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [isLoadingMonth, setIsLoadingMonth] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null)

  // Computed combined month key e.g. "2026-08"
  const selectedMonthKey = `${selectedYear}-${selectedMonthNum}`

  // Year options (current year +/- 3 years)
  const currentYearNum = new Date().getFullYear()
  const yearOptions = [
    currentYearNum - 2,
    currentYearNum - 1,
    currentYearNum,
    currentYearNum + 1,
    currentYearNum + 2,
  ]

  // Initialize or reset when modal opens or initial month prop changes
  useEffect(() => {
    if (isOpen) {
      const parsed = parseMonthStr(month)
      setSelectedYear(parsed.year)
      setSelectedMonthNum(parsed.month)
      setAmount(currentCommission ? String(currentCommission) : '0')
      setNotes(currentNotes || '')
      setError(null)
      setSavedSuccessMsg(null)
    }
  }, [isOpen, month, currentCommission, currentNotes])

  // Fetch commission data whenever the user switches month or year inside the modal
  const fetchCommissionForPeriod = async (targetMonthKey: string) => {
    if (!employee?.id) return
    setIsLoadingMonth(true)
    setError(null)
    try {
      const res = await fetch(`/api/attendance/commissions?employeeId=${employee.id}&month=${targetMonthKey}`)
      const data = await res.json()
      if (data.success && data.commission) {
        setAmount(data.commission.amount ? String(data.commission.amount) : '0')
        setNotes(data.commission.notes || '')
      } else {
        setAmount('0')
        setNotes('')
      }
    } catch (err: any) {
      console.error('Failed to fetch commission for period:', err)
    } finally {
      setIsLoadingMonth(false)
    }
  }

  const handleMonthChange = (newMonth: string) => {
    setSelectedMonthNum(newMonth)
    const newKey = `${selectedYear}-${newMonth}`
    fetchCommissionForPeriod(newKey)
  }

  const handleYearChange = (newYear: string) => {
    setSelectedYear(newYear)
    const newKey = `${newYear}-${selectedMonthNum}`
    fetchCommissionForPeriod(newKey)
  }

  if (!employee) return null

  const numAmount = Math.max(0, parseFloat(amount) || 0)
  const baseSalary = employee.salary || 0
  const totalWithCommission = baseSalary + numAmount

  // Friendly month label
  const monthObj = MONTH_NAMES.find((m) => m.value === selectedMonthNum)
  const formattedMonthLabel = `${monthObj?.label || 'Month'} ${selectedYear}`

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSavedSuccessMsg(null)
    setIsSaving(true)

    try {
      const res = await fetch('/api/attendance/commissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee.id,
          month: selectedMonthKey,
          amount: numAmount,
          notes: notes.trim(),
        }),
      })

      const data = await res.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to save commission.')
      }

      onSaveSuccess({
        month: selectedMonthKey,
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
        <DialogHeader className="border-b border-slate-100 pb-3">
          <DialogTitle className="text-lg font-bold text-[#003D5C] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Monthly Employee Commission
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Select the target <strong className="text-slate-700">Month & Year</strong> to assign or update commission.
          </p>
        </DialogHeader>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 py-1">
          {/* Employee Info Header */}
          <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#003D5C] text-[#81F5F5] font-bold text-sm flex items-center justify-center shadow-2xs">
                {employee.name?.charAt(0) || 'E'}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 leading-tight">{employee.name}</p>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{employee.employee_id || 'N/A'}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-bold px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300/80 rounded-md inline-flex items-center gap-1">
                <Calendar className="w-3 h-3 text-amber-700" />
                {formattedMonthLabel}
              </span>
            </div>
          </div>

          {/* Month & Year Selection Row */}
          <div className="bg-amber-50/50 border border-amber-200/70 p-3 rounded-xl space-y-2">
            <Label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              Target Month & Year
            </Label>
            <div className="grid grid-cols-2 gap-2.5">
              {/* Month Dropdown */}
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-slate-500 uppercase">Month</span>
                <select
                  value={selectedMonthNum}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  disabled={isLoadingMonth || isSaving}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003D5C] focus:border-transparent transition-all"
                >
                  {MONTH_NAMES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label} ({m.value})
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Dropdown */}
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-slate-500 uppercase">Year</span>
                <select
                  value={selectedYear}
                  onChange={(e) => handleYearChange(e.target.value)}
                  disabled={isLoadingMonth || isSaving}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003D5C] focus:border-transparent transition-all"
                >
                  {yearOptions.map((yr) => (
                    <option key={yr} value={String(yr)}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isLoadingMonth && (
              <p className="text-[11px] text-amber-700 font-medium flex items-center gap-1.5 pt-0.5 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                Loading commission record for {formattedMonthLabel}...
              </p>
            )}
          </div>

          {/* Commission Amount Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Commission Amount (PKR)
              </Label>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                For {formattedMonthLabel}
              </span>
            </div>
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
          </div>

          {/* Live Salary Calculation Preview */}
          <div className="bg-gradient-to-br from-slate-50 to-emerald-50/40 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Salary Breakdown Preview ({formattedMonthLabel})
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
              <div className="border-t border-slate-200/80 pt-1.5 flex items-center justify-between font-bold">
                <span className="text-slate-900">Total Monthly Payable:</span>
                <span className="text-emerald-700 text-sm font-mono font-extrabold">
                  PKR {totalWithCommission.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
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
              disabled={isSaving || isLoadingMonth}
              className="bg-[#003D5C] hover:bg-[#002B40] text-white text-xs font-bold uppercase tracking-wider gap-1.5 shadow-sm"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Commission ({selectedMonthKey})
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
