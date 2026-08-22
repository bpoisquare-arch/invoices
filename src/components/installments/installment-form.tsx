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
  const [scheduleDate, setScheduleDate] = useState(existingSchedule?.date || todayStr)
  const [studentName, setStudentName] = useState(existingSchedule?.student_name || 'Aqsa Bibi')
  const [studentId, setStudentId] = useState(existingSchedule?.student_id || 'BCP3000465')
  const [selectedCourse, setSelectedCourse] = useState(
    existingSchedule?.course_name || 'Advanced Diploma of Leadership and Management'
  )
  const [duration, setDuration] = useState(existingSchedule?.duration || '60 weeks')
  const [startDate, setStartDate] = useState(existingSchedule?.start_date || defaultStart)
  const [endDate, setEndDate] = useState(existingSchedule?.end_date || defaultEnd)
  const [startMonthYear, setStartMonthYear] = useState<string>(existingSchedule?.start_month_year || '2026-09')
  const [endMonthOffset, setEndMonthOffset] = useState<number>(existingSchedule?.end_month_offset ?? 3)

  const [adminFee, setAdminFee] = useState<number>(existingSchedule?.admin_fee ?? 500)
  const [resourcesFee, setResourcesFee] = useState<number>(existingSchedule?.resources_fee ?? 800)
  const [tuitionFee, setTuitionFee] = useState<number>(existingSchedule?.tuition_fee ?? 10000)
  
  const [showScholarship, setShowScholarship] = useState<boolean>((existingSchedule?.scholarship || 0) > 0)
  const [scholarship, setScholarship] = useState<number>(existingSchedule?.scholarship || 0)
  const [firstInstallmentAmount, setFirstInstallmentAmount] = useState<number>(
    existingSchedule?.first_installment_amount ?? 5000
  )

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setFixedInfo(getAimtFixedInfo())
  }, [])

  function handleCourseChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const courseName = e.target.value
    setSelectedCourse(courseName)
    const match = AIMT_COURSES.find((c) => c.name === courseName)
    if (match) {
      setDuration(match.duration)
    }
  }

  const activeScholarship = showScholarship ? scholarship : 0
  const { scheduleItems, totalAmount } = calculateInstallmentScheduleItems({
    start_date: startDate,
    end_date: endDate,
    start_month_year: startMonthYear,
    end_month_offset: endMonthOffset,
    admin_fee: adminFee,
    resources_fee: resourcesFee,
    tuition_fee: tuitionFee,
    scholarship: activeScholarship,
    first_installment_amount: firstInstallmentAmount,
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
    start_month_year: startMonthYear,
    end_month_offset: endMonthOffset,
    admin_fee: adminFee,
    resources_fee: resourcesFee,
    tuition_fee: tuitionFee,
    scholarship: activeScholarship,
    total_amount: totalAmount,
    first_installment_amount: firstInstallmentAmount,
    schedule_items: scheduleItems,
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
      setError('Start Date and End Date are required.')
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
        start_month_year: startMonthYear,
        end_month_offset: endMonthOffset,
        admin_fee: Number(adminFee) || 0,
        resources_fee: Number(resourcesFee) || 0,
        tuition_fee: Number(tuitionFee) || 0,
        scholarship: Number(activeScholarship) || 0,
        total_amount: totalAmount,
        first_installment_amount: Number(firstInstallmentAmount) || 0,
        schedule_items: scheduleItems,
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
          <h1 className="font-['Montserrat'] text-2xl font-bold text-[#003D5C] tracking-tight">
            Student Installment Schedule
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure student course details, duration, fees, and installment breakdown for AIMT.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={handleSubmit}
            className="bg-[#009D9E] hover:bg-[#007A7A] text-white font-bold uppercase text-xs h-9 gap-2 shadow-xs transition-colors"
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
                SAVE SCHEDULE
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
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
              <div className="grid grid-cols-2 gap-4">
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

                <div>
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    STUDENT ID *
                  </Label>
                  <Input
                    placeholder="e.g. BCP3000465"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="mt-1.5 h-9 text-xs font-mono font-bold text-slate-900"
                    required
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  COURSE NAME *
                </Label>
                <select
                  value={selectedCourse}
                  onChange={handleCourseChange}
                  className="mt-1.5 w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#009D9E]"
                >
                  {AIMT_COURSES.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name} ({c.duration})
                    </option>
                  ))}
                </select>
              </div>

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

          <Card className="bg-white border border-[#E2E8F0] shadow-2xs rounded-lg">
            <CardHeader className="py-4 border-b border-[#E2E8F0]">
              <CardTitle className="font-['Montserrat'] text-base font-bold text-[#003D5C]">
                Course Dates & Installment Timing
              </CardTitle>
              <p className="text-[11px] text-slate-400 font-medium">
                Set course duration dates and first installment month
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
                    className="mt-1.5 h-9 text-xs font-medium"
                    required
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    COURSE END DATE *
                  </Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1.5 h-9 text-xs font-medium"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    1ST INSTALLMENT MONTH
                  </Label>
                  <Input
                    type="month"
                    value={startMonthYear}
                    onChange={(e) => setStartMonthYear(e.target.value)}
                    className="mt-1.5 h-9 text-xs font-semibold text-slate-800"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Override label (e.g. Dec-25)
                  </p>
                </div>

                <div>
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    LAST INSTALLMENT OFFSET (MONTHS)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={24}
                    value={isNaN(endMonthOffset) ? '' : endMonthOffset}
                    onChange={(e) => {
                      const val = e.target.value
                      setEndMonthOffset(val === '' ? 0 : Number(val))
                    }}
                    placeholder="e.g. 2"
                    className="mt-1.5 h-9 text-xs font-semibold text-slate-800"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    {endMonthOffset > 0
                      ? `${endMonthOffset} month${endMonthOffset > 1 ? 's' : ''} before course end`
                      : 'Ends in course end month'}
                  </p>
                </div>
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

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <Label className="text-xs font-bold text-blue-900 uppercase tracking-wider text-[11px]">
                    INITIAL FEE *
                  </Label>
                  <Input
                    type="number"
                    value={firstInstallmentAmount}
                    onChange={(e) => setFirstInstallmentAmount(Number(e.target.value))}
                    className="mt-1.5 h-9 text-xs font-mono font-bold text-blue-900 bg-blue-50 border-blue-200"
                    required
                  />
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-md flex flex-col justify-center text-right">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    TOTAL AMOUNT
                  </span>
                  <span className="font-mono text-xl font-extrabold text-[#003D5C]">
                    AUD {totalAmount.toLocaleString()}
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
