'use client'

import React, { useEffect, useState, use, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Download,
  Edit2,
  Eye,
  Loader2,
  User,
  Building2,
  FileSpreadsheet,
  Banknote,
  Coins,
  Wallet,
  ShieldCheck,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AttendanceRecordWithEmployee,
  AttendanceSettings,
  Employee,
} from '@/lib/supabase/database.types'
import EditAttendanceModal from '@/components/attendance/edit-attendance-modal'
import ViewPunchesModal from '@/components/attendance/view-punches-modal'
import EmployeeCommissionModal from '@/components/attendance/employee-commission-modal'
import * as XLSX from 'xlsx'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function EmployeeDetailPage({ params }: PageProps) {
  const resolvedParams = use(params)
  const employeeId = resolvedParams.id

  const [employee, setEmployee] = useState<Employee | null>(null)
  const [records, setRecords] = useState<AttendanceRecordWithEmployee[]>([])
  const [settings, setSettings] = useState<AttendanceSettings | undefined>()
  const [isLoading, setIsLoading] = useState(true)

  // Monthly Commission & Month Selector
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-08')
  const [monthlyCommission, setMonthlyCommission] = useState<{ amount: number; notes: string }>({
    amount: 0,
    notes: '',
  })
  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false)

  // Filters
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [arrivalStatus, setArrivalStatus] = useState('all')

  // Summary Metrics
  const [summary, setSummary] = useState<{
    totalDays: number
    onTimeArrivals: number
    lateArrivals: number
    onTimeArrivalRate: number
    onTimeDepartures: number
    earlyDepartures: number
    onTimeDepartureRate: number
    totalWorkingMinutes: number
    formattedTotalHours: string
    requiredWorkingMinutes: number
    formattedRequiredHours: string
    differenceMinutes: number
    formattedDifference: string
    hoursCompletionRate: number
  }>({
    totalDays: 0,
    onTimeArrivals: 0,
    lateArrivals: 0,
    onTimeArrivalRate: 0,
    onTimeDepartures: 0,
    earlyDepartures: 0,
    onTimeDepartureRate: 0,
    totalWorkingMinutes: 0,
    formattedTotalHours: '0h 0m',
    requiredWorkingMinutes: 0,
    formattedRequiredHours: '0h 0m',
    differenceMinutes: 0,
    formattedDifference: '+0h 0m',
    hoursCompletionRate: 100,
  })

  // Gazetted Holidays State
  const [holidays, setHolidays] = useState<Record<string, string>>({})

  // Modals
  const [editingRecord, setEditingRecord] = useState<AttendanceRecordWithEmployee | null>(null)
  const [viewingPunchesRecord, setViewingPunchesRecord] = useState<AttendanceRecordWithEmployee | null>(null)

  const loadCommission = async (targetEmpId: string, monthStr: string) => {
    try {
      const res = await fetch(`/api/attendance/commissions?employeeId=${targetEmpId}&month=${monthStr}`)
      const data = await res.json()
      if (data.success && data.commission) {
        setMonthlyCommission({
          amount: Number(data.commission.amount) || 0,
          notes: data.commission.notes || '',
        })
      } else {
        setMonthlyCommission({ amount: 0, notes: '' })
      }
    } catch (e) {
      console.error('Failed to load commission:', e)
    }
  }

  const loadData = async () => {
    try {
      setIsLoading(true)

      // Fetch employee info, settings, and holidays in parallel
      const [empRes, settRes, holRes] = await Promise.all([
        fetch('/api/attendance/employees'),
        fetch('/api/attendance/settings'),
        fetch('/api/attendance/holidays'),
      ])

      const empData = await empRes.json()
      let currentEmp: Employee | null = null
      if (empData.success && empData.employees) {
        const found = empData.employees.find(
          (e: Employee) => e.id === employeeId || e.employee_id === employeeId
        )
        if (found) {
          currentEmp = found
          setEmployee(found)
        }
      }

      const settData = await settRes.json()
      if (settData.success && settData.settings) setSettings(settData.settings)

      const holData = await holRes.json()
      const holMap: Record<string, string> = holData.success && holData.holidays ? holData.holidays : {}
      setHolidays(holMap)

      // Fetch employee records
      const queryParams = new URLSearchParams()
      queryParams.set('employeeId', employeeId)
      if (startDate) queryParams.set('startDate', startDate)
      if (endDate) queryParams.set('endDate', endDate)
      if (arrivalStatus && arrivalStatus !== 'all') queryParams.set('arrivalStatus', arrivalStatus)
      queryParams.set('pageSize', '1000')

      const recordsRes = await fetch(`/api/attendance/records?${queryParams.toString()}`)
      const recordsData = await recordsRes.json()
      const fetchedRecords: AttendanceRecordWithEmployee[] =
        recordsData.success && recordsData.records ? recordsData.records : []

      // If user selected a date range (startDate to endDate), generate full list of days in range:
      if (startDate && endDate) {
        const sParts = startDate.split('-').map(Number)
        const eParts = endDate.split('-').map(Number)

        if (sParts.length === 3 && eParts.length === 3) {
          const cur = new Date(sParts[0], sParts[1] - 1, sParts[2], 12, 0, 0)
          const end = new Date(eParts[0], eParts[1] - 1, eParts[2], 12, 0, 0)

          const recordsByDate = new Map<string, AttendanceRecordWithEmployee>()
          fetchedRecords.forEach((r) => {
            if (r.attendance_date) {
              recordsByDate.set(r.attendance_date.split('T')[0], r)
            }
          })

          const fullGridRows: AttendanceRecordWithEmployee[] = []

          while (cur <= end) {
            const year = cur.getFullYear()
            const month = String(cur.getMonth() + 1).padStart(2, '0')
            const day = String(cur.getDate()).padStart(2, '0')
            const dStr = `${year}-${month}-${day}`

            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
            const dayName = dayNames[cur.getDay()]
            const isSunday = cur.getDay() === 0
            const isGazettedHoliday = Boolean(holMap[dStr])

            const existing = recordsByDate.get(dStr)

            if (existing) {
              fullGridRows.push(existing)
            } else if (isSunday || isGazettedHoliday) {
              fullGridRows.push({
                id: `holiday-${dStr}`,
                employee_id: currentEmp?.id || employeeId,
                attendance_date: dStr,
                day_of_week: dayName,
                in_time: null,
                out_time: null,
                arrival_status: isGazettedHoliday ? 'Gazetted Holiday' : 'Holiday',
                departure_status: isGazettedHoliday ? (holMap[dStr] ? `Gazetted Holiday (${holMap[dStr]})` : 'Gazetted Holiday') : 'Sunday Holiday',
                total_working_minutes: 0,
                total_working_hours_formatted: '00:00',
                raw_punches: [],
                notes: isGazettedHoliday ? `Gazetted Holiday: ${holMap[dStr]}` : 'Sunday Holiday',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                employee: currentEmp || undefined,
              } as any)
            } else {
              fullGridRows.push({
                id: `absent-${dStr}`,
                employee_id: currentEmp?.id || employeeId,
                attendance_date: dStr,
                day_of_week: dayName,
                in_time: null,
                out_time: null,
                arrival_status: 'Absent',
                departure_status: 'Absent',
                total_working_minutes: 0,
                total_working_hours_formatted: '00:00',
                raw_punches: [],
                notes: 'Absent (No punches recorded)',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                employee: currentEmp || undefined,
              } as any)
            }

            cur.setDate(cur.getDate() + 1)
          }

          // Sort descending (newest date first)
          fullGridRows.sort((a, b) => b.attendance_date.localeCompare(a.attendance_date))

          // Filter by arrival status if selected
          let displayRows = fullGridRows
          if (arrivalStatus && arrivalStatus !== 'all') {
            displayRows = fullGridRows.filter((r) => r.arrival_status === arrivalStatus)
          }

          setRecords(displayRows)
        } else {
          setRecords(fetchedRecords)
        }
      } else {
        setRecords(fetchedRecords)
      }

      // Fetch summary
      const summaryParams = new URLSearchParams()
      summaryParams.set('employeeId', employeeId)
      if (startDate) summaryParams.set('startDate', startDate)
      if (endDate) summaryParams.set('endDate', endDate)
      summaryParams.set('mode', 'summary')

      const summaryRes = await fetch(`/api/attendance/records?${summaryParams.toString()}`)
      const summaryData = await summaryRes.json()
      if (summaryData.success && summaryData.summary) {
        setSummary(summaryData.summary)
      }

      // Load monthly commission
      await loadCommission(employeeId, selectedMonth)
    } catch (err) {
      console.error('Error loading employee details:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [employeeId, startDate, endDate, arrivalStatus, selectedMonth])

  const handleExportExcel = () => {
    if (records.length === 0) {
      alert('No attendance records to export.')
      return
    }

    const exportRows = records.map((r) => ({
      Date: r.attendance_date,
      Day: r.day_of_week,
      'In Time': r.in_time || '',
      'Arrival Status': r.arrival_status,
      'Out Time': r.out_time || '',
      'Departure Status': r.departure_status,
      'Working Duration': r.total_working_hours_formatted || '',
    }))

    const ws = XLSX.utils.json_to_sheet(exportRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `${employee?.name || 'Attendance'}`)
    XLSX.writeFile(wb, `${employee?.name || 'Employee'}_Attendance_History.xlsx`)
  }

  // Calculate attendance status breakdown & earned salary (including monthly commission)
  const salaryStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    let presentDays = 0
    let leaveDays = 0
    let holidayDays = 0
    let absentDays = 0

    records.forEach((r) => {
      const isSunday = (r.day_of_week || '').toLowerCase() === 'sunday'
      const isGazettedHoliday = Boolean(r.attendance_date && holidays[r.attendance_date.split('T')[0]])
      const isHoliday = isSunday || isGazettedHoliday || r.arrival_status === 'Holiday' || r.arrival_status === 'Gazetted Holiday'

      const isLeave =
        r.arrival_status === 'Leave' ||
        (r.departure_status || '').includes('Leave') ||
        ['Sick Leave', 'Casual Leave', 'Annual Leave', 'Probation Leave', 'Gazetted Leave'].includes(r.departure_status as any) ||
        ['Sick Leave', 'Casual Leave', 'Annual Leave', 'Probation Leave', 'Gazetted Leave'].includes(r.arrival_status as any)

      const hasPunches =
        Boolean(r.in_time && r.in_time !== '---') ||
        Boolean(r.out_time && r.out_time !== '---') ||
        (r.total_working_minutes ? r.total_working_minutes > 0 : false)

      const isExplicitAbsent =
        r.arrival_status === 'Absent' ||
        r.departure_status === 'Absent' ||
        (!hasPunches && !isLeave && !isHoliday)

      if (isLeave) {
        leaveDays++
      } else if (hasPunches) {
        presentDays++
      } else if (isHoliday) {
        holidayDays++
      } else if (isExplicitAbsent) {
        if (r.attendance_date && r.attendance_date <= todayStr) {
          absentDays++
        }
      }
    })

    const baseSalary = employee?.salary ? Number(employee.salary) : null
    const commissionAmount = monthlyCommission.amount || 0
    const totalEarnedSalary = baseSalary !== null ? baseSalary + commissionAmount : commissionAmount > 0 ? commissionAmount : null

    return {
      presentDays,
      leaveDays,
      holidayDays,
      absentDays,
      baseSalary,
      commissionAmount,
      totalEarnedSalary,
      hasSalaryConfigured: (baseSalary !== null && baseSalary > 0) || commissionAmount > 0,
      isFullSalaryPayable: absentDays === 0 && ((baseSalary !== null && baseSalary > 0) || commissionAmount > 0),
      hasAbsents: absentDays > 0,
    }
  }, [records, employee, holidays, monthlyCommission])

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Back Button */}
      <div>
        <Link
          href="/attendance/employees"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#003D5C] transition-colors uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Employees
        </Link>
      </div>

      {/* Employee Profile Header Card */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#001E2F] text-[#81F5F5] font-extrabold text-2xl flex items-center justify-center shadow-xs">
            {employee?.name?.charAt(0) || 'E'}
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="font-['Montserrat'] text-2xl font-extrabold text-[#003D5C] tracking-tight">
                {employee?.name || 'Employee'}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#009D9E]/10 text-[#009D9E]">
                {employee?.employee_id || 'N/A'}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                  (employee?.branch || '').toLowerCase() === 'lahore'
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : (employee?.branch || '').toLowerCase() === 'onshore'
                    ? 'bg-teal-100 text-teal-800 border border-teal-200'
                    : (employee?.branch || '').toLowerCase() === 'aimt'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                }`}
              >
                {employee?.branch || 'Multan'} Branch
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-500 mt-0.5">
              {(employee?.designation || 'Staff')
                .replace(/[–—\-]\s*(Multan|Lahore)(\s+Office)?/gi, '')
                .replace(/\s*(Multan|Lahore)\s*Office/gi, '')
                .trim()}
              {employee?.joining_date
                ? ` • Joined: ${new Date(employee.joining_date).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}`
                : ''}
              {employee?.salary ? ` • Salary: PKR ${Number(employee.salary).toLocaleString()}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleExportExcel}
            className="text-xs font-bold uppercase tracking-wider text-slate-700 border-slate-300 gap-1.5"
          >
            <Download className="w-4 h-4 text-[#009D9E]" />
            Export History
          </Button>

          <Link href="/attendance/import">
            <Button className="bg-[#009D9E] hover:bg-[#007A7A] text-white text-xs font-bold uppercase tracking-wider gap-1.5">
              <FileSpreadsheet className="w-4 h-4" />
              Import Excel
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Summary Bento Grid (8 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* 1. Total Working Days */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Days</p>
          <p className="text-2xl font-extrabold text-[#003D5C] mt-1">{summary.totalDays}</p>
          <p className="text-[11px] text-slate-400 mt-1">Recorded days</p>
        </div>

        {/* 2. On-Time Arrival */}
        <div className="bg-white border border-emerald-200/80 rounded-xl p-4 shadow-2xs bg-emerald-50/10">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">On Time Arrival</p>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">{summary.onTimeArrivals}</p>
          <p className="text-[11px] text-emerald-700 font-semibold mt-1">{summary.onTimeArrivalRate}% rate</p>
        </div>

        {/* 3. Late Arrival */}
        <div className="bg-white border border-amber-200/80 rounded-xl p-4 shadow-2xs bg-amber-50/10">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Late Arrivals</p>
          <p className="text-2xl font-extrabold text-amber-600 mt-1">{summary.lateArrivals}</p>
          <p className="text-[11px] text-amber-700 font-semibold mt-1">After cutoff</p>
        </div>

        {/* 4. On-Time Departure */}
        <div className="bg-white border border-emerald-200/80 rounded-xl p-4 shadow-2xs bg-emerald-50/10">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">On Time Departure</p>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">{summary.onTimeDepartures}</p>
          <p className="text-[11px] text-emerald-700 font-semibold mt-1">{summary.onTimeDepartureRate}% rate</p>
        </div>

        {/* 5. Early Departure */}
        <div className="bg-white border border-rose-200/80 rounded-xl p-4 shadow-2xs bg-rose-50/10">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Early Departure</p>
          <p className="text-2xl font-extrabold text-rose-600 mt-1">{summary.earlyDepartures}</p>
          <p className="text-[11px] text-rose-700 font-semibold mt-1">Left early</p>
        </div>

        {/* 6. Hours Required */}
        <div className="bg-white border border-blue-200/80 rounded-xl p-4 shadow-2xs bg-blue-50/15">
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Hours Required</p>
          <p className="text-2xl font-extrabold text-blue-900 mt-1 font-mono">
            {summary.formattedRequiredHours}
          </p>
          <p className="text-[11px] text-blue-600/80 font-medium mt-1">Excl. Leaves & Holidays</p>
        </div>

        {/* 7. Total Hours */}
        <div
          className={`bg-white border rounded-xl p-4 shadow-2xs transition-all ${
            summary.differenceMinutes >= 0
              ? 'border-emerald-200/80 bg-emerald-50/20'
              : 'border-amber-200/80 bg-amber-50/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Hours</p>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                summary.differenceMinutes >= 0
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {summary.formattedDifference}
            </span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">
            {summary.formattedTotalHours}
          </p>
          <p
            className={`text-[11px] font-semibold mt-1 ${
              summary.hoursCompletionRate >= 100 ? 'text-emerald-700' : 'text-amber-700'
            }`}
          >
            {summary.hoursCompletionRate}% completed
          </p>
        </div>

        {/* 8. Earned / Payable Salary Card */}
        <div
          className={`bg-white border rounded-xl p-4 shadow-2xs transition-all ${
            salaryStats.isFullSalaryPayable
              ? 'border-emerald-200/80 bg-emerald-50/20'
              : salaryStats.hasAbsents
              ? 'border-rose-200/80 bg-rose-50/15'
              : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Earned Salary</p>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                salaryStats.isFullSalaryPayable
                  ? 'bg-emerald-100 text-emerald-800'
                  : salaryStats.hasAbsents
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {salaryStats.isFullSalaryPayable ? '100% Payable' : salaryStats.hasAbsents ? 'On Hold' : 'Not Set'}
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1 font-mono tracking-tight truncate">
            {salaryStats.isFullSalaryPayable
              ? `PKR ${salaryStats.totalEarnedSalary?.toLocaleString()}`
              : salaryStats.hasAbsents
              ? '--'
              : 'Not Set'}
          </p>
          <p
            className={`text-[11px] font-semibold mt-1 truncate ${
              salaryStats.isFullSalaryPayable
                ? 'text-emerald-700'
                : salaryStats.hasAbsents
                ? 'text-amber-700'
                : 'text-slate-400'
            }`}
          >
            {salaryStats.isFullSalaryPayable
              ? salaryStats.commissionAmount > 0
                ? `Includes PKR ${salaryStats.commissionAmount.toLocaleString()} commission • 0 Absents`
                : '0 Absents • Full Base Salary'
              : salaryStats.hasAbsents
              ? `${salaryStats.absentDays} Absent(s) • Pending`
              : 'Salary not configured'}
          </p>
        </div>
      </div>

      {/* Dedicated Salary & Attendance Section (with Month Selection & Commission) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-3 flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#003D5C] text-[#81F5F5] flex items-center justify-center font-bold shadow-2xs">
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-['Montserrat'] text-sm sm:text-base font-bold text-[#003D5C] tracking-tight">
                  Salary & Commission Status
                </h3>
                <p className="text-xs text-slate-500">
                  Monthly payable earnings including attendance & custom commission.
                </p>
              </div>
            </div>

            {/* Month Filter Selector for Salary & Commission */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Month:</span>
              <Select
                value={selectedMonth}
                onValueChange={(val) => {
                  if (val) {
                    setSelectedMonth(val)
                    const [y, m] = val.split('-')
                    const lastDay = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate()
                    setStartDate(`${val}-01`)
                    setEndDate(`${val}-${String(lastDay).padStart(2, '0')}`)
                  }
                }}
              >
                <SelectTrigger className="h-8 text-xs font-bold text-[#003D5C] bg-slate-50 border-slate-200 min-w-36">
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2026-08" className="text-xs font-medium">August 2026</SelectItem>
                  <SelectItem value="2026-09" className="text-xs font-medium">September 2026</SelectItem>
                  <SelectItem value="2026-10" className="text-xs font-medium">October 2026</SelectItem>
                  <SelectItem value="2026-11" className="text-xs font-medium">November 2026</SelectItem>
                  <SelectItem value="2026-12" className="text-xs font-medium">December 2026</SelectItem>
                  <SelectItem value="2026-07" className="text-xs font-medium">July 2026</SelectItem>
                  <SelectItem value="2026-06" className="text-xs font-medium">June 2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quick Metrics Badges & Commission Button */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
              Base Salary: <strong className="text-slate-900 font-mono">{salaryStats.baseSalary ? `PKR ${salaryStats.baseSalary.toLocaleString()}` : 'Not Configured'}</strong>
            </span>

            {/* Monthly Commission Badge + Action Button */}
            <div className="flex items-center gap-1.5">
              <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 text-xs font-semibold border border-amber-200/90 flex items-center gap-1.5 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Commission:{' '}
                <strong className="font-mono text-amber-950 font-bold">
                  {salaryStats.commissionAmount > 0
                    ? `+ PKR ${salaryStats.commissionAmount.toLocaleString()}`
                    : 'PKR 0'}
                </strong>
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCommissionModalOpen(true)}
                className="h-7 px-2.5 text-xs font-bold text-amber-800 bg-amber-50/60 border-amber-300 hover:bg-amber-100 hover:text-amber-950 gap-1 rounded-lg shadow-2xs transition-colors"
                title="Add or update monthly commission for this employee"
              >
                <Sparkles className="w-3 h-3 text-amber-600" />
                <span>{salaryStats.commissionAmount > 0 ? 'Edit' : 'Add Commission'}</span>
              </Button>
            </div>

            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
              Attended: <strong className="font-mono">{salaryStats.presentDays} Days</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 text-xs font-semibold border border-indigo-200">
              Approved Leaves: <strong className="font-mono">{salaryStats.leaveDays} Days</strong>
            </span>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
              salaryStats.absentDays > 0
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}>
              Absents: <strong className="font-mono">{salaryStats.absentDays} Days</strong>
            </span>
          </div>
        </div>

        {/* Right Status Banner */}
        <div className="lg:text-right border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6 shrink-0 min-w-56">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Total Net Payable Salary
          </p>
          {salaryStats.isFullSalaryPayable ? (
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono tracking-tight mt-0.5">
                PKR {salaryStats.totalEarnedSalary?.toLocaleString()}
              </p>
              <div className="flex items-center lg:justify-end gap-1.5 text-xs text-emerald-700 font-bold mt-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {salaryStats.commissionAmount > 0
                    ? `Base (${salaryStats.baseSalary?.toLocaleString()}) + Comm (${salaryStats.commissionAmount.toLocaleString()})`
                    : 'Full Base Salary (0 Absents)'}
                </span>
              </div>
            </div>
          ) : salaryStats.hasAbsents ? (
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-amber-600 font-mono tracking-tight mt-0.5">
                -- <span className="text-sm font-sans font-bold text-amber-700">(On Hold)</span>
              </p>
              <div className="flex items-center lg:justify-end gap-1.5 text-xs text-amber-700 font-bold mt-1">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{salaryStats.absentDays} Absent Day(s) — Calculation Pending</span>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-lg font-bold text-slate-500 mt-1">
                Salary Not Set
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure salary in employee profile
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">From Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs border-slate-200"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">To Date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs border-slate-200"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Status</label>
            <Select value={arrivalStatus} onValueChange={(val) => setArrivalStatus(val || 'all')}>
              <SelectTrigger className="text-xs border-slate-200 min-w-36">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="On Time Arrival">On Time Arrival</SelectItem>
                <SelectItem value="Late Arrival">Late Arrival</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {(startDate || endDate || arrivalStatus !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStartDate('')
              setEndDate('')
              setArrivalStatus('all')
            }}
            className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-semibold self-end"
          >
            Reset Filters
          </Button>
        )}
      </div>

      {/* Daily Attendance History Table */}
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-['Montserrat'] text-sm font-bold text-[#003D5C]">
            Daily Attendance Records
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Day</th>
                <th className="py-3 px-4">In Time</th>
                <th className="py-3 px-4">Arrival Status</th>
                <th className="py-3 px-4">Out Time</th>
                <th className="py-3 px-4">Departure Status</th>
                <th className="py-3 px-4">Working Time</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#009D9E]" />
                    Loading attendance history...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No attendance records found for this employee matching active filters.
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Date */}
                    <td className="py-3.5 px-4 font-bold text-slate-900">{record.attendance_date}</td>

                    {/* Day */}
                    <td className="py-3.5 px-4 font-medium text-slate-500">{record.day_of_week}</td>

                    {/* In Time */}
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                      {record.in_time || '--'}
                    </td>

                    {/* Arrival Status */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                            record.arrival_status === 'Holiday'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : record.arrival_status === 'Absent'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : record.arrival_status === 'Leave' || record.arrival_status?.toLowerCase().includes('leave')
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : record.arrival_status === 'On Time Arrival'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              : record.arrival_status === 'Late Arrival'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {record.arrival_status}
                        </span>
                        {(record.departure_status === 'Work From Home' ||
                          record.arrival_status === 'Work From Home' ||
                          record.notes?.includes('Work From Home')) && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-cyan-100 text-cyan-800 border border-cyan-300">
                            WFH
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Out Time */}
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                      {record.out_time || '--'}
                    </td>

                    {/* Departure Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                          record.departure_status === 'Holiday' || record.departure_status?.includes('Holiday')
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : record.departure_status === 'Absent'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : record.departure_status?.toLowerCase().includes('leave')
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : record.departure_status === 'On Time Departure'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : record.departure_status === 'Early Departure'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {record.departure_status}
                      </span>
                    </td>

                    {/* Working Time */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {record.total_working_hours_formatted || '--'}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingPunchesRecord(record)}
                        title="View Raw Punches"
                        className="h-8 w-8 p-0 text-slate-500 hover:text-[#009D9E] hover:bg-[#009D9E]/10"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      {record.day_of_week !== 'Sunday' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingRecord(record)}
                          title="Edit Attendance"
                          className="h-8 w-8 p-0 text-slate-500 hover:text-[#003D5C] hover:bg-slate-100"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      <EditAttendanceModal
        isOpen={!!editingRecord}
        onClose={() => setEditingRecord(null)}
        record={editingRecord}
        onSaveSuccess={() => loadData()}
        settings={settings}
      />

      {/* View Punches Modal */}
      <ViewPunchesModal
        isOpen={!!viewingPunchesRecord}
        onClose={() => setViewingPunchesRecord(null)}
        record={viewingPunchesRecord}
      />

      {/* Monthly Commission Modal */}
      <EmployeeCommissionModal
        isOpen={isCommissionModalOpen}
        onClose={() => setIsCommissionModalOpen(false)}
        employee={employee}
        month={selectedMonth}
        currentCommission={monthlyCommission.amount}
        currentNotes={monthlyCommission.notes}
        onSaveSuccess={({ amount, notes }) => {
          setMonthlyCommission({ amount, notes })
        }}
      />
    </div>
  )
}
