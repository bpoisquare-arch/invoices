'use client'

import React from 'react'
import { AttendanceRecordWithEmployee, RawPunch } from '@/lib/supabase/database.types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Clock, ArrowDownRight, ArrowUpRight, Calendar, User, FileSpreadsheet } from 'lucide-react'

interface ViewPunchesModalProps {
  isOpen: boolean
  onClose: () => void
  record: AttendanceRecordWithEmployee | null
}

export default function ViewPunchesModal({ isOpen, onClose, record }: ViewPunchesModalProps) {
  if (!record) return null

  const rawPunches: RawPunch[] =
    record.raw_punches_parsed && record.raw_punches_parsed.length > 0
      ? record.raw_punches_parsed
      : Array.isArray(record.raw_punches)
      ? (record.raw_punches as unknown as RawPunch[])
      : []

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-xl rounded-xl">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <DialogTitle className="text-base font-bold text-[#003D5C] flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#009D9E]" />
            Raw Attendance Punches
          </DialogTitle>
          <p className="text-xs text-slate-500">
            Chronological raw event records imported from Excel.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Header Info */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between text-xs">
            <div>
              <p className="font-bold text-slate-800">{record.employee?.name || 'Employee'}</p>
              <p className="text-slate-500 font-mono">{record.employee?.employee_id || 'N/A'}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-slate-700">{record.attendance_date}</p>
              <p className="text-slate-400">{record.day_of_week}</p>
            </div>
          </div>

          {/* Punches Timeline */}
          {rawPunches.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs bg-slate-50 rounded-lg border border-dashed border-slate-200">
              No raw punch breakdown available for this record.
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {rawPunches.map((punch, idx) => {
                const isIn =
                  punch.state?.toLowerCase().includes('in') || punch.state?.toLowerCase() === 'c/in'

                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-md flex items-center justify-center font-bold ${
                          isIn
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            : 'bg-amber-50 text-amber-600 border border-amber-100'
                        }`}
                      >
                        {isIn ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 font-mono">{punch.time}</p>
                        <p className="text-[10px] text-slate-400">
                          {punch.rawTimestamp ? `Raw: ${punch.rawTimestamp}` : `Event #${idx + 1}`}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isIn ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {punch.state || (isIn ? 'C/In' : 'C/Out')}
                      </span>
                      {punch.originalRowIndex && (
                        <p className="text-[9px] text-slate-400 mt-0.5">Row #{punch.originalRowIndex}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Aggregated Totals */}
          <div className="bg-[#001E2F] text-slate-100 p-3 rounded-lg flex items-center justify-between text-xs font-mono">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-sans">First In → Last Out</p>
              <p className="font-bold text-slate-200">
                {record.in_time || '--'} → {record.out_time || '--'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase font-sans">Duration</p>
              <p className="font-bold text-[#81F5F5]">{record.total_working_hours_formatted || '--'}</p>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2 border-t border-slate-100">
          <Button variant="outline" onClick={onClose} className="text-xs font-bold w-full sm:w-auto">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
