'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  StudentInstallmentSchedule,
  getInstallments,
  deleteInstallment,
  getAimtFixedInfo,
  syncLocalInstallmentsToSupabase,
} from '@/lib/services/installment.service'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, PlusCircle, Eye, Edit, Download, GraduationCap, Calendar, Loader2, RotateCcw, Filter, X, Trash2, Cloud, CheckCircle2, MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { pdf } from '@react-pdf/renderer'
import AimtSchedulePDFTemplate from '@/components/pdf/aimt-schedule-pdf-template'
import AimtScheduleWebPreview from '@/components/installments/aimt-schedule-web-preview'

export default function InstallmentsPage() {
  const router = useRouter()
  const [schedules, setSchedules] = useState<StudentInstallmentSchedule[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  // Date Filtering State
  const [datePreset, setDatePreset] = useState<'all' | 'today' | '7days' | '30days' | 'thisMonth' | 'custom'>('all')
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')

  async function loadData() {
    setIsLoading(true)
    try {
      const data = await getInstallments()
      setSchedules(data)
    } catch (err) {
      console.error('Failed to load installment schedules:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function resetFilters() {
    setSearch('')
    setDatePreset('all')
    setStartDateFilter('')
    setEndDateFilter('')
    loadData()
  }

  function handlePresetChange(preset: 'all' | 'today' | '7days' | '30days' | 'thisMonth' | 'custom') {
    setDatePreset(preset)
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    if (preset === 'all') {
      setStartDateFilter('')
      setEndDateFilter('')
    } else if (preset === 'today') {
      setStartDateFilter(todayStr)
      setEndDateFilter(todayStr)
    } else if (preset === '7days') {
      const d7 = new Date()
      d7.setDate(d7.getDate() - 7)
      setStartDateFilter(d7.toISOString().split('T')[0])
      setEndDateFilter(todayStr)
    } else if (preset === '30days') {
      const d30 = new Date()
      d30.setDate(d30.getDate() - 30)
      setStartDateFilter(d30.toISOString().split('T')[0])
      setEndDateFilter(todayStr)
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]
      setStartDateFilter(firstDay)
      setEndDateFilter(lastDay)
    }
  }

  async function handleDownloadPDF(schedule: StudentInstallmentSchedule) {
    try {
      setDownloadingId(schedule.id)
      const studentNameStr = schedule.student_name
        ? schedule.student_name.trim().replace(/[/\\?%*:|"<>]/g, '').replace(/\s+/g, '-')
        : (schedule.student_id || 'AIMT')
      const fileName = `Installment-Schedule-${studentNameStr}.pdf`

      // 1. Try server-side streaming PDF route first
      try {
        const response = await fetch(`/api/installments-pdf/${schedule.id}`)
        if (response.ok) {
          const blob = await response.blob()
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = fileName
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
          return
        }
      } catch (serverErr) {
        console.warn('Server PDF streaming failed, trying client-side renderer:', serverErr)
      }

      // 2. Client-side @react-pdf/renderer fallback
      const fixedInfo = getAimtFixedInfo()
      const blob = await pdf(<AimtSchedulePDFTemplate schedule={schedule} fixedInfo={fixedInfo} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error('PDF generation failed, opening direct link:', err)
      window.open(`/api/installments-pdf/${schedule.id}`, '_blank')
    } finally {
      setDownloadingId(null)
    }
  }

  const filteredSchedules = schedules.filter((s) => {
    // Search query match
    if (search.trim()) {
      const query = search.toLowerCase().trim()
      const matchSearch =
        s.student_id?.toLowerCase().includes(query) ||
        s.student_name?.toLowerCase().includes(query) ||
        s.course_name?.toLowerCase().includes(query) ||
        s.agency?.toLowerCase().includes(query)
      if (!matchSearch) return false
    }

    // Date range match (comparing schedule.date or schedule.start_date)
    const targetDate = s.date || s.start_date
    if (startDateFilter && targetDate < startDateFilter) return false
    if (endDateFilter && targetDate > endDateFilter) return false

    return true
  })

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A'
    if (dateStr.includes('/')) return dateStr
    const datePart = dateStr.split('T')[0]
    const parts = datePart.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return dateStr
  }

  return (
    <div className="space-y-6 max-w-full mx-auto font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#003D5C] tracking-tight flex items-center gap-2.5">
            <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7 text-[#009D9E]" />
            Student Installment Schedules
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Search, preview, manage and export AIMT College student installment plans.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={resetFilters}
            className="w-full sm:w-auto h-9 text-xs font-semibold gap-1.5 text-slate-700 hover:bg-slate-100 border-slate-300 justify-center"
            title="Refresh Data & Reset Filters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Refresh
          </Button>

          <Link href="/installments/new" className="w-full sm:w-auto">
            <Button size="sm" className="w-full sm:w-auto bg-[#009D9E] hover:bg-[#007A7A] text-white font-bold uppercase text-xs h-9 gap-2 shadow-xs justify-center">
              <PlusCircle className="w-4 h-4" />
              Create Schedule
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter / Search & Custom Date Range Bar */}
      <Card className="p-3.5 sm:p-4 bg-white border-slate-200 shadow-2xs space-y-3 sm:space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search by Student ID or Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs font-medium"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Date Presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-[#009D9E]" /> Filter:
            </span>
            <Button
              variant={datePreset === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePresetChange('all')}
              className={`h-8 text-xs ${datePreset === 'all' ? 'bg-[#003D5C] text-white' : 'text-slate-700'}`}
            >
              All Time
            </Button>
            <Button
              variant={datePreset === 'today' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePresetChange('today')}
              className={`h-8 text-xs ${datePreset === 'today' ? 'bg-[#003D5C] text-white' : 'text-slate-700'}`}
            >
              Today
            </Button>
            <Button
              variant={datePreset === '7days' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePresetChange('7days')}
              className={`h-8 text-xs ${datePreset === '7days' ? 'bg-[#003D5C] text-white' : 'text-slate-700'}`}
            >
              Last 7 Days
            </Button>
            <Button
              variant={datePreset === '30days' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePresetChange('30days')}
              className={`h-8 text-xs ${datePreset === '30days' ? 'bg-[#003D5C] text-white' : 'text-slate-700'}`}
            >
              Last 30 Days
            </Button>
            <Button
              variant={datePreset === 'thisMonth' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePresetChange('thisMonth')}
              className={`h-8 text-xs ${datePreset === 'thisMonth' ? 'bg-[#003D5C] text-white' : 'text-slate-700'}`}
            >
              This Month
            </Button>
            <Button
              variant={datePreset === 'custom' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDatePreset('custom')}
              className={`h-8 text-xs ${datePreset === 'custom' ? 'bg-[#009D9E] text-white' : 'text-slate-700'}`}
            >
              Custom Range
            </Button>
          </div>
        </div>

        {/* Custom Date Pickers Row (Visible when Custom Range selected or dates specified) */}
        {(datePreset === 'custom' || startDateFilter || endDateFilter) && (
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3 bg-slate-50/80 p-3 rounded-md">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#009D9E]" />
              Custom Date Range:
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-semibold w-10 sm:w-auto">From:</span>
              <Input
                type="date"
                value={startDateFilter}
                onChange={(e) => {
                  setStartDateFilter(e.target.value)
                  setDatePreset('custom')
                }}
                className="h-8 w-full sm:w-36 text-xs font-mono bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-semibold w-10 sm:w-auto">To:</span>
              <Input
                type="date"
                value={endDateFilter}
                onChange={(e) => {
                  setEndDateFilter(e.target.value)
                  setDatePreset('custom')
                }}
                className="h-8 w-full sm:w-36 text-xs font-mono bg-white"
              />
            </div>

            {(startDateFilter || endDateFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStartDateFilter('')
                  setEndDateFilter('')
                  setDatePreset('all')
                }}
                className="h-8 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 font-semibold gap-1 self-start sm:self-auto"
              >
                <X className="w-3 h-3" /> Clear Date Range
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Table Data */}
      <Card className="bg-white border-slate-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Loading schedules...</div>
        ) : filteredSchedules.length === 0 ? (
          <div className="p-8 sm:p-12 text-center text-slate-500 space-y-3">
            <GraduationCap className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No installment schedules found</h3>
            <p className="text-xs text-slate-500">
              {search ? 'Try clearing your search term.' : 'Click Create Schedule to generate the first one.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs border-collapse min-w-[800px] lg:min-w-0">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10.5px] border-y border-slate-200">
                  <th className="py-3 px-3 sm:px-3.5 whitespace-nowrap">Student ID</th>
                  <th className="py-3 px-3 sm:px-3.5 whitespace-nowrap">Student Name</th>
                  <th className="py-3 px-3 sm:px-3.5 whitespace-nowrap">Course Name</th>
                  <th className="py-3 px-2.5 sm:px-3 whitespace-nowrap">Agency</th>
                  <th className="py-3 px-2.5 sm:px-3 whitespace-nowrap">Issue Date</th>
                  <th className="py-3 px-2.5 sm:px-3 whitespace-nowrap">Start Date</th>
                  <th className="py-3 px-2.5 sm:px-3 whitespace-nowrap">End Date</th>
                  <th className="py-3 px-3 sm:px-3.5 text-right whitespace-nowrap">Total Amount</th>
                  <th className="py-3 px-3 text-right sticky right-0 bg-slate-50 z-20 shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.06)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredSchedules.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-3.5 px-3 sm:px-3.5 font-mono font-bold text-blue-700 whitespace-nowrap">
                      <Link href={`/installments/${item.id}/preview`} className="hover:underline">
                        {item.student_id}
                      </Link>
                    </td>

                    <td className="py-3.5 px-3 sm:px-3.5 font-bold text-slate-900 max-w-[140px] truncate" title={item.student_name}>
                      {item.student_name}
                    </td>

                    <td className="py-3.5 px-3 sm:px-3.5 text-slate-700 font-medium max-w-[160px] truncate" title={item.course_name}>
                      {item.course_name}
                    </td>

                    <td className="py-3.5 px-2.5 sm:px-3 text-slate-700 font-medium max-w-[130px] truncate" title={item.agency || ''}>
                      {item.agency ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10.5px] font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200 truncate max-w-full">
                          {item.agency}
                        </span>
                      ) : (
                        <span className="text-slate-400">--</span>
                      )}
                    </td>

                    <td className="py-3.5 px-2.5 sm:px-3 text-slate-700 font-medium font-mono text-[11px] whitespace-nowrap">
                      {formatDate(item.date || item.created_at)}
                    </td>

                    <td className="py-3.5 px-2.5 sm:px-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                      {formatDate(item.start_date)}
                    </td>

                    <td className="py-3.5 px-2.5 sm:px-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                      {formatDate(item.end_date)}
                    </td>

                    <td className="py-3.5 px-3 sm:px-3.5 text-right font-extrabold text-slate-900 text-xs sm:text-sm font-mono whitespace-nowrap">
                      AUD {Number(item.total_amount).toLocaleString()}
                    </td>

                    <td className="py-3.5 px-3 text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50 transition-colors z-10 shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.06)]">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-7 w-7 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-300 transition-colors shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 data-popup-open:bg-slate-100">
                          <MoreHorizontal className="w-4 h-4" />
                          <span className="sr-only">Actions</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 bg-white border border-slate-200 shadow-lg rounded-xl p-1 text-xs z-50">
                          <DropdownMenuItem
                            onClick={() => router.push(`/installments/${item.id}/preview`)}
                            className="flex items-center gap-2 px-2.5 py-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900 rounded-lg cursor-pointer font-medium transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>Preview</span>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => router.push(`/installments/${item.id}/edit`)}
                            className="flex items-center gap-2 px-2.5 py-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900 rounded-lg cursor-pointer font-medium transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5 text-slate-500" />
                            <span>Edit</span>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => handleDownloadPDF(item)}
                            disabled={downloadingId === item.id}
                            className="flex items-center gap-2 px-2.5 py-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900 rounded-lg cursor-pointer font-medium transition-colors"
                          >
                            {downloadingId === item.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                            ) : (
                              <Download className="w-3.5 h-3.5 text-emerald-600" />
                            )}
                            <span>Download PDF</span>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            variant="destructive"
                            onClick={async () => {
                              if (window.confirm(`Are you sure you want to delete the schedule for ${item.student_name} (${item.student_id})?`)) {
                                await deleteInstallment(item.id)
                                await loadData()
                              }
                            }}
                            className="flex items-center gap-2 px-2.5 py-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg cursor-pointer font-medium transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
