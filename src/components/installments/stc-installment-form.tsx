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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 text-slate-800 shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-slate-50 border border-slate-200 p-2 flex items-center justify-center shrink-0 shadow-2xs">
            <img
              src="/STC-logo.png"
              alt="States College Australia"
              className="max-h-full max-w-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-[#009D9E]/10 text-[#009D9E] text-[10px] font-bold uppercase tracking-wider border border-[#009D9E]/20 font-mono">
                STC
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#003D5C] font-['Montserrat']">
                {mode === 'edit' ? 'Edit Installment Schedule' : 'Create Installment Schedule'}
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              States College Australia — Student Payment Planning Module
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/stc/installments">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            form="stc-schedule-form"
            disabled={isSubmitting}
            className="bg-[#003D5C] hover:bg-[#002b40] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
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
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
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
            <Card className="bg-white border border-slate-200/90 text-slate-800 rounded-2xl shadow-2xs">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-bold tracking-wide flex items-center gap-2 text-[#003D5C]">
                  <Layers className="w-4 h-4 text-[#009D9E]" />
                  1. Student & Course Information
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Schedule Date</Label>
                    <Input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="bg-white border-slate-200 text-slate-900 text-xs rounded-xl focus:border-[#009D9E] font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Student ID</Label>
                    <Input
                      type="text"
                      placeholder="e.g. STC20014"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      className="bg-white border-slate-200 text-slate-900 text-xs rounded-xl focus:border-[#009D9E]"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Student Full Name</Label>
                  <Input
                    type="text"
                    placeholder="Enter student's full name"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="bg-white border-slate-200 text-slate-900 text-xs rounded-xl focus:border-[#009D9E]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Select STC Course</Label>
                  <select
                    value={selectedCourse}
                    onChange={(e) => handleCourseChange(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-slate-200 text-slate-800 text-xs rounded-xl focus:outline-none focus:border-[#009D9E]"
                  >
                    {STC_COURSES.map((c) => {
                      const isEnrolled = enrolledCoursesForStudent.includes(c.name.toLowerCase())
                      return (
                        <option key={c.name} value={c.name} className="bg-white text-slate-800">
                          {c.name} ({c.duration}) {isEnrolled ? '✓ [Enrolled]' : ''}
                        </option>
                      )
                    })}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Duration</Label>
                    <Input
                      type="text"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="bg-white border-slate-200 text-slate-900 text-xs rounded-xl focus:border-[#009D9E]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Agency (Optional)</Label>
                    <Input
                      type="text"
                      placeholder="e.g. EdLink Australia"
                      value={agency}
                      onChange={(e) => setAgency(e.target.value)}
                      className="bg-white border-slate-200 text-slate-900 text-xs rounded-xl focus:border-[#009D9E]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Course Start Date</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-white border-slate-200 text-slate-900 text-xs rounded-xl focus:border-[#009D9E] font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Course End Date</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-white border-slate-200 text-slate-900 text-xs rounded-xl focus:border-[#009D9E] font-mono"
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. Schedule Timeline & Overrides */}
            <Card className="bg-white border border-slate-200/90 text-slate-800 rounded-2xl shadow-2xs">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-bold tracking-wide flex items-center gap-2 text-[#003D5C]">
                  <Layers className="w-4 h-4 text-[#009D9E]" />
                  2. Schedule Timeline & Custom Months
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">
                      Schedule Start Month (YYYY-MM)
                    </Label>
                    <Input
                      type="month"
                      value={scheduleStartMonth}
                      onChange={(e) => setScheduleStartMonth(e.target.value)}
                      className="bg-white border-slate-200 text-slate-900 text-xs rounded-xl focus:border-[#009D9E] font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">
                      Schedule End Month (YYYY-MM)
                    </Label>
                    <Input
                      type="month"
                      value={scheduleEndMonth}
                      onChange={(e) => setScheduleEndMonth(e.target.value)}
                      className="bg-white border-slate-200 text-slate-900 text-xs rounded-xl focus:border-[#009D9E] font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="stcCustomFirstMonthCheckbox"
                      checked={showCustomFirstMonth}
                      onChange={(e) => setShowCustomFirstMonth(e.target.checked)}
                      className="rounded accent-[#009D9E] cursor-pointer"
                    />
                    <label
                      htmlFor="stcCustomFirstMonthCheckbox"
                      className="text-xs font-semibold text-slate-700 cursor-pointer select-none"
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
                        className="bg-white border-slate-200 text-slate-900 text-xs rounded-xl focus:border-[#009D9E] font-mono max-w-xs"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 3. Fee Allocations & Initial Fees */}
            <Card className="bg-white border border-slate-200/90 text-slate-800 rounded-2xl shadow-2xs">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-bold tracking-wide flex items-center gap-2 text-[#003D5C]">
                  <Award className="w-4 h-4 text-[#009D9E]" />
                  3. Fee Structure & Upfront Payments
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Application Fee (AUD)</Label>
                    <Input
                      type="number"
                      value={adminFee}
                      onChange={(e) => setAdminFee(Number(e.target.value))}
                      className="bg-white border-slate-200 text-slate-900 text-xs rounded-xl focus:border-[#009D9E]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Material Fee (AUD)</Label>
                    <Input
                      type="number"
                      value={resourcesFee}
                      onChange={(e) => setResourcesFee(Number(e.target.value))}
                      className="bg-white border-slate-200 text-slate-900 text-xs rounded-xl focus:border-[#009D9E]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Tuition Fee (AUD)</Label>
                  <Input
                    type="number"
                    value={tuitionFee}
                    onChange={(e) => setTuitionFee(Number(e.target.value))}
                    className="bg-white border-slate-200 text-slate-900 text-xs rounded-xl focus:border-[#009D9E]"
                  />
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-emerald-700">Scholarship Discount</Label>
                    <button
                      type="button"
                      onClick={() => setShowScholarship(!showScholarship)}
                      className="text-[10px] text-[#009D9E] hover:underline font-semibold"
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
                      className="bg-emerald-50/50 border-emerald-300 text-emerald-900 text-xs rounded-xl focus:border-emerald-500"
                    />
                  )}
                </div>

                {/* Initial Fees Rows */}
                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-700">
                      Initial Upfront Payments Breakdown
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={addInitialFeeRow}
                      className="h-7 px-2 text-[11px] text-[#009D9E] hover:bg-[#009D9E]/10 rounded-lg font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Add Initial Fee
                    </Button>
                  </div>

                  {initialFees.map((fee, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 w-28 font-mono font-medium">
                        {idx === 0 ? '1st Payment:' : `${getOrdinal(idx + 1)} Payment:`}
                      </span>
                      <Input
                        type="number"
                        value={fee}
                        onChange={(e) => handleInitialFeeChange(idx, Number(e.target.value))}
                        className="bg-white border-slate-200 text-slate-900 text-xs rounded-xl focus:border-[#009D9E] flex-1 font-mono"
                      />
                      {initialFees.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeInitialFeeRow(idx)}
                          className="h-9 w-9 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl shrink-0 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Total Calculated Summary */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    Calculated Total:
                  </span>
                  <span className="text-base font-black text-[#009D9E] font-mono">
                    AUD ${calculationResult.totalAmount.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>

        {/* Right Live Preview */}
        <div className="lg:col-span-7 xl:col-span-8 sticky top-24">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#009D9E]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#003D5C]">
                  Live Preview (States College Australia)
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                {calculationResult.scheduleItems.length} Installment Rows
              </span>
            </div>

            <div className="max-h-[800px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-100/70 p-3 sm:p-4">
              <STCScheduleWebPreview schedule={previewScheduleData} fixedInfo={fixedInfo} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
