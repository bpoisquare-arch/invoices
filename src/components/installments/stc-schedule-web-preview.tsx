'use client'

import React from 'react'
import {
  STCStudentInstallmentSchedule,
  STCFixedInfo,
  DEFAULT_STC_FIXED_INFO,
} from '@/lib/services/stc-installment.service'

interface STCScheduleWebPreviewProps {
  schedule: Partial<STCStudentInstallmentSchedule>
  fixedInfo?: STCFixedInfo
  id?: string
}

export default function STCScheduleWebPreview({
  schedule,
  fixedInfo = DEFAULT_STC_FIXED_INFO,
  id = 'stc-schedule-web-preview',
}: STCScheduleWebPreviewProps) {
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
    <div
      id={id}
      className="relative mx-auto w-full max-w-[880px] min-h-[1140px] flex flex-col justify-between bg-white p-8 sm:p-12 md:p-14 shadow-md text-slate-800 border border-slate-200 rounded-md overflow-hidden"
      style={{
        fontFamily:
          '"Canva Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
        fontWeight: 300,
      }}
    >
      {/* Top-Right Corner Elements Image */}
      <img
        src="/elements.png"
        alt="Letterhead Accent Top Right"
        className="absolute top-0 right-0 w-40 sm:w-48 h-auto pointer-events-none z-0 object-contain"
      />

      {/* Bottom-Left Corner Elements Image (Rotated 180 deg) */}
      <img
        src="/elements.png"
        alt="Letterhead Accent Bottom Left"
        className="absolute bottom-0 left-0 w-40 sm:w-48 h-auto pointer-events-none z-0 object-contain rotate-180"
      />

      {/* Main Top / Middle Content Section */}
      <div className="relative z-10 flex-1 flex flex-col">
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-6">
        {/* Left Side: STC Logo with Fixed Details underneath */}
        <div className="flex flex-col items-start text-left space-y-2 max-w-[380px]">
          <img
            src={fixedInfo.logo_url || '/STC-logo.png'}
            alt="States College Australia Logo"
            className="h-16 sm:h-18 object-contain mb-2"
          />
          <div className="text-[13px] leading-snug text-slate-700 font-medium space-y-0.5">
            <p className="font-bold text-slate-900 text-sm">{fixedInfo.college_name || 'States College Australia Pty Ltd'}</p>
            <p className="text-slate-700">{fixedInfo.address || 'Level 3, 301/620 Bourke Street, Melbourne, VIC 3000'}</p>
            <p className="text-slate-700">
              RTO: {fixedInfo.rto || '45976'} | CRICOS: {fixedInfo.cricos || '04106B'}
            </p>
          </div>
        </div>

        {/* Right Side: Heading INSTALLMENT SCHEDULE + Date underneath */}
        <div className="pt-2 sm:pt-4 text-left sm:text-right flex flex-col items-start sm:items-end pr-14 sm:pr-18">
          <h1
            className="text-2xl sm:text-3xl tracking-normal text-slate-800 uppercase leading-none font-black"
            style={{
              fontFamily:
                '"Canva Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
              fontWeight: 900,
            }}
          >
            INSTALLMENT
          </h1>
          <h1
            className="text-2xl sm:text-3xl tracking-normal text-slate-800 uppercase mt-1 font-black"
            style={{
              fontFamily:
                '"Canva Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
              fontWeight: 900,
            }}
          >
            SCHEDULE
          </h1>

          <div className="mt-4 text-[13px] leading-tight text-slate-700 font-medium">
            <p className="font-bold text-slate-900 text-sm">Date</p>
            <p className="font-semibold text-slate-900 text-sm">{formatDate(schedule.date)}</p>
          </div>
        </div>
      </div>

      {/* Student Details & Fee Metadata Form Fill-Line Style */}
      <div className="mt-4 mb-6 space-y-3 text-xs sm:text-sm text-slate-900 leading-normal">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-bold uppercase tracking-wider text-slate-800">Student Name:</span>
          <span className="flex-1 min-w-[200px] border-b-[1.5px] border-slate-900 pb-0.5 font-medium px-1">
            {schedule.student_name || ''}
          </span>
          <span className="font-bold uppercase tracking-wider text-slate-800 ml-auto">Student ID:</span>
          <span className="w-[140px] border-b-[1.5px] border-slate-900 pb-0.5 font-medium px-1">
            {schedule.student_id || ''}
          </span>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-bold uppercase tracking-wider text-slate-800">Course Name:</span>
          <span className="flex-1 min-w-[240px] border-b-[1.5px] border-slate-900 pb-0.5 font-medium px-1">
            {schedule.course_name || ''}
          </span>
          <span className="font-bold uppercase tracking-wider text-slate-800">Duration:</span>
          <span className="w-[100px] border-b-[1.5px] border-slate-900 pb-0.5 font-medium px-1">
            {schedule.duration || ''}
          </span>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-bold uppercase tracking-wider text-slate-800">Start Date:</span>
          <span className="flex-1 min-w-[130px] border-b-[1.5px] border-slate-900 pb-0.5 font-medium px-1">
            {formatDate(schedule.start_date)}
          </span>
          <span className="font-bold uppercase tracking-wider text-slate-800">End Date:</span>
          <span className="flex-1 min-w-[130px] border-b-[1.5px] border-slate-900 pb-0.5 font-medium px-1">
            {formatDate(schedule.end_date)}
          </span>
        </div>

        <div className="flex items-baseline gap-x-2 sm:gap-x-3 pt-1 text-xs sm:text-[13px]">
          <div className="flex items-baseline gap-1 flex-1 min-w-0">
            <span className="font-bold uppercase tracking-wider text-slate-800 shrink-0 whitespace-nowrap">
              Application Fee:
            </span>
            <span className="flex-1 border-b-[1.5px] border-slate-900 pb-0.5 font-medium px-1 whitespace-nowrap">
              AUD {schedule.admin_fee ?? 0}
            </span>
          </div>
          <div className="flex items-baseline gap-1 flex-1 min-w-0">
            <span className="font-bold uppercase tracking-wider text-slate-800 shrink-0 whitespace-nowrap">
              Material Fee:
            </span>
            <span className="flex-1 border-b-[1.5px] border-slate-900 pb-0.5 font-medium px-1 whitespace-nowrap">
              AUD {schedule.resources_fee ?? 0}
            </span>
          </div>
          <div className="flex items-baseline gap-1 flex-1 min-w-0">
            <span className="font-bold uppercase tracking-wider text-slate-800 shrink-0 whitespace-nowrap">
              Tuition Fee:
            </span>
            <span className="flex-1 border-b-[1.5px] border-slate-900 pb-0.5 font-medium px-1 whitespace-nowrap">
              AUD {Number(schedule.tuition_fee || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {Number(schedule.scholarship || 0) > 0 && (
          <div className="flex items-baseline gap-1">
            <span className="font-bold uppercase tracking-wider text-emerald-800">Scholarship:</span>
            <span className="flex-1 border-b-[1.5px] border-slate-900 pb-0.5 font-medium px-1 text-emerald-800">
              AUD -{Number(schedule.scholarship).toLocaleString()}
            </span>
          </div>
        )}

        <div className="flex items-baseline gap-1 pt-1">
          <span className="font-bold uppercase tracking-wider text-slate-900 text-sm">Total Amount:</span>
          <span className="flex-1 border-b-2 border-slate-900 pb-0.5 font-black px-1 text-slate-900 text-sm">
            AUD {Number(totalAmt).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Center STC Watermark Logo (12% Transparency) */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"
        style={{ opacity: 0.12 }}
      >
        <img
          src={fixedInfo.logo_url || '/STC-logo.png'}
          alt="STC Watermark"
          className="w-[460px] object-contain"
        />
      </div>

      {/* Main Installment Table matching Attachment */}
      <div className="relative z-10 my-6 border-2 border-[#0F3A7E] rounded-xs overflow-hidden text-xs sm:text-[13px] shadow-xs">
        {/* Table Title Header Bar */}
        <div
          className="bg-[#0F3A7E] font-black text-white text-center py-2.5 px-3 uppercase text-xs sm:text-sm tracking-wider"
          style={{
            fontFamily:
              '"Canva Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
            fontWeight: 900,
          }}
        >
          INSTALLMENT SCHEDULE
        </div>

        {/* Table Column Subheadings */}
        <div className="grid grid-cols-12 bg-[#DCE6F1] font-bold text-slate-900 py-2 px-3 border-b border-slate-300 text-xs sm:text-[13px]">
          <div className="col-span-3 text-center">Date</div>
          <div className="col-span-6 text-center border-l border-slate-300 pl-3">Installment Details</div>
          <div className="col-span-3 text-right border-l border-slate-300 pl-3">Amount (AUD)</div>
        </div>

        {/* Table Body with alternating #EEF4FB and #DCE6F1 */}
        <div className="divide-y divide-slate-200">
          {items.length > 0 ? (
            items.map((item, idx) => (
              <div
                key={idx}
                className={`grid grid-cols-12 py-2.5 px-3 items-center text-xs sm:text-[13px] font-semibold ${
                  idx % 2 === 0 ? 'bg-[#EEF4FB]' : 'bg-[#DCE6F1]'
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
        <div className="grid grid-cols-12 bg-[#0F3A7E] text-white font-extrabold py-2.5 px-3 items-center text-xs sm:text-sm">
          <div className="col-span-9 text-center uppercase tracking-wider">TOTAL AMOUNT</div>
          <div className="col-span-3 text-right font-black text-sm sm:text-base border-l border-blue-400/40 pl-3">
            AUD {Number(totalAmt).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Horizontal Divider Line below Table */}
      <div className="w-full border-b border-slate-200 my-4" />

      {/* Footer Payment Details Table on Right */}
      <div className="flex flex-col items-end text-sm text-slate-800">
        <div className="w-fit">
          <h3
            className="font-black text-sm sm:text-base text-[#0F3A7E] uppercase tracking-wider mb-2.5 text-right"
            style={{
              fontFamily:
                '"Canva Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontWeight: 900,
            }}
          >
            PAYMENT DETAILS
          </h3>
          <div className="flex items-stretch text-[13px] sm:text-sm leading-relaxed text-left">
            {/* Left Labels */}
            <div className="font-bold text-slate-900 space-y-1 pr-1 whitespace-nowrap">
              <div>Bank:</div>
              <div>Account Name:</div>
              <div>BSB/Branch No:</div>
              <div>Account No:</div>
              <div>BIC/SWIFT Code:</div>
            </div>

            {/* Continuous Vertical Separator Line */}
            <div className="w-[1.5px] bg-slate-400 mx-3 self-stretch" />

            {/* Right Values */}
            <div className="font-medium text-slate-800 space-y-1 whitespace-nowrap">
              <div>{fixedInfo.bank || 'Commonwealth Bank of Australia'}</div>
              <div>{fixedInfo.college_name || 'States College Australia Pty Ltd'}</div>
              <div>{fixedInfo.bsb || '063-010'}</div>
              <div>{fixedInfo.account_no || '1508 2685'}</div>
              <div>{fixedInfo.swift_code || 'CTBAAU2S'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Bottom Contact & Address Bar (Shifted to right of the bottom-left corner graphic) */}
    <div className="relative z-10 mt-auto ml-36 sm:ml-48 pt-4 border-t border-slate-200 text-center text-slate-700 text-xs space-y-1 pb-1">
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 font-medium text-slate-800">
        <span className="inline-flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-[#0F3A7E]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z"/>
          </svg>
          {fixedInfo.phone || '+61 3 9000 5743'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-[#0F3A7E]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/>
          </svg>
          {fixedInfo.mobile || '+61 466 041 112'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-[#0F3A7E]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
          </svg>
          {fixedInfo.email || 'admissions@states.edu.au'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-[#0F3A7E]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
          {fixedInfo.website || 'www.states.edu.au'}
        </span>
      </div>
      <p className="text-[11px] text-slate-500 font-medium pt-0.5">
        {fixedInfo.address || 'Level 3, 301/620 Bourke Street, Melbourne, VIC 3000'} | RTO: {fixedInfo.rto || '45976'} | CRICOS: {fixedInfo.cricos || '04106B'}
      </p>
    </div>
  </div>
)
}
