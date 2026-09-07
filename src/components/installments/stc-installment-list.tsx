'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  STCStudentInstallmentSchedule,
  getSTCInstallments,
  deleteSTCInstallment,
  getSTCFixedInfo,
  syncLocalSTCToCloud,
} from '@/lib/services/stc-installment.service'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Search,
  PlusCircle,
  Eye,
  Edit,
  Download,
  GraduationCap,
  Calendar,
  Loader2,
  RotateCcw,
  Trash2,
  Mail,
  CheckCircle2,
  AlertCircle,
  CloudUpload,
  AlertTriangle,
  X,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import STCResendEmailDialog from '@/components/installments/stc-resend-email-dialog'

export default function STCInstallmentList() {
  const router = useRouter()
  const [schedules, setSchedules] = useState<STCStudentInstallmentSchedule[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  // Sync to Cloud State
  const [syncing, setSyncing] = useState(false)
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Date Filtering State
  const [datePreset, setDatePreset] = useState<'all' | 'today' | '7days' | '30days' | 'thisMonth' | 'custom'>('all')
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')

  // Modals State
  const [scheduleToEmail, setScheduleToEmail] = useState<STCStudentInstallmentSchedule | null>(null)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [scheduleToDelete, setScheduleToDelete] = useState<STCStudentInstallmentSchedule | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function loadData() {
    setIsLoading(true)
    try {
      const data = await getSTCInstallments()
      setSchedules(data)
    } catch (err) {
      console.error('Failed to load STC installment schedules:', err)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSyncToCloud() {
    setSyncing(true)
    setSyncFeedback(null)
    try {
      const res = await syncLocalSTCToCloud()
      if (res.success) {
        setSyncFeedback({
          type: 'success',
          message:
            res.syncedCount > 0
              ? `Successfully synced ${res.syncedCount} STC schedule(s) to Live Cloud Database!`
              : 'All STC schedules are already up to date in Cloud Database!',
        })
        await loadData()
      } else {
        setSyncFeedback({
          type: 'error',
          message: res.error || 'Failed to sync to database. Please make sure the table exists in Supabase.',
        })
      }
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: err?.message || 'Failed to connect to database.',
      })
    } finally {
      setSyncing(false)
      setTimeout(() => {
        setSyncFeedback((prev) => (prev?.type === 'success' ? null : prev))
      }, 5000)
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

  async function handleDownloadPDF(schedule: STCStudentInstallmentSchedule) {
    try {
      setDownloadingId(schedule.id)
      const studentNameStr = (schedule.student_name || schedule.student_id || 'STC')
        .trim()
        .replace(/[/\\?%*:|"<>]/g, '')
        .replace(/\s+/g, '-')
      const fileName = `Installment-Schedule-${studentNameStr}.pdf`
      const fixedInfo = getSTCFixedInfo()

      // 1. Primary: Fast Server-Side POST Stream
      try {
        const response = await fetch(`/api/stc/installments-pdf/${schedule.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schedule, fixedInfo }),
        })
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
      } catch (postErr) {
        console.warn('POST PDF stream failed, trying GET fallback:', postErr)
      }

      // 2. Secondary: Server-Side GET Stream
      const getResponse = await fetch(`/api/stc/installments-pdf/${schedule.id}`)
      if (getResponse.ok) {
        const blob = await getResponse.blob()
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

      // 3. Fallback: Direct window open
      window.open(`/api/stc/installments-pdf/${schedule.id}`, '_blank')
    } catch (err: any) {
      console.error('PDF generation failed:', err)
      window.open(`/api/stc/installments-pdf/${schedule.id}`, '_blank')
    } finally {
      setDownloadingId(null)
    }
  }

  async function confirmDelete() {
    if (!scheduleToDelete) return
    try {
      setIsDeleting(true)
      await deleteSTCInstallment(scheduleToDelete.id)
      setSchedules((prev) => prev.filter((s) => s.id !== scheduleToDelete.id))
      setDeleteModalOpen(false)
      setScheduleToDelete(null)
    } catch (err) {
      console.error('Failed to delete STC schedule:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredSchedules = schedules.filter((s) => {
    if (search.trim()) {
      const query = search.toLowerCase().trim()
      const matchSearch =
        s.student_id?.toLowerCase().includes(query) ||
        s.student_name?.toLowerCase().includes(query) ||
        s.course_name?.toLowerCase().includes(query) ||
        s.agency?.toLowerCase().includes(query)
      if (!matchSearch) return false
    }

    if (startDateFilter || endDateFilter) {
      const schDate = s.date || s.created_at?.split('T')[0]
      if (startDateFilter && schDate < startDateFilter) return false
      if (endDateFilter && schDate > endDateFilter) return false
    }

    return true
  })

  const totalValue = filteredSchedules.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0)

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#001724] border border-white/10 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-white p-2 flex items-center justify-center shrink-0 shadow-md">
            <img
              src="/STC-logo.png"
              alt="States College Australia"
              className="max-h-full max-w-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-[#00BF8F]/20 text-[#00BF8F] text-[10px] font-bold uppercase tracking-wider border border-[#00BF8F]/30 font-mono">
                STC
              </span>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight font-['Montserrat']">
                Installment Schedules
              </h1>
            </div>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              States College Australia — Dedicated Student Payment Plans
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sync Local Storage to Cloud Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncToCloud}
            disabled={syncing}
            className="border-emerald-500/30 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 hover:text-white rounded-xl text-xs font-semibold"
            title="Upload any local STC schedules from this laptop into Supabase Live Database"
          >
            {syncing ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-emerald-400" />
            ) : (
              <CloudUpload className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
            )}
            {syncing ? 'Syncing...' : 'Sync to Cloud'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="border-white/15 text-slate-300 hover:bg-white/10 hover:text-white rounded-xl text-xs font-semibold"
          >
            <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Link href="/stc/installments/new">
            <Button
              size="sm"
              className="bg-[#00BF8F] hover:bg-[#00a87e] text-[#001E2F] rounded-xl text-xs font-bold shadow-md shadow-[#00BF8F]/20 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 mr-1.5" />
              Create Schedule
            </Button>
          </Link>
        </div>
      </div>

      {/* Sync Feedback Toast / Banner */}
      {syncFeedback && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl text-xs sm:text-sm border shadow-md transition-all ${
            syncFeedback.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
              : 'bg-amber-950/80 border-amber-500/40 text-amber-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {syncFeedback.type === 'success' ? (
              <CheckCircle2 className="size-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="size-5 text-amber-400 shrink-0" />
            )}
            <span>{syncFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncFeedback(null)}
            className="p-1 hover:bg-white/10 rounded-md transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#001724] border border-white/10 rounded-2xl p-5 text-white shadow-md">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Schedules</p>
          <p className="text-2xl font-extrabold mt-1 text-[#00BF8F] font-mono">
            {filteredSchedules.length}
          </p>
        </div>
        <div className="bg-[#001724] border border-white/10 rounded-2xl p-5 text-white shadow-md">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Planned Value</p>
          <p className="text-2xl font-extrabold mt-1 text-white font-mono">
            AUD ${totalValue.toLocaleString()}
          </p>
        </div>
        <div className="bg-[#001724] border border-white/10 rounded-2xl p-5 text-white shadow-md">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Schedule</p>
          <p className="text-2xl font-extrabold mt-1 text-slate-200 font-mono">
            AUD $
            {filteredSchedules.length > 0
              ? Math.round(totalValue / filteredSchedules.length).toLocaleString()
              : 0}
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-[#001724] border border-white/10 rounded-2xl p-4 text-white shadow-md space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by student name, student ID, course, agency..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#001E2F] border-white/15 text-white pl-10 text-xs rounded-xl focus:border-[#00BF8F] h-10 w-full"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {(['all', 'today', '7days', '30days', 'thisMonth', 'custom'] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handlePresetChange(preset)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  datePreset === preset
                    ? 'bg-[#00BF8F] text-[#001E2F]'
                    : 'bg-[#001E2F] text-slate-300 hover:bg-white/10'
                }`}
              >
                {preset === 'all'
                  ? 'All Time'
                  : preset === 'today'
                  ? 'Today'
                  : preset === '7days'
                  ? 'Last 7 Days'
                  : preset === '30days'
                  ? 'Last 30 Days'
                  : preset === 'thisMonth'
                  ? 'This Month'
                  : 'Custom'}
              </button>
            ))}
          </div>
        </div>

        {datePreset === 'custom' && (
          <div className="flex items-center gap-3 pt-2 border-t border-white/5">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">From:</span>
              <Input
                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="bg-[#001E2F] border-white/15 text-white text-xs rounded-xl h-8 w-36"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">To:</span>
              <Input
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="bg-[#001E2F] border-white/15 text-white text-xs rounded-xl h-8 w-36"
              />
            </div>
          </div>
        )}
      </div>

      {/* Schedules Table */}
      <Card className="bg-[#001724] border-white/10 text-white rounded-2xl shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#00BF8F] animate-spin" />
            <p className="text-xs text-slate-400 font-medium">Loading STC installment schedules...</p>
          </div>
        ) : filteredSchedules.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
            <GraduationCap className="w-12 h-12 text-slate-600" />
            <h3 className="text-base font-bold text-slate-300">No Installment Schedules Found</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Create your first student installment schedule for States College Australia.
            </p>
            <Link href="/stc/installments/new" className="pt-2">
              <Button size="sm" className="bg-[#00BF8F] hover:bg-[#00a87e] text-[#001E2F] font-bold rounded-xl text-xs">
                <PlusCircle className="w-4 h-4 mr-1.5" />
                Create New Schedule
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#001E2F] text-slate-400 uppercase tracking-wider font-semibold border-b border-white/10 text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Student ID</th>
                  <th className="py-3.5 px-4">Course</th>
                  <th className="py-3.5 px-4">Timeline</th>
                  <th className="py-3.5 px-4 text-right">Total Amount</th>
                  <th className="py-3.5 px-4 text-center">Email Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {filteredSchedules.map((schedule) => (
                  <tr key={schedule.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">
                      <Link
                        href={`/stc/installments/${schedule.id}/preview`}
                        className="hover:text-[#00BF8F] transition-colors"
                      >
                        {schedule.student_name}
                      </Link>
                      {schedule.agency ? (
                        <span className="block text-[10px] font-normal text-slate-400 mt-0.5">
                          Agency: {schedule.agency}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {schedule.student_id}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-300" title={schedule.course_name}>
                      {schedule.course_name}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        {schedule.duration}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                      {schedule.start_date} <span className="text-slate-500">→</span> {schedule.end_date}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[#00BF8F] font-mono">
                      AUD ${Number(schedule.total_amount).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {schedule.last_email_sent_at ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          Sent
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-medium">Unsent</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/stc/installments/${schedule.id}/preview`} title="View / Print">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>

                        <Link href={`/stc/installments/${schedule.id}/edit`} title="Edit Schedule">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownloadPDF(schedule)}
                          disabled={downloadingId === schedule.id}
                          title="Download PDF"
                          className="h-8 w-8 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg"
                        >
                          {downloadingId === schedule.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-[#00BF8F]" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setScheduleToEmail(schedule)
                            setEmailModalOpen(true)
                          }}
                          title="Email Schedule"
                          className="h-8 w-8 text-slate-300 hover:text-[#00BF8F] hover:bg-[#00BF8F]/10 rounded-lg"
                        >
                          <Mail className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setScheduleToDelete(schedule)
                            setDeleteModalOpen(true)
                          }}
                          title="Delete Schedule"
                          className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Email Modal */}
      <STCResendEmailDialog
        schedule={scheduleToEmail}
        open={emailModalOpen}
        onOpenChange={setEmailModalOpen}
        onSuccess={loadData}
      />

      {/* Delete Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-md bg-[#001724] border border-white/10 text-white shadow-2xl p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-400 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Delete Installment Schedule
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300 pt-2">
              Are you sure you want to delete the installment schedule for{' '}
              <strong className="text-white">{scheduleToDelete?.student_name}</strong> (
              {scheduleToDelete?.student_id})? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 flex items-center gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteModalOpen(false)}
              className="border-white/15 text-slate-300 hover:bg-white/10 text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
