import fs from 'fs'

// 1. Update AttendanceRequestModals in Grocery Management
const modalsFilePath = 'D:\\\\Grocery Management\\\\src\\\\components\\\\attendance\\\\AttendanceRequestModals.tsx'

const newModalsContent = `'use client'

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
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Clock,
  Calendar,
  User,
  Building2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  Send,
  FileText,
  Laptop,
} from 'lucide-react'
import { AttendanceRequestItem } from '@/lib/services/attendance-requests.service'

function checkProbationStatus(joiningDateStr?: string | null, targetDateStr?: string, isOldStaff?: boolean | null): {
  isProbation: boolean
  monthsPassed: number
  daysPassed: number
} {
  if (isOldStaff) return { isProbation: false, monthsPassed: 99, daysPassed: 999 }
  if (!joiningDateStr || !targetDateStr) return { isProbation: false, monthsPassed: 99, daysPassed: 999 }
  const j = new Date(joiningDateStr.split('T')[0])
  const t = new Date(targetDateStr.split('T')[0])
  if (isNaN(j.getTime()) || isNaN(t.getTime())) return { isProbation: false, monthsPassed: 99, daysPassed: 999 }

  const monthsDiff = (t.getFullYear() - j.getFullYear()) * 12 + (t.getMonth() - j.getMonth())
  const daysDiff = Math.floor((t.getTime() - j.getTime()) / (1000 * 60 * 60 * 24))

  const isProbation = daysDiff >= 0 && monthsDiff < 3
  return { isProbation, monthsPassed: monthsDiff, daysPassed: daysDiff }
}

// 1. APPLY LEAVE MODAL - EXACT MIS REPLICATION (Attachment 2)
interface ApplyLeaveModalProps {
  isOpen: boolean
  onClose: () => void
  employee: any
  date: string
  onSubmitted: () => void
}

export function ApplyLeaveModal({
  isOpen,
  onClose,
  employee,
  date,
  onSubmitted,
}: ApplyLeaveModalProps) {
  const [selectedLeaveType, setSelectedLeaveType] = useState<string>('Casual Leave')
  const [leaveDays, setLeaveDays] = useState<string>('1')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [balanceSummary, setBalanceSummary] = useState<{
    isProbation: boolean
    joiningDate: string | null
    quotas: { probation_leaves: number; annual_leaves: number; sick_leaves: number; casual_leaves: number; wfh_quota: number }
    used: { probation_leaves: number; annual_leaves: number; sick_leaves: number; casual_leaves: number; wfh_quota: number }
    remaining: { probation_leaves: number; annual_leaves: number; sick_leaves: number; casual_leaves: number; wfh_quota: number }
    probationDates: string[]
    hasProbationInTargetMonth: boolean
  } | null>(null)
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)

  const isOldStaff = Boolean(employee?.is_old_staff)
  const joiningDate = isOldStaff ? null : (employee?.joining_date || employee?.created_at || null)
  const localProbation = checkProbationStatus(joiningDate, date, isOldStaff)
  const isProbation = balanceSummary !== null ? balanceSummary.isProbation : localProbation.isProbation

  const effectiveRemaining = balanceSummary?.remaining || {
    annual_leaves: employee?.leave_quotas?.annual_leaves ?? 6,
    sick_leaves: employee?.leave_quotas?.sick_leaves ?? 7,
    casual_leaves: employee?.leave_quotas?.casual_leaves ?? 7,
    wfh_quota: employee?.leave_quotas?.wfh_quota ?? 4,
    probation_leaves: isOldStaff ? 0 : (employee?.leave_quotas?.probation_leaves ?? 3),
  }

  const effectiveQuotas = balanceSummary?.quotas || employee?.leave_quotas || {
    annual_leaves: 6,
    sick_leaves: 7,
    casual_leaves: 7,
    wfh_quota: 4,
    probation_leaves: isOldStaff ? 0 : 3,
  }

  // Fetch live balance from API
  useEffect(() => {
    if (isOpen && employee?.id && date) {
      setError(null)
      setLeaveDays('1')
      setIsLoadingBalance(true)
      fetch(\`/api/attendance/leave-balance?employeeId=\${encodeURIComponent(employee.id)}&date=\${encodeURIComponent(date)}\`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setBalanceSummary(data)
            if (data.isProbation) {
              setSelectedLeaveType('Probation Leave')
            } else {
              setSelectedLeaveType('Casual Leave')
            }
          }
        })
        .catch((err) => console.error('Error loading leave balance:', err))
        .finally(() => setIsLoadingBalance(false))
    }
  }, [isOpen, employee?.id, date])

  // Duration handler
  const isWfh = selectedLeaveType === 'Work From Home'

  // If WFH selected, force 1 full day
  const handleLeaveTypeChange = (type: string) => {
    setSelectedLeaveType(type)
    if (type === 'Work From Home') {
      setLeaveDays('1')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employee) return
    setIsSubmitting(true)
    setError(null)

    const numDays = isWfh ? 1 : (parseFloat(leaveDays) || 1)

    try {
      const res = await fetch('/api/attendance/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employee.id,
          employee_name: employee.name,
          batch_id: employee.employee_id,
          branch: employee.branch || 'Multan',
          attendance_date: date,
          request_type: 'LEAVE',
          leave_type: selectedLeaveType,
          leave_duration: numDays,
          reason: reason.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (data.success) {
        onSubmitted()
        onClose()
        setReason('')
      } else {
        setError(data.error || 'Failed to submit leave request.')
      }
    } catch (err: any) {
      setError(err.message || 'Network error submitting request.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Current remaining balance for selected type
  let currentRem = 0
  if (selectedLeaveType === 'Work From Home') currentRem = effectiveRemaining.wfh_quota ?? 0
  else if (selectedLeaveType.includes('Annual')) currentRem = effectiveRemaining.annual_leaves ?? 0
  else if (selectedLeaveType.includes('Sick')) currentRem = effectiveRemaining.sick_leaves ?? 0
  else if (selectedLeaveType.includes('Probation')) currentRem = effectiveRemaining.probation_leaves ?? 0
  else currentRem = effectiveRemaining.casual_leaves ?? 0

  const requestedVal = isWfh ? 1 : (parseFloat(leaveDays) || 0)
  const projected = Math.max(0, Number((currentRem - requestedVal).toFixed(2)))
  const isOver = requestedVal > currentRem

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-white border-slate-200 shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-2xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Apply Leave Request
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Submit leave for MIS Admin approval (Date: <strong className="text-slate-800">{date}</strong>)
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Employee summary card */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">Employee</span>
              <span className="font-bold text-slate-800 text-sm">{employee?.name}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block text-[11px]">Batch ID & Branch</span>
              <span className="font-mono font-semibold text-slate-700">
                {employee?.employee_id} • {employee?.branch || 'Branch'}
              </span>
            </div>
          </div>

          {/* EXACT ATTACHMENT 2 CARD: SELECT LEAVE TYPE */}
          <div className="space-y-3 bg-[#f8faff] p-4 rounded-xl border border-indigo-100 shadow-2xs">
            {/* Header: Title + Quota Badge */}
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                SELECT LEAVE TYPE
              </Label>
              {isProbation ? (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-200">
                  Probation Active (Max 1/mo, {effectiveQuotas.probation_leaves ?? 3} total)
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold border border-emerald-200">
                  Standard Leaves (Annual: {effectiveQuotas.annual_leaves ?? 6}, Sick: {effectiveQuotas.sick_leaves ?? 7}, Casual: {effectiveQuotas.casual_leaves ?? 7})
                </span>
              )}
            </div>

            {/* Leave Type Select Dropdown */}
            <div className="space-y-1.5">
              <Select value={selectedLeaveType} onValueChange={(val) => val && handleLeaveTypeChange(val)}>
                <SelectTrigger className="w-full text-xs bg-white border-indigo-200 font-bold text-indigo-950 h-10 px-3 shadow-2xs">
                  <SelectValue placeholder="Select Leave Type" />
                </SelectTrigger>
                <SelectContent className="w-[var(--radix-select-trigger-width)] min-w-[320px]">
                  {isProbation ? (
                    <>
                      <SelectItem value="Probation Leave" className="text-xs font-bold text-indigo-950 py-2">
                        Probation Leave ({effectiveRemaining.probation_leaves ?? 3} remaining / {effectiveQuotas.probation_leaves ?? 3} • Max 1/month)
                      </SelectItem>
                      <SelectItem value="Work From Home" className="text-xs font-medium py-2">
                        Work From Home ({effectiveRemaining.wfh_quota ?? 4} remaining / {effectiveQuotas.wfh_quota ?? 4} • Full Day Only)
                      </SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="Casual Leave" className="text-xs font-medium py-2">
                        Casual Leave ({effectiveRemaining.casual_leaves ?? 7} remaining / {effectiveQuotas.casual_leaves ?? 7})
                      </SelectItem>
                      <SelectItem value="Sick Leave" className="text-xs font-medium py-2">
                        Sick Leave ({effectiveRemaining.sick_leaves ?? 7} remaining / {effectiveQuotas.sick_leaves ?? 7})
                      </SelectItem>
                      <SelectItem value="Annual Leave" className="text-xs font-medium py-2">
                        Annual Leave ({effectiveRemaining.annual_leaves ?? 6} remaining / {effectiveQuotas.annual_leaves ?? 6})
                      </SelectItem>
                      <SelectItem value="Work From Home" className="text-xs font-medium py-2">
                        Work From Home ({effectiveRemaining.wfh_quota ?? 4} remaining / {effectiveQuotas.wfh_quota ?? 4} • Full Day Only)
                      </SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>

              <p className="text-[11px] text-indigo-700">
                {isWfh
                  ? 'Employee recorded under Work From Home (Counted as 100% Present shift).'
                  : \`Employee recorded under \${selectedLeaveType} (Paid approved leave).\`}
              </p>
            </div>

            {/* LEAVE VALUE / DURATION (ATTACHMENT 2) */}
            <div className="space-y-2 pt-2 border-t border-indigo-100">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                  LEAVE VALUE / DURATION
                </Label>
                {isWfh ? (
                  <Badge className="bg-sky-600 text-white font-mono text-[10px] px-2 py-0.5">
                    1.0 (Full Day Fixed)
                  </Badge>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setLeaveDays('0.5')}
                      className={\`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer \${
                        leaveDays === '0.5'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                      }\`}
                    >
                      0.5 (Half Day)
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeaveDays('1')}
                      className={\`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer \${
                        leaveDays === '1'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                      }\`}
                    >
                      1.0 (Full Day)
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="any"
                  readOnly={isWfh}
                  value={leaveDays}
                  onChange={(e) => !isWfh && setLeaveDays(e.target.value)}
                  className="text-xs font-mono font-bold text-slate-800 bg-white border-indigo-200 h-9"
                />
                <span className="text-xs text-slate-500 font-medium shrink-0">day(s)</span>
              </div>

              {/* Real-time Dynamic Balance Deduction Display (Attachment 2) */}
              <div
                className={\`text-[11px] p-2.5 rounded-lg border flex items-center justify-between font-medium \${
                  isOver
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : 'bg-white border-indigo-100 text-indigo-900 shadow-2xs'
                }\`}
              >
                <span>
                  Available Balance: <strong>{currentRem}</strong>
                </span>
                <span className="text-slate-400 font-bold">→</span>
                <span>
                  After Deduction:{' '}
                  <strong className={isOver ? 'text-rose-600 font-bold' : 'text-emerald-700 font-bold'}>
                    {projected}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* Reason / Remarks */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Reason / Remarks (Optional)
            </Label>
            <Input
              placeholder="e.g. Medical emergency, urgent family matter..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="text-xs h-9.5 bg-white border-slate-300"
            />
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium gap-1.5 shadow-xs"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// 2. REGULARIZE MISSING TIMING MODAL (Missing In or Missing Out)
interface RegularizeTimingModalProps {
  isOpen: boolean
  onClose: () => void
  employee: any
  date: string
  requestType: 'MISSING_IN' | 'MISSING_OUT'
  existingTime?: string | null
  onSubmitted: () => void
}

export function RegularizeTimingModal({
  isOpen,
  onClose,
  employee,
  date,
  requestType,
  existingTime,
  onSubmitted,
}: RegularizeTimingModalProps) {
  const isMissingIn = requestType === 'MISSING_IN'
  const defaultTime = isMissingIn ? '10:30 AM' : '06:30 PM'
  const [requestedTime, setRequestedTime] = useState(defaultTime)
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employee || !requestedTime.trim()) return
    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/attendance/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employee.id,
          employee_name: employee.name,
          batch_id: employee.employee_id,
          branch: employee.branch || 'Multan',
          attendance_date: date,
          request_type: requestType,
          requested_in_time: isMissingIn ? requestedTime : undefined,
          requested_out_time: !isMissingIn ? requestedTime : undefined,
          reason: reason.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (data.success) {
        onSubmitted()
        onClose()
        setReason('')
      } else {
        setError(data.error || 'Failed to submit timing regularization.')
      }
    } catch (err: any) {
      setError(err.message || 'Network error submitting request.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white border-slate-200 shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                {isMissingIn ? 'Regularize Missing In-Time' : 'Regularize Missing Out-Time'}
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Submit time correction for Admin approval (Date: <strong className="text-slate-800">{date}</strong>)
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">Employee</span>
              <span className="font-bold text-slate-800 text-sm">{employee?.name}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block text-[11px]">Existing {isMissingIn ? 'Out-Time' : 'In-Time'}</span>
              <span className="font-mono font-bold text-emerald-700">
                {existingTime || '--'}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {isMissingIn ? 'Enter In-Time (HH:MM AM/PM)' : 'Enter Out-Time (HH:MM AM/PM)'}
            </Label>
            <Input
              type="text"
              placeholder={isMissingIn ? '10:30 AM' : '06:30 PM'}
              value={requestedTime}
              onChange={(e) => setRequestedTime(e.target.value)}
              className="text-xs h-9.5 bg-white border-slate-300 font-mono font-bold"
              required
            />
            <p className="text-[11px] text-slate-400">
              Format: e.g. {isMissingIn ? '10:30 AM' : '06:30 PM'}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Reason / Remark (Optional)
            </Label>
            <Input
              placeholder="e.g. Biometric machine glitch, client call outside..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="text-xs h-9.5 bg-white border-slate-300"
            />
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Submit Timing
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// 3. PENDING REQUEST DETAILS & CANCEL MODAL
interface PendingRequestModalProps {
  isOpen: boolean
  onClose: () => void
  request: AttendanceRequestItem | null
  onCancelled: () => void
}

export function PendingRequestModal({
  isOpen,
  onClose,
  request,
  onCancelled,
}: PendingRequestModalProps) {
  const [isCancelling, setIsCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!request) return null

  const handleCancel = async () => {
    setIsCancelling(true)
    setError(null)
    try {
      const res = await fetch(\`/api/attendance/requests?id=\${request.id}\`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        onCancelled()
        onClose()
      } else {
        setError(data.error || 'Failed to cancel request.')
      }
    } catch (err: any) {
      setError(err.message || 'Error cancelling request.')
    } finally {
      setIsCancelling(false)
    }
  }

  const durationLabel = (request as any).leave_duration === 0.5 ? '0.5 (Half Day)' : '1.0 (Full Day)'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white border-slate-200 shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-amber-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shadow-2xs">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                Request Pending Approval
                <Badge className="bg-amber-500 text-white text-[10px] font-mono px-2 py-0.5">
                  PENDING
                </Badge>
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Submitted on {new Date(request.created_at).toLocaleDateString()} for Date: <strong>{request.attendance_date}</strong>
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500">Employee:</span>
              <span className="font-bold text-slate-800">{request.employee_name || 'Staff'} ({request.batch_id})</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500">Branch:</span>
              <span className="font-bold text-slate-800">{request.branch} Branch</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500">Request Type:</span>
              <span className="font-bold text-indigo-700">
                {request.request_type === 'LEAVE'
                  ? \`\${request.leave_type} (\${durationLabel})\`
                  : request.request_type === 'MISSING_IN'
                  ? \`Missing In-Time (\${request.requested_in_time})\`
                  : \`Missing Out-Time (\${request.requested_out_time})\`}
              </span>
            </div>
            {request.reason && (
              <div className="pt-1">
                <span className="text-slate-500 block">Submitted Reason:</span>
                <p className="font-medium text-slate-700 italic mt-0.5">&ldquo;{request.reason}&rdquo;</p>
              </div>
            )}
          </div>

          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2">
            <Building2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              This request is queued for <strong>MIS Admin</strong>. Once approved, the live attendance record in the database will be updated automatically.
            </span>
          </div>

          <DialogFooter className="pt-2 gap-2 flex items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleCancel}
              disabled={isCancelling}
              className="gap-1.5 text-xs"
            >
              {isCancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Withdraw Request
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
              Close
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
`

fs.writeFileSync(modalsFilePath, newModalsContent, 'utf-8')
console.log('Successfully updated Grocery modals in', modalsFilePath)
