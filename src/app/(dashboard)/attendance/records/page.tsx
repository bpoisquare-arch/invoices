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
  LayoutGrid,
  List,
  CheckCircle2,
  AlertTriangle,
  Info,
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
  AttendanceRecordWithEmployee,
  AttendanceSettings,
  Employee,
} from '@/lib/supabase/database.types'
import EditAttendanceModal from '@/components/attendance/edit-attendance-modal'
import ViewPunchesModal from '@/components/attendance/view-punches-modal'
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

  // View Mode: 'grid' (Matrix/Timesheet like screenshot) or 'list' (Classic single row)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

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
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all')
  const [arrivalStatus, setArrivalStatus] = useState<string>('all')
  const [departureStatus, setDepartureStatus] = useState<string>('all')

  // Pagination / Entries limit
  const [pageSize, setPageSize] = useState<number | 'all'>('all')
  const [page, setPage] = useState(1)

  // Modals
  const [editingRecord, setEditingRecord] = useState<AttendanceRecordWithEmployee | null>(null)
  const [viewingPunchesRecord, setViewingPunchesRecord] = useState<AttendanceRecordWithEmployee | null>(null)

  // Summary Metrics
  const [summary, setSummary] = useState({
    totalRecords: 0,
    onTimeArrivals: 0,
    lateArrivals: 0,
    onTimeDepartures: 0,
    earlyDepartures: 0,
    totalHours: '0h 0m',
  })

  // Load Initial Metadata (Employees & Settings)
  useEffect(() => {
    async function loadMeta() {
      try {
        const [empRes, settRes] = await Promise.all([
          fetch('/api/attendance/employees'),
          fetch('/api/attendance/settings'),
        ])
        const empData = await empRes.json()
        const settData = await settRes.json()
        if (empData.success && empData.employees) setEmployees(empData.employees)
        if (settData.success && settData.settings) setSettings(settData.settings)
      } catch (err) {
        console.error('Error loading meta:', err)
      }
    }
    loadMeta()
  }, [])

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
        let recs: AttendanceRecordWithEmployee[] = data.records || []
        
        // Merge any client cached attendance records
        try {
          const rawLocal = localStorage.getItem('attendance_records_store')
          if (rawLocal) {
            const parsedLocal: AttendanceRecordWithEmployee[] = JSON.parse(rawLocal)
            parsedLocal.forEach((loc) => {
              if (!recs.some((r) => r.id === loc.id || (r.employee_id === loc.employee_id && r.attendance_date === loc.attendance_date))) {
                if (!loc.employee) {
                  loc.employee = employees.find((e) => e.id === loc.employee_id || e.employee_id === loc.employee_id) || null
                }
                recs.push(loc)
              }
            })
          }
        } catch (e) {
          // ignore
        }

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

  // Extract distinct departments / designations for dropdown
  const distinctDepartments = useMemo(() => {
    const set = new Set<string>()
    employees.forEach((emp) => {
      if (emp.designation) set.add(emp.designation.trim())
    })
    return Array.from(set).sort()
  }, [employees])

  // Generate Date Columns for Grid View
  const dateColumns = useMemo(() => {
    return getDatesInRange(startDate, endDate)
  }, [startDate, endDate])

  // Filter Employees based on Search and Department
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // Department filter
      if (selectedDepartment !== 'all' && emp.designation?.trim() !== selectedDepartment) {
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
  }, [employees, selectedDepartment, selectedEmployeeId, search])

  // Fast Lookup Map: (employeeId_date) -> AttendanceRecordWithEmployee
  const recordMatrixMap = useMemo(() => {
    const map = new Map<string, AttendanceRecordWithEmployee>()
    records.forEach((rec) => {
      // key by both employee UUID and employee_id string for robust matching
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

  // Export to Excel (Matrix or List)
  const handleExportExcel = () => {
    if (filteredEmployees.length === 0) {
      alert('No employee records available to export.')
      return
    }

    if (viewMode === 'grid') {
      // Build matrix worksheet
      const rows = filteredEmployees.map((emp) => {
        const rowData: Record<string, any> = {
          'Batch ID': emp.employee_id,
          'Employee Name': emp.name,
          'Department / Designation': emp.designation || '--',
        }

        dateColumns.forEach((date) => {
          const dayName = getDayName(date)
          const rec = recordMatrixMap.get(`${emp.id}_${date}`) || recordMatrixMap.get(`${emp.employee_id}_${date}`)
          const colHeader = `${date} (${dayName})`

          if (rec) {
            rowData[colHeader] = `${rec.in_time || '--'} - ${rec.out_time || '--'} [${rec.total_working_hours_formatted || ''}]`
          } else if (dayName === 'Sunday') {
            rowData[colHeader] = 'Holiday'
          } else {
            rowData[colHeader] = '--'
          }
        })

        return rowData
      })

      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance_Matrix')
      XLSX.writeFile(wb, `attendance_matrix_${startDate}_to_${endDate}.xlsx`)
    } else {
      // List export
      const rows = records.map((r) => ({
        'Batch / Employee ID': r.employee?.employee_id || r.employee_id,
        'Employee Name': r.employee?.name || '--',
        Designation: r.employee?.designation || '--',
        Date: r.attendance_date,
        Day: r.day_of_week,
        'In Time': r.in_time || '',
        'Arrival Status': r.arrival_status,
        'Out Time': r.out_time || '',
        'Departure Status': r.departure_status,
        Duration: r.total_working_hours_formatted || '',
      }))

      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance_List')
      XLSX.writeFile(wb, `attendance_records_${startDate}_to_${endDate}.xlsx`)
    }
  }

  // Render Status Badge / Content inside each Grid Cell
  const renderCellContent = (emp: Employee, date: string) => {
    const dayName = getDayName(date)
    const rec = recordMatrixMap.get(`${emp.id}_${date}`) || recordMatrixMap.get(`${emp.employee_id}_${date}`)

    // 1. If Attendance Record Exists
    if (rec) {
      const isLate = rec.arrival_status === 'Late Arrival'
      const isEarlyLeave = rec.departure_status === 'Early Departure'
      const isMissingOut = rec.departure_status === 'Missing Out Time'

      return (
        <div
          onClick={() => setViewingPunchesRecord(rec)}
          className={`group/cell cursor-pointer p-1.5 rounded-md transition-all flex flex-col items-center justify-center text-center gap-0.5 border ${
            isLate || isEarlyLeave || isMissingOut
              ? 'bg-amber-50/70 hover:bg-amber-100/90 border-amber-200/80 text-amber-900'
              : 'bg-emerald-50/50 hover:bg-emerald-100/80 border-emerald-200/70 text-slate-800'
          }`}
          title="Click to view punch details"
        >
          {/* In Time - Out Time */}
          <div className="font-mono text-[11px] font-semibold tracking-tight whitespace-nowrap">
            {rec.in_time || '--'} - {rec.out_time || '--'}
          </div>

          {/* Duration Badge with Clock Icon */}
          <div className="flex items-center justify-center gap-1 text-[11px] font-mono font-medium">
            <span
              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                isLate ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
              }`}
            >
              ⏱
            </span>
            <span className="text-slate-700 font-bold">
              ({rec.total_working_hours_formatted || '00:00'})
            </span>
          </div>

          {/* Quick status pill for deviations */}
          {(isLate || isEarlyLeave) && (
            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-200/90 text-amber-800">
              {isLate ? 'Late' : 'Early Out'}
            </span>
          )}
        </div>
      )
    }

    // 2. Sunday / Weekend / Holiday
    if (dayName === 'Sunday') {
      return (
        <div className="flex items-center justify-center py-2">
          <span className="bg-[#b38600] text-white px-2.5 py-1 rounded text-[11px] font-bold shadow-2xs tracking-wide">
            Holiday
          </span>
        </div>
      )
    }

    // 3. Fallback Absent / Off Day
    return (
      <div className="flex items-center justify-center py-2 text-slate-400 font-mono text-xs">
        --
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
          {/* View Mode Toggle */}
          <div className="bg-slate-100 p-0.5 rounded-lg border border-slate-200 flex items-center">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-[#003D5C] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-[#009D9E]" />
              Grid View
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-[#003D5C] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5 text-[#003D5C]" />
              List View
            </button>
          </div>

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

      {/* Top Filter Bar (Styled exactly like reference UI) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4">
        {/* Row 1: From Date, To Date, Department, Submit Button */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 items-end">
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
              Select Department
            </label>
            <Select
              value={selectedDepartment}
              onValueChange={(val) => setSelectedDepartment(val || 'all')}
            >
              <SelectTrigger className="text-xs border-slate-300 h-9.5 font-medium">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ALL DEPARTMENTS</SelectItem>
                {distinctDepartments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Button
              onClick={fetchRecords}
              className="w-full bg-[#2d3748] hover:bg-[#1a202c] text-white font-bold uppercase tracking-wider text-xs h-9.5 shadow-xs"
            >
              SUBMIT
            </Button>
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

          {/* Instant Search Bar */}
          <div className="flex items-center gap-2 w-full sm:w-72">
            <span className="text-xs text-slate-500 font-semibold">Search:</span>
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <Input
                type="text"
                placeholder="Search Employee Name, ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-xs border-slate-300 h-8.5"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Employees</p>
          <p className="font-['Montserrat'] text-lg font-extrabold text-[#003D5C] mt-0.5">{filteredEmployees.length}</p>
        </div>
        <div className="bg-white border border-slate-200 border-l-4 border-l-emerald-500 rounded-lg p-3 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">On Time Arrival</p>
          <p className="font-['Montserrat'] text-lg font-extrabold text-emerald-600 mt-0.5">{summary.onTimeArrivals}</p>
        </div>
        <div className="bg-white border border-slate-200 border-l-4 border-l-amber-500 rounded-lg p-3 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Late Arrival</p>
          <p className="font-['Montserrat'] text-lg font-extrabold text-amber-600 mt-0.5">{summary.lateArrivals}</p>
        </div>
        <div className="bg-white border border-slate-200 border-l-4 border-l-teal-500 rounded-lg p-3 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">On Time Departure</p>
          <p className="font-['Montserrat'] text-lg font-extrabold text-teal-600 mt-0.5">{summary.onTimeDepartures}</p>
        </div>
        <div className="bg-white border border-slate-200 border-l-4 border-l-rose-500 rounded-lg p-3 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Early Departure</p>
          <p className="font-['Montserrat'] text-lg font-extrabold text-rose-600 mt-0.5">{summary.earlyDepartures}</p>
        </div>
        <div className="bg-white border border-slate-200 border-l-4 border-l-[#003D5C] rounded-lg p-3 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Hours</p>
          <p className="font-['Montserrat'] text-lg font-extrabold text-slate-800 mt-0.5 font-mono">
            {summary.totalHours}
          </p>
        </div>
      </div>

      {/* VIEW MODE 1: MATRIX / GRID TIMESHEET (Requested Design) */}
      {viewMode === 'grid' && (
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

                  {/* Fixed Column 3: Department / Designation */}
                  <th className="py-3 px-3.5 sticky left-[260px] z-40 bg-[#2d3748] border-r border-slate-600/80 min-w-[140px] uppercase tracking-wider text-[11px]">
                    Department ⇅
                  </th>

                  {/* Dynamic Date Columns */}
                  {dateColumns.map((date) => {
                    const day = getDayName(date)
                    const isSunday = day === 'Sunday'
                    return (
                      <th
                        key={date}
                        className={`py-2 px-3 text-center border-r border-slate-600/80 min-w-[155px] font-sans ${
                          isSunday ? 'bg-[#242c3a] text-amber-300' : 'bg-[#2d3748] text-white'
                        }`}
                      >
                        <div className="text-[11px] font-bold font-mono tracking-tight">{date}</div>
                        <div className="text-[10px] font-semibold tracking-wider text-slate-300 uppercase">
                          {day} ⇅
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
                      colSpan={3 + dateColumns.length}
                      className="py-20 text-center text-slate-400 bg-white"
                    >
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-[#009D9E]" />
                      <p className="font-semibold text-slate-600 text-sm">Loading attendance timesheet grid...</p>
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3 + dateColumns.length}
                      className="py-20 text-center text-slate-400 bg-white"
                    >
                      <Calendar className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-600 text-sm">No matching employees found</p>
                      <p className="text-xs text-slate-400 mt-1">Try adjusting your department or search query.</p>
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

                        {/* Sticky Column 3: Department / Designation */}
                        <td
                          className={`py-3 px-3.5 text-slate-600 border-r border-slate-200 text-xs sticky left-[260px] z-20 ${
                            isEven ? 'bg-white' : 'bg-[#f8fafc]'
                          } shadow-[3px_0_5px_rgba(0,0,0,0.04)] font-medium`}
                        >
                          {emp.designation || 'Staff'}
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
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> On Time
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Late / Deviation
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#b38600]"></span> Holiday
              </span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: CLASSIC LIST VIEW (Single record per row) */}
      {viewMode === 'list' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Employee ID</th>
                  <th className="py-3 px-4">Employee Name</th>
                  <th className="py-3 px-4">Designation</th>
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
                    <td colSpan={11} className="py-16 text-center text-slate-400">
                      <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2 text-[#009D9E]" />
                      Loading attendance records...
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-16 text-center text-slate-400">
                      <Calendar className="w-9 h-9 mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-600 text-sm">No matching attendance records found</p>
                    </td>
                  </tr>
                ) : (
                  records.map((record) => {
                    const empName = record.employee?.name || 'Employee'
                    const initial = empName.trim().charAt(0).toUpperCase() || 'E'
                    return (
                      <tr key={record.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {record.employee?.employee_id || record.employee_id || 'N/A'}
                        </td>
                        <td className="py-3 px-4 font-semibold">
                          <Link
                            href={`/attendance/employees/${record.employee?.id || record.employee_id}`}
                            className="text-[#003D5C] hover:text-[#009D9E] font-bold text-xs"
                          >
                            {empName}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {record.employee?.designation || '--'}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {record.attendance_date}
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-medium">
                          {record.day_of_week}
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-900">
                          {record.in_time || '--'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              record.arrival_status === 'On Time Arrival'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {record.arrival_status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-900">
                          {record.out_time || '--'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              record.departure_status === 'On Time Departure'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {record.departure_status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {record.total_working_hours_formatted || '--'}
                        </td>
                        <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingPunchesRecord(record)}
                            title="View Raw Punches"
                            className="h-7 w-7 p-0 text-slate-500 hover:text-[#009D9E]"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingRecord(record)}
                            title="Edit Attendance"
                            className="h-7 w-7 p-0 text-slate-500 hover:text-[#003D5C]"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
      />
    </div>
  )
}
