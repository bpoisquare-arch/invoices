'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  StudentInstallmentSchedule,
  AIMT_COURSES,
  calculateInstallmentScheduleItems,
  saveInstallment,
  getAimtFixedInfo,
  AIMTFixedInfo,
  getOrdinal,
  getInstallments,
} from '@/lib/services/installment.service'
import AimtScheduleWebPreview from '@/components/installments/aimt-schedule-web-preview'
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

interface InstallmentFormProps {
  mode: 'create' | 'edit'
  existingSchedule?: StudentInstallmentSchedule
}

export default function InstallmentForm({ mode, existingSchedule }: InstallmentFormProps) {
  const router = useRouter()

  const todayStr = new Date().toISOString().split('T')[0]
  const defaultStart = '2026-09-21'
  const defaultEnd = '2027-11-14'

  const [fixedInfo, setFixedInfo] = useState<AIMTFixedInfo>(getAimtFixedInfo())
  const [allSchedules, setAllSchedules] = useState<StudentInstallmentSchedule[]>([])
  const [scheduleDate, setScheduleDate] = useState(existingSchedule?.date || todayStr)
  const [studentName, setStudentName] = useState(existingSchedule?.student_name || (mode === 'edit' ? 'Aqsa Bibi' : ''))
  const [studentId, setStudentId] = useState(existingSchedule?.student_id || (mode === 'edit' ? 'BCP3000465' : ''))
  const [selectedCourse, setSelectedCourse] = useState(
    existingSchedule?.course_name || 'Advanced Diploma of Leadership and Management'
  )
  const [duration, setDuration] = useState(existingSchedule?.duration || '60 weeks')
  
  // 1. Course Header Display Dates (Certificate / Header only)
  const [startDate, setStartDate] = useState(existingSchedule?.start_date || defaultStart)
  const [endDate, setEndDate] = useState(existingSchedule?.end_date || defaultEnd)

  // 2. Installment Schedule Timeline (Controls table rows & months)
  const [scheduleStartMonth, setScheduleStartMonth] = useState<string>(
    existingSchedule?.schedule_start_month || (existingSchedule?.start_date ? existingSchedule.start_date.substring(0, 7) : '2026-09')
  )
  const [scheduleEndMonth, setScheduleEndMonth] = useState<string>(
    existingSchedule?.schedule_end_month || '2027-08'
  )

  // 3. Optional 1st Installment Custom Month Override
  const initialCustomMonth = existingSchedule?.first_installment_custom_month || (
    existingSchedule?.start_month_year && existingSchedule.start_month_year !== (existingSchedule.schedule_start_month || existingSchedule.start_date?.substring(0, 7))
      ? existingSchedule.start_month_year
      : ''
  )
  const [customFirstMonth, setCustomFirstMonth] = useState<string>(initialCustomMonth)
  const [showCustomFirstMonth, setShowCustomFirstMonth] = useState<boolean>(Boolean(initialCustomMonth))

  const [adminFee, setAdminFee] = useState<number>(existingSchedule?.admin_fee ?? 500)
  const [resourcesFee, setResourcesFee] = useState<number>(existingSchedule?.resources_fee ?? 800)
  const [agency, setAgency] = useState<string>(existingSchedule?.agency || '')
  const [showMaterialFee, setShowMaterialFee] = useState<boolean>((existingSchedule?.material_fee || 0) > 0)
  const [materialFee, setMaterialFee] = useState<number>(existingSchedule?.material_fee || 0)
  const [tuitionFee, setTuitionFee] = useState<number>(existingSchedule?.tuition_fee ?? 10000)
  
  const [showScholarship, setShowScholarship] = useState<boolean>((existingSchedule?.scholarship || 0) > 0)
  const [scholarship, setScholarship] = useState<number>(existingSchedule?.scholarship || 0)

  // Dynamic Initial Fee inputs array (1st initial fee, 2nd initial fee, etc.)
  const [initialFees, setInitialFees] = useState<number[]>(() => {
    if (existingSchedule?.initial_fees && existingSchedule.initial_fees.length > 0) {
      return existingSchedule.initial_fees
    }
    if (existingSchedule?.first_installment_amount !== undefined) {
      return [existingSchedule.first_installment_amount]
    }
    return [5000]
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setFixedInfo(getAimtFixedInfo())
    getInstallments().then((data) => {
      if (Array.isArray(data)) {
        setAllSchedules(data)
      }
    })
  }, [])

  // Identify courses already enrolled by this student ID
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

  // Auto-fill student name and agency when student ID matches an existing student
  function handleStudentIdChange(val: string) {
    setStudentId(val)
    const trimmed = val.trim().toLowerCase()
    if (trimmed) {
      const match = allSchedules.find(
        (s) => s.student_id?.trim().toLowerCase() === trimmed && (mode !== 'edit' || s.id !== existingSchedule?.id)
      )
      if (match) {
        if (match.student_name) {
          setStudentName(match.student_name)
        }
        if (match.agency && !agency) {
          setAgency(match.agency)
        }
      }
    }
  }

  // Auto-switch selected course if the currently selected course is already enrolled
  useEffect(() => {
    if (enrolledCoursesForStudent.length > 0) {
      const isCurrentDisabled = enrolledCoursesForStudent.includes(selectedCourse.trim().toLowerCase())
      if (isCurrentDisabled) {
        const availableCourse = AIMT_COURSES.find(
          (c) => !enrolledCoursesForStudent.includes(c.name.trim().toLowerCase())
        )
        if (availableCourse) {
          setSelectedCourse(availableCourse.name)
          setDuration(availableCourse.duration)
        }
      }
    }
  }, [enrolledCoursesForStudent, selectedCourse])

  function handleCourseChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const courseName = e.target.value
    setSelectedCourse(courseName)
    const match = AIMT_COURSES.find((c) => c.name === courseName)
    if (match) {
      setDuration(match.duration)
    }
  }

  function handleAddInitialFee() {
    setInitialFees((prev) => [...prev, 0])
  }

  function handleUpdateInitialFee(index: number, val: number) {
    setInitialFees((prev) => prev.map((f, i) => (i === index ? val : f)))
  }

  function handleRemoveInitialFee(index: number) {
    setInitialFees((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))
  }

  const activeScholarship = showScholarship ? scholarship : 0
  const activeMaterialFee = showMaterialFee && Number(materialFee) > 0 ? Number(materialFee) : 0

  const totalInitialPayment = initialFees.reduce((acc, n) => acc + (Number(n) || 0), 0)

  const effectiveCustomFirstMonth = (showCustomFirstMonth && customFirstMonth.trim()) ? customFirstMonth.trim() : undefined

  const { scheduleItems, totalAmount } = calculateInstallmentScheduleItems({
    start_date: startDate,
    end_date: endDate,
    schedule_start_month: scheduleStartMonth,
    schedule_end_month: scheduleEndMonth,
    first_installment_custom_month: effectiveCustomFirstMonth,
    admin_fee: adminFee,
    resources_fee: resourcesFee,
    material_fee: activeMaterialFee,
    tuition_fee: tuitionFee,
    scholarship: activeScholarship,
    initial_fees: initialFees,
    first_installment_amount: totalInitialPayment,
  })

  const liveSchedule: Partial<StudentInstallmentSchedule> = {
    id: existingSchedule?.id || 'temp',
    date: scheduleDate,
    student_name: studentName,
    student_id: studentId,
    course_name: selectedCourse,
    duration: duration,
    start_date: startDate,
    end_date: endDate,
    schedule_start_month: scheduleStartMonth,
    schedule_end_month: scheduleEndMonth,
    first_installment_custom_month: effectiveCustomFirstMonth,
    start_month_year: effectiveCustomFirstMonth || scheduleStartMonth,
    admin_fee: adminFee,
    resources_fee: resourcesFee,
    material_fee: activeMaterialFee > 0 ? activeMaterialFee : undefined,
    tuition_fee: tuitionFee,
    scholarship: activeScholarship,
    total_amount: totalAmount,
    first_installment_amount: totalInitialPayment,
    initial_fees: initialFees,
    schedule_items: scheduleItems,
    agency: agency.trim() || undefined,
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!studentName.trim()) {
      setError('Student Name is required.')
      return
    }
    if (!studentId.trim()) {
      setError('Student ID is required.')
      return
    }
    if (!startDate || !endDate) {
      setError('Course Start Date and End Date are required.')
      return
    }
    if (!scheduleStartMonth || !scheduleEndMonth) {
      setError('Schedule Start Month and End Month are required.')
      return
    }

    // Duplicate check: Same Student ID cannot enroll in the same Course more than once
    const trimmedId = studentId.trim().toLowerCase()
    const trimmedCourse = selectedCourse.trim().toLowerCase()
    const isDuplicate = allSchedules.some(
      (s) =>
        s.student_id?.trim().toLowerCase() === trimmedId &&
        s.course_name?.trim().toLowerCase() === trimmedCourse &&
        (mode !== 'edit' || s.id !== existingSchedule?.id)
    )

    if (isDuplicate) {
      setError(
        `A schedule already exists for Student ID "${studentId}" and Course "${selectedCourse}". Duplicate schedules for the same course cannot be created.`
      )
      setIsSubmitting(false)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const savedSchedule = await saveInstallment({
        id: existingSchedule?.id,
        date: scheduleDate,
        student_name: studentName,
        student_id: studentId,
        course_name: selectedCourse,
        duration: duration,
        start_date: startDate,
        end_date: endDate,
        schedule_start_month: scheduleStartMonth,
        schedule_end_month: scheduleEndMonth,
        first_installment_custom_month: effectiveCustomFirstMonth,
        start_month_year: effectiveCustomFirstMonth || scheduleStartMonth,
        admin_fee: Number(adminFee) || 0,
        resources_fee: Number(resourcesFee) || 0,
        material_fee: activeMaterialFee > 0 ? Number(activeMaterialFee) : undefined,
        tuition_fee: Number(tuitionFee) || 0,
        scholarship: Number(activeScholarship) || 0,
        total_amount: totalAmount,
        first_installment_amount: totalInitialPayment,
        initial_fees: initialFees,
        schedule_items: scheduleItems,
        agency: agency.trim() || undefined,
      })

      router.push(`/installments/${savedSchedule.id}/preview`)
    } catch (err: any) {
      setError(err?.message || 'Failed to save installment schedule')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="font-['Montserrat'] text-xl sm:text-2xl font-bold text-[#003D5C] tracking-tight">
            {mode === 'edit' ? 'Edit Installment Schedule' : 'Create Installment Schedule'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure student course details, duration, fees, and installment breakdown for AIMT.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            type="button"
            onClick={handleSubmit}
            className="w-full sm:w-auto bg-[#009D9E] hover:bg-[#007A7A] text-white font-bold uppercase text-xs h-10 sm:h-9 gap-2 shadow-xs transition-colors justify-center"
            disabled={isSubmitting}
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        <div className="lg:col-span-5 space-y-6">
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
              {/* Row 1: Student ID (1st) & Student Name (2nd) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    STUDENT ID *
                  </Label>
                  <Input
                    placeholder="e.g. BCP3000465"
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

              {/* Row 2: Agency Name (Before Course Name) */}
              <div>
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center justify-between">
                  <span>AGENCY NAME (OPTIONAL)</span>
                  <span className="text-[10px] text-slate-400 font-normal lowercase">(for schedule list only, not on preview/PDF)</span>
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
                  onChange={handleCourseChange}
                  className="mt-1.5 w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#009D9E]"
                >
                  {AIMT_COURSES.map((c) => {
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
                    className="mt-1.5 h-9 text-xs"
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
                    className="mt-1.5 h-9 text-xs"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Course Header Display Dates */}
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
                    className="mt-1.5 h-9 text-xs font-medium text-slate-900"
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
                    className="mt-1.5 h-9 text-xs font-medium text-slate-900"
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
                  {scheduleItems.length} Installment{scheduleItems.length !== 1 ? 's' : ''}
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
                    className="mt-1.5 h-9 text-xs font-semibold text-slate-900"
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
                    className="mt-1.5 h-9 text-xs font-semibold text-slate-900"
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
                    className="h-8 text-[11px] font-semibold text-slate-600 border-dashed border-slate-300 hover:text-[#009D9E] hover:border-[#009D9E]"
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
                        className="h-6 text-[11px] text-rose-600 hover:text-rose-800 p-0"
                      >
                        Reset / Cancel
                      </Button>
                    </div>
                    <Input
                      type="month"
                      value={customFirstMonth}
                      onChange={(e) => setCustomFirstMonth(e.target.value)}
                      placeholder="e.g. 2026-08"
                      className="h-9 text-xs font-semibold text-slate-900 bg-white"
                    />
                    <p className="text-[10px] text-slate-500 mt-1.5 leading-tight">
                      * Modifies only the 1st installment row label. 2nd, 3rd, and subsequent installments will remain strictly on the schedule timeline.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-[#E2E8F0] shadow-2xs rounded-lg">
            <CardHeader className="py-4 border-b border-[#E2E8F0] flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-['Montserrat'] text-base font-bold text-[#003D5C]">
                  Fees & Installment Breakdown
                </CardTitle>
                <p className="text-[11px] text-slate-400 font-medium">
                  Admin fee, Resource fee, Tuition fee & Initial fee
                </p>
              </div>

              <div className="flex items-center gap-2">
                {!showMaterialFee && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowMaterialFee(true)
                      setMaterialFee(500)
                    }}
                    className="h-8 text-[11px] gap-1.5 text-blue-700 border-blue-300 bg-blue-50 hover:bg-blue-100 font-semibold"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    + Material Fee
                  </Button>
                )}

                {!showScholarship && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowScholarship(true)}
                    className="h-8 text-[11px] gap-1.5 text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 font-semibold"
                  >
                    <Award className="w-3.5 h-3.5" />
                    + Scholarship
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col justify-end">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px] pb-1.5">
                    ADMIN
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
                    RESOURCE
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

              {showMaterialFee && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <Label className="text-xs font-bold text-blue-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-blue-600" />
                      MATERIAL FEE (AUD)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={materialFee === 0 ? '' : materialFee}
                      onChange={(e) => {
                        const val = e.target.value
                        setMaterialFee(val === '' ? 0 : Number(val))
                      }}
                      placeholder="e.g. 500"
                      className="mt-1.5 h-9 text-xs font-mono font-bold text-blue-900 bg-white"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowMaterialFee(false)
                      setMaterialFee(0)
                    }}
                    className="text-xs text-rose-600 hover:text-rose-800 self-end mb-1"
                  >
                    Remove
                  </Button>
                </div>
              )}

              {showScholarship && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <Label className="text-xs font-bold text-emerald-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-emerald-600" />
                      SCHOLARSHIP (AUD)
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
                    onClick={() => { setShowScholarship(false); setScholarship(0); }}
                    className="text-xs text-rose-600 hover:text-rose-800 self-end mb-1"
                  >
                    Remove
                  </Button>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      TOTAL COURSE AMOUNT
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Admin + Resources {showMaterialFee && '+ Material'} + Tuition {showScholarship && '- Scholarship'}
                    </span>
                  </div>
                  <span className="font-mono text-xl font-extrabold text-[#003D5C]">
                    AUD {totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-[#E2E8F0] shadow-2xs rounded-lg">
            <CardHeader className="py-3.5 border-b border-[#E2E8F0]">
              <div>
                <CardTitle className="font-['Montserrat'] text-base font-bold text-[#003D5C]">
                  Initial Fee Breakdown
                </CardTitle>
                <p className="text-[11px] text-slate-400 font-medium">
                  Enter upfront fee amounts received from the student
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-3">
                {initialFees.map((fee, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-md"
                  >
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px] block mb-1.5">
                      {idx === 0
                        ? '1ST INITIAL FEE (AUD) *'
                        : `${getOrdinal(idx + 1).toUpperCase()} INITIAL FEE (AUD)`}
                    </Label>
                    <div className="flex flex-wrap items-center gap-3">
                      <Input
                        type="number"
                        min={0}
                        value={fee === 0 ? '' : fee}
                        onChange={(e) => {
                          const v = e.target.value
                          handleUpdateInitialFee(idx, v === '' ? 0 : Number(v))
                        }}
                        placeholder={`e.g. ${idx === 0 ? '400' : '1000'}`}
                        className="w-48 sm:w-56 h-9 text-xs font-mono font-bold text-slate-900 bg-white"
                        required={idx === 0}
                      />

                      {idx === 0 && initialFees.length === 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddInitialFee}
                          className="text-xs h-9 font-semibold border-dashed border-[#009D9E] text-[#009D9E] hover:bg-[#009D9E]/10"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          + Add 2nd Initial Fee
                        </Button>
                      )}

                      {initialFees.length > 1 && idx > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveInitialFee(idx)}
                          className="text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 h-9 px-2.5"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {initialFees.length > 1 && (
                  <div className="pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddInitialFee}
                      className="text-xs h-8 font-semibold border-dashed border-[#009D9E] text-[#009D9E] hover:bg-[#009D9E]/10"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      + Add {getOrdinal(initialFees.length + 1)} Initial Fee
                    </Button>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">
                      TOTAL INITIAL PAYMENT
                    </span>
                    <span className="text-[11px] text-blue-600/80">
                      {initialFees.length} upfront payment{initialFees.length > 1 ? 's' : ''} configured
                    </span>
                  </div>
                  <span className="font-mono text-xl font-extrabold text-[#003D5C]">
                    AUD {totalInitialPayment.toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-7 sticky top-4">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-[#009D9E]" />
              LIVE PREVIEW SHEET
            </span>
          </div>

          <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 shadow-inner flex justify-center overflow-x-auto">
            <AimtScheduleWebPreview schedule={liveSchedule} fixedInfo={fixedInfo} />
          </div>
        </div>
      </div>
    </div>
  )
}
