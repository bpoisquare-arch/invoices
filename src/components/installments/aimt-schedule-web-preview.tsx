'use client'

import React from 'react'
import { StudentInstallmentSchedule, AIMTFixedInfo, DEFAULT_AIMT_FIXED_INFO } from '@/lib/services/installment.service'

interface AimtScheduleWebPreviewProps {
  schedule: Partial<StudentInstallmentSchedule>
  fixedInfo?: AIMTFixedInfo
  id?: string
}

export default function AimtScheduleWebPreview({ schedule, fixedInfo = DEFAULT_AIMT_FIXED_INFO, id = "aimt-schedule-web-preview" }: AimtScheduleWebPreviewProps) {
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A'
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return dateStr
  }

  const items = schedule.schedule_items || []
  const totalAmt = schedule.total_amount || 0

  return (
    <div id={id} className="relative mx-auto w-full max-w-[850px] bg-white p-8 sm:p-12 shadow-sm text-slate-800 border border-slate-200 rounded-md overflow-hidden" style={{ fontFamily: '"Canva Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif', fontWeight: 300 }}>
      {/* Top-Right Corner Elements Image */}
      <img
        src="/elements.png"
        alt="Letterhead Accent Top Right"
        className="absolute top-0 right-0 w-36 sm:w-44 h-auto pointer-events-none z-0 object-contain"
      />

      {/* Bottom-Left Corner Elements Image (Rotated 180 deg) */}
      <img
        src="/elements.png"
        alt="Letterhead Accent Bottom Left"
        className="absolute bottom-0 left-0 w-36 sm:w-44 h-auto pointer-events-none z-0 object-contain rotate-180"
      />

      {/* Top Header Row matching updated user instructions */}
      <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start gap-6 pb-6">
        {/* Left Side: AIMT Logo with Fixed Details underneath */}
        <div className="flex flex-col items-start text-left space-y-2 max-w-[360px]">
          <img
            src={fixedInfo.logo_url || '/aimt-logo.png'}
            alt="AIMT Logo"
            className="h-16 object-contain mb-2"
          />
          <div className="text-[12px] leading-tight text-slate-700 font-medium space-y-0.5">
            <p className="font-bold text-slate-900">{fixedInfo.college_name}</p>
            <p className="text-slate-600">Address: {fixedInfo.address}</p>
            <p className="text-slate-600">RTO: {fixedInfo.rto}, CRICOS: {fixedInfo.cricos}</p>
          </div>
        </div>

        {/* Right Side: Heading INSTALLMENT SCHEDULE + Date underneath */}
        <div className="pt-2 sm:pt-4 text-left sm:text-right flex flex-col items-start sm:items-end pr-14 sm:pr-16">
          <h1 className="text-2xl sm:text-3xl tracking-normal text-slate-800 uppercase leading-none font-black" style={{ fontFamily: '"Canva Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif', fontWeight: 900 }}>
            INSTALLMENT
          </h1>
          <h1 className="text-2xl sm:text-3xl tracking-normal text-slate-800 uppercase mt-1 font-black" style={{ fontFamily: '"Canva Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif', fontWeight: 900 }}>
            SCHEDULE
          </h1>

          <div className="mt-4 text-[12px] leading-tight text-slate-700 font-medium">
            <p className="font-bold text-slate-900 text-sm">Date</p>
            <p className="font-semibold text-slate-900 text-sm">{formatDate(schedule.date)}</p>
          </div>
        </div>
      </div>

      {/* Student Details & Fee Metadata Form Fill-Line Style */}
      <div className="mt-4 mb-6 space-y-2 text-xs sm:text-sm text-slate-900 leading-normal">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-bold uppercase tracking-wider text-slate-700">Student Name:</span>
          <span className="flex-1 min-w-[200px] border-b border-slate-900 pb-0.5 font-medium px-1">
            {schedule.student_name || ''}
          </span>
          <span className="font-bold uppercase tracking-wider text-slate-700 ml-auto">Student ID:</span>
          <span className="w-[140px] border-b border-slate-900 pb-0.5 font-medium px-1">
            {schedule.student_id || ''}
          </span>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-bold uppercase tracking-wider text-slate-700">Course Name:</span>
          <span className="flex-1 min-w-[240px] border-b border-slate-900 pb-0.5 font-medium px-1">
            {schedule.course_name || ''}
          </span>
          <span className="font-bold uppercase tracking-wider text-slate-700">Duration:</span>
          <span className="w-[100px] border-b border-slate-900 pb-0.5 font-medium px-1">
            {schedule.duration || ''}
          </span>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-bold uppercase tracking-wider text-slate-700">Start Date:</span>
          <span className="flex-1 min-w-[130px] border-b border-slate-900 pb-0.5 font-medium px-1">
            {formatDate(schedule.start_date)}
          </span>
          <span className="font-bold uppercase tracking-wider text-slate-700">End Date:</span>
          <span className="flex-1 min-w-[130px] border-b border-slate-900 pb-0.5 font-medium px-1">
            {formatDate(schedule.end_date)}
          </span>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pt-1">
          <div className="flex items-baseline gap-1 flex-1 min-w-[130px]">
            <span className="font-bold uppercase tracking-wider text-slate-700">Admin Fee:</span>
            <span className="flex-1 border-b border-slate-900 pb-0.5 font-medium px-1">
              AUD {schedule.admin_fee ?? 0}
            </span>
          </div>
          <div className="flex items-baseline gap-1 flex-1 min-w-[150px]">
            <span className="font-bold uppercase tracking-wider text-slate-700">Resources Fee:</span>
            <span className="flex-1 border-b border-slate-900 pb-0.5 font-medium px-1">
              AUD {schedule.resources_fee ?? 0}
            </span>
          </div>
          <div className="flex items-baseline gap-1 flex-1 min-w-[150px]">
            <span className="font-bold uppercase tracking-wider text-slate-700">Tuition Fee:</span>
            <span className="flex-1 border-b border-slate-900 pb-0.5 font-medium px-1">
              AUD {Number(schedule.tuition_fee || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {Number(schedule.scholarship || 0) > 0 && (
          <div className="flex items-baseline gap-1">
            <span className="font-bold uppercase tracking-wider text-emerald-800">Scholarship:</span>
            <span className="flex-1 border-b border-slate-900 pb-0.5 font-medium px-1 text-emerald-800">
              AUD -{Number(schedule.scholarship).toLocaleString()}
            </span>
          </div>
        )}

        <div className="flex items-baseline gap-1 pt-1">
          <span className="font-bold uppercase tracking-wider text-slate-900">Total Amount:</span>
          <span className="flex-1 border-b-2 border-slate-900 pb-0.5 font-bold px-1 text-slate-900">
            AUD {Number(totalAmt).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Top Layer Center AIMT Watermark Logo (20% Transparency) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20" style={{ opacity: 0.1 }}>
        <img
          src={fixedInfo.logo_url || '/aimt-logo.png'}
          alt="AIMT Watermark"
          className="w-[380px] object-contain"
        />
      </div>

      {/* Main Installment Table matching Image */}
      <div className="relative z-10 my-6 border border-[#0F3A7E] rounded-xs overflow-hidden text-xs shadow-xs">
        {/* Table Title Header Bar */}
        <div className="bg-[#0F3A7E] font-black text-white text-center py-2 px-3 uppercase text-xs tracking-wider" style={{ fontFamily: '"Canva Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif', fontWeight: 900 }}>
          INSTALLMENT SCHEDULE
        </div>

        {/* Table Body */}
        <div className="divide-y divide-slate-200">
          {items.length > 0 ? (
            items.map((item, idx) => (
              <div
                key={idx}
                className={`grid grid-cols-12 py-2 px-3 items-center text-xs font-semibold ${idx % 2 === 0 ? 'bg-[#DCE6F1]' : 'bg-[#EEF4FB]'
                  }`}
              >
                <div className="col-span-3 font-bold text-[#0F3A7E] text-center">
                  {item.monthLabel}
                </div>
                <div className="col-span-6 text-slate-800 border-l border-slate-300 pl-3">
                  {item.description}
                </div>
                <div className="col-span-3 text-right font-bold text-slate-900 border-l border-slate-300 pl-3">
                  AUD {Number(item.amount).toLocaleString()}
                </div>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-slate-400 italic bg-slate-50">
              No installment schedule generated yet. Enter Start/End dates and fees.
            </div>
          )}
        </div>

        {/* Total Amount Footer Bar */}
        <div className="grid grid-cols-12 bg-[#0F3A7E] text-white font-extrabold py-2 px-3 items-center text-xs">
          <div className="col-span-9 text-center uppercase tracking-wider">
            TOTAL AMOUNT
          </div>
          <div className="col-span-3 text-right font-extrabold text-sm border-l border-blue-400/40 pl-3">
            AUD {Number(totalAmt).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Footer Fixed Payment & Contact Details (Right Aligned) */}
      <div className="relative z-10 pt-4 mt-6 border-t border-slate-200 text-right text-xs text-slate-800 space-y-1 pb-6">
        <h3 className="font-extrabold text-sm text-[#0F3A7E] uppercase tracking-wider mb-2" style={{ fontFamily: '"Canva Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontWeight: 900 }}>
          Payment Details
        </h3>
        <p><span className="font-bold">Account Name:</span> Australian Institute of Management and Technology</p>
        <p><span className="font-bold">BSB:</span> 016 358</p>
        <p><span className="font-bold">Account Number:</span> 812181361</p>
        <p className="pt-1.5"><span className="font-bold">email:</span> accounts@aimtedu.com.au</p>
      </div>
    </div>
  )
}
