'use client'

import React from 'react'
import { EdlinkPayslip, formatCurrency } from '@/lib/services/edlink-payslip.service'

interface EdLinkPayslipWebPreviewProps {
  payslip: EdlinkPayslip
}

export default function EdLinkPayslipWebPreview({ payslip }: EdLinkPayslipWebPreviewProps) {
  const formatHours = (val: any) => {
    if (val === undefined || val === null || val === '') return '0'
    return String(val)
  }
  const formatRate = (val: number) => `$${(Number(val) || 0).toFixed(4)}`

  return (
    <div className="w-full max-w-[820px] min-h-[960px] mx-auto bg-white text-[#0f172a] shadow-xl rounded-lg p-10 sm:p-14 font-sans border border-slate-200 print:border-none print:shadow-none print:p-0 transition-all flex flex-col justify-between">
      <div>
        {/* 1. Top Section: EdLink Logo (Left) and Paid By (Right) */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-5 mb-8">
          <div className="w-52 sm:w-60">
            <img
              src="/edlink-logo.png"
              alt="EdLink Australia Logo"
              className="w-full max-w-[240px] h-auto object-contain block"
            />
          </div>
          <div className="w-full sm:w-[270px] bg-[#f1f5f9] rounded-none p-3.5 text-xs sm:text-[12px] leading-relaxed">
            <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1.5">
              PAID BY
            </div>
            <div className="text-slate-800 font-medium">
              {payslip.paid_by_name || 'EdLink Education & Visa Services'}
            </div>
            <div className="text-slate-600">{payslip.paid_by_address_1 || 'Suit 3, Level 4/20'}</div>
            <div className="text-slate-600">{payslip.paid_by_address_2 || 'Collins Street, Melbourne 3000'}</div>
            <div className="text-slate-600">ABN {payslip.paid_by_abn || '62 658 488 469'}</div>
          </div>
        </div>

        {/* 2. Middle Section: Employee details (Left) & Employment Details Box (Right) */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-5 mb-8 mt-4">
          <div className="text-sm">
            <div className="font-bold text-slate-900 text-lg mb-1.5">
              {payslip.employee_name || 'Muhammad Usman'}
            </div>
            {payslip.address_line_1 && (
              <div className="text-slate-700 text-sm leading-relaxed">{payslip.address_line_1}</div>
            )}
            {payslip.address_line_2 && (
              <div className="text-slate-700 text-sm leading-relaxed">{payslip.address_line_2}</div>
            )}
          </div>

          <div className="w-full sm:w-[270px] bg-[#f1f5f9] rounded-none p-3.5 text-xs sm:text-[12px] leading-relaxed">
            <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1.5">
              EMPLOYMENT DETAILS
            </div>
            <div>
              <span className="text-slate-600">Pay Frequency: </span>
              <span className="font-semibold text-slate-900">{payslip.pay_frequency || 'Fortnightly'}</span>
            </div>
            {payslip.show_annual_salary !== false && Number(payslip.annual_salary || 0) > 0 && (
              <div>
                <span className="text-slate-600">Annual Salary: </span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(payslip.annual_salary || 0)}
                </span>
              </div>
            )}
            <div>
              <span className="text-slate-600">Employment Basis: </span>
              <span className="font-semibold text-slate-900">
                {payslip.employment_basis || 'Full-time employment'}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Summary Ribbon / Bar: Natural wide spacing without text overlap */}
        <div className="bg-slate-100 border-y-2 border-slate-300 px-4 py-3 text-xs sm:text-[13px] flex flex-wrap justify-between items-center gap-4 mb-8 font-medium rounded-sm">
          <div>
            <span className="font-bold text-slate-900">Pay Period: </span>
            <span className="text-slate-800">
              {payslip.pay_period_start} - {payslip.pay_period_end}
            </span>
          </div>

          <div>
            <span className="font-bold text-slate-900">Payment Date: </span>
            <span className="text-slate-800">{payslip.payment_date}</span>
          </div>

          <div>
            <span className="font-bold text-slate-900">Total Earnings: </span>
            <span className="text-slate-900 font-bold">{formatCurrency(payslip.total_earnings || 0)}</span>
          </div>

          <div>
            <span className="font-bold text-slate-900">Net Pay: </span>
            <span className="text-slate-900 font-bold">{formatCurrency(payslip.net_pay || 0)}</span>
          </div>
        </div>

        {/* 4. SALARY & WAGES Section */}
        <div className="mb-7">
          <div className="text-right text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5 pr-1">
            THIS PAY
          </div>
          <div className="border-t-2 border-b-2 border-slate-300 py-2 px-3 text-xs font-bold uppercase tracking-wider grid grid-cols-12 text-slate-900">
            <div className="col-span-6">SALARY & WAGES</div>
            <div className="col-span-2 text-right"></div>
            <div className="col-span-2 text-right">RATE</div>
            <div className="col-span-2 text-right"></div>
          </div>

          <div className="py-3 px-3 text-[13px] grid grid-cols-12 text-slate-800 items-center">
            <div className="col-span-6 font-medium">{payslip.wages_description || 'Ordinary Hours'}</div>
            <div className="col-span-2 text-right font-mono text-xs">
              {formatHours(payslip.ordinary_hours)}
            </div>
            <div className="col-span-2 text-right font-mono text-xs">
              {formatRate(payslip.hourly_rate)}
            </div>
            <div className="col-span-2 text-right font-bold text-slate-900">
              {formatCurrency(payslip.wages_amount)}
            </div>
          </div>

          <div className="bg-slate-100 border-t border-b border-slate-300 py-2 px-3 text-[13px] font-bold text-slate-900 grid grid-cols-12">
            <div className="col-span-6">TOTAL</div>
            <div className="col-span-6 text-right font-bold">
              {formatCurrency(payslip.wages_total)}
            </div>
          </div>
        </div>

        {/* 5. TAX Section */}
        <div className="mb-7">
          <div className="border-t-2 border-b-2 border-slate-300 py-2 px-3 text-xs font-bold uppercase tracking-wider grid grid-cols-12 text-slate-900">
            <div className="col-span-8">TAX</div>
            <div className="col-span-4 text-right"></div>
          </div>

          <div className="py-3 px-3 text-[13px] grid grid-cols-12 text-slate-800 items-center">
            <div className="col-span-8 font-medium">{payslip.tax_description || 'PAYG'}</div>
            <div className="col-span-4 text-right font-bold text-slate-900">
              {formatCurrency(payslip.tax_amount)}
            </div>
          </div>

          <div className="bg-slate-100 border-t border-b border-slate-300 py-2 px-3 text-[13px] font-bold text-slate-900 grid grid-cols-12">
            <div className="col-span-8">TOTAL</div>
            <div className="col-span-4 text-right font-bold">
              {formatCurrency(payslip.tax_total)}
            </div>
          </div>
        </div>

        {/* 6. PAYMENT DETAILS Section */}
        <div className="mb-6">
          <div className="border-t-2 border-b-2 border-slate-300 py-2 px-3 text-xs font-bold uppercase tracking-wider grid grid-cols-12 text-slate-900">
            <div className="col-span-6">PAYMENT DETAILS</div>
            <div className="col-span-3 text-left">REFERENCE</div>
            <div className="col-span-3 text-right">AMOUNT</div>
          </div>

          <div className="py-3 px-3 text-[13px] grid grid-cols-12 text-slate-800 items-center">
            <div className="col-span-6 font-medium">
              <span>{payslip.bank_account_masked}</span>
              {payslip.account_name && <span className="ml-3 text-slate-900 font-semibold">{payslip.account_name}</span>}
            </div>
            <div className="col-span-3 text-left text-slate-700">
              {payslip.payment_reference || 'EdLink Pay'}
            </div>
            <div className="col-span-3 text-right font-bold text-slate-900">
              {formatCurrency(payslip.payment_amount)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
