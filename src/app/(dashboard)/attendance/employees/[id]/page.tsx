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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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

const MONTH_OPTIONS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
]

const YEAR_OPTIONS = ['2024', '2025', '2026', '2027', '2028', '2029', '2030']

interface PageProps {
  params: Promise<{ id: string }>
}

export default function EmployeeDetailPage({ params }: PageProps) {
  const resolvedParams = use(params)
  const employeeId = resolvedParams.id

  const [employee, setEmployee] = useState<Employee | null>(null)
  const [records, setRecords] = useState<AttendanceRecordWithEmployee[]>([])
  const [fullMonthRecords, setFullMonthRecords] = useState<AttendanceRecordWithEmployee[]>([])
  const [settings, setSettings] = useState<AttendanceSettings | undefined>()
  const [isLoading, setIsLoading] = useState(true)

  // Monthly Commission & Month Selector
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-08')
  const [monthlyCommission, setMonthlyCommission] = useState<{ amount: number; notes: string }>({
    amount: 0,
    notes: '',
  })
  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false)

  // Filters & Sorting
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [arrivalStatus, setArrivalStatus] = useState('all')
  const [dateSortOrder, setDateSortOrder] = useState<'asc' | 'desc'>('asc')

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

      // Calculate the start and end of the entire selected month
      const [y, m] = selectedMonth.split('-').map(Number)
      const lastDay = new Date(y, m, 0).getDate()
      const monthStart = `${selectedMonth}-01`
      const monthEnd = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`

      // Active date range (defaults to full month)
      const activeStart = startDate || monthStart
      const activeEnd = endDate || monthEnd

      // Fetch employee records for the ENTIRE month
      const queryParams = new URLSearchParams()
      queryParams.set('employeeId', employeeId)
      queryParams.set('startDate', monthStart)
      queryParams.set('endDate', monthEnd)
      queryParams.set('pageSize', '1000')

      const recordsRes = await fetch(`/api/attendance/records?${queryParams.toString()}`)
      const recordsData = await recordsRes.json()
      const fetchedRecords: AttendanceRecordWithEmployee[] =
        recordsData.success && recordsData.records ? recordsData.records : []

      // Generate full calendar grid for the entire month
      const sParts = monthStart.split('-').map(Number)
      const eParts = monthEnd.split('-').map(Number)
      const cur = new Date(sParts[0], sParts[1] - 1, sParts[2], 12, 0, 0)
      const end = new Date(eParts[0], eParts[1] - 1, eParts[2], 12, 0, 0)

      const recordsByDate = new Map<string, AttendanceRecordWithEmployee>()
      fetchedRecords.forEach((r) => {
        if (r.attendance_date) {
          recordsByDate.set(r.attendance_date.split('T')[0], r)
        }
      })

      const fullGridRows: AttendanceRecordWithEmployee[] = []

      const now = new Date()
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

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

        const hasPunches =
          Boolean(existing?.in_time && existing.in_time !== '---') ||
          Boolean(existing?.out_time && existing.out_time !== '---') ||
          (existing?.total_working_minutes ? existing.total_working_minutes > 0 : false)

        const isExplicitLeaveOrWfh =
          existing?.arrival_status === 'Leave' ||
          existing?.arrival_status === 'Work From Home' ||
          existing?.departure_status === 'Work From Home' ||
          existing?.notes?.includes('Work From Home') ||
          ['Sick Leave', 'Casual Leave', 'Annual Leave', 'Probation Leave', 'Gazetted Leave', 'Half Day'].includes(existing?.departure_status as any) ||
          ['Sick Leave', 'Casual Leave', 'Annual Leave', 'Probation Leave', 'Gazetted Leave', 'Half Day'].includes(existing?.arrival_status as any)

        if (existing) {
          if (isGazettedHoliday && !hasPunches && !isExplicitLeaveOrWfh) {
            fullGridRows.push({
              ...existing,
              arrival_status: 'Gazetted Holiday',
              departure_status: holMap[dStr] ? `Gazetted Holiday (${holMap[dStr]})` : 'Gazetted Holiday',
              total_working_minutes: 0,
              total_working_hours_formatted: '00:00',
            })
          } else if (isSunday && !hasPunches && !isExplicitLeaveOrWfh) {
            fullGridRows.push({
              ...existing,
              arrival_status: 'Holiday',
              departure_status: 'Sunday Holiday',
              total_working_minutes: 0,
              total_working_hours_formatted: '00:00',
            })
          } else {
            fullGridRows.push(existing)
          }
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
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            employee: currentEmp || undefined,
          } as any)
        } else if (dStr >= todayStr) {
          fullGridRows.push({
            id: `future-${dStr}`,
            employee_id: currentEmp?.id || employeeId,
            attendance_date: dStr,
            day_of_week: dayName,
            in_time: null,
            out_time: null,
            arrival_status: '--',
            departure_status: '--',
            total_working_minutes: 0,
            total_working_hours_formatted: '--',
            raw_punches: [],
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
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            employee: currentEmp || undefined,
          } as any)
        }

        cur.setDate(cur.getDate() + 1)
      }

      setFullMonthRecords(fullGridRows)

      // Filter rows to the active date range for table view
      let displayRows = fullGridRows.filter((r) => {
        const d = r.attendance_date?.split('T')[0]
        return d && d >= activeStart && d <= activeEnd
      })

      // Sort based on dateSortOrder (asc = 1st date at top, desc = newest date at top)
      if (dateSortOrder === 'asc') {
        displayRows.sort((a, b) => a.attendance_date.localeCompare(b.attendance_date))
      } else {
        displayRows.sort((a, b) => b.attendance_date.localeCompare(a.attendance_date))
      }

      // Filter by arrival status if selected
      if (arrivalStatus && arrivalStatus !== 'all') {
        displayRows = displayRows.filter((r) => {
          if (arrivalStatus === 'Absent') return r.arrival_status === 'Absent' || r.departure_status === 'Absent'
          if (arrivalStatus === 'Leave') return r.arrival_status === 'Leave' || (r.departure_status || '').includes('Leave')
          if (arrivalStatus === 'Work From Home') return r.arrival_status === 'Work From Home' || r.departure_status === 'Work From Home'
          return r.arrival_status === arrivalStatus
        })
      }

      setRecords(displayRows)

      // Fetch summary for the active date range
      const summaryParams = new URLSearchParams()
      summaryParams.set('employeeId', employeeId)
      summaryParams.set('startDate', activeStart)
      summaryParams.set('endDate', activeEnd)
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
  }, [employeeId, startDate, endDate, arrivalStatus, selectedMonth, dateSortOrder])

  const toggleDateSortOrder = () => {
    const nextOrder = dateSortOrder === 'asc' ? 'desc' : 'asc'
    setDateSortOrder(nextOrder)
    setRecords((prev) => {
      const copy = [...prev]
      if (nextOrder === 'asc') {
        copy.sort((a, b) => a.attendance_date.localeCompare(b.attendance_date))
      } else {
        copy.sort((a, b) => b.attendance_date.localeCompare(a.attendance_date))
      }
      return copy
    })
  }

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

  // Calculate attendance status breakdown & earned salary (including monthly commission, leave rules, WFH, and absent deductions)
  const salaryStats = useMemo(() => {
    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    const getStats = (list: typeof records) => {
      let present = 0
      let wfh = 0
      let leave = 0
      let holiday = 0
      let absent = 0
      let future = 0

      list.forEach((r) => {
        const isSunday = (r.day_of_week || '').toLowerCase() === 'sunday'
        const isGazettedHoliday = Boolean(r.attendance_date && holidays[r.attendance_date.split('T')[0]])
        const hasPunches =
          Boolean(r.in_time && r.in_time !== '---') ||
          Boolean(r.out_time && r.out_time !== '---') ||
          (r.total_working_minutes ? r.total_working_minutes > 0 : false)

        const isHoliday =
          (isSunday && !hasPunches) ||
          (isGazettedHoliday && !hasPunches) ||
          r.arrival_status === 'Holiday' ||
          r.arrival_status === 'Gazetted Holiday' ||
          r.arrival_status?.toLowerCase().includes('holiday') ||
          r.departure_status === 'Holiday' ||
          r.departure_status === 'Gazetted Holiday' ||
          r.departure_status?.toLowerCase().includes('holiday')

        const isWfh =
          r.departure_status === 'Work From Home' ||
          r.arrival_status === 'Work From Home' ||
          r.notes?.includes('Work From Home')

        const isLeave =
          r.arrival_status === 'Leave' ||
          (r.departure_status || '').includes('Leave') ||
          ['Sick Leave', 'Casual Leave', 'Annual Leave', 'Probation Leave', 'Gazetted Leave', 'Half Day'].includes(r.departure_status as any) ||
          ['Sick Leave', 'Casual Leave', 'Annual Leave', 'Probation Leave', 'Gazetted Leave', 'Half Day'].includes(r.arrival_status as any)

        const isNeutralPlaceholder = r.arrival_status === '--' || r.departure_status === '--'

        if (isHoliday) {
          holiday++
        } else if (isWfh) {
          wfh++
          present++
        } else if (isLeave) {
          leave++
        } else if (hasPunches) {
          present++
        } else if (isNeutralPlaceholder || (r.attendance_date && r.attendance_date >= todayStr)) {
          future++
        } else {
          absent++
        }
      })

      const totalDays = list.length
      const totalWorkingDays = Math.max(0, totalDays - holiday)
      const paidDays = present + wfh + leave

      return {
        present,
        wfh,
        leave,
        holiday,
        absent,
        future,
        totalDays,
        totalWorkingDays,
        paidDays,
      }
    }

    // 1. Full Month Statistics (to determine stable Daily Rate across full month total days)
    const fullMonthStats = getStats(fullMonthRecords.length > 0 ? fullMonthRecords : records)

    // 2. Active date range statistics
    const activeStart = startDate || (fullMonthRecords[0]?.attendance_date?.split('T')[0]) || `${selectedMonth}-01`
    const activeEnd = endDate || (fullMonthRecords[fullMonthRecords.length - 1]?.attendance_date?.split('T')[0]) || `${selectedMonth}-31`

    const rangeList = fullMonthRecords.length > 0
      ? fullMonthRecords.filter((r) => {
          const d = r.attendance_date?.split('T')[0]
          return d && d >= activeStart && d <= activeEnd
        })
      : records

    const rangeStats = getStats(rangeList)

    const baseSalary = employee?.salary ? Number(employee.salary) : null
    const commissionAmount = monthlyCommission.amount || 0
    const grossMonthlySalary = baseSalary !== null ? baseSalary + commissionAmount : commissionAmount > 0 ? commissionAmount : 0

    // Daily Rate = Base Salary / Total Days of the ENTIRE Month (e.g. 31 days in August)
    const monthTotalDays = fullMonthStats.totalDays > 0 ? fullMonthStats.totalDays : 31
    const perDaySalary = monthTotalDays > 0 && baseSalary !== null && baseSalary > 0
      ? baseSalary / monthTotalDays
      : 0

    // Paid Days in active range = Total days - Absent days
    const absentDays = rangeStats.absent
    const paidDays = Math.max(0, rangeStats.totalDays - absentDays)
    const absentDeduction = Math.round(absentDays * perDaySalary)

    // Earned Base Salary = Base Salary - Absent Deduction
    const earnedBaseSalary = baseSalary !== null ? Math.max(0, Math.round(baseSalary - absentDeduction)) : 0
    // Total Earned Salary = Earned Base Salary + Full Commission
    const totalEarnedSalary = earnedBaseSalary + commissionAmount

    const hasSalaryConfigured = (baseSalary !== null && baseSalary > 0) || commissionAmount > 0

    return {
      presentDays: rangeStats.present,
      wfhDays: rangeStats.wfh,
      leaveDays: rangeStats.leave,
      holidayDays: rangeStats.holiday,
      absentDays: rangeStats.absent,
      futureDays: rangeStats.future,
      paidDays,
      totalDaysInMonth: rangeStats.totalDays,
      totalWorkingDays: rangeStats.totalWorkingDays,
      monthTotalDays,
      baseSalary,
      commissionAmount,
      grossMonthlySalary,
      perDaySalary: Math.round(perDaySalary),
      absentDeduction,
      totalEarnedSalary,
      hasSalaryConfigured,
      isFullSalaryPayable: rangeStats.absent === 0 && rangeStats.future === 0 && hasSalaryConfigured,
      hasAbsents: rangeStats.absent > 0,
    }
  }, [fullMonthRecords, records, employee, holidays, monthlyCommission, startDate, endDate, selectedMonth])

  return (
    <div className="space-y-6 max-w-full mx-auto font-sans">
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
      <Card className="p-6 shadow-2xs border-slate-200/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#001E2F] text-[#81F5F5] font-extrabold text-2xl flex items-center justify-center shadow-xs">
            {employee?.name?.charAt(0) || 'E'}
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-extrabold text-[#003D5C] tracking-tight">
                {employee?.name || 'Employee'}
              </h2>
              <Badge variant="outline" className="font-mono text-xs font-bold bg-[#009D9E]/10 text-[#009D9E] border-[#009D9E]/30">
                {employee?.employee_id || 'N/A'}
              </Badge>
              <Badge
                variant={
                  (employee?.branch || '').toLowerCase() === 'lahore'
                    ? 'purple'
                    : (employee?.branch || '').toLowerCase() === 'onshore'
                    ? 'info'
                    : (employee?.branch || '').toLowerCase() === 'aimt'
                    ? 'warning'
                    : 'info'
                }
                className="text-xs font-bold"
              >
                {employee?.branch || 'Multan'} Branch
              </Badge>
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
      </Card>

      {/* Metrics Summary Bento Grid (Spacious & Clean 2-Tier Layout) */}
      <div className="space-y-3.5">
        {/* Tier 1: Core Attendance & Salary Status (5 Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* 1. Monthly Total Days */}
          <Card className="p-4 bg-white shadow-2xs border-slate-200/90 rounded-xl hover:shadow-xs transition-shadow flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Monthly Total Days</p>
              <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-600">
                <Calendar className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-3xl sm:text-4xl font-black text-[#003D5C] font-mono tracking-tight my-2">
              {salaryStats.monthTotalDays}
            </p>
            <p className="text-xs text-slate-400 font-medium">Calendar days in month</p>
          </Card>

          {/* 2. Present Days */}
          <Card className="p-4 bg-blue-50/20 shadow-2xs border-blue-200/80 rounded-xl hover:shadow-xs transition-shadow flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Present Days</p>
              <div className="w-6 h-6 rounded-md bg-blue-100/80 flex items-center justify-center text-blue-700">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-3xl sm:text-4xl font-black text-blue-900 font-mono tracking-tight my-2">
              {salaryStats.presentDays}
            </p>
            <p className="text-xs text-blue-600/80 font-medium">Days attended / WFH</p>
          </Card>

          {/* 3. Absents */}
          <Card className="p-4 bg-rose-50/20 shadow-2xs border-rose-200/80 rounded-xl hover:shadow-xs transition-shadow flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600">Absents</p>
              <div className="w-6 h-6 rounded-md bg-rose-100/80 flex items-center justify-center text-rose-600">
                <AlertCircle className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-3xl sm:text-4xl font-black text-rose-700 font-mono tracking-tight my-2">
              {salaryStats.absentDays}
            </p>
            <p className="text-xs text-rose-600 font-semibold truncate">
              {salaryStats.absentDays > 0 ? `-PKR ${salaryStats.absentDeduction.toLocaleString()} (Deduction)` : '0 deductions'}
            </p>
          </Card>

          {/* 4. Total Hours */}
          <Card
            className={`p-4 shadow-2xs rounded-xl hover:shadow-xs transition-all flex flex-col justify-between ${
              summary.differenceMinutes >= 0
                ? 'border-emerald-200/80 bg-emerald-50/20'
                : 'border-amber-200/80 bg-amber-50/20'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Hours</p>
              <Badge
                variant={summary.differenceMinutes >= 0 ? 'success' : 'warning'}
                className="text-[10px] font-bold px-1.5 py-0.5 font-mono"
              >
                {summary.formattedDifference}
              </Badge>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight my-2">
              {summary.formattedTotalHours}
            </p>
            <p
              className={`text-xs font-semibold ${
                summary.hoursCompletionRate >= 100 ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {summary.hoursCompletionRate}% completed
            </p>
          </Card>

          {/* 5. Earned / Payable Salary Card */}
          <Card
            className={`p-4 shadow-2xs rounded-xl hover:shadow-xs transition-all flex flex-col justify-between ${
              !salaryStats.hasSalaryConfigured
                ? 'border-slate-200/90 bg-white'
                : salaryStats.absentDays === 0
                ? 'border-emerald-200/80 bg-emerald-50/20'
                : 'border-amber-200/80 bg-amber-50/20'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Earned Salary</p>
              <Badge
                variant={!salaryStats.hasSalaryConfigured ? 'secondary' : salaryStats.absentDays === 0 ? 'success' : 'warning'}
                className="text-[9px] font-bold px-1.5 py-0.5"
              >
                {!salaryStats.hasSalaryConfigured
                  ? 'Not Set'
                  : `${salaryStats.paidDays}/${salaryStats.monthTotalDays} Paid Days`}
              </Badge>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight my-2 whitespace-nowrap">
              {salaryStats.hasSalaryConfigured
                ? `PKR ${salaryStats.totalEarnedSalary.toLocaleString()}`
                : 'Not Set'}
            </p>
            <p
              className={`text-xs font-semibold leading-tight truncate ${
                !salaryStats.hasSalaryConfigured
                  ? 'text-slate-400'
                  : salaryStats.absentDays === 0
                  ? 'text-emerald-700'
                  : 'text-amber-700'
              }`}
            >
              {!salaryStats.hasSalaryConfigured
                ? 'Salary not configured'
                : `PKR ${salaryStats.grossMonthlySalary.toLocaleString()} Total Gross`}
            </p>
          </Card>
        </div>

        {/* Tier 2: Punch & Punctuality Breakdown (4 Equal Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. On-Time Arrival */}
          <Card className="p-4 shadow-2xs border-emerald-200/80 bg-emerald-50/15 rounded-xl hover:shadow-xs transition-shadow flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">On Time Arrival</p>
              <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-3xl sm:text-4xl font-black text-emerald-600 font-mono tracking-tight my-2">
              {summary.onTimeArrivals}
            </p>
            <p className="text-xs text-emerald-700 font-semibold">{summary.onTimeArrivalRate}% on-time rate</p>
          </Card>

          {/* 2. Late Arrival */}
          <Card className="p-4 shadow-2xs border-amber-200/80 bg-amber-50/15 rounded-xl hover:shadow-xs transition-shadow flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Late Arrivals</p>
              <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-3xl sm:text-4xl font-black text-amber-600 font-mono tracking-tight my-2">
              {summary.lateArrivals}
            </p>
            <p className="text-xs text-amber-700 font-semibold">After shift grace cutoff</p>
          </Card>

          {/* 3. On-Time Departure */}
          <Card className="p-4 shadow-2xs border-emerald-200/80 bg-emerald-50/15 rounded-xl hover:shadow-xs transition-shadow flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">On Time Departure</p>
              <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-3xl sm:text-4xl font-black text-emerald-600 font-mono tracking-tight my-2">
              {summary.onTimeDepartures}
            </p>
            <p className="text-xs text-emerald-700 font-semibold">{summary.onTimeDepartureRate}% on-time rate</p>
          </Card>

          {/* 4. Early Departure */}
          <Card className="p-4 shadow-2xs border-rose-200/80 bg-rose-50/15 rounded-xl hover:shadow-xs transition-shadow flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Early Departure</p>
              <div className="w-6 h-6 rounded-md bg-rose-100 text-rose-700 flex items-center justify-center">
                <AlertCircle className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-3xl sm:text-4xl font-black text-rose-600 font-mono tracking-tight my-2">
              {summary.earlyDepartures}
            </p>
            <p className="text-xs text-rose-700 font-semibold">Left early before shift end</p>
          </Card>
        </div>
      </div>

      {/* Dedicated Salary & Attendance Section (with Month Selection & Commission) */}
      <Card className="p-5 shadow-2xs border-slate-200/90 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-3 flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#003D5C] text-[#81F5F5] flex items-center justify-center font-bold shadow-2xs">
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#003D5C] tracking-tight">
                  Salary & Commission Status
                </h3>
                <p className="text-xs text-slate-500">
                  Monthly package, daily rate (divided by {salaryStats.monthTotalDays} days), and earned salary to-date.
                </p>
              </div>
            </div>

            {/* Month Display for Salary & Commission */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-50 border border-slate-200 px-3 py-1 rounded-lg">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Month:</span>
              <span className="text-xs font-bold text-[#003D5C]">
                {MONTH_OPTIONS.find(m => m.value === selectedMonth.split('-')[1])?.label}{' '}
                {selectedMonth.split('-')[0]}
              </span>
            </div>
          </div>

          {/* Quick Metrics Badges & Commission Button */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
              Total Package: <strong className="text-slate-900 font-mono">{salaryStats.grossMonthlySalary ? `PKR ${salaryStats.grossMonthlySalary.toLocaleString()}` : 'Not Set'}</strong>
            </span>

            {/* Monthly Commission Badge + Action Button */}
            <div className="flex items-center gap-1.5">
              <Badge variant="warning" className="px-2.5 py-1 text-xs font-semibold flex items-center gap-1.5 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Commission:{' '}
                <strong className="font-mono text-amber-950 font-bold">
                  {salaryStats.commissionAmount > 0
                    ? `+ PKR ${salaryStats.commissionAmount.toLocaleString()}`
                    : 'PKR 0'}
                </strong>
              </Badge>
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

            <Badge variant="success" className="px-2.5 py-1 text-xs font-semibold">
              Paid Days: <strong className="font-mono ml-1">{salaryStats.paidDays}/{salaryStats.monthTotalDays} Days</strong>
              <span className="text-emerald-700 ml-1">({salaryStats.presentDays} Pres{salaryStats.wfhDays > 0 ? `, ${salaryStats.wfhDays} WFH` : ''}{salaryStats.leaveDays > 0 ? `, ${salaryStats.leaveDays} Leaves` : ''})</span>
            </Badge>

            <Badge
              variant={salaryStats.absentDays > 0 ? 'destructive' : 'secondary'}
              className="px-2.5 py-1 text-xs font-semibold"
            >
              Absents: <strong className="font-mono ml-1">{salaryStats.absentDays} Days</strong>
              {salaryStats.absentDays > 0 && (
                <span className="text-rose-600 ml-1">(-PKR {salaryStats.absentDeduction.toLocaleString()})</span>
              )}
            </Badge>

            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
              Daily Rate: <strong className="font-mono text-slate-900">PKR {salaryStats.perDaySalary.toLocaleString()}/day</strong>
              <span className="text-slate-500 ml-1">({salaryStats.monthTotalDays} Total Days)</span>
            </span>
          </div>
        </div>

        {/* Right Status Banner */}
        <div className="lg:text-right border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6 shrink-0 min-w-64">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Earned Salary (To-Date)
          </p>
          {salaryStats.hasSalaryConfigured ? (
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono tracking-tight mt-0.5">
                PKR {salaryStats.totalEarnedSalary.toLocaleString()}
              </p>
              <div className="flex items-center lg:justify-end gap-1.5 text-xs font-bold mt-1">
                {salaryStats.absentDays === 0 ? (
                  <div className="flex items-center gap-1 text-emerald-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      PKR {salaryStats.grossMonthlySalary.toLocaleString()} Total Package ({salaryStats.paidDays}/{salaryStats.monthTotalDays} Days Paid)
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      -PKR {salaryStats.absentDeduction.toLocaleString()} ({salaryStats.absentDays} Absent Day{salaryStats.absentDays > 1 ? 's' : ''})
                    </span>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-slate-500 font-mono mt-1">
                Rate: PKR {salaryStats.perDaySalary.toLocaleString()}/day • Total Gross: PKR {salaryStats.grossMonthlySalary.toLocaleString()}
              </p>
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
      </Card>

      {/* Filter Bar with Month, Year, Status & Sort */}
      <Card className="p-4 shadow-2xs border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Month</label>
            <Select
              value={selectedMonth.split('-')[1]}
              onValueChange={(mVal) => {
                if (mVal) {
                  const yVal = selectedMonth.split('-')[0]
                  const newMonthStr = `${yVal}-${mVal}`
                  setSelectedMonth(newMonthStr)
                  const lastDay = new Date(parseInt(yVal, 10), parseInt(mVal, 10), 0).getDate()
                  setStartDate(`${newMonthStr}-01`)
                  setEndDate(`${newMonthStr}-${String(lastDay).padStart(2, '0')}`)
                }
              }}
            >
              <SelectTrigger className="h-9 text-xs font-bold text-[#003D5C] bg-slate-50 border-slate-200 min-w-[120px]">
                <SelectValue placeholder="Select Month" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {MONTH_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={m.value} className="text-xs font-medium">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Year</label>
            <Select
              value={selectedMonth.split('-')[0]}
              onValueChange={(yVal) => {
                if (yVal) {
                  const mVal = selectedMonth.split('-')[1]
                  const newMonthStr = `${yVal}-${mVal}`
                  setSelectedMonth(newMonthStr)
                  const lastDay = new Date(parseInt(yVal, 10), parseInt(mVal, 10), 0).getDate()
                  setStartDate(`${newMonthStr}-01`)
                  setEndDate(`${newMonthStr}-${String(lastDay).padStart(2, '0')}`)
                }
              }}
            >
              <SelectTrigger className="h-9 text-xs font-bold text-[#003D5C] bg-slate-50 border-slate-200 min-w-[100px]">
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {YEAR_OPTIONS.map((y) => (
                  <SelectItem key={y} value={y} className="text-xs font-medium">
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Status</label>
            <Select value={arrivalStatus} onValueChange={(val) => setArrivalStatus(val || 'all')}>
              <SelectTrigger className="h-9 text-xs border-slate-200 min-w-36">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="On Time Arrival">On Time Arrival</SelectItem>
                <SelectItem value="Late Arrival">Late Arrival</SelectItem>
                <SelectItem value="Absent">Absent Only</SelectItem>
                <SelectItem value="Leave">Leave Only</SelectItem>
                <SelectItem value="Work From Home">Work From Home</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Date Order</label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleDateSortOrder}
              className="text-xs font-semibold h-9 px-3 border-slate-200 gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-800"
              title="Click to toggle Ascending (1st → 31st) or Descending (31st → 1st)"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-[#009D9E]" />
              <span>{dateSortOrder === 'asc' ? '1st → 31st (Asc)' : '31st → 1st (Desc)'}</span>
            </Button>
          </div>
        </div>

        {(startDate || endDate || arrivalStatus !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const now = new Date()
              const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
              setSelectedMonth(currentMonthStr)
              const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
              setStartDate(`${currentMonthStr}-01`)
              setEndDate(`${currentMonthStr}-${String(lastDay).padStart(2, '0')}`)
              setArrivalStatus('all')
            }}
            className="text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            Reset Filters
          </Button>
        )}
      </Card>

      {/* Daily Attendance History Table using Shadcn Table */}
      <Card className="shadow-2xs border-slate-200/90 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-[#003D5C]">
            Daily Attendance Records
          </h3>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80">
              <TableHead
                onClick={toggleDateSortOrder}
                className="cursor-pointer hover:bg-slate-100/80 transition-colors select-none group"
                title="Click to sort Ascending / Descending"
              >
                <div className="flex items-center gap-1.5">
                  <span>Date</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#003D5C]" />
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 font-mono font-bold">
                    {dateSortOrder === 'asc' ? '1 → 31' : '31 → 1'}
                  </Badge>
                </div>
              </TableHead>
              <TableHead>Day</TableHead>
              <TableHead>In Time</TableHead>
              <TableHead>Arrival Status</TableHead>
              <TableHead>Out Time</TableHead>
              <TableHead>Departure Status</TableHead>
              <TableHead>Working Time</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-16 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#009D9E]" />
                  Loading attendance history...
                </TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-16 text-center text-slate-400">
                  <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  No attendance records found for this employee matching active filters.
                </TableCell>
              </TableRow>
            ) : (
              records.map((record) => (
                <TableRow key={record.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Date */}
                  <TableCell className="font-bold text-slate-900">{record.attendance_date}</TableCell>

                  {/* Day */}
                  <TableCell className="font-medium text-slate-500">{record.day_of_week}</TableCell>

                  {/* In Time */}
                  <TableCell className="font-mono font-medium text-slate-900">
                    {record.in_time || '--'}
                  </TableCell>

                  {/* Arrival Status */}
                  <TableCell>
                    {record.arrival_status === '--' ? (
                      <span className="text-slate-400 font-mono text-xs font-semibold">--</span>
                    ) : (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge
                          variant={
                            record.arrival_status === 'Holiday' ||
                            record.arrival_status === 'Gazetted Holiday' ||
                            record.arrival_status?.toLowerCase().includes('holiday')
                              ? 'warning'
                              : record.arrival_status === 'Absent'
                              ? 'destructive'
                              : record.arrival_status === 'Leave' || record.arrival_status?.toLowerCase().includes('leave')
                              ? 'purple'
                              : record.arrival_status === 'On Time Arrival'
                              ? 'success'
                              : record.arrival_status === 'Late Arrival'
                              ? 'warning'
                              : 'secondary'
                          }
                          className="text-[11px] font-bold uppercase tracking-wider"
                        >
                          {record.arrival_status}
                        </Badge>
                        {(record.departure_status === 'Work From Home' ||
                          record.arrival_status === 'Work From Home' ||
                          record.notes?.includes('Work From Home')) && (
                          <Badge variant="info" className="text-[10px] font-extrabold uppercase">
                            WFH
                          </Badge>
                        )}
                      </div>
                    )}
                  </TableCell>

                  {/* Out Time */}
                  <TableCell className="font-mono font-medium text-slate-900">
                    {record.out_time || '--'}
                  </TableCell>

                  {/* Departure Status */}
                  <TableCell>
                    {record.departure_status === '--' ? (
                      <span className="text-slate-400 font-mono text-xs font-semibold">--</span>
                    ) : (
                      <Badge
                        variant={
                          record.departure_status === 'Holiday' ||
                          record.departure_status?.includes('Holiday') ||
                          record.departure_status === 'Gazetted Holiday' ||
                          record.departure_status?.includes('Gazetted Holiday')
                            ? 'warning'
                            : record.departure_status === 'Absent'
                            ? 'destructive'
                            : record.departure_status?.toLowerCase().includes('leave')
                            ? 'purple'
                            : record.departure_status === 'On Time Departure'
                            ? 'success'
                            : record.departure_status === 'Early Departure'
                            ? 'destructive'
                            : 'secondary'
                        }
                        className="text-[11px] font-bold uppercase tracking-wider"
                      >
                        {record.departure_status?.toLowerCase().includes('leave') && record.notes?.includes('day')
                          ? record.notes
                          : record.departure_status}
                      </Badge>
                    )}
                  </TableCell>

                  {/* Working Time */}
                  <TableCell className="font-mono font-bold text-slate-900">
                    {record.arrival_status === '--' || record.total_working_hours_formatted === '--'
                      ? '--'
                      : record.total_working_hours_formatted || '00:00'}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right space-x-1 whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setViewingPunchesRecord(record)}
                      title="View Raw Punches"
                      className="text-slate-500 hover:text-[#009D9E] hover:bg-[#009D9E]/10"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    {record.day_of_week !== 'Sunday' && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setEditingRecord(record)}
                        title="Edit Attendance"
                        className="text-slate-500 hover:text-[#003D5C] hover:bg-slate-100"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

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
        onSaveSuccess={({ month: savedMonth, amount, notes }) => {
          if (savedMonth === selectedMonth) {
            setMonthlyCommission({ amount, notes })
          } else {
            setSelectedMonth(savedMonth)
            setMonthlyCommission({ amount, notes })
          }
          loadData()
        }}
      />
    </div>
  )
}
