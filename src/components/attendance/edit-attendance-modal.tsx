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
import { Clock, Calendar, User, Save, Loader2, AlertCircle, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react'

interface EditAttendanceModalProps {
  isOpen: boolean
  onClose: () => void
  record: AttendanceRecordWithEmployee | null
  onSaveSuccess: (updatedRecord: any) => void
  settings?: AttendanceSettings
}

const COMMON_OUT_PRESETS = [
  '05:30 PM',
  '06:00 PM',
  '06:30 PM',
  '07:00 PM',
  '07:30 PM',
  '08:00 PM',
]

export default function EditAttendanceModal({
  isOpen,
  onClose,
  record,
  onSaveSuccess,
  settings = DEFAULT_ATTENDANCE_SETTINGS,
}: EditAttendanceModalProps) {
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
    }
  }, [record, isOpen])

  if (!record) return null

  const isMissingOut = !record.out_time || record.out_time === '---' || record.departure_status === 'Missing Out Time'

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
      if (record.id) {
        // Update existing record
        const res = await fetch('/api/attendance/records', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: record.id,
            attendance_date: date,
            in_time: inTime.trim() || null,
            out_time: outTime.trim() || null,
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
            in_time: inTime.trim() || null,
            out_time: outTime.trim() || null,
          }),
        })

        const data = await res.json()
        if (!data.success) {
          throw new Error(data.error || 'Failed to save new record.')
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
        <DialogHeader className="border-b border-slate-100 pb-4">
          <DialogTitle className="text-lg font-bold text-[#003D5C] flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#009D9E]" />
            {isMissingOut ? 'Update Missing Out Time' : 'Edit Attendance Record'}
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1">
            Manually update in/out timings. Status and total working hours are automatically recalculated.
          </p>
        </DialogHeader>

        {isMissingOut && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs p-3 rounded-lg flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Missing Punch-Out Detected</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                The employee checked in at <span className="font-bold font-mono">{record.in_time || 'N/A'}</span> but missed checking out. Please enter their confirmed departure time below.
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
          <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-lg flex items-center justify-between">
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
              className="text-sm border-slate-200 font-mono"
            />
            <p className="text-[11px] text-slate-400 font-medium">Day: {dayName}</p>
          </div>

          {/* In / Out Times Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Office In Time
              </Label>
              <Input
                type="text"
                placeholder="e.g. 10:30 AM"
                value={inTime}
                onChange={(e) => setInTime(e.target.value)}
                className="text-sm border-slate-200 font-mono"
              />
              <p className="text-[10px] text-slate-400">Format: 10:30 AM or 10:30</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>Office Out Time</span>
                {isMissingOut && (
                  <span className="text-[10px] font-bold text-amber-600 uppercase">Required</span>
                )}
              </Label>
              <Input
                type="text"
                placeholder="e.g. 06:30 PM"
                value={outTime}
                onChange={(e) => setOutTime(e.target.value)}
                className={`text-sm font-mono ${
                  isMissingOut && !outTime
                    ? 'border-amber-400 bg-amber-50/40 focus:border-[#009D9E]'
                    : 'border-slate-200'
                }`}
                autoFocus={isMissingOut}
              />
              <p className="text-[10px] text-slate-400">Format: 06:30 PM or 18:30</p>
            </div>
          </div>

          {/* Quick Presets for Out Time */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#009D9E]" />
              Quick Out Time Presets:
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_OUT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setOutTime(preset)}
                  className={`text-[11px] font-mono px-2.5 py-1 rounded border transition-colors ${
                    outTime === preset
                      ? 'bg-[#009D9E] text-white border-[#009D9E] font-bold'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Live Recalculation Preview Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-4 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Live Auto-Recalculation Preview
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white p-2.5 rounded-md border border-slate-100 shadow-2xs">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Arrival Status</p>
                <p
                  className={`text-xs font-bold mt-1 ${
                    liveArrivalStatus === 'On Time Arrival'
                      ? 'text-emerald-600'
                      : liveArrivalStatus === 'Late Arrival'
                      ? 'text-amber-600'
                      : 'text-slate-400'
                  }`}
                >
                  {liveArrivalStatus}
                </p>
              </div>

              <div className="bg-white p-2.5 rounded-md border border-slate-100 shadow-2xs">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Departure Status</p>
                <p
                  className={`text-xs font-bold mt-1 ${
                    liveDepartureStatus === 'On Time Departure'
                      ? 'text-emerald-600'
                      : liveDepartureStatus === 'Early Departure'
                      ? 'text-rose-600'
                      : 'text-slate-400'
                  }`}
                >
                  {liveDepartureStatus}
                </p>
              </div>

              <div className="bg-white p-2.5 rounded-md border border-slate-100 shadow-2xs">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Working Time</p>
                <p className="text-xs font-bold text-slate-900 mt-1 font-mono">{liveWorkingDuration}</p>
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
