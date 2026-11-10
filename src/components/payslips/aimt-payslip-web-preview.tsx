'use client'

import React from 'react'
import { AIMTPayslip, formatCurrency } from '@/lib/services/aimt-payslip.service'

interface AIMTPayslipWebPreviewProps {
  payslip: AIMTPayslip
}

export default function AIMTPayslipWebPreview({ payslip }: AIMTPayslipWebPreviewProps) {
  const formatHours = (val: any) => {
    if (val === undefined || val === null || val === '') return '0'
    return String(val)
  }
  const formatRate = (val: number) => `$${(Number(val) || 0).toFixed(4)}`

  const showYtd = Boolean(payslip.include_ytd)
  const wagesYtd = payslip.wages_ytd !== undefined ? payslip.wages_ytd : payslip.wages_total
  const taxYtd = payslip.tax_ytd !== undefined ? payslip.tax_ytd : payslip.tax_total
  const superYtd =
    payslip.superannuation_ytd !== undefined
      ? payslip.superannuation_ytd
      : payslip.superannuation_total ?? payslip.superannuation_amount ?? 0

  return (
    <div className="w-full max-w-[820px] min-h-[960px] mx-auto bg-white text-[#0f172a] shadow-xl rounded-lg p-10 sm:p-14 font-sans border border-slate-200 print:border-none print:shadow-none print:p-0 transition-all flex flex-col justify-between">
      <div>
        {/* 1. Top Section: Logo (Left) and Paid By (Right - Matching Attachment 2) */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-5 mb-8">
          <div className="w-48 sm:w-56">
            <img
              src="/aimt-logo.png"
              alt="AIMT Logo"
              className="w-full max-w-[210px] h-auto object-contain block"
            />
          </div>
          <div className="w-full sm:w-[270px] bg-[#f1f5f9] rounded-none p-3.5 text-xs sm:text-[12px] leading-relaxed">
            <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1.5">
              PAID BY
            </div>
            <div className="text-slate-800 font-medium">
              {payslip.paid_by_name || 'Australian Institute of Management and Technology'}
            </div>
            <div className="text-slate-600">{payslip.paid_by_address_1 || '84 Buckley Street'}</div>
            <div className="text-slate-600">{payslip.paid_by_address_2 || 'Footscray VIC 3011'}</div>
            <div className="text-slate-600">ABN {payslip.paid_by_abn || '85 136 626 956'}</div>
          </div>
        </div>

        {/* 2. Middle Section: Employee details (Left) & Employment Details Box (Right - Matching Attachment 2) */}
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

        {/* 4. SALARY & WAGES Section (With THIS PAY & optional YTD Columns) */}
        <div className="mb-7">
          <div className="flex justify-end items-center text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5 px-3">
            <span className="w-28 text-right">THIS PAY</span>
            {showYtd && <span className="w-28 text-right">YTD</span>}
          </div>

          <div className="border-t-2 border-b-2 border-slate-300 py-2 px-3 text-xs font-bold uppercase tracking-wider flex items-center text-slate-900">
            <div className="flex-1">SALARY & WAGES</div>
            <div className="w-16"></div>
            <div className="w-24 text-right">RATE</div>
            <div className="w-28"></div>
            {showYtd && <div className="w-28"></div>}
          </div>

          <div className="py-3 px-3 text-[13px] flex items-center text-slate-800">
            <div className="flex-1 font-medium truncate pr-3">{payslip.wages_description || 'Ordinary Hours'}</div>
            <div className="w-16 text-right font-mono text-xs">
              {formatHours(payslip.ordinary_hours)}
            </div>
            <div className="w-24 text-right font-mono text-xs">
              {formatRate(payslip.hourly_rate)}
            </div>
            <div className="w-28 text-right font-mono font-bold text-slate-900">
              {formatCurrency(payslip.wages_amount)}
            </div>
            {showYtd && (
              <div className="w-28 text-right font-mono font-semibold text-slate-700">
                {formatCurrency(wagesYtd)}
              </div>
            )}
          </div>

          <div className="bg-slate-100 border-t border-b border-slate-300 py-2 px-3 text-[13px] font-bold text-slate-900 flex items-center">
            <div className="flex-1">TOTAL</div>
            <div className="w-16"></div>
            <div className="w-24"></div>
            <div className="w-28 text-right font-mono font-bold">{formatCurrency(payslip.wages_total)}</div>
            {showYtd && (
              <div className="w-28 text-right font-mono font-bold">{formatCurrency(wagesYtd)}</div>
            )}
          </div>
        </div>

        {/* 5. TAX Section (With THIS PAY & optional YTD Columns) */}
        <div className="mb-7">
          <div className="border-t-2 border-b-2 border-slate-300 py-2 px-3 text-xs font-bold uppercase tracking-wider flex items-center text-slate-900">
            <div className="flex-1">TAX</div>
            <div className="w-28"></div>
            {showYtd && <div className="w-28"></div>}
          </div>

          <div className="py-3 px-3 text-[13px] flex items-center text-slate-800">
            <div className="flex-1 font-medium truncate pr-3">{payslip.tax_description || 'PAYG'}</div>
            <div className="w-28 text-right font-mono font-bold text-slate-900">
              {formatCurrency(payslip.tax_amount)}
            </div>
            {showYtd && (
              <div className="w-28 text-right font-mono font-semibold text-slate-700">
                {formatCurrency(taxYtd)}
              </div>
            )}
          </div>

          <div className="bg-slate-100 border-t border-b border-slate-300 py-2 px-3 text-[13px] font-bold text-slate-900 flex items-center">
            <div className="flex-1">TOTAL</div>
            <div className="w-28 text-right font-mono font-bold">{formatCurrency(payslip.tax_total)}</div>
            {showYtd && (
              <div className="w-28 text-right font-mono font-bold">{formatCurrency(taxYtd)}</div>
            )}
          </div>
        </div>

        {/* 5b. SUPERANNUATION Section (With THIS PAY & optional YTD Columns) */}
        {(payslip.include_superannuation || Number(payslip.superannuation_amount || 0) > 0) && (
          <div className="mb-7">
            <div className="border-t-2 border-b-2 border-slate-300 py-2 px-3 text-xs font-bold uppercase tracking-wider flex items-center text-slate-900">
              <div className="flex-1">SUPERANNUATION</div>
              <div className="w-28"></div>
              {showYtd && <div className="w-28"></div>}
            </div>

            <div className="py-3 px-3 text-[13px] flex items-center text-slate-800">
              <div className="flex-1 font-medium truncate pr-3">
                {payslip.superannuation_description || 'SGC - HOSTPLUS Superannuation Fund - Industry - 102860122'}
              </div>
              <div className="w-28 text-right font-mono font-bold text-slate-900">
                {formatCurrency(payslip.superannuation_amount || 0)}
              </div>
              {showYtd && (
                <div className="w-28 text-right font-mono font-semibold text-slate-700">
                  {formatCurrency(superYtd)}
                </div>
              )}
            </div>

            <div className="bg-slate-100 border-t border-b border-slate-300 py-2 px-3 text-[13px] font-bold text-slate-900 flex items-center">
              <div className="flex-1">TOTAL</div>
              <div className="w-28 text-right font-mono font-bold">
                {formatCurrency(payslip.superannuation_total ?? payslip.superannuation_amount ?? 0)}
              </div>
              {showYtd && (
                <div className="w-28 text-right font-mono font-bold">{formatCurrency(superYtd)}</div>
              )}
            </div>
          </div>
        )}

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
              {payslip.payment_reference || 'AIMT Pay'}
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
