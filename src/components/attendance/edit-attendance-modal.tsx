'use client'

import React, { useState, useEffect } from 'react'
import { AttendanceRecordWithEmployee, AttendanceSettings, EmployeeLeaveQuotas } from '@/lib/supabase/database.types'
import {
  calculateArrivalStatus,
  calculateDepartureStatus,
  calculateWorkingDuration,
  parseDateString,
  DEFAULT_ATTENDANCE_SETTINGS,
  LEAVE_TYPES,
} from '@/lib/services/attendance-calculator'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Clock,
  Calendar,
  Save,
  Loader2,
  AlertCircle,
  AlertTriangle,
  UserX,
  UserCheck,
  PlaneTakeoff,
  FileText,
  Laptop,
} from 'lucide-react'

interface EditAttendanceModalProps {
  isOpen: boolean
  onClose: () => void
  record: AttendanceRecordWithEmployee | null
  onSaveSuccess: (updatedRecord: any) => void
  settings?: AttendanceSettings
}

// Convert "10:30 AM" or "10:30" to "HH:mm" for <input type="time">
function toTimeInputValue(timeStr: string): string {
  if (!timeStr || !timeStr.trim() || timeStr === '---') return ''
  const s = timeStr.trim().toUpperCase()
  const match12 = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/)
  if (match12) {
    let hours = parseInt(match12[1], 10)
    const minutes = match12[2]
    const meridian = match12[3]
    if (meridian === 'PM' && hours < 12) hours += 12
    if (meridian === 'AM' && hours === 12) hours = 0
    return `${String(hours).padStart(2, '0')}:${minutes}`
  }
  return ''
}

// Convert "18:30" (from <input type="time">) to "06:30 PM" (12-hour formatted string)
function fromTimeInputValue(timeInput: string): string {
  if (!timeInput || !timeInput.trim()) return ''
  const parts = timeInput.split(':')
  if (parts.length >= 2) {
    let hours = parseInt(parts[0], 10)
    const minutes = parts[1]
    const meridian = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12
    if (hours === 0) hours = 12
    return `${String(hours).padStart(2, '0')}:${minutes} ${meridian}`
  }
  return timeInput
}

// Helper to get standard shift hours for Work From Home
function getWfhTimes(dateStr: string, settings?: AttendanceSettings) {
  const parsedDate = parseDateString(dateStr)
  const dayOfWeek = parsedDate ? parsedDate.dayOfWeek : 1
  const isSaturday = dayOfWeek === 6
  const inTimeStr = isSaturday ? (settings?.saturday_in_time || '11:00') : (settings?.weekday_in_time || '10:30')
  const outTimeStr = isSaturday ? (settings?.saturday_out_time || '15:00') : (settings?.weekday_out_time || '18:30')
  return {
    inTime: fromTimeInputValue(inTimeStr),
    outTime: fromTimeInputValue(outTimeStr),
    hours: isSaturday ? '4h 0m' : '8h 0m',
  }
}

type AttendanceStatusType = 'present' | 'absent' | 'leave' | 'wfh'

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

  // Probation is strictly first 3 calendar months from joining date
  const isProbation = daysDiff >= 0 && monthsDiff < 3
  return { isProbation, monthsPassed: monthsDiff, daysPassed: daysDiff }
}

export default function EditAttendanceModal({
  isOpen,
  onClose,
  record,
  onSaveSuccess,
  settings = DEFAULT_ATTENDANCE_SETTINGS,
}: EditAttendanceModalProps) {
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatusType>('present')
  const [selectedLeaveType, setSelectedLeaveType] = useState<string>('Casual Leave')
  const [leaveDays, setLeaveDays] = useState<string>('1')
  const [wfhDays, setWfhDays] = useState<string>('1')
  const [date, setDate] = useState('')
  const [inTime, setInTime] = useState('')
  const [outTime, setOutTime] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [balanceSummary, setBalanceSummary] = useState<{
    isProbation: boolean
    joiningDate: string | null
    quotas: EmployeeLeaveQuotas
    used: { probation_leaves: number; annual_leaves: number; sick_leaves: number; casual_leaves: number; wfh_quota: number }
    remaining: { probation_leaves: number; annual_leaves: number; sick_leaves: number; casual_leaves: number; wfh_quota: number }
    probationDates: string[]
    hasProbationInTargetMonth: boolean
  } | null>(null)
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)

  const isOldStaff = Boolean(record?.employee?.is_old_staff)
  const employeeJoiningDate = isOldStaff ? null : (record?.employee?.joining_date || record?.employee?.created_at || null)
  const localProbation = isOldStaff ? { isProbation: false, monthsPassed: 99, daysPassed: 999 } : checkProbationStatus(employeeJoiningDate, date || record?.attendance_date, isOldStaff)
  const isProbation = !isOldStaff && (balanceSummary !== null ? balanceSummary.isProbation : localProbation.isProbation)

  const effectiveRemaining = balanceSummary?.remaining || {
    annual_leaves: record?.employee?.leave_quotas?.annual_leaves ?? 6,
    sick_leaves: record?.employee?.leave_quotas?.sick_leaves ?? 7,
    casual_leaves: record?.employee?.leave_quotas?.casual_leaves ?? 7,
    wfh_quota: record?.employee?.leave_quotas?.wfh_quota ?? 4,
    probation_leaves: isOldStaff ? 0 : (record?.employee?.leave_quotas?.probation_leaves ?? 3),
  }

  const effectiveQuotas = balanceSummary?.quotas || record?.employee?.leave_quotas || {
    annual_leaves: 6,
    sick_leaves: 7,
    casual_leaves: 7,
    wfh_quota: 4,
    probation_leaves: isOldStaff ? 0 : 3,
  }

  const fetchLiveBalance = async (empId: string, targetDate: string, recId?: string) => {
    try {
      setIsLoadingBalance(true)
      const res = await fetch(
        `/api/attendance/leave-balance?employeeId=${encodeURIComponent(empId)}&date=${encodeURIComponent(
          targetDate
        )}&excludeRecordId=${encodeURIComponent(recId || '')}`
      )
      const data = await res.json()
      if (data.success) {
        setBalanceSummary(data)
      }
    } catch (e) {
      console.error('Error fetching live leave balance:', e)
    } finally {
      setIsLoadingBalance(false)
    }
  }

  useEffect(() => {
    if (record) {
      const recDate = record.attendance_date || ''
      const empId = record.employee_id || record.employee?.id || record.employee?.employee_id || ''
      setDate(recDate)
      setInTime(record.in_time || '')
      setOutTime(record.out_time || '')
      setError(null)

      // Parse existing leave value from notes
      const existingValMatch = record.notes ? record.notes.match(/\(([0-9]+(?:\.[0-9]+)?)\s*day/i) || record.notes.match(/([0-9]+(?:\.[0-9]+)?)\s*day/i) : null
      const initialDays = existingValMatch ? existingValMatch[1] : '1'
      setLeaveDays(initialDays)
      setWfhDays(initialDays)

      if (empId) {
        fetchLiveBalance(empId, recDate, record.id)
      }

      const isProb = checkProbationStatus(
        record.employee?.joining_date || record.employee?.created_at,
        recDate
      ).isProbation

      // Infer current status
      if (
        record.notes?.includes('Work From Home') ||
        record.arrival_status === 'Work From Home' ||
        record.departure_status === 'Work From Home'
      ) {
        setAttendanceStatus('wfh')
        const wfh = getWfhTimes(recDate, settings)
        setInTime(wfh.inTime)
        setOutTime(wfh.outTime)
      } else if (
        record.arrival_status === 'Leave' ||
        record.departure_status?.includes('Leave') ||
        LEAVE_TYPES.includes(record.departure_status as any) ||
        LEAVE_TYPES.includes(record.arrival_status as any)
      ) {
        setAttendanceStatus('leave')
        const matched = LEAVE_TYPES.find(
          (t) => t === record.departure_status || t === record.arrival_status
        )
        if (isProb) {
          setSelectedLeaveType('Probation Leaves')
        } else {
          setSelectedLeaveType(matched && matched !== 'Probation Leaves' && matched !== 'Probation Leave' ? matched : 'Casual Leave')
        }
      } else if (
        record.arrival_status === 'Absent' ||
        record.departure_status === 'Absent' ||
        (!record.in_time && !record.out_time && !record.id)
      ) {
        if (!record.in_time && !record.out_time && !record.id) {
          // If adding new blank attendance
          setAttendanceStatus('present')
        } else {
          setAttendanceStatus('absent')
        }
      } else {
        setAttendanceStatus('present')
      }
    }
  }, [record, isOpen])

  if (!record) return null

  const isMissingOut =
    attendanceStatus === 'present' &&
    (!outTime || outTime === '---' || record.departure_status === 'Missing Out Time')

  // Live recalculations for preview
  const parsedDate = parseDateString(date)
  const dayOfWeek = parsedDate ? parsedDate.dayOfWeek : 1
  const dayName = parsedDate ? parsedDate.dayName : record.day_of_week
  const wfhTimes = getWfhTimes(date, settings)

  const liveArrivalStatus = inTime.trim()
    ? calculateArrivalStatus(inTime, dayOfWeek, settings)
    : 'Missing In Time'
  const liveDepartureStatus = outTime.trim()
    ? calculateDepartureStatus(outTime, dayOfWeek, settings)
    : 'Missing Out Time'
  const { formatted: liveWorkingDuration } = calculateWorkingDuration(
    inTime.trim() || null,
    outTime.trim() || null
  )

  const isCasualExhausted = (effectiveRemaining.casual_leaves || 0) <= 0
  const isSickExhausted = (effectiveRemaining.sick_leaves || 0) <= 0
  const isAnnualExhausted = (effectiveRemaining.annual_leaves || 0) <= 0
  const isProbationExhausted = (effectiveRemaining.probation_leaves || 0) <= 0
  const isWfhExhausted = (effectiveRemaining.wfh_quota || 0) <= 0
  const isAllStandardExhausted = isCasualExhausted && isSickExhausted && isAnnualExhausted

  const handleStatusChange = (newStatus: AttendanceStatusType) => {
    setError(null)
    if (newStatus === 'wfh') {
      if (isWfhExhausted) {
        setError('Work From Home quota is exhausted (0 remaining). Cannot apply WFH.')
        return
      }
      setAttendanceStatus('wfh')
      const wfh = getWfhTimes(date, settings)
      setInTime(wfh.inTime)
      setOutTime(wfh.outTime)
    } else if (newStatus === 'leave') {
      if (isProbation) {
        if (isProbationExhausted) {
          setError('Probation leave quota is exhausted (0 remaining).')
        }
        setSelectedLeaveType('Probation Leaves')
      } else {
        if (isAllStandardExhausted) {
          setError('All standard leave balances are 0 (Exhausted).')
        }
        if (!isCasualExhausted) setSelectedLeaveType('Casual Leave')
        else if (!isSickExhausted) setSelectedLeaveType('Sick Leave')
        else if (!isAnnualExhausted) setSelectedLeaveType('Annual Leave')
        else setSelectedLeaveType('Casual Leave')
      }
      setAttendanceStatus('leave')
    } else {
      setAttendanceStatus(newStatus)
    }
  }

  const handleDateChange = (newDate: string) => {
    setDate(newDate)
    setError(null)
    const empId = record.employee_id || record.employee?.id || record.employee?.employee_id || ''
    if (empId) {
      fetchLiveBalance(empId, newDate, record.id)
    }
    const prob = checkProbationStatus(employeeJoiningDate, newDate)
    if (attendanceStatus === 'wfh') {
      const wfh = getWfhTimes(newDate, settings)
      setInTime(wfh.inTime)
      setOutTime(wfh.outTime)
    } else if (attendanceStatus === 'leave') {
      if (prob.isProbation) {
        setSelectedLeaveType('Probation Leaves')
      } else if (selectedLeaveType === 'Probation Leaves' || selectedLeaveType === 'Probation Leave') {
        setSelectedLeaveType('Casual Leave')
      }
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const numLeaveDays = parseFloat(leaveDays) || 1
    const numWfhDays = parseFloat(wfhDays) || 1

    if (attendanceStatus === 'leave' && (isNaN(numLeaveDays) || numLeaveDays <= 0)) {
      setError('Please enter a valid leave value greater than 0.')
      return
    }

    if (attendanceStatus === 'wfh' && (isNaN(numWfhDays) || numWfhDays <= 0)) {
      setError('Please enter a valid WFH value greater than 0.')
      return
    }

    // Validation 1: Probation Rule Enforcement
    if (attendanceStatus === 'leave') {
      if (isProbation) {
        if (selectedLeaveType !== 'Probation Leaves' && selectedLeaveType !== 'Probation Leave') {
          setError('Employee is in probation period (within 3 months of joining). Only Probation Leaves can be applied.')
          return
        }
        if (balanceSummary?.hasProbationInTargetMonth) {
          const monthStr = date.substring(0, 7)
          setError(
            `Monthly Limit Exceeded: Only 1 Probation Leave is allowed per calendar month. This employee already has a Probation Leave in ${monthStr}.`
          )
          return
        }
        if ((effectiveRemaining.probation_leaves || 0) < numLeaveDays) {
          setError(
            `Probation Leaves Quota Exceeded: Only ${effectiveRemaining.probation_leaves ?? 0} remaining, but ${numLeaveDays} day(s) requested.`
          )
          return
        }
      } else {
        if (selectedLeaveType === 'Probation Leaves' || selectedLeaveType === 'Probation Leave') {
          setError('Probation period has ended (3 months completed). Please select Annual, Sick, or Casual Leave.')
          return
        }
        if ((selectedLeaveType === 'Annual Leaves' || selectedLeaveType === 'Annual Leave') && (effectiveRemaining.annual_leaves || 0) < numLeaveDays) {
          setError(`Annual Leaves Quota Exceeded: Only ${effectiveRemaining.annual_leaves ?? 0} remaining, but ${numLeaveDays} day(s) requested.`)
          return
        }
        if ((selectedLeaveType === 'Sick Leaves' || selectedLeaveType === 'Sick Leave') && (effectiveRemaining.sick_leaves || 0) < numLeaveDays) {
          setError(`Sick Leaves Quota Exceeded: Only ${effectiveRemaining.sick_leaves ?? 0} remaining, but ${numLeaveDays} day(s) requested.`)
          return
        }
        if ((selectedLeaveType === 'Casual Leaves' || selectedLeaveType === 'Casual Leave') && (effectiveRemaining.casual_leaves || 0) < numLeaveDays) {
          setError(`Casual Leaves Quota Exceeded: Only ${effectiveRemaining.casual_leaves ?? 0} remaining, but ${numLeaveDays} day(s) requested.`)
          return
        }
      }
    }

    // Validation 2: WFH Quota Enforcement
    if (attendanceStatus === 'wfh') {
      if ((effectiveRemaining.wfh_quota || 0) < numWfhDays) {
        setError(`Work From Home (WFH) Quota Exceeded: Only ${effectiveRemaining.wfh_quota ?? 0} remaining, but ${numWfhDays} day(s) requested.`)
        return
      }
    }

    setIsSaving(true)

    try {
      let payloadArrivalStatus: string | undefined = undefined
      let payloadDepartureStatus: string | undefined = undefined
      let payloadInTime: string | null = inTime.trim() || null
      let payloadOutTime: string | null = outTime.trim() || null
      let payloadNotes: string | null = null

      if (attendanceStatus === 'absent') {
        payloadArrivalStatus = 'Absent'
        payloadDepartureStatus = 'Absent'
        payloadInTime = null
        payloadOutTime = null
        payloadNotes = null
      } else if (attendanceStatus === 'leave') {
        payloadArrivalStatus = 'Leave'
        payloadDepartureStatus = selectedLeaveType
        payloadInTime = null
        payloadOutTime = null
        payloadNotes = `${selectedLeaveType} (${numLeaveDays} day${numLeaveDays === 1 ? '' : 's'})`
      } else if (attendanceStatus === 'wfh') {
        payloadInTime = wfhTimes.inTime
        payloadOutTime = wfhTimes.outTime
        payloadArrivalStatus = 'On Time Arrival'
        payloadDepartureStatus = 'Work From Home'
        payloadNotes = `Work From Home (${numWfhDays} day${numWfhDays === 1 ? '' : 's'})`
      }

      const isSyntheticRecord =
        !record.id ||
        record.id.startsWith('absent-') ||
        record.id.startsWith('holiday-') ||
        record.id.startsWith('future-') ||
        record.id.startsWith('dummy-') ||
        !record.id.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)

      if (!isSyntheticRecord) {
        // Update existing record
        const res = await fetch('/api/attendance/records', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: record.id,
            employee_id: record.employee_id || record.employee?.id,
            attendance_date: date,
            in_time: payloadInTime,
            out_time: payloadOutTime,
            arrival_status: payloadArrivalStatus,
            departure_status: payloadDepartureStatus,
            notes: payloadNotes,
          }),
        })

        const data = await res.json()
        if (!data.success) {
          throw new Error(data.error || 'Failed to update record.')
        }
        onSaveSuccess(data.record)
      } else {
        // Create new manual record
        const res = await fetch('/api/attendance/records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employee_id: record.employee_id || record.employee?.id,
            attendance_date: date,
            in_time: payloadInTime,
            out_time: payloadOutTime,
            arrival_status: payloadArrivalStatus,
            departure_status: payloadDepartureStatus,
            notes: payloadNotes,
          }),
        })

        const data = await res.json()
        if (!data.success) {
          throw new Error(data.error || 'Failed to save record.')
        }
        onSaveSuccess(data.record)
      }

      onClose()
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-white border border-slate-200 shadow-xl rounded-xl">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <DialogTitle className="text-lg font-bold text-[#003D5C] flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#009D9E]" />
            Edit Attendance Record
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Update attendance status, mark leaves, work from home, or pick office in/out timings.
          </p>
        </DialogHeader>

        {isMissingOut && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs p-3 rounded-lg flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Missing Punch-Out Detected</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                The employee checked in at <span className="font-bold font-mono">{record.in_time || 'N/A'}</span> but missed checking out. Pick their departure time or mark status.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 py-2">
          {/* Employee Header Box */}
          <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#009D9E]/10 text-[#009D9E] font-bold text-xs flex items-center justify-center">
                {record.employee?.name?.charAt(0) || 'E'}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">{record.employee?.name || 'Employee'}</p>
                <p className="text-xs text-slate-500 font-mono">
                  {record.employee?.employee_id || 'N/A'}
                  {isOldStaff ? ' • Old Staff (Confirmed)' : (employeeJoiningDate && ` • Joined: ${employeeJoiningDate.split('T')[0]}`)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-200 text-slate-700 rounded-md block">
                {record.employee?.designation || 'Staff'}
              </span>
              <span className={`text-[10px] font-bold mt-1 inline-block ${isProbation ? 'text-amber-600' : 'text-emerald-600'}`}>
                {isProbation ? 'Probation Active' : (isOldStaff ? 'Old Staff (Confirmed)' : 'Confirmed Staff')}
              </span>
            </div>
          </div>

          {/* Attendance Status Selector (Present, Absent, Leave, Work From Home) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Attendance Status
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Option 1: Present */}
              <button
                type="button"
                onClick={() => handleStatusChange('present')}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                  attendanceStatus === 'present'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-500 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Present</span>
              </button>

              {/* Option 2: Absent */}
              <button
                type="button"
                onClick={() => handleStatusChange('absent')}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                  attendanceStatus === 'absent'
                    ? 'bg-rose-50 text-rose-700 border-rose-500 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <UserX className="w-3.5 h-3.5" />
                <span>Absent</span>
              </button>

              {/* Option 3: Leave */}
              <button
                type="button"
                onClick={() => handleStatusChange('leave')}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                  attendanceStatus === 'leave'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-500 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <PlaneTakeoff className="w-3.5 h-3.5" />
                <span>Leave</span>
              </button>

              {/* Option 4: Work From Home (WFH) */}
              <button
                type="button"
                onClick={() => handleStatusChange('wfh')}
                disabled={isWfhExhausted}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                  isWfhExhausted
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                    : attendanceStatus === 'wfh'
                    ? 'bg-cyan-50 text-cyan-800 border-cyan-500 shadow-2xs ring-1 ring-cyan-500'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
                title={isWfhExhausted ? 'WFH quota exhausted (0 remaining)' : 'Work From Home'}
              >
                <Laptop className={`w-3.5 h-3.5 ${isWfhExhausted ? 'text-slate-400' : 'text-cyan-600'}`} />
                <span>WFH {isWfhExhausted ? '(0)' : ''}</span>
              </button>
            </div>
          </div>

          {/* If WFH is selected: Auto Assigned Shift Info & Locked Inputs */}
          {attendanceStatus === 'wfh' && (
            <div className="space-y-3 bg-cyan-50/70 p-3.5 rounded-lg border border-cyan-200 animate-in fade-in duration-200">
              <div className="flex items-start justify-between gap-2.5 text-xs text-cyan-900">
                <div className="flex items-start gap-2">
                  <Laptop className="w-4 h-4 text-cyan-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-cyan-950">Work From Home (WFH) Applied</p>
                    <p className="text-[11px] text-cyan-800 mt-0.5">
                      Shift timings for <strong>{dayName}</strong> ({wfhTimes.inTime} – {wfhTimes.outTime}) locked. Counted as <strong>100% Present ({wfhTimes.hours})</strong>.
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-900 font-mono font-bold text-[10px] shrink-0">
                  {effectiveRemaining.wfh_quota ?? 4} remaining / {effectiveQuotas.wfh_quota ?? 4}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <Label className="text-[11px] font-bold text-slate-600 block mb-1">In Time (Auto Locked):</Label>
                  <Input
                    disabled
                    readOnly
                    value={wfhTimes.inTime}
                    className="bg-white font-mono text-xs font-bold text-slate-800 border-cyan-200 cursor-not-allowed h-9"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-bold text-slate-600 block mb-1">Out Time (Auto Locked):</Label>
                  <Input
                    disabled
                    readOnly
                    value={wfhTimes.outTime}
                    className="bg-white font-mono text-xs font-bold text-slate-800 border-cyan-200 cursor-not-allowed h-9"
                  />
                </div>
              </div>
            </div>
          )}

          {/* If LEAVE is selected: Leave Type Dropdown & Probation Rules */}
          {attendanceStatus === 'leave' && (
            <div className="space-y-2 bg-indigo-50/60 p-3.5 rounded-lg border border-indigo-200/80 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  Select Leave Type
                </Label>
                {isProbation ? (
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                    Probation Active (Max 1/mo, {effectiveQuotas.probation_leaves ?? 3} total)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    Standard Leaves (Annual: {effectiveQuotas.annual_leaves ?? 6}, Sick: {effectiveQuotas.sick_leaves ?? 7}, Casual: {effectiveQuotas.casual_leaves ?? 7})
                  </span>
                )}
              </div>

              {isProbation ? (
                <div className="space-y-2">
                  {balanceSummary?.hasProbationInTargetMonth && (
                    <div className="bg-amber-100/90 border border-amber-300 text-amber-900 text-xs p-2.5 rounded-lg flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Monthly Limit Exceeded for this Month</p>
                        <p className="text-[11px] text-amber-800">
                          A Probation Leave is already recorded in this month ({balanceSummary.probationDates.filter(d => d.startsWith(date.substring(0, 7))).join(', ')}). Limit is 1 per calendar month.
                        </p>
                      </div>
                    </div>
                  )}

                  <Select
                    value={selectedLeaveType}
                    onValueChange={(val) => setSelectedLeaveType(val || 'Probation Leaves')}
                  >
                    <SelectTrigger className="w-full text-xs bg-white border-amber-300 font-bold text-amber-950 h-10 px-3">
                      <SelectValue placeholder="Select Leave Type" />
                    </SelectTrigger>
                    <SelectContent className="w-[var(--radix-select-trigger-width)] min-w-[320px]">
                      <SelectItem value="Probation Leaves" disabled={isProbationExhausted} className={`text-xs font-bold text-indigo-950 py-2 ${isProbationExhausted ? 'text-slate-400 opacity-50 cursor-not-allowed' : ''}`}>
                        Probation Leaves ({effectiveRemaining.probation_leaves ?? 3} remaining / {effectiveQuotas.probation_leaves ?? 3}{isProbationExhausted ? ' • Exhausted (0)' : ' • Max 1/month'})
                      </SelectItem>
                      <SelectItem value="Annual Leaves" disabled className="text-xs text-slate-400 opacity-60 py-2">
                        Annual Leaves (Locked — Available after 3 months)
                      </SelectItem>
                      <SelectItem value="Sick Leaves" disabled className="text-xs text-slate-400 opacity-60 py-2">
                        Sick Leaves (Locked — Available after 3 months)
                      </SelectItem>
                      <SelectItem value="Casual Leaves" disabled className="text-xs text-slate-400 opacity-60 py-2">
                        Casual Leaves (Locked — Available after 3 months)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-amber-700 font-medium">
                    Employee joined on <strong>{employeeJoiningDate ? employeeJoiningDate.split('T')[0] : 'N/A'}</strong> (within 3-month probation). Only Probation Leaves can be selected.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Select
                    value={selectedLeaveType === 'Probation Leaves' ? 'Casual Leave' : selectedLeaveType}
                    onValueChange={(val) => setSelectedLeaveType(val || 'Casual Leave')}
                  >
                    <SelectTrigger className="w-full text-xs bg-white border-indigo-300 font-bold text-indigo-950 h-10 px-3">
                      <SelectValue placeholder="Select Leave Type" />
                    </SelectTrigger>
                    <SelectContent className="w-[var(--radix-select-trigger-width)] min-w-[320px]">
                      <SelectItem value="Casual Leave" disabled={isCasualExhausted} className={`text-xs font-medium py-2 ${isCasualExhausted ? 'text-slate-400 opacity-50 cursor-not-allowed' : ''}`}>
                        Casual Leaves ({effectiveRemaining.casual_leaves ?? 7} remaining / {effectiveQuotas.casual_leaves ?? 7}{isCasualExhausted ? ' • Exhausted (0)' : ''})
                      </SelectItem>
                      <SelectItem value="Sick Leave" disabled={isSickExhausted} className={`text-xs font-medium py-2 ${isSickExhausted ? 'text-slate-400 opacity-50 cursor-not-allowed' : ''}`}>
                        Sick Leaves ({effectiveRemaining.sick_leaves ?? 7} remaining / {effectiveQuotas.sick_leaves ?? 7}{isSickExhausted ? ' • Exhausted (0)' : ''})
                      </SelectItem>
                      <SelectItem value="Annual Leave" disabled={isAnnualExhausted} className={`text-xs font-medium py-2 ${isAnnualExhausted ? 'text-slate-400 opacity-50 cursor-not-allowed' : ''}`}>
                        Annual Leaves ({effectiveRemaining.annual_leaves ?? 6} remaining / {effectiveQuotas.annual_leaves ?? 6}{isAnnualExhausted ? ' • Exhausted (0)' : ''})
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-indigo-700">
                    Employee recorded under <span className="font-bold">{selectedLeaveType === 'Probation Leaves' ? 'Casual Leave' : selectedLeaveType}</span> (Paid approved leave).
                  </p>
                </div>
              )}

              {/* Dynamic Leave Value / Days Input & Real-time Deduction Preview */}
              <div className="space-y-1.5 pt-2.5 mt-2 border-t border-indigo-200/60">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Leave Value / Duration</span>
                  </Label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setLeaveDays('0.5')}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded border transition-colors cursor-pointer ${
                        leaveDays === '0.5'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                      }`}
                    >
                      0.5 (Half Day)
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeaveDays('1')}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded border transition-colors cursor-pointer ${
                        leaveDays === '1'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                      }`}
                    >
                      1.0 (Full Day)
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="any"
                    min="0.1"
                    max="30"
                    value={leaveDays}
                    onChange={(e) => setLeaveDays(e.target.value)}
                    required
                    placeholder="e.g. 0.5 or 1"
                    className="text-xs font-mono font-bold text-slate-800 bg-white border-indigo-200 h-9"
                  />
                  <span className="text-xs text-slate-500 font-medium shrink-0">day(s)</span>
                </div>

                {/* Real-time Dynamic Balance Deduction Display */}
                {(() => {
                  const val = parseFloat(leaveDays) || 0
                  let currentRem = 0
                  if (selectedLeaveType.includes('Annual')) currentRem = effectiveRemaining.annual_leaves ?? 0
                  else if (selectedLeaveType.includes('Sick')) currentRem = effectiveRemaining.sick_leaves ?? 0
                  else if (selectedLeaveType.includes('Probation')) currentRem = effectiveRemaining.probation_leaves ?? 0
                  else currentRem = effectiveRemaining.casual_leaves ?? 0

                  const projected = Math.max(0, Number((currentRem - val).toFixed(2)))
                  const isOver = val > currentRem
                  return (
                    <div className={`text-[11px] p-2 rounded-md border flex items-center justify-between font-medium ${isOver ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-indigo-100 text-indigo-900'}`}>
                      <span>Available Balance: <strong>{currentRem}</strong></span>
                      <span className="text-slate-400">→</span>
                      <span>After Deduction: <strong className={isOver ? 'text-rose-600 font-bold' : 'text-emerald-700 font-bold'}>{projected}</strong></span>
                    </div>
                  )
                })()}
              </div>
            </div>
          )}

          {/* If ABSENT is selected: Informative Alert */}
          {attendanceStatus === 'absent' && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-lg flex items-center gap-2 animate-in fade-in duration-200">
              <UserX className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Employee is marked as <strong>Absent</strong> (no working hours recorded).</span>
            </div>
          )}

          {/* Date Input */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Attendance Date
            </Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              required
              className="text-sm border-slate-200 font-mono h-10"
            />
            <p className="text-[11px] text-slate-400 font-medium">Day: {dayName}</p>
          </div>

          {/* If PRESENT: In / Out Times Grid with Time Picker */}
          {attendanceStatus === 'present' && (
            <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-200">
              {/* Office In Time */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Office In Time
                </Label>
                <Input
                  type="time"
                  value={toTimeInputValue(inTime)}
                  onChange={(e) => setInTime(fromTimeInputValue(e.target.value))}
                  className="text-sm border-slate-200 font-mono h-10"
                />
                <p className="text-[11px] text-slate-500 font-mono">
                  {inTime ? `Selected: ${inTime}` : 'Pick in time'}
                </p>
              </div>

              {/* Office Out Time */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Office Out Time
                  </span>
                  {isMissingOut && (
                    <span className="text-[10px] font-bold text-amber-600 uppercase">Required</span>
                  )}
                </Label>
                <Input
                  type="time"
                  value={toTimeInputValue(outTime)}
                  onChange={(e) => setOutTime(fromTimeInputValue(e.target.value))}
                  className={`text-sm font-mono h-10 ${
                    isMissingOut && !outTime
                      ? 'border-amber-400 bg-amber-50/40 focus:border-[#009D9E]'
                      : 'border-slate-200'
                  }`}
                  autoFocus={isMissingOut}
                />
                <p className="text-[11px] text-slate-500 font-mono">
                  {outTime ? `Selected: ${outTime}` : 'Pick out time'}
                </p>
              </div>
            </div>
          )}

          {/* Live Recalculation Preview Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 space-y-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Live Auto-Recalculation Preview
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white p-2 rounded-md border border-slate-100 shadow-2xs">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Arrival Status</p>
                <p
                  className={`text-xs font-bold mt-0.5 ${
                    attendanceStatus === 'absent'
                      ? 'text-rose-600'
                      : attendanceStatus === 'leave'
                      ? 'text-indigo-600'
                      : attendanceStatus === 'wfh'
                      ? 'text-cyan-700'
                      : liveArrivalStatus === 'On Time Arrival'
                      ? 'text-emerald-600'
                      : liveArrivalStatus === 'Late Arrival'
                      ? 'text-amber-600'
                      : 'text-slate-400'
                  }`}
                >
                  {attendanceStatus === 'absent'
                    ? 'Absent'
                    : attendanceStatus === 'leave'
                    ? 'Leave'
                    : attendanceStatus === 'wfh'
                    ? 'On Time (WFH)'
                    : liveArrivalStatus}
                </p>
              </div>

              <div className="bg-white p-2 rounded-md border border-slate-100 shadow-2xs">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">
                  {attendanceStatus === 'leave' ? 'Leave Type' : 'Departure Status'}
                </p>
                <p
                  className={`text-xs font-bold mt-0.5 ${
                    attendanceStatus === 'absent'
                      ? 'text-rose-600'
                      : attendanceStatus === 'leave'
                      ? 'text-indigo-600'
                      : attendanceStatus === 'wfh'
                      ? 'text-cyan-700'
                      : liveDepartureStatus === 'On Time Departure'
                      ? 'text-emerald-600'
                      : liveDepartureStatus === 'Early Departure'
                      ? 'text-rose-600'
                      : 'text-slate-400'
                  }`}
                >
                  {attendanceStatus === 'absent'
                    ? 'Absent'
                    : attendanceStatus === 'leave'
                    ? selectedLeaveType
                    : attendanceStatus === 'wfh'
                    ? 'On Time (WFH)'
                    : liveDepartureStatus}
                </p>
              </div>

              <div className="bg-white p-2 rounded-md border border-slate-100 shadow-2xs">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Working Time</p>
                <p className="text-xs font-bold text-slate-900 mt-0.5 font-mono">
                  {attendanceStatus === 'present'
                    ? liveWorkingDuration
                    : attendanceStatus === 'wfh'
                    ? wfhTimes.hours
                    : '00:00'}
                </p>
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
              className="bg-[#009D9E] hover:bg-[#007A7A] text-white text-xs font-bold uppercase tracking-wider gap-1.5"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save & Recalculate
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
