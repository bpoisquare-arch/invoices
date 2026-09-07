'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  STCStudentInstallmentSchedule,
  STC_COURSES,
  calculateSTCInstallmentScheduleItems,
  saveSTCInstallment,
  getSTCFixedInfo,
  STCFixedInfo,
  getOrdinal,
  getSTCInstallments,
} from '@/lib/services/stc-installment.service'
import STCScheduleWebPreview from '@/components/installments/stc-schedule-web-preview'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Loader2,
  Eye,
  Send,
  Award,
  AlertCircle,
  Layers,
  Plus,
  Trash2,
  CheckCircle2,
} from 'lucide-react'

interface STCInstallmentFormProps {
  mode: 'create' | 'edit'
  existingSchedule?: STCStudentInstallmentSchedule
}

export default function STCInstallmentForm({ mode, existingSchedule }: STCInstallmentFormProps) {
  const router = useRouter()

  const todayStr = new Date().toISOString().split('T')[0]
  const defaultStart = '2026-09-21'
  const defaultEnd = '2027-11-14'

  const [fixedInfo, setFixedInfo] = useState<STCFixedInfo>(getSTCFixedInfo())
  const [allSchedules, setAllSchedules] = useState<STCStudentInstallmentSchedule[]>([])
  const [scheduleDate, setScheduleDate] = useState(existingSchedule?.date || todayStr)
  const [studentName, setStudentName] = useState(existingSchedule?.student_name || '')
  const [studentId, setStudentId] = useState(existingSchedule?.student_id || '')
  const [selectedCourse, setSelectedCourse] = useState(
    existingSchedule?.course_name || 'BSB50120 Diploma of Business'
  )
  const [duration, setDuration] = useState(existingSchedule?.duration || '60 weeks')

  // 1. Course Header Display Dates
  const [startDate, setStartDate] = useState(existingSchedule?.start_date || defaultStart)
  const [endDate, setEndDate] = useState(existingSchedule?.end_date || defaultEnd)

  // 2. Installment Schedule Timeline
  const [scheduleStartMonth, setScheduleStartMonth] = useState<string>(
    existingSchedule?.schedule_start_month ||
      (existingSchedule?.start_date ? existingSchedule.start_date.substring(0, 7) : '2026-09')
  )
  const [scheduleEndMonth, setScheduleEndMonth] = useState<string>(
    existingSchedule?.schedule_end_month || '2027-08'
  )

  // 3. Optional 1st Installment Custom Month Override
  const initialCustomMonth =
    existingSchedule?.first_installment_custom_month ||
    (existingSchedule?.start_month_year &&
    existingSchedule.start_month_year !==
      (existingSchedule.schedule_start_month || existingSchedule.start_date?.substring(0, 7))
      ? existingSchedule.start_month_year
      : '')
  const [customFirstMonth, setCustomFirstMonth] = useState<string>(initialCustomMonth)
  const [showCustomFirstMonth, setShowCustomFirstMonth] = useState<boolean>(Boolean(initialCustomMonth))

  const [adminFee, setAdminFee] = useState<number>(existingSchedule?.admin_fee ?? 500)
  const [resourcesFee, setResourcesFee] = useState<number>(existingSchedule?.resources_fee ?? 800)
  const [agency, setAgency] = useState<string>(existingSchedule?.agency || '')
  const [tuitionFee, setTuitionFee] = useState<number>(existingSchedule?.tuition_fee ?? 10000)

  const [showScholarship, setShowScholarship] = useState<boolean>((existingSchedule?.scholarship || 0) > 0)
  const [scholarship, setScholarship] = useState<number>(existingSchedule?.scholarship || 0)

  // Dynamic Initial Fee inputs array
  const [initialFees, setInitialFees] = useState<number[]>(() => {
    if (existingSchedule?.initial_fees && existingSchedule.initial_fees.length > 0) {
      return existingSchedule.initial_fees
    }
    if (existingSchedule?.first_installment_amount !== undefined) {
      return [existingSchedule.first_installment_amount]
    }
    return [1000]
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setFixedInfo(getSTCFixedInfo())
    getSTCInstallments().then((data) => {
      if (Array.isArray(data)) {
        setAllSchedules(data)
      }
    })
  }, [])

  const enrolledCoursesForStudent = React.useMemo(() => {
    const trimmed = studentId.trim().toLowerCase()
    if (!trimmed) return []
    return allSchedules
      .filter(
        (s) => s.student_id?.trim().toLowerCase() === trimmed && (mode !== 'edit' || s.id !== existingSchedule?.id)
      )
      .map((s) => s.course_name?.trim().toLowerCase())
      .filter(Boolean)
  }, [allSchedules, studentId, mode, existingSchedule?.id])

  const handleCourseChange = (courseName: string) => {
    setSelectedCourse(courseName)
    const found = STC_COURSES.find((c) => c.name === courseName)
    if (found) {
      setDuration(found.duration)
    }
  }

  // Live calculation
  const calculationResult = React.useMemo(() => {
    return calculateSTCInstallmentScheduleItems({
      start_date: startDate,
      end_date: endDate,
      schedule_start_month: scheduleStartMonth,
      schedule_end_month: scheduleEndMonth,
      first_installment_custom_month: showCustomFirstMonth && customFirstMonth ? customFirstMonth : undefined,
      admin_fee: adminFee,
      resources_fee: resourcesFee,
      tuition_fee: tuitionFee,
      scholarship: showScholarship ? scholarship : 0,
      initial_fees: initialFees,
    })
  }, [
    startDate,
    endDate,
    scheduleStartMonth,
    scheduleEndMonth,
    showCustomFirstMonth,
    customFirstMonth,
    adminFee,
    resourcesFee,
    tuitionFee,
    showScholarship,
    scholarship,
    initialFees,
  ])

  const handleInitialFeeChange = (index: number, val: number) => {
    const updated = [...initialFees]
    updated[index] = Math.max(0, val)
    setInitialFees(updated)
  }

  const addInitialFeeRow = () => {
    setInitialFees([...initialFees, 0])
  }

  const removeInitialFeeRow = (index: number) => {
    if (initialFees.length <= 1) return
    const updated = initialFees.filter((_, i) => i !== index)
    setInitialFees(updated)
  }

  const previewScheduleData: Partial<STCStudentInstallmentSchedule> = {
    id: existingSchedule?.id || 'preview',
    date: scheduleDate,
    student_name: studentName,
    student_id: studentId,
    course_name: selectedCourse,
    duration,
    start_date: startDate,
    end_date: endDate,
    schedule_start_month: scheduleStartMonth,
    schedule_end_month: scheduleEndMonth,
    first_installment_custom_month: showCustomFirstMonth && customFirstMonth ? customFirstMonth : undefined,
    admin_fee: adminFee,
    resources_fee: resourcesFee,
    tuition_fee: tuitionFee,
    scholarship: showScholarship ? scholarship : 0,
    total_amount: calculationResult.totalAmount,
    first_installment_amount: initialFees[0] || 0,
    initial_fees: initialFees,
    schedule_items: calculationResult.scheduleItems,
    agency: agency.trim() || undefined,
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!studentName.trim()) {
      setError('Student Name is required')
      return
    }
    if (!studentId.trim()) {
      setError('Student ID is required')
      return
    }
    if (!selectedCourse.trim()) {
      setError('Course is required')
      return
    }

    try {
      setIsSubmitting(true)
      const saved = await saveSTCInstallment({
        id: existingSchedule?.id,
        date: scheduleDate,
        student_name: studentName.trim(),
        student_id: studentId.trim(),
        course_name: selectedCourse.trim(),
        duration: duration.trim(),
        start_date: startDate,
        end_date: endDate,
        schedule_start_month: scheduleStartMonth,
        schedule_end_month: scheduleEndMonth,
        first_installment_custom_month:
          showCustomFirstMonth && customFirstMonth ? customFirstMonth : undefined,
        admin_fee: Number(adminFee) || 0,
        resources_fee: Number(resourcesFee) || 0,
        tuition_fee: Number(tuitionFee) || 0,
        scholarship: showScholarship ? Number(scholarship) || 0 : 0,
        total_amount: calculationResult.totalAmount,
        first_installment_amount: initialFees[0] || 0,
        initial_fees: initialFees,
        schedule_items: calculationResult.scheduleItems,
        agency: agency.trim() || null,
        recipient_email: existingSchedule?.recipient_email,
        from_email: existingSchedule?.from_email,
        email_subject: existingSchedule?.email_subject,
        email_message: existingSchedule?.email_message,
        last_email_sent_at: existingSchedule?.last_email_sent_at,
        last_email_status: existingSchedule?.last_email_status,
      })

      router.push(`/stc/installments/${saved.id}/preview`)
    } catch (err: any) {
      console.error('Error saving STC installment:', err)
      setError(err?.message || 'Failed to save installment schedule')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Top Banner */}
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
                {mode === 'edit' ? 'Edit Installment Schedule' : 'Create Installment Schedule'}
              </h1>
            </div>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              States College Australia — Student Payment Planning Module
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/stc/installments">
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 text-slate-200 hover:bg-white/10 hover:text-white rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            form="stc-schedule-form"
            disabled={isSubmitting}
            className="bg-[#00BF8F] hover:bg-[#00a87e] text-[#001E2F] rounded-xl text-xs font-bold shadow-md shadow-[#00BF8F]/20 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                {mode === 'edit' ? 'Save Changes' : 'Generate & Save'}
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Form + Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* Left Form Controls */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          <form id="stc-schedule-form" onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Student & Course Details */}
            <Card className="bg-[#001724] border-white/10 text-white rounded-2xl shadow-lg">
              <CardHeader className="pb-3 border-b border-white/5">
                <CardTitle className="text-sm font-bold tracking-wide flex items-center gap-2 text-[#00BF8F]">
                  <Layers className="w-4 h-4" />
                  1. Student & Course Information
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-300">Schedule Date</Label>
                    <Input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="bg-[#001E2F] border-white/15 text-white text-xs rounded-xl focus:border-[#00BF8F]"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-300">Student ID</Label>
                    <Input
                      type="text"
                      placeholder="e.g. STC20014"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      className="bg-[#001E2F] border-white/15 text-white text-xs rounded-xl focus:border-[#00BF8F]"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300">Student Full Name</Label>
                  <Input
                    type="text"
                    placeholder="Enter student's full name"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="bg-[#001E2F] border-white/15 text-white text-xs rounded-xl focus:border-[#00BF8F]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300">Select STC Course</Label>
                  <select
                    value={selectedCourse}
                    onChange={(e) => handleCourseChange(e.target.value)}
                    className="w-full h-10 px-3 bg-[#001E2F] border border-white/15 text-white text-xs rounded-xl focus:outline-none focus:border-[#00BF8F]"
                  >
                    {STC_COURSES.map((c) => {
                      const isEnrolled = enrolledCoursesForStudent.includes(c.name.toLowerCase())
                      return (
                        <option key={c.name} value={c.name} className="bg-[#001E2F] text-white">
                          {c.name} ({c.duration}) {isEnrolled ? '✓ [Enrolled]' : ''}
                        </option>
                      )
                    })}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-300">Duration</Label>
                    <Input
                      type="text"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="bg-[#001E2F] border-white/15 text-white text-xs rounded-xl focus:border-[#00BF8F]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-300">Agency (Optional)</Label>
                    <Input
                      type="text"
                      placeholder="e.g. EdLink Australia"
                      value={agency}
                      onChange={(e) => setAgency(e.target.value)}
                      className="bg-[#001E2F] border-white/15 text-white text-xs rounded-xl focus:border-[#00BF8F]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-300">Course Start Date</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-[#001E2F] border-white/15 text-white text-xs rounded-xl focus:border-[#00BF8F]"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-300">Course End Date</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-[#001E2F] border-white/15 text-white text-xs rounded-xl focus:border-[#00BF8F]"
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. Schedule Timeline & Overrides */}
            <Card className="bg-[#001724] border-white/10 text-white rounded-2xl shadow-lg">
              <CardHeader className="pb-3 border-b border-white/5">
                <CardTitle className="text-sm font-bold tracking-wide flex items-center gap-2 text-[#00BF8F]">
                  <Layers className="w-4 h-4" />
                  2. Schedule Timeline & Custom Months
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-300">
                      Schedule Start Month (YYYY-MM)
                    </Label>
                    <Input
                      type="month"
                      value={scheduleStartMonth}
                      onChange={(e) => setScheduleStartMonth(e.target.value)}
                      className="bg-[#001E2F] border-white/15 text-white text-xs rounded-xl focus:border-[#00BF8F]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-300">
                      Schedule End Month (YYYY-MM)
                    </Label>
                    <Input
                      type="month"
                      value={scheduleEndMonth}
                      onChange={(e) => setScheduleEndMonth(e.target.value)}
                      className="bg-[#001E2F] border-white/15 text-white text-xs rounded-xl focus:border-[#00BF8F]"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="stcCustomFirstMonthCheckbox"
                      checked={showCustomFirstMonth}
                      onChange={(e) => setShowCustomFirstMonth(e.target.checked)}
                      className="rounded accent-[#00BF8F] cursor-pointer"
                    />
                    <label
                      htmlFor="stcCustomFirstMonthCheckbox"
                      className="text-xs font-semibold text-slate-200 cursor-pointer select-none"
                    >
                      Override 1st Installment Month Only
                    </label>
                  </div>

                  {showCustomFirstMonth && (
                    <div className="mt-2.5">
                      <Input
                        type="month"
                        value={customFirstMonth}
                        onChange={(e) => setCustomFirstMonth(e.target.value)}
                        className="bg-[#001E2F] border-white/15 text-white text-xs rounded-xl focus:border-[#00BF8F] max-w-xs"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 3. Fee Allocations & Initial Fees */}
            <Card className="bg-[#001724] border-white/10 text-white rounded-2xl shadow-lg">
              <CardHeader className="pb-3 border-b border-white/5">
                <CardTitle className="text-sm font-bold tracking-wide flex items-center gap-2 text-[#00BF8F]">
                  <Award className="w-4 h-4" />
                  3. Fee Structure & Upfront Payments
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-300">Application Fee (AUD)</Label>
                    <Input
                      type="number"
                      value={adminFee}
                      onChange={(e) => setAdminFee(Number(e.target.value))}
                      className="bg-[#001E2F] border-white/15 text-white text-xs rounded-xl focus:border-[#00BF8F]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-300">Material Fee (AUD)</Label>
                    <Input
                      type="number"
                      value={resourcesFee}
                      onChange={(e) => setResourcesFee(Number(e.target.value))}
                      className="bg-[#001E2F] border-white/15 text-white text-xs rounded-xl focus:border-[#00BF8F]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300">Tuition Fee (AUD)</Label>
                  <Input
                    type="number"
                    value={tuitionFee}
                    onChange={(e) => setTuitionFee(Number(e.target.value))}
                    className="bg-[#001E2F] border-white/15 text-white text-xs rounded-xl focus:border-[#00BF8F]"
                  />
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-emerald-400">Scholarship Discount</Label>
                    <button
                      type="button"
                      onClick={() => setShowScholarship(!showScholarship)}
                      className="text-[10px] text-[#00BF8F] hover:underline"
                    >
                      {showScholarship ? 'Remove' : '+ Add Scholarship'}
                    </button>
                  </div>
                  {showScholarship && (
                    <Input
                      type="number"
                      value={scholarship}
                      onChange={(e) => setScholarship(Number(e.target.value))}
                      placeholder="e.g. 1000"
                      className="bg-[#001E2F] border-emerald-500/40 text-emerald-300 text-xs rounded-xl focus:border-emerald-400"
                    />
                  )}
                </div>

                {/* Initial Fees Rows */}
                <div className="pt-3 border-t border-white/5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-200">
                      Initial Upfront Payments Breakdown
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={addInitialFeeRow}
                      className="h-7 px-2 text-[11px] text-[#00BF8F] hover:bg-[#00BF8F]/10 rounded-lg"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Add Initial Fee
                    </Button>
                  </div>

                  {initialFees.map((fee, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 w-28 font-mono">
                        {idx === 0 ? '1st Payment:' : `${getOrdinal(idx + 1)} Payment:`}
                      </span>
                      <Input
                        type="number"
                        value={fee}
                        onChange={(e) => handleInitialFeeChange(idx, Number(e.target.value))}
                        className="bg-[#001E2F] border-white/15 text-white text-xs rounded-xl focus:border-[#00BF8F] flex-1"
                      />
                      {initialFees.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeInitialFeeRow(idx)}
                          className="h-9 w-9 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Total Calculated Summary */}
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#00BF8F]/15 to-[#06D6A0]/10 border border-[#00BF8F]/30 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                    Calculated Total:
                  </span>
                  <span className="text-base font-black text-[#00BF8F] font-mono">
                    AUD ${calculationResult.totalAmount.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>

        {/* Right Live Preview */}
        <div className="lg:col-span-7 xl:col-span-8 sticky top-24">
          <div className="bg-[#001724] border border-white/10 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#00BF8F]" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Live Preview (States College Australia)
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {calculationResult.scheduleItems.length} Installment Rows
              </span>
            </div>

            <div className="max-h-[800px] overflow-y-auto rounded-xl border border-white/5 bg-slate-900/50 p-2">
              <STCScheduleWebPreview schedule={previewScheduleData} fixedInfo={fixedInfo} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
