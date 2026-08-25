'use client'

import React, { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Search,
  Filter,
  Download,
  Calendar,
  Clock,
  Edit2,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileSpreadsheet,
  X,
  RefreshCw,
  SlidersHorizontal,
  Cloud,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  AttendanceRecordWithEmployee,
  AttendanceSettings,
  Employee,
} from '@/lib/supabase/database.types'
import EditAttendanceModal from '@/components/attendance/edit-attendance-modal'
import ViewPunchesModal from '@/components/attendance/view-punches-modal'
import { EMPLOYEE_DESIGNATIONS } from '@/lib/constants/designations'
import * as XLSX from 'xlsx'

// Helper to format date to YYYY-MM-DD
function formatDate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Generate all dates between start and end
function getDatesInRange(startDateStr: string, endDateStr: string): string[] {
  if (!startDateStr || !endDateStr) return []
  const dates: string[] = []
  const current = new Date(startDateStr + 'T00:00:00')
  const end = new Date(endDateStr + 'T00:00:00')
  
  if (isNaN(current.getTime()) || isNaN(end.getTime())) return []
  
  // Safety limit: max 60 days to prevent browser hanging
  let count = 0
  while (current <= end && count < 60) {
    dates.push(formatDate(current))
    current.setDate(current.getDate() + 1)
    count++
  }
  return dates
}

// Get Day Name
function getDayName(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { weekday: 'long' })
}

export default function AttendanceRecordsPage() {
  const [records, setRecords] = useState<AttendanceRecordWithEmployee[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [settings, setSettings] = useState<AttendanceSettings | undefined>()
  const [isLoading, setIsLoading] = useState(true)

  // Date Range Defaults: Past 7 days by default
  const today = useMemo(() => new Date(), [])
  const defaultEnd = useMemo(() => formatDate(today), [today])
  const defaultStart = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 6)
    return formatDate(d)
  }, [])

  // Filters State
  const [startDate, setStartDate] = useState(defaultStart)
  const [endDate, setEndDate] = useState(defaultEnd)
  const [selectedDesignation, setSelectedDesignation] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all')
  const [arrivalStatus, setArrivalStatus] = useState<string>('all')
  const [departureStatus, setDepartureStatus] = useState<string>('all')

  // Pagination / Entries limit
  const [pageSize, setPageSize] = useState<number | 'all'>('all')

  // Modals
  const [editingRecord, setEditingRecord] = useState<AttendanceRecordWithEmployee | null>(null)
  const [viewingPunchesRecord, setViewingPunchesRecord] = useState<AttendanceRecordWithEmployee | null>(null)

  // Gazetted Holidays State & Modal
  const [holidays, setHolidays] = useState<Record<string, string>>({})
  const [holidayModalDate, setHolidayModalDate] = useState<string | null>(null)
  const [holidayNameInput, setHolidayNameInput] = useState<string>('Gazetted Holiday')
  const [isHolidaySaving, setIsHolidaySaving] = useState(false)

  // Bulk Delete Attendance Records Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteStartDate, setDeleteStartDate] = useState(startDate)
  const [deleteEndDate, setDeleteEndDate] = useState(endDate)
  const [deleteEmployeeId, setDeleteEmployeeId] = useState('all')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Sync deleteStartDate/deleteEndDate when modal opens
  useEffect(() => {
    if (isDeleteModalOpen) {
      setDeleteStartDate(startDate)
      setDeleteEndDate(endDate)
      setDeleteEmployeeId(selectedEmployeeId)
      setDeleteMessage(null)
      setDeleteError(null)
    }
  }, [isDeleteModalOpen, startDate, endDate, selectedEmployeeId])

  const handleDeleteRecords = async () => {
    if (!deleteStartDate || !deleteEndDate) {
      setDeleteError('Please select both From and To dates.')
      return
    }

    if (deleteStartDate > deleteEndDate) {
      setDeleteError('From date cannot be after To date.')
      return
    }

    try {
      setIsDeleting(true)
      setDeleteError(null)
      setDeleteMessage(null)

      const res = await fetch('/api/attendance/records', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: deleteStartDate,
          endDate: deleteEndDate,
          employeeId: deleteEmployeeId !== 'all' ? deleteEmployeeId : undefined,
        }),
      })

      const data = await res.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete attendance records.')
      }

      setDeleteMessage(`Successfully deleted ${data.deletedCount} attendance record(s).`)
      await fetchRecords()
      setTimeout(() => {
        setIsDeleteModalOpen(false)
        setDeleteMessage(null)
      }, 1500)
    } catch (err: any) {
      setDeleteError(err.message || 'Error deleting records.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Summary Metrics
  const [summary, setSummary] = useState({
    totalRecords: 0,
    onTimeArrivals: 0,
    lateArrivals: 0,
    onTimeDepartures: 0,
    earlyDepartures: 0,
    totalHours: '0h 0m',
  })

  // Load Initial Metadata (Employees, Settings & Holidays)
  useEffect(() => {
    async function loadMeta() {
      try {
        const [empRes, settRes, holRes] = await Promise.all([
          fetch('/api/attendance/employees'),
          fetch('/api/attendance/settings'),
          fetch('/api/attendance/holidays'),
        ])
        const empData = await empRes.json()
        const settData = await settRes.json()
        const holData = await holRes.json()
        if (empData.success && empData.employees) setEmployees(empData.employees)
        if (settData.success && settData.settings) setSettings(settData.settings)
        if (holData.success && holData.holidays) setHolidays(holData.holidays)
      } catch (err) {
        console.error('Error loading meta:', err)
      }
    }
    loadMeta()
  }, [])

  const getPresentEmployeesCountOnDate = (date: string): number => {
    let count = 0
    employees.forEach((emp) => {
      const rec = recordMatrixMap.get(`${emp.id}_${date}`) || recordMatrixMap.get(`${emp.employee_id}_${date}`)
      if (rec) {
        const isPresent =
          Boolean(rec.in_time && rec.in_time !== '--') ||
          Boolean(rec.out_time && rec.out_time !== '--') ||
          (rec.total_working_minutes ? rec.total_working_minutes > 0 : false) ||
          rec.arrival_status === 'On Time Arrival' ||
          rec.arrival_status === 'Late Arrival' ||
          rec.departure_status === 'On Time Departure' ||
          rec.departure_status === 'Early Departure'
        if (isPresent) count++
      }
    })
    return count
  }

  const handleDateHeaderClick = (date: string) => {
    setHolidayModalDate(date)
    setHolidayNameInput(holidays[date] || 'Gazetted Holiday')
  }

  const handleSaveHoliday = async (date: string, isHoliday: boolean) => {
    if (isHoliday) {
      const presentCount = getPresentEmployeesCountOnDate(date)
      if (presentCount > 0) {
        alert(
          `Cannot mark as Gazetted Holiday because ${presentCount} employee(s) have recorded attendance/punches on this date.\n\nGazetted Holiday can only be marked on days where ALL employees are absent.`
        )
        return
      }
    }

    try {
      setIsHolidaySaving(true)
      const res = await fetch('/api/attendance/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          name: holidayNameInput.trim() || 'Gazetted Holiday',
          isHoliday,
        }),
      })
      const data = await res.json()
      if (data.success && data.holidays) {
        setHolidays(data.holidays)
      }
      setHolidayModalDate(null)
      await fetchRecords()
    } catch (err) {
      console.error('Error saving holiday:', err)
    } finally {
      setIsHolidaySaving(false)
    }
  }

  // Fetch Attendance Records
  const fetchRecords = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      if (selectedEmployeeId && selectedEmployeeId !== 'all') params.set('employeeId', selectedEmployeeId)
      if (arrivalStatus && arrivalStatus !== 'all') params.set('arrivalStatus', arrivalStatus)
      if (departureStatus && departureStatus !== 'all') params.set('departureStatus', departureStatus)
      
      // Always get full range for grid view
      params.set('page', '1')
      params.set('pageSize', '1000')

      const res = await fetch(`/api/attendance/records?${params.toString()}`)
      const data = await res.json()

      if (data.success) {
        const recs: AttendanceRecordWithEmployee[] = data.records || []
        setRecords(recs)

        // Calculate summary
        let onTimeArr = 0
        let lateArr = 0
        let onTimeDep = 0
        let earlyDep = 0
        let totalMinutes = 0

        recs.forEach((r) => {
          if (r.arrival_status === 'On Time Arrival') onTimeArr++
          if (r.arrival_status === 'Late Arrival') lateArr++
          if (r.departure_status === 'On Time Departure') onTimeDep++
          if (r.departure_status === 'Early Departure') earlyDep++
          if (r.total_working_minutes) totalMinutes += r.total_working_minutes
        })

        const hrs = Math.floor(totalMinutes / 60)
        const mins = totalMinutes % 60

        setSummary({
          totalRecords: recs.length,
          onTimeArrivals: onTimeArr,
          lateArrivals: lateArr,
          onTimeDepartures: onTimeDep,
          earlyDepartures: earlyDep,
          totalHours: `${hrs}h ${mins}m`,
        })
      }
    } catch (err) {
      console.error('Error fetching records:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch when query parameters change or on submit
  useEffect(() => {
    fetchRecords()
  }, [startDate, endDate, selectedEmployeeId, arrivalStatus, departureStatus])

  // Extract distinct designations for dropdown (merging default constants and custom existing)
  const availableDesignations = useMemo(() => {
    const set = new Set<string>(EMPLOYEE_DESIGNATIONS)
    employees.forEach((emp) => {
      if (emp.designation?.trim()) set.add(emp.designation.trim())
    })
    return Array.from(set)
  }, [employees])

  // Generate Date Columns for Grid View
  const dateColumns = useMemo(() => {
    return getDatesInRange(startDate, endDate)
  }, [startDate, endDate])

  // Filter Employees based on Search and Designation
  const filteredEmployees = useMemo(() => {
    let list = employees.filter((emp) => {
      // Designation filter
      if (selectedDesignation !== 'all' && emp.designation?.trim().toLowerCase() !== selectedDesignation.toLowerCase()) {
        return false
      }
      // Employee selection filter
      if (selectedEmployeeId !== 'all' && emp.id !== selectedEmployeeId && emp.employee_id !== selectedEmployeeId) {
        return false
      }
      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase()
        const nameMatch = emp.name.toLowerCase().includes(q)
        const idMatch = emp.employee_id.toLowerCase().includes(q)
        const desigMatch = emp.designation?.toLowerCase().includes(q)
        if (!nameMatch && !idMatch && !desigMatch) return false
      }
      return true
    })

    if (pageSize !== 'all') {
      list = list.slice(0, pageSize)
    }

    return list
  }, [employees, selectedDesignation, selectedEmployeeId, search, pageSize])

  // Fast Lookup Map: (employeeId_date) -> AttendanceRecordWithEmployee
  const recordMatrixMap = useMemo(() => {
    const map = new Map<string, AttendanceRecordWithEmployee>()
    records.forEach((rec) => {
      if (rec.employee?.id) {
        map.set(`${rec.employee.id}_${rec.attendance_date}`, rec)
      }
      if (rec.employee?.employee_id) {
        map.set(`${rec.employee.employee_id}_${rec.attendance_date}`, rec)
      }
      if (rec.employee_id) {
        map.set(`${rec.employee_id}_${rec.attendance_date}`, rec)
      }
    })
    return map
  }, [records])

  // Dynamically calculate KPI summary stats across grid matrix
  const kpiStats = useMemo(() => {
    let onTimeArrivals = 0
    let lateArrivals = 0
    let onTimeDepartures = 0
    let earlyDepartures = 0
    let totalAbsent = 0
    let totalLeaves = 0

    const todayStr = formatDate(new Date())

    filteredEmployees.forEach((emp) => {
      dateColumns.forEach((date) => {
        const dayName = getDayName(date)
        const isGazettedHoliday = Boolean(holidays[date]) && getPresentEmployeesCountOnDate(date) === 0
        if (dayName === 'Sunday' || isGazettedHoliday) return // Sundays and Gazetted Holidays

        const rec = recordMatrixMap.get(`${emp.id}_${date}`) || recordMatrixMap.get(`${emp.employee_id}_${date}`)
        const isFuture = date > todayStr
        const isToday = date === todayStr
        const isPast = date < todayStr

        if (rec) {
          const isLeave =
            rec.arrival_status === 'Leave' ||
            rec.departure_status?.includes('Leave') ||
            ['Sick Leave', 'Casual Leave', 'Annual Leave', 'Probation Leave', 'Gazetted Leave'].includes(rec.departure_status as any) ||
            ['Sick Leave', 'Casual Leave', 'Annual Leave', 'Probation Leave', 'Gazetted Leave'].includes(rec.arrival_status as any)

          const isAbsent =
            rec.arrival_status === 'Absent' ||
            rec.departure_status === 'Absent' ||
            (!rec.in_time && !rec.out_time && !isLeave)

          if (isLeave) {
            totalLeaves++
          } else if (isAbsent) {
            if (!isFuture) totalAbsent++
          } else {
            if (rec.arrival_status === 'On Time Arrival') onTimeArrivals++
            if (rec.arrival_status === 'Late Arrival') lateArrivals++
            if (rec.departure_status === 'On Time Departure') onTimeDepartures++
            if (rec.departure_status === 'Early Departure') earlyDepartures++
          }
        } else {
          // No record exists
          if (isPast) {
            totalAbsent++
          } else if (isToday) {
            if (hasOfficeInTimePassed(date, settings)) {
              totalAbsent++
            }
          }
        }
      })
    })

    return {
      totalEmployees: filteredEmployees.length,
      onTimeArrivals,
      lateArrivals,
      onTimeDepartures,
      earlyDepartures,
      totalAbsent,
      totalLeaves,
    }
  }, [filteredEmployees, dateColumns, recordMatrixMap, settings, holidays])

  // Export to Excel Matrix
  const handleExportExcel = () => {
    if (filteredEmployees.length === 0) {
      alert('No employee records available to export.')
      return
    }

    const rows = filteredEmployees.map((emp) => {
      const rowData: Record<string, any> = {
        'Batch ID': emp.employee_id,
        'Employee Name': emp.name,
        Designation: emp.designation || '--',
        Branch: emp.branch || 'Multan',
      }

      dateColumns.forEach((date) => {
        const dayName = getDayName(date)
        const isGazettedHoliday = Boolean(holidays[date]) && getPresentEmployeesCountOnDate(date) === 0
        const rec = recordMatrixMap.get(`${emp.id}_${date}`) || recordMatrixMap.get(`${emp.employee_id}_${date}`)
        const colHeader = `${date} (${dayName})`

        if (rec) {
          const isLeave =
            rec.arrival_status === 'Leave' ||
            rec.departure_status?.includes('Leave') ||
            ['Sick Leave', 'Casual Leave', 'Annual Leave', 'Probation Leave', 'Gazetted Leave'].includes(rec.departure_status as any)

          const isAbsent =
            rec.arrival_status === 'Absent' ||
            rec.departure_status === 'Absent' ||
            (!rec.in_time && !rec.out_time && !isLeave)

          if (isLeave) {
            rowData[colHeader] = `Leave (${rec.departure_status || 'Casual Leave'})`
          } else if (isAbsent) {
            rowData[colHeader] = 'Absent'
          } else {
            rowData[colHeader] = `${rec.in_time || '--'} - ${rec.out_time || '--'} [${rec.total_working_hours_formatted || ''}]`
          }
        } else if (isGazettedHoliday) {
          rowData[colHeader] = `Gazetted Holiday (${holidays[date] || 'Gazetted Holiday'})`
        } else if (dayName === 'Sunday') {
          rowData[colHeader] = 'Holiday'
        } else {
          rowData[colHeader] = 'Absent'
        }
      })

      return rowData
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance_Matrix')
    XLSX.writeFile(wb, `attendance_matrix_${startDate}_to_${endDate}.xlsx`)
  }

  // Handle Blank Cell Click (Allows adding attendance or marking leave)
  const handleBlankCellClick = (emp: Employee, date: string) => {
    const dayName = getDayName(date)
    setEditingRecord({
      id: '',
      employee_id: emp.id,
      attendance_date: date,
      day_of_week: dayName,
      in_time: '',
      out_time: '',
      arrival_status: 'Absent',
      departure_status: 'Absent',
      total_working_minutes: 0,
      total_working_hours_formatted: '00:00',
      raw_punches: [],
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      employee: emp,
    } as any)
  }

// Helper to check if office arrival cutoff has passed
function hasOfficeInTimePassed(dateStr: string, settings?: AttendanceSettings): boolean {
  const now = new Date()
  const today = formatDate(now)
  if (dateStr < today) return true
  if (dateStr > today) return false

  const dayOfWeek = now.getDay() // 0 = Sunday, 6 = Saturday
  const isSaturday = dayOfWeek === 6
  const inTimeStr = isSaturday ? (settings?.saturday_in_time || '11:00') : (settings?.weekday_in_time || '10:30')
  const grace = isSaturday ? (settings?.saturday_grace_minutes ?? 15) : (settings?.weekday_grace_minutes ?? 15)

  const [h, m] = inTimeStr.split(':').map(Number)
  const cutoffMinutes = (h || 10) * 60 + (m || 30) + grace

  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  return currentMinutes >= cutoffMinutes
}

// Helper to check if office departure cutoff has passed
function hasOfficeOutTimePassed(dateStr: string, settings?: AttendanceSettings): boolean {
  const now = new Date()
  const today = formatDate(now)
  if (dateStr < today) return true
  if (dateStr > today) return false

  const dayOfWeek = now.getDay()
  const isSaturday = dayOfWeek === 6
  const outTimeStr = isSaturday ? (settings?.saturday_out_time || '15:00') : (settings?.weekday_out_time || '18:30')

  const [h, m] = outTimeStr.split(':').map(Number)
  const cutoffMinutes = (h || 18) * 60 + (m || 30)

  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  return currentMinutes >= cutoffMinutes
}

  // Render Status Badge / Content inside each Grid Cell
  const renderCellContent = (emp: Employee, date: string) => {
    const todayStr = formatDate(new Date())
    const dayName = getDayName(date)
    const isFuture = date > todayStr
    const isToday = date === todayStr
    const isPast = date < todayStr
    const presentCountOnDate = getPresentEmployeesCountOnDate(date)
    const isGazettedHoliday = Boolean(holidays[date]) && presentCountOnDate === 0
    const rec = recordMatrixMap.get(`${emp.id}_${date}`) || recordMatrixMap.get(`${emp.employee_id}_${date}`)

    // 1. If an explicit record exists in database (or manually added)
    if (rec) {
      const isLeave =
        rec.arrival_status === 'Leave' ||
        rec.departure_status?.includes('Leave') ||
        ['Sick Leave', 'Casual Leave', 'Annual Leave', 'Probation Leave', 'Gazetted Leave'].includes(rec.departure_status as any) ||
        ['Sick Leave', 'Casual Leave', 'Annual Leave', 'Probation Leave', 'Gazetted Leave'].includes(rec.arrival_status as any)

      const isExplicitAbsent =
        rec.arrival_status === 'Absent' ||
        rec.departure_status === 'Absent' ||
        (!rec.in_time && !rec.out_time && !isLeave)

      // A. Leave Record
      if (isLeave) {
        const leaveLabel =
          ['Sick Leave', 'Casual Leave', 'Annual Leave', 'Probation Leave', 'Gazetted Leave'].find(
            (l) => l === rec.departure_status || l === rec.arrival_status
          ) || 'Leave'

        return (
          <div
            onClick={() => setEditingRecord(rec)}
            className="group/cell cursor-pointer p-1.5 rounded-md transition-all flex items-center justify-center text-center border bg-indigo-50/80 hover:bg-indigo-100 border-indigo-200 text-indigo-950 shadow-2xs hover:shadow-xs"
            title={`Click to edit leave (${leaveLabel})`}
          >
            <span className="bg-indigo-600 text-white px-2 py-0.5 rounded text-[10px] font-bold tracking-tight shadow-2xs">
              {leaveLabel}
            </span>
          </div>
        )
      }

      // B. Explicit Absent Record
      if (isExplicitAbsent) {
        if (isGazettedHoliday) {
          return (
            <div
              className="flex items-center justify-center py-2"
              title={`Gazetted Holiday: ${holidays[date]}`}
            >
              <span className="bg-[#b38600] text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-2xs tracking-wide whitespace-nowrap">
                Gazetted Holiday
              </span>
            </div>
          )
        }

        if (dayName === 'Sunday') {
          return (
            <div
              className="flex items-center justify-center py-2"
              title="Sunday Holiday"
            >
              <span className="bg-[#b38600] text-white px-2.5 py-1 rounded text-[11px] font-bold shadow-2xs tracking-wide">
                Holiday
              </span>
            </div>
          )
        }

        if (isFuture) {
          return (
            <div
              onClick={() => handleBlankCellClick(emp, date)}
              className="flex items-center justify-center py-2 text-slate-300 font-mono text-xs cursor-pointer hover:bg-blue-50/40 rounded transition-colors"
              title="Future date. Click to mark Leave or timings"
            >
              --
            </div>
          )
        }

        return (
          <div
            onClick={() => setEditingRecord(rec)}
            className="group/cell cursor-pointer p-1.5 rounded-md transition-all flex items-center justify-center text-center border bg-rose-50/80 hover:bg-rose-100 border-rose-200 text-rose-950 shadow-2xs hover:shadow-xs"
            title="Click to edit or mark Leave"
          >
            <span className="bg-rose-600 text-white px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shadow-2xs">
              ABSENT
            </span>
          </div>
        )
      }

      // A. Leave Record
      if (isLeave) {
        const leaveLabel =
          ['Sick Leave', 'Casual Leave', 'Annual Leave', 'Probation Leave', 'Gazetted Leave'].find(
            (l) => l === rec.departure_status || l === rec.arrival_status
          ) || 'Leave'

        return (
          <div
            onClick={() => setEditingRecord(rec)}
            className="group/cell cursor-pointer p-1.5 rounded-md transition-all flex items-center justify-center text-center border bg-indigo-50/80 hover:bg-indigo-100 border-indigo-200 text-indigo-950 shadow-2xs hover:shadow-xs"
            title={`Click to edit leave (${leaveLabel})`}
          >
            <span className="bg-indigo-600 text-white px-2 py-0.5 rounded text-[10px] font-bold tracking-tight shadow-2xs">
              {leaveLabel}
            </span>
          </div>
        )
      }

      // B. Explicit Absent Record
      if (isExplicitAbsent) {
        if (isFuture) {
          return (
            <div
              onClick={() => handleBlankCellClick(emp, date)}
              className="flex items-center justify-center py-2 text-slate-300 font-mono text-xs cursor-pointer hover:bg-blue-50/40 rounded transition-colors"
              title="Future date. Click to mark Leave or timings"
            >
              --
            </div>
          )
        }

        return (
          <div
            onClick={() => setEditingRecord(rec)}
            className="group/cell cursor-pointer p-1.5 rounded-md transition-all flex items-center justify-center text-center border bg-rose-50/80 hover:bg-rose-100 border-rose-200 text-rose-950 shadow-2xs hover:shadow-xs"
            title="Click to edit or mark Leave"
          >
            <span className="bg-rose-600 text-white px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shadow-2xs">
              ABSENT
            </span>
          </div>
        )
      }

      // C. Present Record with timings
      const isLate = rec.arrival_status === 'Late Arrival'
      const isEarlyLeave = rec.departure_status === 'Early Departure'
      const hasInTime = Boolean(rec.in_time && rec.in_time !== '---')
      const hasOutTime = Boolean(rec.out_time && rec.out_time !== '---')

      // Check if departure time cutoff has passed
      const outTimePassed = isPast || (isToday && hasOfficeOutTimePassed(date, settings))
      const isMissingOut = hasInTime && !hasOutTime && outTimePassed
      const isCurrentlyInOffice = hasInTime && !hasOutTime && isToday && !outTimePassed

      return (
        <div
          onClick={() => setEditingRecord(rec)}
          className={`group/cell cursor-pointer p-1.5 rounded-md transition-all flex flex-col items-center justify-center text-center gap-0.5 border ${
            isMissingOut
              ? 'bg-amber-50/90 hover:bg-amber-100/95 border-amber-300 text-amber-950 shadow-2xs hover:shadow-xs'
              : isCurrentlyInOffice
              ? 'bg-emerald-50/70 hover:bg-emerald-100 border-emerald-300 text-emerald-950'
              : isLate || isEarlyLeave
              ? 'bg-amber-50/70 hover:bg-amber-100/90 border-amber-200/80 text-amber-900'
              : 'bg-emerald-50/50 hover:bg-emerald-100/80 border-emerald-200/70 text-slate-800'
          }`}
          title={isCurrentlyInOffice ? 'Currently active in office' : 'Click to edit timings or enter missing Out Time'}
        >
          {/* In Time - Out Time */}
          <div className="font-mono text-[11px] font-semibold tracking-tight whitespace-nowrap flex items-center justify-center gap-1">
            <span>{rec.in_time || '---'}</span>
            <span className="text-slate-400">-</span>
            <span className={isMissingOut ? 'text-amber-700 font-bold bg-amber-200/60 px-1 rounded' : isCurrentlyInOffice ? 'text-emerald-700 font-semibold' : ''}>
              {hasOutTime ? rec.out_time : isCurrentlyInOffice ? 'In Office' : '---'}
            </span>
          </div>

          {/* Duration Badge with Clock Icon */}
          <div className="flex items-center justify-center gap-1 text-[11px] font-mono font-medium">
            <span
              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                isMissingOut
                  ? 'bg-amber-500 text-white'
                  : isCurrentlyInOffice
                  ? 'bg-emerald-500 text-white animate-pulse'
                  : isLate
                  ? 'bg-amber-500 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              ⏱
            </span>
            <span className={`font-bold ${isMissingOut ? 'text-amber-700' : 'text-slate-700'}`}>
              ({rec.total_working_hours_formatted && rec.total_working_hours_formatted !== '00:00' ? rec.total_working_hours_formatted : isCurrentlyInOffice ? 'Working' : '--'})
            </span>
          </div>

          {/* Missing Out Alert or Status Pill */}
          {isMissingOut ? (
            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 border border-amber-300 flex items-center gap-0.5 mt-0.5 group-hover/cell:bg-amber-300 transition-colors">
              <span>Missing Out</span>
              <Edit2 className="w-2.5 h-2.5 inline" />
            </span>
          ) : isCurrentlyInOffice ? (
            <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
              Active Now
            </span>
          ) : (isLate || isEarlyLeave) ? (
            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-200/90 text-amber-800">
              {isLate ? 'Late' : 'Early Out'}
            </span>
          ) : null}
        </div>
      )
    }

    // 3. If NO record exists:
    // A. Future Date -> Show neutral placeholder "--" (Do not mark absent!)
    if (isFuture) {
      return (
        <div
          onClick={() => handleBlankCellClick(emp, date)}
          className="flex items-center justify-center py-2 text-slate-300 font-mono text-xs cursor-pointer hover:bg-blue-50/40 rounded transition-colors"
          title="Future date. Click to pre-record leave or timings"
        >
          --
        </div>
      )
    }

    // B. Today -> If in-time cutoff has passed, show ABSENT; else show "--"
    if (isToday) {
      if (hasOfficeInTimePassed(date, settings)) {
        return (
          <div
            onClick={() => handleBlankCellClick(emp, date)}
            className="group/cell cursor-pointer p-1.5 rounded-md transition-all flex items-center justify-center text-center border bg-rose-50/80 hover:bg-rose-100 border-rose-200 text-rose-950 shadow-2xs hover:shadow-xs"
            title="In time passed (Absent). Click to mark Leave or timings"
          >
            <span className="bg-rose-600 text-white px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shadow-2xs">
              ABSENT
            </span>
          </div>
        )
      } else {
        return (
          <div
            onClick={() => handleBlankCellClick(emp, date)}
            className="flex items-center justify-center py-2 text-slate-400 font-mono text-xs cursor-pointer hover:bg-blue-50/40 rounded transition-colors"
            title="Office shift starting soon. Click to mark Leave or timings"
          >
            --
          </div>
        )
      }
    }

    // C. Past Date -> Show ABSENT (No punches recorded)
    return (
      <div
        onClick={() => handleBlankCellClick(emp, date)}
        className="group/cell cursor-pointer p-1.5 rounded-md transition-all flex items-center justify-center text-center border bg-rose-50/80 hover:bg-rose-100 border-rose-200 text-rose-950 shadow-2xs hover:shadow-xs"
        title="Past date with no punches (Absent). Click to mark Leave or enter timings"
      >
        <span className="bg-rose-600 text-white px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shadow-2xs">
          ABSENT
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-full mx-auto font-sans pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-['Montserrat'] text-2xl font-bold text-[#003D5C] tracking-tight flex items-center gap-2.5">
            Attendance Records
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Timesheet grid view with fixed employee columns and dynamic date-wise attendance logs.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            onClick={() => setIsDeleteModalOpen(true)}
            className="text-xs font-bold uppercase tracking-wider text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 gap-1.5 shadow-2xs h-9"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            Delete Records
          </Button>

          <Button
            variant="outline"
            onClick={handleExportExcel}
            className="text-xs font-bold uppercase tracking-wider text-slate-700 border-slate-300 gap-1.5 shadow-2xs h-9"
          >
            <Download className="w-4 h-4 text-[#009D9E]" />
            Excel Export
          </Button>

          <Link href="/attendance/import">
            <Button className="bg-[#009D9E] hover:bg-[#007A7A] text-white px-4 py-2 font-bold uppercase tracking-wider text-xs gap-2 shadow-xs h-9">
              <FileSpreadsheet className="w-4 h-4" />
              Import Excel
            </Button>
          </Link>
        </div>
      </div>

      {/* Top Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4">
        {/* Row 1: From Date, To Date, Designation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1.5">
              From:
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs border-slate-300 font-medium h-9.5"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1.5">
              To:
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs border-slate-300 font-medium h-9.5"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1.5">
              Select Designation
            </label>
            <Select
              value={selectedDesignation}
              onValueChange={(val) => setSelectedDesignation(val || 'all')}
            >
              <SelectTrigger className="text-xs border-slate-300 h-9.5 font-medium w-full min-w-[220px]">
                <SelectValue placeholder="ALL DESIGNATIONS">
                  {selectedDesignation === 'all' ? 'ALL DESIGNATIONS' : selectedDesignation}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-64 min-w-[280px]">
                <SelectItem value="all">ALL DESIGNATIONS</SelectItem>
                {availableDesignations.map((desig) => (
                  <SelectItem key={desig} value={desig}>
                    {desig}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 2: Secondary Quick Filters (Show entries, Search) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Quick Excel Button */}
            <button
              onClick={handleExportExcel}
              className="bg-[#2d3748] hover:bg-[#1a202c] text-white text-[11px] font-bold px-3 py-1.5 rounded shadow-2xs transition-colors"
            >
              Excel
            </button>

            {/* Show entries dropdown */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const val = e.target.value
                  setPageSize(val === 'all' ? 'all' : parseInt(val, 10))
                }}
                className="border border-slate-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#009D9E]"
              >
                <option value="all">All</option>
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
              <span>entries</span>
            </div>
          </div>

          {/* Instant Search Bar (Expanded) */}
          <div className="flex items-center gap-2 flex-1 w-full max-w-xl sm:justify-end">
            <span className="text-xs text-slate-500 font-semibold shrink-0">Search:</span>
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <Input
                type="text"
                placeholder="Search Employee Name, ID, Designation..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs border-slate-300 h-9 w-full bg-slate-50/50 focus:bg-white transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPI Counters (7 cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Employees</p>
          <p className="font-['Montserrat'] text-lg font-extrabold text-[#003D5C] mt-0.5">{kpiStats.totalEmployees}</p>
        </div>
        <div className="bg-white border border-slate-200 border-l-4 border-l-emerald-500 rounded-lg p-3 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">On Time Arrival</p>
          <p className="font-['Montserrat'] text-lg font-extrabold text-emerald-600 mt-0.5">{kpiStats.onTimeArrivals}</p>
        </div>
        <div className="bg-white border border-slate-200 border-l-4 border-l-amber-500 rounded-lg p-3 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Late Arrival</p>
          <p className="font-['Montserrat'] text-lg font-extrabold text-amber-600 mt-0.5">{kpiStats.lateArrivals}</p>
        </div>
        <div className="bg-white border border-slate-200 border-l-4 border-l-teal-500 rounded-lg p-3 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">On Time Departure</p>
          <p className="font-['Montserrat'] text-lg font-extrabold text-teal-600 mt-0.5">{kpiStats.onTimeDepartures}</p>
        </div>
        <div className="bg-white border border-slate-200 border-l-4 border-l-rose-400 rounded-lg p-3 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Early Departure</p>
          <p className="font-['Montserrat'] text-lg font-extrabold text-rose-500 mt-0.5">{kpiStats.earlyDepartures}</p>
        </div>
        <div className="bg-white border border-slate-200 border-l-4 border-l-rose-600 rounded-lg p-3 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Absent</p>
          <p className="font-['Montserrat'] text-lg font-extrabold text-rose-600 mt-0.5">{kpiStats.totalAbsent}</p>
        </div>
        <div className="bg-white border border-slate-200 border-l-4 border-l-indigo-600 rounded-lg p-3 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Leave</p>
          <p className="font-['Montserrat'] text-lg font-extrabold text-indigo-600 mt-0.5">{kpiStats.totalLeaves}</p>
        </div>
      </div>

      {/* MATRIX / GRID TIMESHEET */}
      <div className="bg-white border border-slate-300 rounded-xl shadow-xs overflow-hidden">
        {/* Scrollable Container with Sticky Columns */}
        <div className="overflow-x-auto max-h-[720px] relative scrollbar-thin scrollbar-thumb-slate-300">
          <table className="w-full text-left text-xs border-collapse border-spacing-0">
            {/* Dark Styled Header */}
            <thead className="bg-[#2d3748] text-white font-bold sticky top-0 z-30 shadow-xs">
              <tr>
                {/* Fixed Column 1: Batch ID */}
                <th className="py-3 px-3.5 sticky left-0 z-40 bg-[#2d3748] border-r border-slate-600/80 min-w-[90px] text-center uppercase tracking-wider text-[11px]">
                  Batch ID ⇅
                </th>

                {/* Fixed Column 2: Employee Name */}
                <th className="py-3 px-3.5 sticky left-[90px] z-40 bg-[#2d3748] border-r border-slate-600/80 min-w-[170px] uppercase tracking-wider text-[11px]">
                  Employee Name ⇅
                </th>

                {/* Fixed Column 3: Designation */}
                <th className="py-3 px-3.5 sticky left-[260px] z-40 bg-[#2d3748] border-r border-slate-600/80 min-w-[150px] uppercase tracking-wider text-[11px]">
                  Designation ⇅
                </th>

                {/* Fixed Column 4: Branch */}
                <th className="py-3 px-3 sticky left-[410px] z-40 bg-[#2d3748] border-r border-slate-600/80 min-w-[110px] text-center uppercase tracking-wider text-[11px] shadow-[3px_0_5px_rgba(0,0,0,0.2)]">
                  Branch ⇅
                </th>

                {/* Dynamic Date Columns */}
                {dateColumns.map((date) => {
                  const day = getDayName(date)
                  const isSunday = day === 'Sunday'
                  const isGazettedHoliday = Boolean(holidays[date]) && getPresentEmployeesCountOnDate(date) === 0
                  return (
                    <th
                      key={date}
                      onClick={() => handleDateHeaderClick(date)}
                      className={`py-2 px-3 text-center border-r border-slate-600/80 min-w-[155px] font-sans cursor-pointer transition-all select-none group/th ${
                        isSunday
                          ? 'bg-[#242c3a] text-amber-300 hover:bg-[#1a202c]'
                          : isGazettedHoliday
                          ? 'bg-[#8c6b00] text-amber-100 hover:bg-[#735700]'
                          : 'bg-[#2d3748] text-white hover:bg-[#3d4a60]'
                      }`}
                      title={
                        isGazettedHoliday
                          ? `Gazetted Holiday: ${holidays[date]}. Click to edit or remove.`
                          : 'Click date to mark as Gazetted Holiday'
                      }
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-[11px] font-bold font-mono tracking-tight">{date}</span>
                        {isGazettedHoliday && (
                          <span className="text-[9px] bg-amber-300 text-amber-950 font-extrabold px-1 rounded shadow-2xs">
                            HOLIDAY
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-semibold tracking-wider text-slate-300 uppercase flex items-center justify-center gap-1 mt-0.5 group-hover/th:text-white">
                        <span>{day}</span>
                        <span className="text-[9px] opacity-70">⚙️</span>
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-200 text-slate-700 bg-white">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={4 + dateColumns.length}
                    className="py-20 text-center text-slate-400 bg-white"
                  >
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-[#009D9E]" />
                    <p className="font-semibold text-slate-600 text-sm">Loading attendance timesheet grid...</p>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td
                    colSpan={4 + dateColumns.length}
                    className="py-20 text-center text-slate-400 bg-white"
                  >
                    <Calendar className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600 text-sm">No matching employees found</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting your designation or search query.</p>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp, index) => {
                  const isEven = index % 2 === 0
                  const rowBgClass = isEven ? 'bg-white' : 'bg-slate-50/60'

                  return (
                    <tr key={emp.id} className={`${rowBgClass} hover:bg-blue-50/40 transition-colors`}>
                      {/* Sticky Column 1: Batch ID */}
                      <td
                        className={`py-3 px-3 text-center font-mono font-bold text-slate-900 border-r border-slate-200 sticky left-0 z-20 ${
                          isEven ? 'bg-white' : 'bg-[#f8fafc]'
                        } shadow-[2px_0_4px_rgba(0,0,0,0.02)]`}
                      >
                        {emp.employee_id}
                      </td>

                      {/* Sticky Column 2: Employee Name */}
                      <td
                        className={`py-3 px-3.5 font-bold text-slate-900 border-r border-slate-200 sticky left-[90px] z-20 ${
                          isEven ? 'bg-white' : 'bg-[#f8fafc]'
                        } shadow-[2px_0_4px_rgba(0,0,0,0.02)]`}
                      >
                        <Link
                          href={`/attendance/employees/${emp.id}`}
                          className="hover:text-[#009D9E] transition-colors text-xs flex items-center gap-1.5"
                        >
                          {emp.name}
                        </Link>
                      </td>

                      {/* Sticky Column 3: Designation */}
                      <td
                        className={`py-3 px-3.5 text-slate-600 border-r border-slate-200 text-xs sticky left-[260px] z-20 ${
                          isEven ? 'bg-white' : 'bg-[#f8fafc]'
                        } shadow-[2px_0_4px_rgba(0,0,0,0.02)] font-medium`}
                      >
                        {emp.designation || 'Staff'}
                      </td>

                      {/* Sticky Column 4: Branch */}
                      <td
                        className={`py-3 px-2 text-center border-r border-slate-200 text-xs sticky left-[410px] z-20 ${
                          isEven ? 'bg-white' : 'bg-[#f8fafc]'
                        } shadow-[3px_0_5px_rgba(0,0,0,0.04)]`}
                      >
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            emp.branch === 'Lahore'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : emp.branch === 'Multan'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : emp.branch === 'Onshore'
                              ? 'bg-teal-100 text-teal-800 border border-teal-200'
                              : emp.branch === 'AIMT'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {emp.branch || 'Multan'}
                        </span>
                      </td>

                      {/* Dynamic Date Data Cells */}
                      {dateColumns.map((date) => (
                        <td
                          key={date}
                          className="py-2 px-2 border-r border-slate-200 align-middle text-center"
                        >
                          {renderCellContent(emp, date)}
                        </td>
                      ))}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Grid Footer Bar */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div>
            Showing <span className="font-bold text-slate-800">{filteredEmployees.length}</span> employees across{' '}
            <span className="font-bold text-slate-800">{dateColumns.length}</span> days ({startDate} to {endDate})
          </div>
          <div className="flex items-center gap-3.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> On Time
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Late / Deviation
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#b38600]"></span> Holiday
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span> Absent
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span> Leave
            </span>
          </div>
        </div>
      </div>

      {/* Edit Attendance Modal */}
      <EditAttendanceModal
        isOpen={!!editingRecord}
        onClose={() => setEditingRecord(null)}
        record={editingRecord}
        onSaveSuccess={() => fetchRecords()}
        settings={settings}
      />

      {/* View Punches Modal */}
      <ViewPunchesModal
        isOpen={!!viewingPunchesRecord}
        onClose={() => setViewingPunchesRecord(null)}
        record={viewingPunchesRecord}
        onEditClick={() => {
          if (viewingPunchesRecord) {
            setEditingRecord(viewingPunchesRecord)
          }
        }}
      />

      {/* Gazetted Holiday Configuration Modal */}
      <Dialog open={!!holidayModalDate} onOpenChange={(open) => !open && setHolidayModalDate(null)}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-xl rounded-xl">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-base font-bold text-[#003D5C] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#009D9E]" />
              Manage Gazetted Holiday
            </DialogTitle>
            <p className="text-xs text-slate-500">
              Configure whether this date is an official Gazetted Holiday for all employees.
            </p>
          </DialogHeader>

          {holidayModalDate && (() => {
            const presentCount = getPresentEmployeesCountOnDate(holidayModalDate)
            const isAlreadyHoliday = Boolean(holidays[holidayModalDate])
            const canMarkHoliday = isAlreadyHoliday || presentCount === 0

            return (
              <div className="space-y-4 py-2">
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase text-slate-400">Selected Date</p>
                    <p className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                      {holidayModalDate} ({getDayName(holidayModalDate)})
                    </p>
                  </div>
                  {isAlreadyHoliday ? (
                    <span className="bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold px-2.5 py-1 rounded-full">
                      🎉 Gazetted Holiday
                    </span>
                  ) : (
                    <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-full">
                      Regular Working Day
                    </span>
                  )}
                </div>

                {!canMarkHoliday ? (
                  <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-lg text-xs text-rose-800 space-y-1.5">
                    <p className="font-bold text-rose-900 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      Cannot Mark as Gazetted Holiday
                    </p>
                    <p>
                      <strong>{presentCount}</strong> employee(s) have recorded attendance/punches on this date.
                    </p>
                    <p className="text-[11px] text-rose-700 font-medium">
                      Gazetted Holiday can only be marked on days where <strong>ALL employees are absent</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Holiday Name / Reason (Optional)
                    </Label>
                    <Input
                      type="text"
                      placeholder="e.g. Independence Day, Eid Holiday, Gazetted Holiday"
                      value={holidayNameInput}
                      onChange={(e) => setHolidayNameInput(e.target.value)}
                      className="text-sm border-slate-200"
                    />
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-xs text-blue-800 space-y-1">
                  <p className="font-semibold text-blue-900">Effect on Attendance:</p>
                  <p>
                    Marking this date as a Gazetted Holiday will automatically display <strong>Gazetted Holiday</strong> for every employee across the system, and set expected working hours to <strong>0h</strong>.
                  </p>
                </div>

                <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-between sm:justify-between gap-2">
                  {isAlreadyHoliday ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSaveHoliday(holidayModalDate, false)}
                      disabled={isHolidaySaving}
                      className="text-xs font-bold text-rose-600 border-rose-200 hover:bg-rose-50"
                    >
                      {isHolidaySaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 mr-1 text-rose-600" />
                      )}
                      Remove Holiday
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setHolidayModalDate(null)}
                      disabled={isHolidaySaving}
                      className="text-xs font-bold"
                    >
                      Cancel
                    </Button>
                  )}

                  <Button
                    type="button"
                    onClick={() => handleSaveHoliday(holidayModalDate, true)}
                    disabled={!canMarkHoliday || isHolidaySaving}
                    className="bg-[#009D9E] hover:bg-[#007A7A] text-white text-xs font-bold uppercase tracking-wider gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isHolidaySaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    {isAlreadyHoliday ? 'Update Holiday' : 'Mark as Gazetted Holiday'}
                  </Button>
                </DialogFooter>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Attendance Records Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={(open) => !isDeleting && setIsDeleteModalOpen(open)}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-xl rounded-xl">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-base font-bold text-rose-700 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-600" />
              Delete Attendance Records
            </DialogTitle>
            <p className="text-xs text-slate-500">
              Filter by date range and employee to permanently delete recorded attendance data.
            </p>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {deleteError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            {deleteMessage && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs p-3 rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{deleteMessage}</span>
              </div>
            )}

            {/* Date Filters */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700 block mb-1.5">From Date:</Label>
                <Input
                  type="date"
                  value={deleteStartDate}
                  onChange={(e) => setDeleteStartDate(e.target.value)}
                  className="text-xs border-slate-300 h-9"
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-700 block mb-1.5">To Date:</Label>
                <Input
                  type="date"
                  value={deleteEndDate}
                  onChange={(e) => setDeleteEndDate(e.target.value)}
                  className="text-xs border-slate-300 h-9"
                />
              </div>
            </div>

            {/* Employee Filter */}
            <div>
              <Label className="text-xs font-bold text-slate-700 block mb-1.5">Filter by Employee:</Label>
              <Select value={deleteEmployeeId} onValueChange={(val) => setDeleteEmployeeId(val || 'all')}>
                <SelectTrigger className="text-xs border-slate-300 h-9">
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="all">All Employees (Entire Team)</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} ({emp.employee_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Warning Box */}
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1 text-amber-950">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Warning: Permanent Action
              </p>
              <p>
                All attendance punches, working hours, and check-in/out records for the selected date range (<strong>{deleteStartDate}</strong> to <strong>{deleteEndDate}</strong>) will be permanently deleted.
              </p>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-between sm:justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
              className="text-xs font-bold"
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleDeleteRecords}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider gap-1.5 shadow-sm"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              {isDeleting ? 'Deleting...' : 'Confirm & Delete Records'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
