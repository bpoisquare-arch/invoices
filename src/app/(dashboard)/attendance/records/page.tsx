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

export default function AttendanceRecordsPage() {
  const [records, setRecords] = useState<AttendanceRecordWithEmployee[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [settings, setSettings] = useState<AttendanceSettings | undefined>()
  const [isLoading, setIsLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [dayOfWeek, setDayOfWeek] = useState<string>('all')
  const [arrivalStatus, setArrivalStatus] = useState<string>('all')
  const [departureStatus, setDepartureStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('date_desc')

  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Modals
  const [editingRecord, setEditingRecord] = useState<AttendanceRecordWithEmployee | null>(null)
  const [viewingPunchesRecord, setViewingPunchesRecord] = useState<AttendanceRecordWithEmployee | null>(null)

  // Summary of current filtered view
  const [filteredSummary, setFilteredSummary] = useState<{
    totalDays: number
    onTimeArrivals: number
    lateArrivals: number
    onTimeDepartures: number
    earlyDepartures: number
    formattedTotalHours: string
  }>({
    totalDays: 0,
    onTimeArrivals: 0,
    lateArrivals: 0,
    onTimeDepartures: 0,
    earlyDepartures: 0,
    formattedTotalHours: '0h 0m',
  })

  // Load initial employees and settings
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
        console.error('Error loading metadata:', err)
      }
    }
    loadMeta()
  }, [])

  // Fetch records whenever filters or pagination change
  const fetchRecords = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (selectedEmployeeId && selectedEmployeeId !== 'all') params.set('employeeId', selectedEmployeeId)
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      if (selectedMonth) params.set('month', selectedMonth)
      if (dayOfWeek && dayOfWeek !== 'all') params.set('dayOfWeek', dayOfWeek)
      if (arrivalStatus && arrivalStatus !== 'all') params.set('arrivalStatus', arrivalStatus)
      if (departureStatus && departureStatus !== 'all') params.set('departureStatus', departureStatus)
      if (sortBy) params.set('sortBy', sortBy)
      params.set('page', page.toString())
      params.set('pageSize', pageSize.toString())

      const res = await fetch(`/api/attendance/records?${params.toString()}`)
      const data = await res.json()

      if (data.success) {
        let recs = data.records || []
        try {
          const rawLocal = localStorage.getItem('attendance_records_store')
          if (rawLocal) {
            const parsedLocal: AttendanceRecordWithEmployee[] = JSON.parse(rawLocal)
            parsedLocal.forEach((loc) => {
              if (!recs.some((r: any) => r.id === loc.id || (r.employee_id === loc.employee_id && r.attendance_date === loc.attendance_date))) {
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
        setTotalCount(Math.max(data.totalCount || 0, recs.length))
        setTotalPages(data.totalPages || Math.max(1, Math.ceil(recs.length / pageSize)))
      }

      // Also get summary for this filter slice
      const summaryParams = new URLSearchParams()
      if (selectedEmployeeId && selectedEmployeeId !== 'all') summaryParams.set('employeeId', selectedEmployeeId)
      if (startDate) summaryParams.set('startDate', startDate)
      if (endDate) summaryParams.set('endDate', endDate)
      if (selectedMonth) summaryParams.set('month', selectedMonth)
      summaryParams.set('mode', 'summary')

      const summaryRes = await fetch(`/api/attendance/records?${summaryParams.toString()}`)
      const summaryData = await summaryRes.json()
      if (summaryData.success && summaryData.summary) {
        setFilteredSummary(summaryData.summary)
      }
    } catch (err) {
      console.error('Error fetching records:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [
    search,
    selectedEmployeeId,
    startDate,
    endDate,
    selectedMonth,
    dayOfWeek,
    arrivalStatus,
    departureStatus,
    sortBy,
    page,
    pageSize,
  ])

  const handleResetFilters = () => {
    setSearch('')
    setSelectedEmployeeId('all')
    setStartDate('')
    setEndDate('')
    setSelectedMonth('')
    setDayOfWeek('all')
    setArrivalStatus('all')
    setDepartureStatus('all')
    setSortBy('date_desc')
    setPage(1)
  }

  const handleDeleteRecord = async (id: string) => {
    if (!confirm('Are you sure you want to delete this attendance record?')) return
    try {
      const res = await fetch(`/api/attendance/records?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        fetchRecords()
      }
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const handleExportExcel = () => {
    if (records.length === 0) {
      alert('No records to export.')
      return
    }

    const exportRows = records.map((r) => ({
      'Employee ID': r.employee?.employee_id || '',
      'Employee Name': r.employee?.name || '',
      Designation: r.employee?.designation || '',
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
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance')
    XLSX.writeFile(wb, `attendance_export_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const hasActiveFilters =
    search ||
    selectedEmployeeId !== 'all' ||
    startDate ||
    endDate ||
    selectedMonth ||
    dayOfWeek !== 'all' ||
    arrivalStatus !== 'all' ||
    departureStatus !== 'all'

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-['Montserrat'] text-2xl font-bold text-[#003D5C] tracking-tight">
            Attendance Records
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Search, filter, view raw punch events, and edit employee attendance records.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="outline"
            onClick={handleExportExcel}
            className="text-xs font-bold uppercase tracking-wider text-slate-700 border-slate-300 gap-1.5 shadow-2xs"
          >
            <Download className="w-4 h-4 text-[#009D9E]" />
            Export Excel
          </Button>

          <Link href="/attendance/import">
            <Button className="bg-[#009D9E] hover:bg-[#007A7A] text-white px-5 py-2.5 font-bold uppercase tracking-wider text-xs gap-2 shadow-xs transition-colors">
              <FileSpreadsheet className="w-4 h-4" />
              Import Excel
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Stat Badges for Active Query (Stitch Theme) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500">Total Records</p>
          <p className="font-['Montserrat'] text-xl font-extrabold text-[#003D5C] mt-0.5">{totalCount}</p>
        </div>
        <div className="bg-white border border-slate-200/90 border-l-4 border-l-emerald-500 rounded-xl p-3.5 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500">On Time Arrival</p>
          <p className="font-['Montserrat'] text-xl font-extrabold text-emerald-600 mt-0.5">{filteredSummary.onTimeArrivals}</p>
        </div>
        <div className="bg-white border border-slate-200/90 border-l-4 border-l-amber-500 rounded-xl p-3.5 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500">Late Arrival</p>
          <p className="font-['Montserrat'] text-xl font-extrabold text-amber-600 mt-0.5">{filteredSummary.lateArrivals}</p>
        </div>
        <div className="bg-white border border-slate-200/90 border-l-4 border-l-teal-500 rounded-xl p-3.5 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500">On Time Departure</p>
          <p className="font-['Montserrat'] text-xl font-extrabold text-teal-600 mt-0.5">{filteredSummary.onTimeDepartures}</p>
        </div>
        <div className="bg-white border border-slate-200/90 border-l-4 border-l-rose-500 rounded-xl p-3.5 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500">Early Departure</p>
          <p className="font-['Montserrat'] text-xl font-extrabold text-rose-600 mt-0.5">{filteredSummary.earlyDepartures}</p>
        </div>
        <div className="bg-white border border-slate-200/90 border-l-4 border-l-[#003D5C] rounded-xl p-3.5 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500">Total Hours</p>
          <p className="font-['Montserrat'] text-xl font-extrabold text-slate-800 mt-0.5 font-mono">
            {filteredSummary.formattedTotalHours}
          </p>
        </div>
      </div>

      {/* Filter Control Box */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs space-y-3">
        {/* Row 1: Search, Employee, Month, Clear */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <Input
              type="text"
              placeholder="Search by Employee Name, ID, Designation..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="pl-9 text-xs border-slate-200"
            />
          </div>

          {/* Employee Dropdown */}
          <div>
            <Select
              value={selectedEmployeeId}
              onValueChange={(val) => {
                setSelectedEmployeeId(val || 'all')
                setPage(1)
              }}
            >
              <SelectTrigger className="text-xs border-slate-200">
                <SelectValue placeholder="All Employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employee_id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Month Picker */}
          <div>
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value)
                setStartDate('')
                setEndDate('')
                setPage(1)
              }}
              className="text-xs border-slate-200"
            />
          </div>

          {/* Sort By */}
          <div>
            <Select
              value={sortBy}
              onValueChange={(val) => {
                setSortBy(val || 'date_desc')
                setPage(1)
              }}
            >
              <SelectTrigger className="text-xs border-slate-200">
                <SelectValue placeholder="Sort Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Newest Date First</SelectItem>
                <SelectItem value="date_asc">Oldest Date First</SelectItem>
                <SelectItem value="employee_asc">Employee Name (A-Z)</SelectItem>
                <SelectItem value="employee_desc">Employee Name (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 2: Date Range, Day, Arrival Status, Departure Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1 border-t border-slate-100">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">From Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                setSelectedMonth('')
                setPage(1)
              }}
              className="text-xs border-slate-200"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">To Date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setSelectedMonth('')
                setPage(1)
              }}
              className="text-xs border-slate-200"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Day of Week</label>
            <Select
              value={dayOfWeek}
              onValueChange={(val) => {
                setDayOfWeek(val || 'all')
                setPage(1)
              }}
            >
              <SelectTrigger className="text-xs border-slate-200">
                <SelectValue placeholder="All Days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Days</SelectItem>
                <SelectItem value="Monday">Monday</SelectItem>
                <SelectItem value="Tuesday">Tuesday</SelectItem>
                <SelectItem value="Wednesday">Wednesday</SelectItem>
                <SelectItem value="Thursday">Thursday</SelectItem>
                <SelectItem value="Friday">Friday</SelectItem>
                <SelectItem value="Saturday">Saturday</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Arrival Status</label>
            <Select
              value={arrivalStatus}
              onValueChange={(val) => {
                setArrivalStatus(val || 'all')
                setPage(1)
              }}
            >
              <SelectTrigger className="text-xs border-slate-200">
                <SelectValue placeholder="All Arrival Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Arrival Statuses</SelectItem>
                <SelectItem value="On Time Arrival">On Time Arrival</SelectItem>
                <SelectItem value="Late Arrival">Late Arrival</SelectItem>
                <SelectItem value="Missing In Time">Missing In Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Departure Status</label>
            <Select
              value={departureStatus}
              onValueChange={(val) => {
                setDepartureStatus(val || 'all')
                setPage(1)
              }}
            >
              <SelectTrigger className="text-xs border-slate-200">
                <SelectValue placeholder="All Departure Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departure Statuses</SelectItem>
                <SelectItem value="On Time Departure">On Time Departure</SelectItem>
                <SelectItem value="Early Departure">Early Departure</SelectItem>
                <SelectItem value="Missing Out Time">Missing Out Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-xs text-slate-500 font-medium">Filters active: Showing filtered records</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1 h-7 font-semibold"
            >
              <X className="w-3.5 h-3.5" />
              Clear All Filters
            </Button>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
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
                    <p className="text-xs text-slate-400 mt-1">
                      Try adjusting your filters or import records from an Excel spreadsheet.
                    </p>
                  </td>
                </tr>
              ) : (
                records.map((record) => {
                  const empName = record.employee?.name || 'Employee'
                  const initial = empName.trim().charAt(0).toUpperCase() || 'E'
                  return (
                    <tr key={record.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Employee ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-xs">
                        {record.employee?.employee_id || 'N/A'}
                      </td>

                      {/* Employee Name with Avatar */}
                      <td className="py-3.5 px-4 font-semibold">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#003D5C]/10 text-[#003D5C] font-extrabold text-[11px] flex items-center justify-center shrink-0 border border-[#003D5C]/15">
                            {initial}
                          </div>
                          <Link
                            href={`/attendance/employees/${record.employee?.id || record.employee_id}`}
                            className="text-[#003D5C] hover:text-[#009D9E] font-bold text-xs"
                          >
                            {empName}
                          </Link>
                        </div>
                      </td>

                      {/* Designation */}
                      <td className="py-3.5 px-4 text-slate-600 text-xs">
                        {record.employee?.designation || '--'}
                      </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {record.attendance_date}
                    </td>

                    {/* Day */}
                    <td className="py-3.5 px-4 text-slate-500 font-medium">
                      {record.day_of_week}
                    </td>

                    {/* In Time */}
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                      {record.in_time || '--'}
                    </td>

                    {/* Arrival Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                          record.arrival_status === 'On Time Arrival'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : record.arrival_status === 'Late Arrival'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {record.arrival_status}
                      </span>
                    </td>

                    {/* Out Time */}
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                      {record.out_time || '--'}
                    </td>

                    {/* Departure Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                          record.departure_status === 'On Time Departure'
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingRecord(record)}
                        title="Edit Attendance"
                        className="h-8 w-8 p-0 text-slate-500 hover:text-[#003D5C] hover:bg-slate-100"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRecord(record.id)}
                        title="Delete Record"
                        className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                )
              }))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Showing {records.length} of {totalCount} records</span>
            <span>•</span>
            <span>Page {page} of {totalPages}</span>
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={pageSize.toString()}
              onValueChange={(val) => {
                setPageSize(parseInt(val || '25', 10))
                setPage(1)
              }}
            >
              <SelectTrigger className="w-24 h-8 text-xs border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / page</SelectItem>
                <SelectItem value="25">25 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
                <SelectItem value="100">100 / page</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="h-8 px-2.5 text-xs font-semibold"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="h-8 px-2.5 text-xs font-semibold"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <EditAttendanceModal
        isOpen={!!editingRecord}
        onClose={() => setEditingRecord(null)}
        record={editingRecord}
        onSaveSuccess={() => {
          fetchRecords()
        }}
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
