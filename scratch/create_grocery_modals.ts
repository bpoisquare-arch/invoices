import fs from 'fs'
import path from 'path'

const modalComponentCode = `'use client'

import React, { useState } from 'react'
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
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  Send,
  FileText,
} from 'lucide-react'
import { AttendanceRequestItem } from '@/lib/services/attendance-requests.service'

const LEAVE_TYPES = [
  'Sick Leave',
  'Casual Leave',
  'Annual Leave',
  'Probation Leave',
  'Half Day',
  'Official Leave',
  'Unpaid Leave',
]

// 1. APPLY LEAVE MODAL
interface ApplyLeaveModalProps {
  isOpen: boolean
  onClose: () => void
  employee: { id: string; name: string; employee_id: string; branch?: string | null } | null
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
  const [leaveType, setLeaveType] = useState('Casual Leave')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employee) return
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
          request_type: 'LEAVE',
          leave_type: leaveType,
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white border-slate-200 shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-2xs">
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

          {/* Leave Type Select */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Leave Type
            </Label>
            <Select value={leaveType} onValueChange={(val) => setLeaveType(val || 'Casual Leave')}>
              <SelectTrigger className="h-9.5 text-xs bg-white border-slate-300">
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent>
                {LEAVE_TYPES.map((lt) => (
                  <SelectItem key={lt} value={lt}>
                    {lt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reason / Notes */}
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

          <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Once applied, this record will appear as <strong>PENDING</strong> on the attendance grid until MIS Admin reviews and approves it.
            </span>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium gap-1.5"
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
  employee: { id: string; name: string; employee_id: string; branch?: string | null } | null
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

          {/* Employee summary card */}
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

          {/* Timing Input */}
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

          {/* Reason / Remarks */}
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

          <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Once applied, this cell will display <strong>PENDING</strong> until approved by MIS Admin. On approval, live database will update immediately.
            </span>
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
                  ? \`Leave Request (\${request.leave_type})\`
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

const targetPath = 'D:\\\\Grocery Management\\\\src\\\\components\\\\attendance\\\\AttendanceRequestModals.tsx'
fs.writeFileSync(targetPath, modalComponentCode, 'utf-8')
console.log('Successfully wrote', targetPath)
