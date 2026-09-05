'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles,
  Loader2,
  Save,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Edit2,
  Trash2,
  History,
  X,
  Plus,
  Coins,
  ArrowRight,
} from 'lucide-react'

export interface CommissionRecord {
  id: string
  employee_id: string
  month_year: string // e.g. "2026-08"
  amount: number
  notes?: string
  created_at?: string
  updated_at?: string
}

const MONTH_NAMES = [
  { value: '01', label: 'January', short: 'Jan' },
  { value: '02', label: 'February', short: 'Feb' },
  { value: '03', label: 'March', short: 'Mar' },
  { value: '04', label: 'April', short: 'Apr' },
  { value: '05', label: 'May', short: 'May' },
  { value: '06', label: 'June', short: 'Jun' },
  { value: '07', label: 'July', short: 'Jul' },
  { value: '08', label: 'August', short: 'Aug' },
  { value: '09', label: 'September', short: 'Sep' },
  { value: '10', label: 'October', short: 'Oct' },
  { value: '11', label: 'November', short: 'Nov' },
  { value: '12', label: 'December', short: 'Dec' },
]

interface EmployeeCommissionModalProps {
  isOpen: boolean
  onClose: () => void
  employee: {
    id: string
    name: string
    employee_id?: string | null
    designation?: string | null
    branch?: string | null
    salary?: number | null
  } | null
  initialMonth?: string // e.g. "2026-08"
  month?: string // backwards compatibility alias
  currentCommission?: number
  currentNotes?: string
  onSaveSuccess?: (updatedCommission: { month: string; amount: number; notes: string }) => void
}

export default function EmployeeCommissionModal({
  isOpen,
  onClose,
  employee,
  initialMonth,
  month,
  currentCommission,
  currentNotes,
  onSaveSuccess,
}: EmployeeCommissionModalProps) {
  const activeMonthParam = initialMonth || month
  const parseMonthStr = (mStr?: string) => {
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

  const defaultPeriod = parseMonthStr(activeMonthParam)
  const [selectedYear, setSelectedYear] = useState<string>(defaultPeriod.year)
  const [selectedMonthNum, setSelectedMonthNum] = useState<string>(defaultPeriod.month)
  const [amount, setAmount] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  // Editing state (if editing an existing history record)
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null)

  // Commission history list
  const [historyList, setHistoryList] = useState<CommissionRecord[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingMonth, setDeletingMonth] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Computed period key e.g. "2026-08"
  const selectedMonthKey = `${selectedYear}-${selectedMonthNum}`

  // Expanded Year options (2023 to 2030)
  const yearOptions = [2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030]

  // Fetch all commissions for this employee
  const fetchEmployeeHistory = async () => {
    if (!employee?.id) return
    setIsLoadingHistory(true)
    try {
      const res = await fetch(`/api/attendance/commissions?employeeId=${encodeURIComponent(employee.id)}`)
      const data = await res.json()
      if (data.success && Array.isArray(data.commissions)) {
        setHistoryList(data.commissions)
        // Check if there is already a commission for the currently selected month
        const match = data.commissions.find((c: CommissionRecord) => c.month_year === selectedMonthKey)
        if (match && !editingRecordId) {
          setAmount(match.amount ? String(match.amount) : '')
          setNotes(match.notes || '')
        }
      } else {
        setHistoryList([])
      }
    } catch (err) {
      console.error('Failed to fetch commission history:', err)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // When modal opens or employee changes, initialize data
  useEffect(() => {
    if (isOpen && employee?.id) {
      const p = parseMonthStr(activeMonthParam)
      setSelectedYear(p.year)
      setSelectedMonthNum(p.month)
      setAmount('')
      setNotes('')
      setEditingRecordId(null)
      setError(null)
      setSuccessMsg(null)
      fetchEmployeeHistory()
    }
  }, [isOpen, employee?.id, activeMonthParam])

  // When month or year dropdown changes in form
  const handlePeriodChange = (newYear: string, newMonth: string) => {
    setSelectedYear(newYear)
    setSelectedMonthNum(newMonth)
    const newKey = `${newYear}-${newMonth}`
    const match = historyList.find((c) => c.month_year === newKey)
    if (match) {
      setAmount(String(match.amount || 0))
      setNotes(match.notes || '')
      setEditingRecordId(match.id || newKey)
    } else {
      if (editingRecordId) {
        setEditingRecordId(null)
      }
      setAmount('')
      setNotes('')
    }
  }

  // Load a record from history list into edit form
  const handleEditFromHistory = (item: CommissionRecord) => {
    const parts = item.month_year.split('-')
    if (parts.length === 2) {
      setSelectedYear(parts[0])
      setSelectedMonthNum(parts[1])
    }
    setAmount(String(item.amount || 0))
    setNotes(item.notes || '')
    setEditingRecordId(item.id || item.month_year)
    setError(null)
    setSuccessMsg(null)
  }

  // Cancel edit mode
  const handleCancelEdit = () => {
    setEditingRecordId(null)
    setAmount('')
    setNotes('')
  }

  // Delete a commission record
  const handleDeleteRecord = async (monthYearToDelete: string) => {
    if (!employee?.id) return
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the commission record for ${formatMonthLabel(monthYearToDelete)}?`
    )
    if (!confirmDelete) return

    setDeletingMonth(monthYearToDelete)
    setError(null)
    setSuccessMsg(null)

    try {
      const res = await fetch(
        `/api/attendance/commissions?employeeId=${encodeURIComponent(employee.id)}&month=${encodeURIComponent(
          monthYearToDelete
        )}`,
        { method: 'DELETE' }
      )
      const data = await res.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete commission.')
      }

      setSuccessMsg(`Commission for ${formatMonthLabel(monthYearToDelete)} deleted successfully.`)
      setHistoryList((prev) => prev.filter((c) => c.month_year !== monthYearToDelete))

      if (selectedMonthKey === monthYearToDelete) {
        setAmount('')
        setNotes('')
        setEditingRecordId(null)
      }

      if (onSaveSuccess) {
        onSaveSuccess({ month: monthYearToDelete, amount: 0, notes: '' })
      }
    } catch (err: any) {
      setError(err.message || 'Error deleting commission.')
    } finally {
      setDeletingMonth(null)
    }
  }

  // Save / Update Commission
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employee?.id) return
    setError(null)
    setSuccessMsg(null)
    setIsSaving(true)

    const parsedAmt = Math.max(0, parseFloat(amount) || 0)

    try {
      const res = await fetch('/api/attendance/commissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee.id,
          month: selectedMonthKey,
          amount: parsedAmt,
          notes: notes.trim(),
        }),
      })

      const data = await res.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to save commission.')
      }

      const formattedLabel = formatMonthLabel(selectedMonthKey)
      setSuccessMsg(`Commission of PKR ${parsedAmt.toLocaleString()} saved for ${formattedLabel}!`)

      // Update or insert into history list
      setHistoryList((prev) => {
        const idx = prev.findIndex((c) => c.month_year === selectedMonthKey)
        const updatedEntry: CommissionRecord = {
          id: data.commission?.id || `comm_${Date.now()}`,
          employee_id: employee.id,
          month_year: selectedMonthKey,
          amount: parsedAmt,
          notes: notes.trim(),
          updated_at: new Date().toISOString(),
        }
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = updatedEntry
          return next
        }
        return [updatedEntry, ...prev].sort((a, b) => b.month_year.localeCompare(a.month_year))
      })

      setEditingRecordId(null)

      if (onSaveSuccess) {
        onSaveSuccess({
          month: selectedMonthKey,
          amount: parsedAmt,
          notes: notes.trim(),
        })
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!employee) return null

  const numAmount = Math.max(0, parseFloat(amount) || 0)
  const baseSalary = employee.salary ? Number(employee.salary) : 0
  const totalWithCommission = baseSalary + numAmount

  function formatMonthLabel(mKey: string) {
    if (!mKey || !mKey.includes('-')) return mKey
    const [yr, mn] = mKey.split('-')
    const mObj = MONTH_NAMES.find((m) => m.value === mn)
    return `${mObj?.label || mn} ${yr}`
  }

  function formatMonthShort(mKey: string) {
    if (!mKey || !mKey.includes('-')) return mKey
    const [yr, mn] = mKey.split('-')
    const mObj = MONTH_NAMES.find((m) => m.value === mn)
    return `${mObj?.short || mn} ${yr}`
  }

  const selectedMonthObj = MONTH_NAMES.find((m) => m.value === selectedMonthNum)
  const currentSelectedLabel = `${selectedMonthObj?.label || selectedMonthNum} ${selectedYear}`

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-2xl md:max-w-4xl bg-white border border-slate-200 shadow-2xl rounded-2xl p-4 sm:p-5 font-sans overflow-hidden">
        {/* Compact Header with Employee Info */}
        <DialogHeader className="border-b border-slate-100 pb-2.5">
          <div className="flex items-center justify-between gap-3 pr-6">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#131B2E] text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs">
                {employee.name?.charAt(0)?.toUpperCase() || 'E'}
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5 truncate">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="truncate">{employee.name}</span>
                  <span className="font-mono font-normal text-xs text-slate-400">({employee.employee_id || 'N/A'})</span>
                </DialogTitle>
                <p className="text-[11px] text-slate-500 font-medium truncate">
                  {employee.designation || 'Staff'}{employee.branch ? ` • ${employee.branch} Branch` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                Base: <strong className="font-mono text-slate-900">{baseSalary > 0 ? `PKR ${baseSalary.toLocaleString()}` : 'Not Set'}</strong>
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Alerts */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-2.5 rounded-lg flex items-center gap-2 mt-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-2 rounded-lg flex items-center gap-2 mt-1">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
            <span className="truncate">{successMsg}</span>
          </div>
        )}

        {/* 2-Column Side-by-Side Body: Left = Form, Right = History */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 pt-1">
          {/* Left Column: Form (7 cols) */}
          <form onSubmit={handleSave} className="md:col-span-7 flex flex-col justify-between space-y-2.5 bg-slate-50/60 border border-slate-200/80 rounded-xl p-3">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  {editingRecordId ? 'Edit Monthly Commission' : 'Set Monthly Commission'}
                </h3>
                {editingRecordId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="text-[10px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-0.5 hover:underline cursor-pointer"
                  >
                    <X className="w-3 h-3" /> Cancel Edit
                  </button>
                )}
              </div>

              {/* Month & Year Selectors */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-600 uppercase">Month *</Label>
                  <select
                    value={selectedMonthNum}
                    onChange={(e) => handlePeriodChange(selectedYear, e.target.value)}
                    disabled={isSaving}
                    className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#003D5C] transition-all cursor-pointer"
                  >
                    {MONTH_NAMES.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label} ({m.value})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-600 uppercase">Year *</Label>
                  <select
                    value={selectedYear}
                    onChange={(e) => handlePeriodChange(e.target.value, selectedMonthNum)}
                    disabled={isSaving}
                    className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#003D5C] transition-all cursor-pointer"
                  >
                    {yearOptions.map((yr) => (
                      <option key={yr} value={String(yr)}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Amount & Notes */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-600 uppercase">
                    Amount (PKR) *
                  </Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 font-mono">
                      PKR
                    </span>
                    <Input
                      type="number"
                      min="0"
                      step="100"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="e.g. 5000"
                      className="pl-11 text-xs font-bold font-mono border-slate-200 h-8 bg-white focus:border-[#009D9E]"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-600 uppercase">
                    Notes (Optional)
                  </Label>
                  <Input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Admissions Bonus"
                    className="text-xs border-slate-200 h-8 bg-white"
                  />
                </div>
              </div>

              {/* Compact Live Calculation Banner */}
              <div className="bg-white border border-amber-200/80 rounded-lg p-2 flex items-center justify-between gap-2 text-xs shadow-2xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded shrink-0 font-mono">
                    {currentSelectedLabel}
                  </span>
                  <span className="text-[11px] text-slate-600 truncate">
                    Base <strong className="text-slate-900 font-bold">{baseSalary.toLocaleString()}</strong> + Comm <strong className="text-amber-800 font-bold">+{numAmount.toLocaleString()}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1 font-bold shrink-0">
                  <span className="text-[10px] text-slate-400">Total:</span>
                  <span className="text-emerald-700 text-xs font-mono font-extrabold">
                    PKR {totalWithCommission.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-1 flex items-center justify-end">
              <Button
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto h-8 px-4 bg-black hover:bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider gap-1.5 shadow-sm cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-3 h-3" />
                    {editingRecordId ? `Update (${selectedMonthKey})` : `Add Commission (${selectedMonthKey})`}
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Right Column: Commission History (5 cols) */}
          <div className="md:col-span-5 flex flex-col bg-slate-50/60 border border-slate-200/80 rounded-xl p-3">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5 mb-2">
              <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                <History className="w-3.5 h-3.5 text-blue-600" />
                <span>History</span>
                <Badge variant="secondary" className="text-[9px] font-mono font-bold px-1.5 py-0 ml-1">
                  {historyList.length}
                </Badge>
              </h3>
              <span className="text-[10px] text-slate-400 font-medium">All Months</span>
            </div>

            {isLoadingHistory ? (
              <div className="py-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                <span>Loading...</span>
              </div>
            ) : historyList.length === 0 ? (
              <div className="py-8 px-2 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-1">
                <Coins className="w-5 h-5 text-slate-300" />
                <p className="font-semibold text-slate-600 text-[11px]">No history yet</p>
                <p className="text-[10px] text-slate-400">Recorded commissions will appear here.</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[195px] overflow-y-auto pr-1">
                {historyList.map((item) => {
                  const isItemDeleting = deletingMonth === item.month_year
                  const isItemActive = selectedMonthKey === item.month_year
                  return (
                    <div
                      key={item.id || item.month_year}
                      className={`p-2 rounded-lg border flex items-center justify-between gap-2 text-xs transition-colors ${
                        isItemActive
                          ? 'bg-amber-50/90 border-amber-300'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold px-1.5 py-0.5 bg-slate-100 text-slate-800 border border-slate-200 rounded font-mono text-[10px] shrink-0">
                            {formatMonthShort(item.month_year)}
                          </span>
                          <span className="font-mono font-extrabold text-emerald-700 text-xs truncate">
                            +PKR {Number(item.amount).toLocaleString()}
                          </span>
                        </div>
                        {item.notes && (
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">{item.notes}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditFromHistory(item)}
                          disabled={isItemDeleting || isSaving}
                          className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Edit this commission"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRecord(item.month_year)}
                          disabled={isItemDeleting || isSaving}
                          className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete this commission"
                        >
                          {isItemDeleting ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

