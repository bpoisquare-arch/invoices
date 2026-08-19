'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  SlidersHorizontal,
  Clock,
  Calendar,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Info,
  ShieldCheck,
  Globe,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { AttendanceSettings } from '@/lib/supabase/database.types'
import {
  calculateArrivalStatus,
  calculateDepartureStatus,
  calculateWorkingDuration,
  DEFAULT_ATTENDANCE_SETTINGS,
} from '@/lib/services/attendance-calculator'

export default function AttendanceSettingsPage() {
  const [settings, setSettings] = useState<AttendanceSettings>(DEFAULT_ATTENDANCE_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Interactive Live Rule Simulator state
  const [simDay, setSimDay] = useState<'weekday' | 'saturday'>('weekday')
  const [simInTime, setSimInTime] = useState('10:42 AM')
  const [simOutTime, setSimOutTime] = useState('06:35 PM')

  useEffect(() => {
    async function loadSettings() {
      try {
        setIsLoading(true)
        const res = await fetch('/api/attendance/settings')
        const data = await res.json()
        if (data.success && data.settings) {
          setSettings(data.settings)
        }
      } catch (err) {
        console.error('Error loading settings:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadSettings()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSuccessMessage(null)
    setErrorMessage(null)

    try {
      const res = await fetch('/api/attendance/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      const data = await res.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to save settings.')
      }

      setSettings(data.settings)
      setSuccessMessage('Attendance timing rules and settings saved successfully!')
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while saving settings.')
    } finally {
      setIsSaving(false)
    }
  }

  // Live Simulator calculation
  const simDayOfWeek = simDay === 'weekday' ? 1 : 6
  const simArrivalStatus = simInTime.trim()
    ? calculateArrivalStatus(simInTime, simDayOfWeek, settings)
    : 'Missing In Time'
  const simDepartureStatus = simOutTime.trim()
    ? calculateDepartureStatus(simOutTime, simDayOfWeek, settings)
    : 'Missing Out Time'
  const { formatted: simWorkingDuration } = calculateWorkingDuration(
    simInTime.trim() || null,
    simOutTime.trim() || null
  )

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-['Montserrat'] text-2xl font-bold text-[#003D5C] tracking-tight">
            Attendance Policy & Rules Settings
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Configure office timings, grace periods, and non-working day rules. Changes apply automatically to all future calculations.
          </p>
        </div>
        <Link href="/attendance">
          <Button variant="outline" className="text-xs font-bold uppercase tracking-wider text-slate-700 border-slate-300">
            Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* Success / Error Alerts */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-4 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-4 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Monday to Friday Rules Card */}
        <Card className="bg-white border border-slate-200/90 shadow-2xs rounded-xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-3.5 px-5">
            <CardTitle className="text-sm font-bold text-[#003D5C] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#009D9E]" />
              Monday to Friday Timing Policies
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* In Time */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Official In Time (24h)
                </Label>
                <Input
                  type="text"
                  placeholder="10:30"
                  value={settings.weekday_in_time}
                  onChange={(e) =>
                    setSettings({ ...settings, weekday_in_time: e.target.value })
                  }
                  required
                  className="text-sm border-slate-200 font-mono"
                />
                <p className="text-[10px] text-slate-400">Default: 10:30 (10:30 AM)</p>
              </div>

              {/* Grace Period */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Grace Period (Minutes)
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="120"
                  value={settings.weekday_grace_minutes}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      weekday_grace_minutes: parseInt(e.target.value || '0', 10),
                    })
                  }
                  required
                  className="text-sm border-slate-200 font-mono"
                />
                <p className="text-[10px] text-slate-400">
                  On-Time cutoff: up to 10:45 AM (15 mins)
                </p>
              </div>

              {/* Out Time */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Official Out Time (24h)
                </Label>
                <Input
                  type="text"
                  placeholder="18:30"
                  value={settings.weekday_out_time}
                  onChange={(e) =>
                    setSettings({ ...settings, weekday_out_time: e.target.value })
                  }
                  required
                  className="text-sm border-slate-200 font-mono"
                />
                <p className="text-[10px] text-slate-400">Default: 18:30 (6:30 PM)</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-xs text-slate-600 space-y-1">
              <p className="font-bold text-slate-700">Calculated Evaluation Rules:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-500">
                <li>Arrivals between 10:30 AM – 10:45 AM = <strong className="text-emerald-700">On Time Arrival</strong></li>
                <li>Arrivals at 10:46 AM and later = <strong className="text-amber-700">Late Arrival</strong></li>
                <li>Departures before 6:30 PM (6:29 PM or earlier) = <strong className="text-rose-700">Early Departure</strong></li>
                <li>Departures at 6:30 PM or later = <strong className="text-emerald-700">On Time Departure</strong></li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Saturday Rules Card */}
        <Card className="bg-white border border-slate-200/90 shadow-2xs rounded-xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-3.5 px-5">
            <CardTitle className="text-sm font-bold text-[#003D5C] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#009D9E]" />
              Saturday Timing Policies
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* In Time */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Official In Time (24h)
                </Label>
                <Input
                  type="text"
                  placeholder="11:00"
                  value={settings.saturday_in_time}
                  onChange={(e) =>
                    setSettings({ ...settings, saturday_in_time: e.target.value })
                  }
                  required
                  className="text-sm border-slate-200 font-mono"
                />
                <p className="text-[10px] text-slate-400">Default: 11:00 (11:00 AM)</p>
              </div>

              {/* Grace Period */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Grace Period (Minutes)
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="120"
                  value={settings.saturday_grace_minutes}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      saturday_grace_minutes: parseInt(e.target.value || '0', 10),
                    })
                  }
                  required
                  className="text-sm border-slate-200 font-mono"
                />
                <p className="text-[10px] text-slate-400">
                  On-Time cutoff: up to 11:15 AM (15 mins)
                </p>
              </div>

              {/* Out Time */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Official Out Time (24h)
                </Label>
                <Input
                  type="text"
                  placeholder="15:00"
                  value={settings.saturday_out_time}
                  onChange={(e) =>
                    setSettings({ ...settings, saturday_out_time: e.target.value })
                  }
                  required
                  className="text-sm border-slate-200 font-mono"
                />
                <p className="text-[10px] text-slate-400">Default: 15:00 (3:00 PM)</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-xs text-slate-600 space-y-1">
              <p className="font-bold text-slate-700">Calculated Evaluation Rules:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-500">
                <li>Arrivals between 11:00 AM – 11:15 AM = <strong className="text-emerald-700">On Time Arrival</strong></li>
                <li>Arrivals at 11:16 AM and later = <strong className="text-amber-700">Late Arrival</strong></li>
                <li>Departures before 3:00 PM (2:59 PM or earlier) = <strong className="text-rose-700">Early Departure</strong></li>
                <li>Departures at 3:00 PM or later = <strong className="text-emerald-700">On Time Departure</strong></li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Sunday & Timezone Card */}
        <Card className="bg-white border border-slate-200/90 shadow-2xs rounded-xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-3.5 px-5">
            <CardTitle className="text-sm font-bold text-[#003D5C] flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#009D9E]" />
              Non-Working Day & Timezone Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Configured Office Timezone
                </Label>
                <Input
                  type="text"
                  placeholder="Asia/Karachi"
                  value={settings.timezone}
                  onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                  required
                  className="text-sm border-slate-200 font-mono"
                />
                <p className="text-[10px] text-slate-400">
                  e.g. Asia/Karachi, Australia/Melbourne, America/New_York
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-lg flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs shrink-0">
                  SUN
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Sunday Non-Working Day Rule</p>
                  <p className="text-[11px] text-slate-500">
                    Sundays are always treated as non-working days. Imported Excel records for Sundays are automatically skipped and tracked in the summary.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="submit"
            disabled={isSaving}
            className="bg-[#009D9E] hover:bg-[#007A7A] text-white px-7 py-3 font-bold uppercase tracking-wider text-xs gap-2 shadow-xs transition-colors"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Timing Policy Changes
          </Button>
        </div>
      </form>

      {/* Interactive Live Calculation Simulator */}
      <Card className="bg-[#001E2F] text-slate-100 rounded-xl border border-slate-800 shadow-md p-6 space-y-4 mt-8">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#81F5F5]" />
          <h3 className="font-['Montserrat'] text-base font-bold text-[#CAE6FF]">
            Live Rule Calculation Simulator
          </h3>
        </div>
        <p className="text-xs text-slate-300">
          Test any attendance time against the active rules to preview how the engine evaluates status and working duration.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
              Select Day
            </Label>
            <Select value={simDay} onValueChange={(val) => setSimDay((val as 'weekday' | 'saturday') || 'weekday')}>
              <SelectTrigger className="bg-slate-900 border-slate-700 text-xs text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekday">Monday – Friday</SelectItem>
                <SelectItem value="saturday">Saturday</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
              Test In Time
            </Label>
            <Input
              type="text"
              value={simInTime}
              onChange={(e) => setSimInTime(e.target.value)}
              placeholder="e.g. 10:42 AM"
              className="bg-slate-900 border-slate-700 text-xs text-slate-100 font-mono"
            />
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
              Test Out Time
            </Label>
            <Input
              type="text"
              value={simOutTime}
              onChange={(e) => setSimOutTime(e.target.value)}
              placeholder="e.g. 06:35 PM"
              className="bg-slate-900 border-slate-700 text-xs text-slate-100 font-mono"
            />
          </div>
        </div>

        {/* Simulator Results Output */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 grid grid-cols-3 gap-4 text-center mt-3">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Calculated Arrival</p>
            <p
              className={`text-sm font-extrabold mt-1 ${
                simArrivalStatus === 'On Time Arrival'
                  ? 'text-emerald-400'
                  : simArrivalStatus === 'Late Arrival'
                  ? 'text-amber-400'
                  : 'text-slate-400'
              }`}
            >
              {simArrivalStatus}
            </p>
          </div>

          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Calculated Departure</p>
            <p
              className={`text-sm font-extrabold mt-1 ${
                simDepartureStatus === 'On Time Departure'
                  ? 'text-emerald-400'
                  : simDepartureStatus === 'Early Departure'
                  ? 'text-rose-400'
                  : 'text-slate-400'
              }`}
            >
              {simDepartureStatus}
            </p>
          </div>

          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Calculated Duration</p>
            <p className="text-sm font-extrabold text-[#81F5F5] mt-1 font-mono">{simWorkingDuration}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
