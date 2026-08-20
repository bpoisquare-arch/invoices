'use client'

import React, { useState, useEffect } from 'react'
import { AttendanceRecordWithEmployee, AttendanceSettings } from '@/lib/supabase/database.types'
import {
  calculateArrivalStatus,
  calculateDepartureStatus,
  calculateWorkingDuration,
  parseDateString,
  DEFAULT_ATTENDANCE_SETTINGS,
} from '@/lib/services/attendance-calculator'
import { LEAVE_TYPES } from '@/lib/services/attendance.service'
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

type AttendanceStatusType = 'present' | 'absent' | 'leave'

export default function EditAttendanceModal({
  isOpen,
  onClose,
  record,
  onSaveSuccess,
  settings = DEFAULT_ATTENDANCE_SETTINGS,
}: EditAttendanceModalProps) {
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatusType>('present')
  const [selectedLeaveType, setSelectedLeaveType] = useState<string>('Casual Leave')
  const [date, setDate] = useState('')
  const [inTime, setInTime] = useState('')
  const [outTime, setOutTime] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (record) {
      setDate(record.attendance_date || '')
      setInTime(record.in_time || '')
      setOutTime(record.out_time || '')
      setError(null)

      // Infer current status
      if (
        record.arrival_status === 'Leave' ||
        record.departure_status?.includes('Leave') ||
        LEAVE_TYPES.includes(record.departure_status as any) ||
        LEAVE_TYPES.includes(record.arrival_status as any)
      ) {
        setAttendanceStatus('leave')
        const matched = LEAVE_TYPES.find(
          (t) => t === record.departure_status || t === record.arrival_status
        )
        setSelectedLeaveType(matched || 'Casual Leave')
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSaving(true)

    try {
      let payloadArrivalStatus: string | undefined = undefined
      let payloadDepartureStatus: string | undefined = undefined
      let payloadInTime: string | null = inTime.trim() || null
      let payloadOutTime: string | null = outTime.trim() || null

      if (attendanceStatus === 'absent') {
        payloadArrivalStatus = 'Absent'
        payloadDepartureStatus = 'Absent'
        payloadInTime = null
        payloadOutTime = null
      } else if (attendanceStatus === 'leave') {
        payloadArrivalStatus = 'Leave'
        payloadDepartureStatus = selectedLeaveType
        payloadInTime = null
        payloadOutTime = null
      }

      if (record.id) {
        // Update existing record
        const res = await fetch('/api/attendance/records', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: record.id,
            attendance_date: date,
            in_time: payloadInTime,
            out_time: payloadOutTime,
            arrival_status: payloadArrivalStatus,
            departure_status: payloadDepartureStatus,
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
            Update attendance status, mark leaves, or pick office in/out timings.
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
                <p className="text-xs text-slate-500 font-mono">{record.employee?.employee_id || 'N/A'}</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-200 text-slate-700 rounded-md">
              {record.employee?.designation || 'Staff'}
            </span>
          </div>

          {/* Attendance Status Selector (Present, Absent, Leave) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Attendance Status
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {/* Option 1: Present */}
              <button
                type="button"
                onClick={() => setAttendanceStatus('present')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
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
                onClick={() => setAttendanceStatus('absent')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
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
                onClick={() => setAttendanceStatus('leave')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                  attendanceStatus === 'leave'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-500 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <PlaneTakeoff className="w-3.5 h-3.5" />
                <span>Leave</span>
              </button>
            </div>
          </div>

          {/* If LEAVE is selected: Leave Type Dropdown */}
          {attendanceStatus === 'leave' && (
            <div className="space-y-1.5 bg-indigo-50/60 p-3.5 rounded-lg border border-indigo-200/80 animate-in fade-in duration-200">
              <Label className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                Select Leave Type
              </Label>
              <Select
                value={selectedLeaveType}
                onValueChange={(val) => setSelectedLeaveType(val || 'Casual Leave')}
              >
                <SelectTrigger className="text-xs bg-white border-indigo-300 font-bold text-indigo-950 h-10">
                  <SelectValue placeholder="Select Leave Type" />
                </SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPES.map((lt) => (
                    <SelectItem key={lt} value={lt} className="text-xs font-medium">
                      {lt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-indigo-700 mt-1">
                Employee will be recorded under <span className="font-bold">{selectedLeaveType}</span> for this date.
              </p>
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
              onChange={(e) => setDate(e.target.value)}
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
                    : liveDepartureStatus}
                </p>
              </div>

              <div className="bg-white p-2 rounded-md border border-slate-100 shadow-2xs">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Working Time</p>
                <p className="text-xs font-bold text-slate-900 mt-0.5 font-mono">
                  {attendanceStatus === 'present' ? liveWorkingDuration : '00:00'}
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
