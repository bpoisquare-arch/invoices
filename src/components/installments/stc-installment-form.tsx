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

  function handleStudentIdChange(val: string) {
    setStudentId(val)
    const trimmed = val.trim().toLowerCase()
    if (trimmed) {
      const match = allSchedules.find(
        (s) => s.student_id?.trim().toLowerCase() === trimmed && (mode !== 'edit' || s.id !== existingSchedule?.id)
      )
      if (match) {
        if (match.student_name && !studentName) {
          setStudentName(match.student_name)
        }
        if (match.agency && !agency) {
          setAgency(match.agency)
        }
      }
    }
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="font-['Montserrat'] text-xl sm:text-2xl font-bold text-[#003D5C] tracking-tight">
            {mode === 'edit' ? 'Edit Installment Schedule' : 'Create Installment Schedule'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure student course details, duration, fees, and installment breakdown for States College Australia.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link href="/stc/installments" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold h-10 sm:h-9 cursor-pointer justify-center"
            >
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            form="stc-schedule-form"
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-[#009D9E] hover:bg-[#007A7A] text-white font-bold uppercase text-xs h-10 sm:h-9 gap-2 shadow-xs transition-colors justify-center cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                {mode === 'edit' ? 'UPDATE SCHEDULE' : 'SAVE SCHEDULE'}
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-md flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Form + Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* Left Form Controls */}
        <div className="lg:col-span-5 space-y-6">
          <form id="stc-schedule-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Card 1: Student & Course Information (Exact Sequence from AIMT Attachment) */}
            <Card className="bg-white border border-[#E2E8F0] shadow-2xs rounded-lg">
              <CardHeader className="py-4 border-b border-[#E2E8F0] flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-['Montserrat'] text-base font-bold text-[#003D5C]">
                    Student & Course Information
                  </CardTitle>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Core identification and enrolled qualifications
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {/* Row 1: Student ID & Student Name (2 Columns) */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                      STUDENT ID *
                    </Label>
                    <Input
                      placeholder="e.g. STC20014"
                      value={studentId}
                      onChange={(e) => handleStudentIdChange(e.target.value)}
                      className="mt-1.5 h-9 text-xs font-mono font-bold text-slate-900"
                      required
                    />
                    {enrolledCoursesForStudent.length > 0 && (
                      <p className="text-[10.5px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        Auto-filled ({enrolledCoursesForStudent.length} schedule(s) found)
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                      STUDENT NAME *
                    </Label>
                    <Input
                      placeholder="e.g. Aqsa Bibi"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      className="mt-1.5 h-9 text-xs font-semibold text-slate-900"
                      required
                    />
                  </div>
                </div>

                {/* Row 2: Agency Name (Optional) */}
                <div>
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center justify-between">
                    <span>AGENCY NAME (OPTIONAL)</span>
                    <span className="text-[10px] text-slate-400 font-normal lowercase">
                      (for schedule list only, not on preview/pdf)
                    </span>
                  </Label>
                  <Input
                    placeholder="e.g. Global Education Services, Nexus Visa, etc."
                    value={agency}
                    onChange={(e) => setAgency(e.target.value)}
                    className="mt-1.5 h-9 text-xs font-medium text-slate-900"
                  />
                </div>

                {/* Row 3: Course Name */}
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                      COURSE NAME *
                    </Label>
                    {enrolledCoursesForStudent.length > 0 && (
                      <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        {enrolledCoursesForStudent.length} course(s) disabled
                      </span>
                    )}
                  </div>
                  <select
                    value={selectedCourse}
                    onChange={(e) => handleCourseChange(e.target.value)}
                    className="mt-1.5 w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#009D9E]"
                  >
                    {STC_COURSES.map((c) => {
                      const isEnrolled = enrolledCoursesForStudent.includes(c.name.trim().toLowerCase())
                      return (
                        <option
                          key={c.name}
                          value={c.name}
                          disabled={isEnrolled}
                          className={isEnrolled ? 'text-slate-400 bg-slate-100 italic' : ''}
                        >
                          {c.name} ({c.duration}) {isEnrolled ? '— [Already Enrolled]' : ''}
                        </option>
                      )
                    })}
                  </select>
                </div>

                {/* Row 4: Duration (Weeks) & Schedule Issue Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                      DURATION (WEEKS)
                    </Label>
                    <Input
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="mt-1.5 h-9 text-xs font-medium text-slate-900"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                      SCHEDULE ISSUE DATE
                    </Label>
                    <Input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="mt-1.5 h-9 text-xs font-mono font-medium text-slate-900"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Course Dates (Header Display) */}
            <Card className="bg-white border border-[#E2E8F0] shadow-2xs rounded-lg">
              <CardHeader className="py-4 border-b border-[#E2E8F0]">
                <CardTitle className="font-['Montserrat'] text-base font-bold text-[#003D5C] flex items-center justify-between">
                  <span>Course Dates (Header Display)</span>
                  <span className="text-[11px] font-normal text-slate-400">Header Only</span>
                </CardTitle>
                <p className="text-[11px] text-slate-400 font-medium">
                  Controls Start Date & End Date printed on the document header
                </p>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                      COURSE START DATE *
                    </Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="mt-1.5 h-9 text-xs font-medium text-slate-900 font-mono"
                      required
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      e.g. 21/09/2026 (shows on header)
                    </p>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                      COURSE END DATE *
                    </Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="mt-1.5 h-9 text-xs font-medium text-slate-900 font-mono"
                      required
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      e.g. 14/11/2027 (shows on header)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Installment Schedule Timeline */}
            <Card className="bg-white border border-[#E2E8F0] shadow-2xs rounded-lg">
              <CardHeader className="py-4 border-b border-[#E2E8F0]">
                <CardTitle className="font-['Montserrat'] text-base font-bold text-[#003D5C] flex items-center justify-between">
                  <span>Installment Schedule Timeline</span>
                  <span className="text-[11px] font-bold text-[#009D9E] bg-[#009D9E]/10 px-2 py-0.5 rounded">
                    {calculationResult.scheduleItems.length} Installment{calculationResult.scheduleItems.length !== 1 ? 's' : ''}
                  </span>
                </CardTitle>
                <p className="text-[11px] text-slate-400 font-medium">
                  Set start and end months for installment schedule table generation
                </p>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                      SCHEDULE START MONTH *
                    </Label>
                    <Input
                      type="month"
                      value={scheduleStartMonth}
                      onChange={(e) => setScheduleStartMonth(e.target.value)}
                      className="mt-1.5 h-9 text-xs font-semibold text-slate-900 font-mono"
                      required
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Timeline starting month (e.g. Sep 2026)
                    </p>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                      SCHEDULE END MONTH *
                    </Label>
                    <Input
                      type="month"
                      value={scheduleEndMonth}
                      onChange={(e) => setScheduleEndMonth(e.target.value)}
                      className="mt-1.5 h-9 text-xs font-semibold text-slate-900 font-mono"
                      required
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Timeline ending month (e.g. Aug 2027)
                    </p>
                  </div>
                </div>

                {/* Optional 1st Installment Custom Month Override */}
                <div className="pt-2 border-t border-slate-100">
                  {!showCustomFirstMonth ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCustomFirstMonth(true)}
                      className="h-8 text-[11px] font-semibold text-slate-600 border-dashed border-slate-300 hover:text-[#009D9E] hover:border-[#009D9E] cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      + Override 1st Installment Month Only (Optional)
                    </Button>
                  ) : (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                      <div className="flex items-center justify-between mb-1.5">
                        <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                          1ST INSTALLMENT CUSTOM MONTH (OVERRIDE)
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowCustomFirstMonth(false)
                            setCustomFirstMonth('')
                          }}
                          className="h-6 text-[11px] text-rose-600 hover:text-rose-800 p-0 cursor-pointer"
                        >
                          Reset / Cancel
                        </Button>
                      </div>
                      <Input
                        type="month"
                        value={customFirstMonth}
                        onChange={(e) => setCustomFirstMonth(e.target.value)}
                        placeholder="e.g. 2026-08"
                        className="h-9 text-xs font-semibold text-slate-900 bg-white font-mono"
                      />
                      <p className="text-[10px] text-slate-500 mt-1.5 leading-tight">
                        * Modifies only the 1st installment row label. 2nd, 3rd, and subsequent installments will remain strictly on the schedule timeline.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Card 4: Fees & Installment Breakdown */}
            <Card className="bg-white border border-[#E2E8F0] shadow-2xs rounded-lg">
              <CardHeader className="py-4 border-b border-[#E2E8F0] flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-['Montserrat'] text-base font-bold text-[#003D5C]">
                    Fees & Installment Breakdown
                  </CardTitle>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Application fee, Material fee, Tuition fee & Initial payments
                  </p>
                </div>

                {!showScholarship && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowScholarship(true)}
                    className="h-8 text-[11px] gap-1.5 text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 font-semibold cursor-pointer"
                  >
                    <Award className="w-3.5 h-3.5" />
                    + Scholarship
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col justify-end">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px] pb-1.5">
                      APPLICATION
                    </Label>
                    <Input
                      type="number"
                      value={adminFee}
                      onChange={(e) => setAdminFee(Number(e.target.value))}
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px] pb-1.5">
                      MATERIAL
                    </Label>
                    <Input
                      type="number"
                      value={resourcesFee}
                      onChange={(e) => setResourcesFee(Number(e.target.value))}
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px] pb-1.5">
                      TUITION
                    </Label>
                    <Input
                      type="number"
                      value={tuitionFee}
                      onChange={(e) => setTuitionFee(Number(e.target.value))}
                      className="h-9 text-xs font-mono font-bold text-slate-900"
                    />
                  </div>
                </div>

                {showScholarship && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <Label className="text-xs font-bold text-emerald-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-emerald-600" />
                        SCHOLARSHIP DISCOUNT (AUD)
                      </Label>
                      <Input
                        type="number"
                        value={scholarship}
                        onChange={(e) => setScholarship(Number(e.target.value))}
                        className="mt-1.5 h-9 text-xs font-mono font-bold text-emerald-900 bg-white"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowScholarship(false)
                        setScholarship(0)
                      }}
                      className="text-xs text-rose-600 hover:text-rose-800 self-end mb-1 cursor-pointer"
                    >
                      Remove
                    </Button>
                  </div>
                )}

                {/* Dynamic Initial Upfront Payments Breakdown */}
                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                      Initial Upfront Payments Breakdown
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={addInitialFeeRow}
                      className="h-7 px-2 text-[11px] text-[#009D9E] hover:bg-[#009D9E]/10 rounded-lg font-semibold cursor-pointer"
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
                        className="h-9 text-xs font-mono font-semibold text-slate-900 bg-white border-slate-200 flex-1"
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

                {/* Total Calculated Summary Box */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        TOTAL COURSE AMOUNT
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Application + Material + Tuition {showScholarship && '- Scholarship'}
                      </span>
                    </div>
                    <span className="font-mono text-xl font-extrabold text-[#003D5C]">
                      AUD {calculationResult.totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>

        {/* Right Live Preview */}
        <div className="lg:col-span-7 sticky top-24">
          <div className="bg-white border border-[#E2E8F0] shadow-2xs rounded-lg p-4">
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

            <div className="max-h-[850px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-100/70 p-3 sm:p-4">
              <STCScheduleWebPreview schedule={previewScheduleData} fixedInfo={fixedInfo} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
