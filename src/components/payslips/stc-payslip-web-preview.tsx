'use client'

import React from 'react'
import { STCPayslip, formatCurrency, DEFAULT_STC_PAID_BY } from '@/lib/services/stc-payslip.service'

interface STCPayslipWebPreviewProps {
  payslip: STCPayslip
}

export default function STCPayslipWebPreview({ payslip }: STCPayslipWebPreviewProps) {
  const formatHours = (val: any) => {
    if (val === undefined || val === null || val === '') return '0'
    return String(val)
  }
  const formatRate = (val: number) => `$${(Number(val) || 0).toFixed(4)}`

  return (
    <div className="w-full max-w-[820px] min-h-[960px] mx-auto bg-white text-[#0f172a] shadow-xl rounded-lg p-10 sm:p-14 font-sans border border-slate-200 print:border-none print:shadow-none print:p-0 transition-all flex flex-col justify-between">
      <div>
        {/* 1. Top Section: Logo (Left) and Paid By (Right) */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-5 mb-8">
          <div className="w-48 sm:w-56">
            <img
              src="/STC-logo.png"
              alt="States College Australia Logo"
              className="w-full max-w-[210px] h-auto object-contain block"
            />
          </div>
          <div className="w-full sm:w-[270px] bg-[#f1f5f9] rounded-none p-3.5 text-xs sm:text-[12px] leading-relaxed">
            <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1.5">
              PAID BY
            </div>
            <div className="text-slate-800 font-medium">
              {payslip.paid_by_name || DEFAULT_STC_PAID_BY.paid_by_name}
            </div>
            <div className="text-slate-600">{payslip.paid_by_address_1 || DEFAULT_STC_PAID_BY.paid_by_address_1}</div>
            <div className="text-slate-600">{payslip.paid_by_address_2 || DEFAULT_STC_PAID_BY.paid_by_address_2}</div>
            <div className="text-slate-600">ABN {payslip.paid_by_abn || DEFAULT_STC_PAID_BY.paid_by_abn}</div>
          </div>
        </div>

        {/* 2. Middle Section: Employee details (Left) & Employment Details Box (Right) */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-5 mb-8 mt-4">
          <div className="text-sm">
            <div className="font-bold text-slate-900 text-lg mb-1.5">
              {payslip.employee_name || 'Ubaid Raza'}
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

        {/* 3. Summary Ribbon / Bar */}
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

        {/* 4. Salary & Wages Section */}
        <div className="mb-6">
          <div className="text-right text-xs font-bold text-slate-900 pb-1 uppercase tracking-wider">
            THIS PAY
          </div>
          <table className="w-full text-left text-xs sm:text-[13px] border-collapse">
            <thead>
              <tr className="border-y-2 border-slate-300 font-bold text-slate-900 bg-transparent">
                <th className="py-2 px-1">SALARY &amp; WAGES</th>
                <th className="py-2 px-1 text-right">HOURS</th>
                <th className="py-2 px-1 text-right">RATE</th>
                <th className="py-2 px-1 text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              <tr className="text-slate-800">
                <td className="py-3 px-1 font-medium">{payslip.wages_description || 'Ordinary Hours'}</td>
                <td className="py-3 px-1 text-right">{formatHours(payslip.ordinary_hours)}</td>
                <td className="py-3 px-1 text-right">{formatRate(payslip.hourly_rate)}</td>
                <td className="py-3 px-1 text-right">{formatCurrency(payslip.wages_amount)}</td>
              </tr>
              <tr className="border-y-2 border-slate-300 bg-slate-50 font-bold text-slate-900">
                <td colSpan={3} className="py-2 px-1">
                  TOTAL
                </td>
                <td className="py-2 px-1 text-right">{formatCurrency(payslip.wages_total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 5. Tax Section */}
        <div className="mb-6">
          <table className="w-full text-left text-xs sm:text-[13px] border-collapse">
            <thead>
              <tr className="border-y-2 border-slate-300 font-bold text-slate-900 bg-transparent">
                <th className="py-2 px-1">TAX</th>
                <th className="py-2 px-1 text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              <tr className="text-slate-800">
                <td className="py-3 px-1 font-medium">{payslip.tax_description || 'PAYG'}</td>
                <td className="py-3 px-1 text-right">{formatCurrency(payslip.tax_amount)}</td>
              </tr>
              <tr className="border-y-2 border-slate-300 bg-slate-50 font-bold text-slate-900">
                <td className="py-2 px-1">TOTAL</td>
                <td className="py-2 px-1 text-right">{formatCurrency(payslip.tax_total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 5b. Superannuation Section (Optional) */}
        {Boolean(
          payslip.include_superannuation &&
          ((payslip.superannuation_description && payslip.superannuation_description.trim() !== '') ||
            Number(payslip.superannuation_amount || 0) > 0)
        ) && (
          <div className="mb-6">
            <table className="w-full text-left text-xs sm:text-[13px] border-collapse">
              <thead>
                <tr className="border-y-2 border-slate-300 font-bold text-slate-900 bg-transparent">
                  <th className="py-2 px-1">SUPERANNUATION</th>
                  <th className="py-2 px-1 text-right">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                <tr className="text-slate-800">
                  <td className="py-3 px-1 font-medium">
                    {payslip.superannuation_description || ''}
                  </td>
                  <td className="py-3 px-1 text-right">
                    {formatCurrency(payslip.superannuation_amount || 0)}
                  </td>
                </tr>
                <tr className="border-y-2 border-slate-300 bg-slate-50 font-bold text-slate-900">
                  <td className="py-2 px-1">TOTAL</td>
                  <td className="py-2 px-1 text-right">
                    {formatCurrency(
                      payslip.superannuation_total ?? payslip.superannuation_amount ?? 0
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* 6. Payment Details Section */}
        <div className="mb-6">
          <table className="w-full text-left text-xs sm:text-[13px] border-collapse">
            <thead>
              <tr className="border-y-2 border-slate-300 font-bold text-slate-900 bg-transparent">
                <th className="py-2 px-1">PAYMENT DETAILS</th>
                <th className="py-2 px-1 text-left">REFERENCE</th>
                <th className="py-2 px-1 text-right">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              <tr className="text-slate-800">
                <td className="py-3 px-1 font-medium">
                  {payslip.bank_account_masked}
                  {payslip.account_name && (
                    <span className="text-slate-600 font-normal"> ({payslip.account_name})</span>
                  )}
                </td>
                <td className="py-3 px-1 text-left">{payslip.payment_reference || 'STC Pay'}</td>
                <td className="py-3 px-1 text-right font-medium">{formatCurrency(payslip.payment_amount)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
