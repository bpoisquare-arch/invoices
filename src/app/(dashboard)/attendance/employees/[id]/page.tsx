'use client'

import React, { useEffect, useState, use } from 'react'
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

  // Filters
  const [selectedMonth, setSelectedMonth] = useState('')
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
    formattedTotalHours: string
  }>({
    totalDays: 0,
    onTimeArrivals: 0,
    lateArrivals: 0,
    onTimeArrivalRate: 0,
    onTimeDepartures: 0,
    earlyDepartures: 0,
    onTimeDepartureRate: 0,
    formattedTotalHours: '0h 0m',
  })

  // Modals
  const [editingRecord, setEditingRecord] = useState<AttendanceRecordWithEmployee | null>(null)
  const [viewingPunchesRecord, setViewingPunchesRecord] = useState<AttendanceRecordWithEmployee | null>(null)

  const loadData = async () => {
    try {
      setIsLoading(true)

      // Fetch employee info
      const empRes = await fetch('/api/attendance/employees')
      const empData = await empRes.json()
      if (empData.success && empData.employees) {
        const found = empData.employees.find(
          (e: Employee) => e.id === employeeId || e.employee_id === employeeId
        )
        if (found) setEmployee(found)
      }

      // Fetch settings
      const settRes = await fetch('/api/attendance/settings')
      const settData = await settRes.json()
      if (settData.success && settData.settings) setSettings(settData.settings)

      // Fetch employee records
      const queryParams = new URLSearchParams()
      queryParams.set('employeeId', employeeId)
      if (selectedMonth) queryParams.set('month', selectedMonth)
      if (startDate) queryParams.set('startDate', startDate)
      if (endDate) queryParams.set('endDate', endDate)
      if (arrivalStatus && arrivalStatus !== 'all') queryParams.set('arrivalStatus', arrivalStatus)
      queryParams.set('pageSize', '1000')

      const recordsRes = await fetch(`/api/attendance/records?${queryParams.toString()}`)
      const recordsData = await recordsRes.json()

      if (recordsData.success && recordsData.records) {
        setRecords(recordsData.records)
      }

      // Fetch summary
      const summaryParams = new URLSearchParams()
      summaryParams.set('employeeId', employeeId)
      if (selectedMonth) summaryParams.set('month', selectedMonth)
      if (startDate) summaryParams.set('startDate', startDate)
      if (endDate) summaryParams.set('endDate', endDate)
      summaryParams.set('mode', 'summary')

      const summaryRes = await fetch(`/api/attendance/records?${summaryParams.toString()}`)
      const summaryData = await summaryRes.json()
      if (summaryData.success && summaryData.summary) {
        setSummary(summaryData.summary)
      }
    } catch (err) {
      console.error('Error loading employee details:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [employeeId, selectedMonth, startDate, endDate, arrivalStatus])

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
              <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                (employee?.branch || 'Multan').toLowerCase() === 'lahore'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {employee?.branch || 'Multan'} Branch
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-500 mt-0.5">
              {employee?.designation || 'Staff'} • Joined: {employee?.joining_date ? new Date(employee.joining_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : (employee ? new Date(employee.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '')}
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

      {/* Metrics Summary Bento */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Working Days */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Days</p>
          <p className="text-2xl font-extrabold text-[#003D5C] mt-1">{summary.totalDays}</p>
          <p className="text-[11px] text-slate-400 mt-1">Recorded days</p>
        </div>

        {/* On-Time Arrival */}
        <div className="bg-white border border-emerald-200/80 rounded-xl p-4 shadow-2xs bg-emerald-50/10">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">On Time Arrival</p>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">{summary.onTimeArrivals}</p>
          <p className="text-[11px] text-emerald-700 font-semibold mt-1">{summary.onTimeArrivalRate}% rate</p>
        </div>

        {/* Late Arrival */}
        <div className="bg-white border border-amber-200/80 rounded-xl p-4 shadow-2xs bg-amber-50/10">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Late Arrivals</p>
          <p className="text-2xl font-extrabold text-amber-600 mt-1">{summary.lateArrivals}</p>
          <p className="text-[11px] text-amber-700 font-semibold mt-1">After cutoff</p>
        </div>

        {/* On-Time Departure */}
        <div className="bg-white border border-emerald-200/80 rounded-xl p-4 shadow-2xs bg-emerald-50/10">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">On Time Departure</p>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">{summary.onTimeDepartures}</p>
          <p className="text-[11px] text-emerald-700 font-semibold mt-1">{summary.onTimeDepartureRate}% rate</p>
        </div>

        {/* Early Departure */}
        <div className="bg-white border border-rose-200/80 rounded-xl p-4 shadow-2xs bg-rose-50/10">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Early Departure</p>
          <p className="text-2xl font-extrabold text-rose-600 mt-1">{summary.earlyDepartures}</p>
          <p className="text-[11px] text-rose-700 font-semibold mt-1">Left early</p>
        </div>

        {/* Total Working Hours */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Worked</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">{summary.formattedTotalHours}</p>
          <p className="text-[11px] text-slate-400 mt-1">Sum of intervals</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Month</label>
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value)
                setStartDate('')
                setEndDate('')
              }}
              className="text-xs border-slate-200 w-44"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">From Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                setSelectedMonth('')
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
              }}
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

        {(selectedMonth || startDate || endDate || arrivalStatus !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedMonth('')
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
    </div>
  )
}
