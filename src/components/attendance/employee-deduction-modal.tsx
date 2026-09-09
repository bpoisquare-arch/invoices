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
  Receipt,
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
  ArrowRight,
  FileMinus,
} from 'lucide-react'

export interface DeductionRecord {
  id: string
  employee_id: string
  month_year: string // e.g. "2026-08"
  amount: number
  note_type?: string
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

interface EmployeeDeductionModalProps {
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
  month?: string
  currentDeduction?: number
  currentNoteType?: string
  onSaveSuccess?: (updatedDeduction: { month: string; amount: number; noteType: string }) => void
}

export default function EmployeeDeductionModal({
  isOpen,
  onClose,
  employee,
  initialMonth,
  month,
  currentDeduction,
  currentNoteType,
  onSaveSuccess,
}: EmployeeDeductionModalProps) {
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
  const [noteType, setNoteType] = useState<string>('')

  // Editing state
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null)

  // Deduction history list
  const [historyList, setHistoryList] = useState<DeductionRecord[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingMonth, setDeletingMonth] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const selectedMonthKey = `${selectedYear}-${selectedMonthNum}`
  const yearOptions = [2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030]

  const fetchEmployeeHistory = async () => {
    if (!employee?.id) return
    setIsLoadingHistory(true)
    try {
      const res = await fetch(`/api/attendance/deductions?employeeId=${encodeURIComponent(employee.id)}`)
      const data = await res.json()
      if (data.success && Array.isArray(data.deductions)) {
        setHistoryList(data.deductions)
        const match = data.deductions.find((d: DeductionRecord) => d.month_year === selectedMonthKey)
        if (match && !editingRecordId) {
          setAmount(match.amount ? String(match.amount) : '')
          setNoteType(match.note_type || match.notes || '')
        }
      } else {
        setHistoryList([])
      }
    } catch (err) {
      console.error('Failed to fetch deduction history:', err)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  useEffect(() => {
    if (isOpen && employee?.id) {
      const p = parseMonthStr(activeMonthParam)
      setSelectedYear(p.year)
      setSelectedMonthNum(p.month)
      setAmount('')
      setNoteType('')
      setEditingRecordId(null)
      setError(null)
      setSuccessMsg(null)
      fetchEmployeeHistory()
    }
  }, [isOpen, employee?.id, activeMonthParam])

  const handlePeriodChange = (newYear: string, newMonth: string) => {
    setSelectedYear(newYear)
    setSelectedMonthNum(newMonth)
    const newKey = `${newYear}-${newMonth}`
    const match = historyList.find((d) => d.month_year === newKey)
    if (match) {
      setAmount(String(match.amount || 0))
      setNoteType(match.note_type || match.notes || '')
      setEditingRecordId(match.id || newKey)
    } else {
      if (editingRecordId) {
        setEditingRecordId(null)
      }
      setAmount('')
      setNoteType('')
    }
  }

  const handleEditFromHistory = (item: DeductionRecord) => {
    const parts = item.month_year.split('-')
    if (parts.length === 2) {
      setSelectedYear(parts[0])
      setSelectedMonthNum(parts[1])
    }
    setAmount(String(item.amount || 0))
    setNoteType(item.note_type || item.notes || '')
    setEditingRecordId(item.id || item.month_year)
    setError(null)
    setSuccessMsg(null)
  }

  const handleCancelEdit = () => {
    setEditingRecordId(null)
    setAmount('')
    setNoteType('')
  }

  const handleDeleteRecord = async (monthYearToDelete: string) => {
    if (!employee?.id) return
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the deduction record for ${formatMonthLabel(monthYearToDelete)}?`
    )
    if (!confirmDelete) return

    setDeletingMonth(monthYearToDelete)
    setError(null)
    setSuccessMsg(null)

    try {
      const res = await fetch(
        `/api/attendance/deductions?employeeId=${encodeURIComponent(employee.id)}&month=${encodeURIComponent(
          monthYearToDelete
        )}`,
        { method: 'DELETE' }
      )
      const data = await res.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete deduction.')
      }

      setSuccessMsg(`Deduction for ${formatMonthLabel(monthYearToDelete)} deleted successfully.`)
      setHistoryList((prev) => prev.filter((d) => d.month_year !== monthYearToDelete))

      if (selectedMonthKey === monthYearToDelete) {
        setAmount('')
        setNoteType('')
        setEditingRecordId(null)
      }

      if (onSaveSuccess) {
        onSaveSuccess({ month: monthYearToDelete, amount: 0, noteType: '' })
      }
    } catch (err: any) {
      setError(err.message || 'Error deleting deduction.')
    } finally {
      setDeletingMonth(null)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employee?.id) return
    setError(null)
    setSuccessMsg(null)
    setIsSaving(true)

    const parsedAmt = Math.max(0, parseFloat(amount) || 0)

    try {
      const res = await fetch('/api/attendance/deductions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee.id,
          month: selectedMonthKey,
          amount: parsedAmt,
          noteType: noteType.trim() || 'Other Deduction',
        }),
      })

      const data = await res.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to save deduction.')
      }

      setSuccessMsg(`Deduction of PKR ${parsedAmt.toLocaleString()} saved for ${formatMonthLabel(selectedMonthKey)}!`)
      setEditingRecordId(null)

      // Refresh history list
      fetchEmployeeHistory()

      if (onSaveSuccess) {
        onSaveSuccess({
          month: selectedMonthKey,
          amount: parsedAmt,
          noteType: noteType.trim() || 'Other Deduction',
        })
      }
    } catch (err: any) {
      setError(err.message || 'Error saving deduction.')
    } finally {
      setIsSaving(false)
    }
  }

  function formatMonthLabel(mKey: string) {
    if (!mKey || !mKey.includes('-')) return mKey
    const [y, m] = mKey.split('-')
    const found = MONTH_NAMES.find((opt) => opt.value === m)
    return `${found?.label || m} ${y}`
  }

  if (!employee) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl w-full p-0 overflow-hidden bg-white border border-slate-200 shadow-2xl rounded-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-1.5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-300">
              <FileMinus className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white tracking-tight">
                Monthly Deduction
              </DialogTitle>
              <p className="text-xs text-rose-200/80 mt-0.5">
                {employee.name} • {employee.employee_id || 'Staff'} ({employee.branch || 'Multan'})
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Alerts */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-700 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-rose-600" />
                {editingRecordId ? 'Edit Deduction Record' : 'Add Monthly Deduction'}
              </span>
              {editingRecordId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-[11px] text-slate-500 hover:text-slate-800 underline font-medium"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            {/* Month & Year Selectors */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-600">Month</Label>
                <select
                  value={selectedMonthNum}
                  onChange={(e) => handlePeriodChange(selectedYear, e.target.value)}
                  className="mt-1 w-full text-xs font-medium bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                >
                  {MONTH_NAMES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-600">Year</Label>
                <select
                  value={selectedYear}
                  onChange={(e) => handlePeriodChange(e.target.value, selectedMonthNum)}
                  className="mt-1 w-full text-xs font-medium bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={String(y)}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Amount */}
            <div>
              <Label className="text-xs font-semibold text-slate-600">Deduction Amount (PKR)</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">PKR</span>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 5000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-12 text-sm font-bold font-mono text-rose-950 bg-white border-slate-300 focus:border-rose-500 focus:ring-rose-500"
                  required
                />
              </div>
            </div>

            {/* Note / Type */}
            <div>
              <Label className="text-xs font-semibold text-slate-600">Note / Deduction Type</Label>
              <Input
                type="text"
                placeholder="e.g. Previous Deduction, Advance salary, Late penalty..."
                value={noteType}
                onChange={(e) => setNoteType(e.target.value)}
                className="mt-1 text-xs bg-white border-slate-300 focus:border-rose-500 focus:ring-rose-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                This note will appear in the payslip under <strong>Others Deduction</strong> (e.g. Previous Deduction).
              </p>
            </div>

            {/* Submit button */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={isSaving}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {editingRecordId ? 'Update Deduction' : 'Save Deduction'}
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* History List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-slate-500" />
                Deduction History ({historyList.length})
              </span>
              {isLoadingHistory && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
            </div>

            {historyList.length === 0 ? (
              <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                <Receipt className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
                <p className="text-xs text-slate-500 font-medium">No deduction history recorded yet.</p>
                <p className="text-[10px] text-slate-400">Recorded deductions will appear here.</p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs divide-y divide-slate-100 bg-white">
                {historyList.map((item) => {
                  const isSelected = item.month_year === selectedMonthKey
                  const isDeleting = deletingMonth === item.month_year
                  return (
                    <div
                      key={item.id || item.month_year}
                      className={`p-3 flex items-center justify-between gap-3 text-xs transition-colors ${
                        isSelected ? 'bg-rose-50/50' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{formatMonthLabel(item.month_year)}</span>
                          {isSelected && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-rose-100/50 text-rose-700 border-rose-200 font-bold">
                              Active
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Note/Type: <span className="font-semibold text-slate-700">{item.note_type || item.notes || 'Other Deduction'}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-rose-700 text-sm">
                          PKR {Number(item.amount).toLocaleString()}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditFromHistory(item)}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                            title="Edit this record"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => handleDeleteRecord(item.month_year)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            title="Delete this record"
                          >
                            {isDeleting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
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
