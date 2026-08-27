'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import {
  Receipt,
  Search,
  Calendar,
  Building2,
  FileSpreadsheet,
  Download,
  Printer,
  Eye,
  Loader2,
  Users,
  Banknote,
  MoreVertical,
  Mail,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  ArrowUpDown,
} from 'lucide-react'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { EMPLOYEE_DESIGNATIONS } from '@/lib/constants/designations'
import { Employee } from '@/lib/supabase/database.types'
import { pdf } from '@react-pdf/renderer'
import PayslipPDFTemplate from '@/components/pdf/payslip-pdf-template'

const MONTHS = [
  { value: '0', label: 'January' },
  { value: '1', label: 'February' },
  { value: '2', label: 'March' },
  { value: '3', label: 'April' },
  { value: '4', label: 'May' },
  { value: '5', label: 'June' },
  { value: '6', label: 'July' },
  { value: '7', label: 'August' },
  { value: '8', label: 'September' },
  { value: '9', label: 'October' },
  { value: '10', label: 'November' },
  { value: '11', label: 'December' },
]

const YEARS = ['2024', '2025', '2026', '2027', '2028']

// Helper to convert number to words for Pakistani Rupees
function numberToWordsPKR(num: number): string {
  if (!num || isNaN(num) || num === 0) return 'Zero Pakistani Rupees Only'

  const a = [
    '',
    'one',
    'two',
    'three',
    'four',
    'five',
    'six',
    'seven',
    'eight',
    'nine',
    'ten',
    'eleven',
    'twelve',
    'thirteen',
    'fourteen',
    'fifteen',
    'sixteen',
    'seventeen',
    'eighteen',
    'nineteen',
  ]
  const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

  const convertLessThanOneThousand = (n: number): string => {
    let result = ''
    if (n >= 100) {
      result += a[Math.floor(n / 100)] + ' hundred '
      n %= 100
      if (n > 0) result += 'and '
    }
    if (n >= 20) {
      const tens = b[Math.floor(n / 10)]
      const ones = a[n % 10]
      result += (ones ? `${tens}-${ones}` : tens) + ' '
    } else if (n > 0) {
      result += a[n] + ' '
    }
    return result.trim()
  }

  let integerPart = Math.floor(Math.abs(num))
  if (integerPart === 0) return 'Zero Pakistani Rupees Only'

  let words = ''

  if (integerPart >= 1000000000) {
    words += convertLessThanOneThousand(Math.floor(integerPart / 1000000000)) + ' billion '
    integerPart %= 1000000000
  }
  if (integerPart >= 1000000) {
    words += convertLessThanOneThousand(Math.floor(integerPart / 1000000)) + ' million '
    integerPart %= 1000000
  }
  if (integerPart >= 1000) {
    words += convertLessThanOneThousand(Math.floor(integerPart / 1000)) + ' thousand '
    integerPart %= 1000
  }
  if (integerPart > 0) {
    words += convertLessThanOneThousand(integerPart) + ' '
  }

  words = words.trim()
  if (words.length > 0) {
    words = words.charAt(0).toUpperCase() + words.slice(1)
  }

  return `${words} Pakistani Rupees Only`
}

export default function PayslipsPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  // Current Date Defaults
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState<string>(String(now.getMonth()))
  const [selectedYear, setSelectedYear] = useState<string>(String(now.getFullYear()))
  const [selectedDesignation, setSelectedDesignation] = useState<string>('all')
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [pageSize, setPageSize] = useState<number | 'all'>('all')

  // Selected Employee for View/Print Modal
  const [selectedPayslipEmployee, setSelectedPayslipEmployee] = useState<Employee | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const payslipRef = useRef<HTMLDivElement>(null)

  // Computed Date Range based on selected Month & Year
  const { startDate, endDate, daysInMonth, monthLabel } = useMemo(() => {
    const m = parseInt(selectedMonth, 10)
    const y = parseInt(selectedYear, 10)
    const totalDays = new Date(y, m + 1, 0).getDate()
    const sDate = `${y}-${String(m + 1).padStart(2, '0')}-01`
    const eDate = `${y}-${String(m + 1).padStart(2, '0')}-${String(totalDays).padStart(2, '0')}`
    const label = `${MONTHS.find((item) => item.value === selectedMonth)?.label || 'Month'} ${y}`
    return { startDate: sDate, endDate: eDate, daysInMonth: totalDays, monthLabel: label }
  }, [selectedMonth, selectedYear])

  // Fetch employees and attendance records for selected month
  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [empRes, attRes] = await Promise.all([
        fetch('/api/attendance/employees?isActiveOnly=false'),
        fetch(`/api/attendance/records?startDate=${startDate}&endDate=${endDate}`),
      ])

      const empData = await empRes.json()
      if (empData.success && Array.isArray(empData.employees)) {
        setEmployees(empData.employees)
      }

      const attData = await attRes.json()
      if (attData.success && Array.isArray(attData.records)) {
        setAttendanceRecords(attData.records)
      }
    } catch (e) {
      console.error('Failed to fetch payslip data:', e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [startDate, endDate])

  // Available Branches and Designations dynamically collected
  const availableBranches = useMemo(() => {
    const s = new Set<string>()
    employees.forEach((e) => {
      if (e.branch) s.add(e.branch)
    })
    if (!s.has('Multan')) s.add('Multan')
    return Array.from(s).sort()
  }, [employees])

  const availableDesignations = useMemo(() => {
    const s = new Set<string>(EMPLOYEE_DESIGNATIONS)
    employees.forEach((e) => {
      if (e.designation) s.add(e.designation)
    })
    return Array.from(s).sort()
  }, [employees])

  // Attendance aggregates per employee for the selected month
  const employeeAttendanceStats = useMemo(() => {
    const map: Record<
      string,
      {
        alDays: number
        clDays: number
        slDays: number
        wfhDays: number
        unpaidDays: number
      }
    > = {}

    for (const rec of attendanceRecords) {
      const empId = rec.employee_id || rec.employee?.id || rec.employee?.employee_id
      if (!empId) continue

      if (!map[empId]) {
        map[empId] = { alDays: 0, clDays: 0, slDays: 0, wfhDays: 0, unpaidDays: 0 }
      }

      const arrStatus = rec.arrival_status || ''
      const depStatus = rec.departure_status || ''
      const isLeave = arrStatus === 'Leave' || depStatus.includes('Leave')
      const isWfh = depStatus === 'Work From Home' || arrStatus === 'Work From Home'
      const isAbsent = arrStatus === 'Absent' || depStatus === 'Absent'

      // Check leave duration notes
      let leaveVal = 1
      if (Array.isArray(rec.raw_punches)) {
        const found = (rec.raw_punches as any[]).find((p) => p && typeof p === 'object' && p.notes)
        if (found && found.notes) {
          const match = found.notes.match(/([\d.]+)\s*day/i)
          if (match && match[1]) {
            leaveVal = parseFloat(match[1]) || 1
          }
        }
      }

      if (isWfh) {
        map[empId].wfhDays += 1
      } else if (isAbsent) {
        map[empId].unpaidDays += 1
      } else if (isLeave) {
        if (depStatus.includes('Annual') || arrStatus.includes('Annual')) {
          map[empId].alDays += leaveVal
        } else if (depStatus.includes('Casual') || arrStatus.includes('Casual')) {
          map[empId].clDays += leaveVal
        } else if (depStatus.includes('Sick') || arrStatus.includes('Sick')) {
          map[empId].slDays += leaveVal
        } else {
          map[empId].alDays += leaveVal
        }
      }
    }

    return map
  }, [attendanceRecords])

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (selectedDesignation !== 'all' && emp.designation !== selectedDesignation) {
        return false
      }
      if (selectedBranch !== 'all' && (emp.branch || 'Multan') !== selectedBranch) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = emp.name?.toLowerCase().includes(q)
        const matchId = emp.employee_id?.toLowerCase().includes(q)
        const matchDesig = emp.designation?.toLowerCase().includes(q)
        const matchBranch = (emp.branch || 'Multan').toLowerCase().includes(q)
        if (!matchName && !matchId && !matchDesig && !matchBranch) {
          return false
        }
      }
      return true
    })
  }, [employees, selectedDesignation, selectedBranch, searchQuery])

  // Displayed records with pagination
  const displayedEmployees = useMemo(() => {
    if (pageSize === 'all') return filteredEmployees
    return filteredEmployees.slice(0, pageSize)
  }, [filteredEmployees, pageSize])

  // Summary calculations
  const totalPayrollAmount = useMemo(() => {
    return filteredEmployees.reduce((sum, e) => sum + (Number(e.salary) || 0), 0)
  }, [filteredEmployees])

  // Helper calculation for selected employee's payslip data
  const getPayslipData = (emp: Employee) => {
    const stats =
      employeeAttendanceStats[emp.id] ||
      employeeAttendanceStats[emp.employee_id] || {
        alDays: 0,
        clDays: 0,
        slDays: 0,
        wfhDays: 0,
        unpaidDays: 0,
      }

    const totalWorkingDays = daysInMonth
    const unpaidDays = stats.unpaidDays
    const totalPaidDays = Math.max(0, totalWorkingDays - unpaidDays)

    const basicPay = Number(emp.salary) || 0
    const perDaySalary = totalWorkingDays > 0 ? basicPay / totalWorkingDays : 0
    const unpaidDeduction = Math.round(perDaySalary * unpaidDays)
    const commission = 0
    const adjustments = 0
    const totalEarnings = basicPay + commission + adjustments
    const totalDeduction = unpaidDeduction
    const netPay = Math.max(0, totalEarnings - totalDeduction)

    return {
      totalWorkingDays,
      alDays: stats.alDays,
      clDays: stats.clDays,
      slDays: stats.slDays,
      wfhDays: stats.wfhDays,
      unpaidDays,
      totalPaidDays,
      basicPay,
      commission,
      adjustments,
      totalEarnings,
      unpaidDeduction,
      totalDeduction,
      netPay,
      amountInWords: numberToWordsPKR(netPay),
    }
  }

  // Handle PDF Download directly using @react-pdf/renderer
  const handleDownloadPdf = async (emp: Employee) => {
    try {
      setIsGeneratingPdf(true)
      const data = getPayslipData(emp)
      const payPeriod = `${startDate.split('-').reverse().join('/')}`

      const doc = (
        <PayslipPDFTemplate
          employee={emp}
          payslipData={data}
          payPeriod={payPeriod}
        />
      )

      const blob = await pdf(doc).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Payslip_${emp.employee_id || 'Staff'}_${monthLabel.replace(/\s+/g, '_')}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error generating PDF with react-pdf:', err)
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const currentPayslipData = selectedPayslipEmployee ? getPayslipData(selectedPayslipEmployee) : null

  return (
    <div className="space-y-5 max-w-full mx-auto font-sans pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-['Montserrat'] text-2xl font-bold text-[#003D5C] tracking-tight flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-[#009D9E]" />
            Payslips
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Monthly employee salary slips, attendance deductions, branch-wise filters, and printable payslips.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            onClick={handlePrint}
            className="text-xs font-bold uppercase tracking-wider text-slate-700 border-slate-300 gap-1.5 shadow-2xs h-9"
          >
            <Printer className="w-4 h-4 text-[#009D9E]" />
            Print All
          </Button>

          <Button
            variant="outline"
            className="text-xs font-bold uppercase tracking-wider text-slate-700 border-slate-300 gap-1.5 shadow-2xs h-9"
          >
            <Download className="w-4 h-4 text-[#009D9E]" />
            Excel Export
          </Button>

          <Link href="/attendance/records">
            <Button className="bg-[#009D9E] hover:bg-[#007A7A] text-white px-4 py-2 font-bold uppercase tracking-wider text-xs gap-2 shadow-xs h-9">
              <FileSpreadsheet className="w-4 h-4" />
              Attendance Records
            </Button>
          </Link>
        </div>
      </div>

      {/* Top Unified Filter Bar with Month & Year Selectors */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-12 gap-3 items-end">
          {/* 1. Select Month */}
          <div className="lg:col-span-2 space-y-1">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              SELECT MONTH
            </label>
            <Select value={selectedMonth} onValueChange={(val) => setSelectedMonth(val || '0')}>
              <SelectTrigger className="text-xs border-slate-300 h-9.5 font-semibold rounded-lg bg-slate-50/50 focus:bg-white w-full">
                <SelectValue placeholder="Select Month" />
              </SelectTrigger>
              <SelectContent className="max-h-64 min-w-[160px]">
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2. Select Year */}
          <div className="lg:col-span-2 space-y-1">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              SELECT YEAR
            </label>
            <Select value={selectedYear} onValueChange={(val) => setSelectedYear(val || '2026')}>
              <SelectTrigger className="text-xs border-slate-300 h-9.5 font-semibold rounded-lg bg-slate-50/50 focus:bg-white w-full">
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent className="max-h-64 min-w-[120px]">
                {YEARS.map((yr) => (
                  <SelectItem key={yr} value={yr}>
                    {yr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3. Select Designation */}
          <div className="lg:col-span-3 space-y-1">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              SELECT DESIGNATION
            </label>
            <Select
              value={selectedDesignation}
              onValueChange={(val) => setSelectedDesignation(val || 'all')}
            >
              <SelectTrigger className="text-xs border-slate-300 h-9.5 font-medium rounded-lg bg-slate-50/50 focus:bg-white w-full">
                <SelectValue placeholder="ALL DESIGNATIONS">
                  {selectedDesignation === 'all' ? 'ALL DESIGNATIONS' : selectedDesignation}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-64 min-w-[260px]">
                <SelectItem value="all">ALL DESIGNATIONS</SelectItem>
                {availableDesignations.map((desig) => (
                  <SelectItem key={desig} value={desig}>
                    {desig}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 4. Branch Filter */}
          <div className="lg:col-span-2 space-y-1">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              BRANCH
            </label>
            <Select
              value={selectedBranch}
              onValueChange={(val) => setSelectedBranch(val || 'all')}
            >
              <SelectTrigger className="text-xs border-slate-300 h-9.5 font-medium rounded-lg bg-slate-50/50 focus:bg-white w-full">
                <SelectValue placeholder="ALL BRANCHES">
                  {selectedBranch === 'all' ? 'ALL BRANCHES' : selectedBranch}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-64 min-w-[180px]">
                <SelectItem value="all">ALL BRANCHES</SelectItem>
                {availableBranches.map((br) => (
                  <SelectItem key={br} value={br}>
                    {br}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 5. Search Bar */}
          <div className="lg:col-span-3 space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                SEARCH
              </label>
              <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                <span>Show:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const val = e.target.value
                    setPageSize(val === 'all' ? 'all' : parseInt(val, 10))
                  }}
                  className="border border-slate-200 rounded px-1.5 py-0.5 text-[10px] bg-slate-50 focus:outline-none focus:ring-1 focus:ring-[#009D9E]"
                >
                  <option value="all">All</option>
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                </select>
              </div>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <Input
                type="text"
                placeholder="Search Name, ID, Branch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 h-9.5 text-xs bg-slate-50/50 focus:bg-white border-slate-300 rounded-lg shadow-2xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards (Salaried Staff card removed per user instruction) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Staff</p>
          <p className="text-2xl font-bold font-mono text-[#003D5C] mt-1">{filteredEmployees.length}</p>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Monthly Payroll</p>
          <p className="text-2xl font-bold font-mono text-[#009D9E] mt-1">
            PKR {totalPayrollAmount.toLocaleString()}
          </p>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date Period</p>
          <p className="text-sm font-bold font-mono text-slate-800 mt-2 truncate">
            {startDate.split('-').reverse().join('/')} – {endDate.split('-').reverse().join('/')} ({monthLabel})
          </p>
        </div>
      </div>

      {/* Payslips Table with 3-Dots Dropdown Action Menu */}
      <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#002D27] text-white text-[11px] font-bold uppercase tracking-wider border-b border-[#002D27]">
                <th className="py-3 px-4 font-mono">BATCH ID</th>
                <th className="py-3 px-4">EMPLOYEE NAME</th>
                <th className="py-3 px-4">DESIGNATION</th>
                <th className="py-3 px-4">BRANCH</th>
                <th className="py-3 px-4 text-right font-mono">MONTHLY SALARY</th>
                <th className="py-3 px-4 text-center">PAYSLIP STATUS</th>
                <th className="py-3 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#009D9E] mb-2" />
                    <p className="font-medium text-xs">Loading employee payslips...</p>
                  </td>
                </tr>
              ) : displayedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-6 h-6 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No employees found matching the filters.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Try adjusting month, year, designation, or branch.</p>
                  </td>
                </tr>
              ) : (
                displayedEmployees.map((emp) => {
                  const salary = Number(emp.salary) || 0
                  const hasSalary = salary > 0

                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-default"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                        {emp.employee_id || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#009D9E]/10 text-[#009D9E] font-bold text-xs flex items-center justify-center shrink-0">
                            {emp.name?.charAt(0) || 'E'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">{emp.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {emp.is_old_staff
                                ? 'Old Staff (Confirmed)'
                                : emp.joining_date
                                ? `Joined: ${emp.joining_date.split('T')[0]}`
                                : 'Confirmed'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {emp.designation || 'Staff'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200/60">
                          {emp.branch || 'Multan'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        {hasSalary ? (
                          `PKR ${salary.toLocaleString()}`
                        ) : (
                          <span className="text-slate-400 font-normal">Not Set</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {hasSalary ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                            Salary Missing
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {/* 3-Dots Dropdown Action Menu (Matches Employee Overview Page) */}
                        <DropdownMenu>
                          <DropdownMenuTrigger className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-300 transition-colors shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#009D9E]/30 data-popup-open:bg-slate-100">
                            <MoreVertical className="w-4 h-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-44 bg-white border border-slate-200 shadow-xl rounded-xl p-1 text-xs z-50 animate-in fade-in-0 zoom-in-95"
                          >
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedPayslipEmployee(emp)
                                setIsViewModalOpen(true)
                              }}
                              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-slate-700 hover:bg-[#009D9E]/10 hover:text-[#003D5C] cursor-pointer font-medium transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#009D9E]" />
                              <span>View Payslip</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => handleDownloadPdf(emp)}
                              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-slate-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer font-medium transition-colors"
                            >
                              <Download className="w-3.5 h-3.5 text-blue-600" />
                              <span>Download PDF</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => {
                                alert(`Email feature will be activated soon for ${emp.name}`)
                              }}
                              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-slate-700 hover:bg-purple-50 hover:text-purple-700 cursor-pointer font-medium transition-colors"
                            >
                              <Mail className="w-3.5 h-3.5 text-purple-600" />
                              <span>Send Email</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Individual Payslip Voucher Modal (Exact Format from User's 2nd Attachment) */}
      {selectedPayslipEmployee && currentPayslipData && (
        <Dialog open={isViewModalOpen} onOpenChange={(open) => !open && setIsViewModalOpen(false)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] bg-white border border-slate-200 shadow-2xl rounded-2xl p-0 overflow-hidden flex flex-col">
            {/* Modal Scrollable Container */}
            <div className="overflow-y-auto p-8 flex-1 bg-white">
              <div
                id="printable-payslip"
                ref={payslipRef}
                className="bg-white p-8 max-w-xl mx-auto space-y-7 text-slate-900 border border-slate-100 shadow-xs rounded-lg font-sans"
              >
                {/* 1. Header Title (Exact green/teal styling from attachment) */}
                <div className="text-center pt-2">
                  <h1 className="text-3xl font-extrabold text-[#007A78] tracking-tight uppercase">
                    EMPLOYEE PAYSLIP
                  </h1>
                </div>

                {/* 2. Top Info Grid */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs font-medium pt-2">
                  <div className="flex items-center">
                    <span className="w-32 font-bold text-[#003D5C]">Pay Period</span>
                    <span className="mr-2 font-bold">:</span>
                    <span className="text-slate-800 font-mono">
                      {startDate.split('-').reverse().join('/')}
                    </span>
                  </div>

                  <div className="flex items-center">
                    <span className="w-28 font-bold text-[#003D5C]">Employee ID</span>
                    <span className="mr-2 font-bold">:</span>
                    <span className="text-slate-800 font-mono font-bold">
                      {selectedPayslipEmployee.employee_id || '01234'}
                    </span>
                  </div>

                  <div className="flex items-center">
                    <span className="w-32 font-bold text-[#003D5C]">Employee Name</span>
                    <span className="mr-2 font-bold">:</span>
                    <span className="text-slate-900 font-semibold">{selectedPayslipEmployee.name}</span>
                  </div>

                  <div className="flex items-center">
                    <span className="w-28 font-bold text-[#003D5C]">Designation</span>
                    <span className="mr-2 font-bold">:</span>
                    <span className="text-slate-800">{selectedPayslipEmployee.designation}</span>
                  </div>
                </div>

                {/* 3. ATTENDENCE Section */}
                <div className="space-y-1.5">
                  <h2 className="text-base font-bold text-[#007A78] uppercase tracking-wide">
                    ATTENDENCE
                  </h2>
                  <div className="border border-slate-200 overflow-hidden rounded-xs text-xs">
                    <div className="bg-[#EFEFEF] px-4 py-2 flex justify-between items-center text-slate-800 font-medium">
                      <span>Total Wroking Days</span>
                      <span className="font-mono">{currentPayslipData.totalWorkingDays.toFixed(2)}</span>
                    </div>
                    <div className="bg-white px-4 py-2 flex justify-between items-center text-slate-700">
                      <span>A/L Days</span>
                      <span className="font-mono">{currentPayslipData.alDays}</span>
                    </div>
                    <div className="bg-[#EFEFEF] px-4 py-2 flex justify-between items-center text-slate-800">
                      <span>C/L Days</span>
                      <span className="font-mono">{currentPayslipData.clDays}</span>
                    </div>
                    <div className="bg-white px-4 py-2 flex justify-between items-center text-slate-700">
                      <span>S/L Days</span>
                      <span className="font-mono">{currentPayslipData.slDays}</span>
                    </div>
                    <div className="bg-[#EFEFEF] px-4 py-2 flex justify-between items-center text-slate-800">
                      <span>WFH/L Days</span>
                      <span className="font-mono">{currentPayslipData.wfhDays}</span>
                    </div>
                    <div className="bg-white px-4 py-2 flex justify-between items-center text-slate-700">
                      <span>Unpaid Days</span>
                      <span className="font-mono">{currentPayslipData.unpaidDays}</span>
                    </div>
                    <div className="bg-[#E5E5E5] px-4 py-2.5 flex justify-between items-center text-slate-900 font-bold">
                      <span>Total Paid Days</span>
                      <span className="font-mono">{currentPayslipData.totalPaidDays.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* 4. EARNINGS Section */}
                <div className="space-y-1.5">
                  <h2 className="text-base font-bold text-[#007A78] uppercase tracking-wide">
                    EARNINGS
                  </h2>
                  <div className="border border-slate-200 overflow-hidden rounded-xs text-xs">
                    <div className="bg-[#EFEFEF] px-4 py-2 flex justify-between items-center text-slate-800 font-medium">
                      <span>Basic Pay</span>
                      <span className="font-mono">
                        ${currentPayslipData.basicPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="bg-white px-4 py-2 flex justify-between items-center text-slate-700">
                      <span>Comission</span>
                      <span className="font-mono">
                        ${currentPayslipData.commission.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="bg-[#EFEFEF] px-4 py-2 flex justify-between items-center text-slate-800">
                      <span>Adjustments</span>
                      <span className="font-mono">
                        ${currentPayslipData.adjustments.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="bg-white px-4 py-2.5 flex justify-between items-center text-slate-900 font-bold">
                      <span>Total Earnings</span>
                      <span className="font-mono">
                        ${currentPayslipData.totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5. DEDUCTIONS Section */}
                <div className="space-y-1.5">
                  <h2 className="text-base font-bold text-[#007A78] uppercase tracking-wide">
                    DEDUCTIONS
                  </h2>
                  <div className="border border-slate-200 overflow-hidden rounded-xs text-xs">
                    <div className="bg-[#EFEFEF] px-4 py-2 flex justify-between items-center text-slate-800 font-medium">
                      <span>Unpaid Days</span>
                      <span className="font-mono">
                        ${currentPayslipData.unpaidDeduction.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="bg-white px-4 py-2 flex justify-between items-center text-slate-900 font-bold">
                      <span>Total Deduction</span>
                      <span className="font-mono">
                        ${currentPayslipData.totalDeduction.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="bg-[#E5E5E5] px-4 py-2.5 flex justify-between items-center text-slate-900 font-bold">
                      <span>Net Pay</span>
                      <span className="font-mono">
                        ${currentPayslipData.netPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 6. Footer Information (Amount in Words & Disclaimer Note) */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-start gap-4 text-xs font-semibold text-slate-900">
                    <span className="font-bold shrink-0">Amount in Words</span>
                    <span className="text-slate-800 font-medium">
                      {currentPayslipData.amountInWords}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-700 text-center font-bold leading-relaxed pt-2">
                    This document is system generated and does not require any signature or the
                    Company's stamp in order to be considered valid
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200 flex sm:justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsViewModalOpen(false)}
                className="text-xs"
              >
                Close
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrint}
                  className="text-xs font-bold gap-1.5 border-slate-300"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Slip
                </Button>
                <Button
                  size="sm"
                  disabled={isGeneratingPdf}
                  onClick={() => handleDownloadPdf(selectedPayslipEmployee)}
                  className="bg-[#009D9E] hover:bg-[#007A7A] text-white text-xs font-bold gap-1.5"
                >
                  {isGeneratingPdf ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  Download PDF
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
