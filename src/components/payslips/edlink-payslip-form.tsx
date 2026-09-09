'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  EdlinkPayslip,
  DEFAULT_EDLINK_PAYSLIP,
  edlinkPayslipService,
} from '@/lib/services/edlink-payslip.service'
import EdLinkPayslipWebPreview from './edlink-payslip-web-preview'
import EdLinkPayslipPDFTemplate from '@/components/pdf/edlink-payslip-pdf-template'
import { pdf } from '@react-pdf/renderer'
import {
  ArrowLeft,
  Download,
  Save,
  Eye,
  CheckCircle2,
  Calendar,
  DollarSign,
  User,
  CreditCard,
  Building,
  Sparkles,
  Briefcase,
  Check,
} from 'lucide-react'

interface EdLinkPayslipFormProps {
  initialData?: EdlinkPayslip
  isEditing?: boolean
}

// Helper to convert DD/MM/YYYY or YYYY-MM-DD to YYYY-MM-DD for date input
function toInputDateFormat(dateStr?: string): string {
  if (!dateStr) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
  const parts = dateStr.split('/')
  if (parts.length === 3) {
    const [dd, mm, yyyy] = parts
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
  }
  return ''
}

// Helper to convert YYYY-MM-DD to DD/MM/YYYY for display/PDF
function toDisplayDateFormat(isoStr?: string): string {
  if (!isoStr) return ''
  const parts = isoStr.split('-')
  if (parts.length === 3) {
    const [yyyy, mm, dd] = parts
    return `${dd}/${mm}/${yyyy}`
  }
  return isoStr
}

// Helper to calculate End Date based on Pay Frequency
function calculatePeriodEnd(startIso: string, frequency: string): string {
  if (!startIso) return ''
  try {
    const [y, m, d] = startIso.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    if (frequency === 'Weekly') {
      date.setDate(date.getDate() + 6)
    } else if (frequency === 'Monthly') {
      date.setMonth(date.getMonth() + 1)
      date.setDate(date.getDate() - 1)
    } else {
      // Default Fortnightly: +13 days
      date.setDate(date.getDate() + 13)
    }
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  } catch {
    return startIso
  }
}

// Helper to calculate Annual Salary based on Frequency and Wages
function calculateAnnualSalary(wages: number, frequency: string): number {
  if (frequency === 'Weekly') {
    return Math.round(wages * 52 * 100) / 100
  } else if (frequency === 'Monthly') {
    return Math.round(wages * 12 * 100) / 100
  } else {
    // Fortnightly
    return Math.round(wages * 26 * 100) / 100
  }
}

export default function EdLinkPayslipForm({ initialData, isEditing = false }: EdLinkPayslipFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState<EdlinkPayslip>(
    initialData || {
      id: '',
      created_at: '',
      ...DEFAULT_EDLINK_PAYSLIP,
    }
  )

  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [showPreviewMobile, setShowPreviewMobile] = useState(false)

  // Auto-calculation handler for hours and rate
  const handleHoursRateChange = (hours: number, rate: number) => {
    const calcWages = Math.round(hours * rate * 100) / 100
    const calcAnnual = calculateAnnualSalary(calcWages, formData.pay_frequency || 'Fortnightly')
    const calcNet = Math.max(0, Math.round((calcWages - formData.tax_amount) * 100) / 100)

    setFormData((prev) => ({
      ...prev,
      ordinary_hours: hours,
      hourly_rate: rate,
      wages_amount: calcWages,
      wages_total: calcWages,
      total_earnings: calcWages,
      annual_salary: prev.show_annual_salary !== false ? calcAnnual : prev.annual_salary,
      net_pay: calcNet,
      payment_amount: calcNet,
    }))
  }

  // Handle Pay Frequency change
  const handleFrequencyChange = (frequency: 'Weekly' | 'Fortnightly' | 'Monthly') => {
    const startIso = toInputDateFormat(formData.pay_period_start)
    let newEndDisplay = formData.pay_period_end

    if (startIso) {
      const endIso = calculatePeriodEnd(startIso, frequency)
      newEndDisplay = toDisplayDateFormat(endIso)
    }

    const calcAnnual = calculateAnnualSalary(formData.total_earnings || 0, frequency)

    // Adjust default hours recommendation if standard
    let hours = formData.ordinary_hours
    if (frequency === 'Weekly' && hours === 76) hours = 38
    else if (frequency === 'Fortnightly' && hours === 38) hours = 76

    setFormData((prev) => ({
      ...prev,
      pay_frequency: frequency,
      pay_period_end: newEndDisplay,
      ordinary_hours: hours,
      annual_salary: prev.show_annual_salary !== false ? calcAnnual : prev.annual_salary,
    }))
  }

  // Handle Start Date change with Auto Frequency date selection
  const handleStartDateChange = (isoVal: string) => {
    if (!isoVal) return
    const endIso = calculatePeriodEnd(isoVal, formData.pay_frequency || 'Fortnightly')
    setFormData((prev) => ({
      ...prev,
      pay_period_start: toDisplayDateFormat(isoVal),
      pay_period_end: toDisplayDateFormat(endIso),
    }))
  }

  const handleEndDateChange = (isoVal: string) => {
    setFormData((prev) => ({
      ...prev,
      pay_period_end: toDisplayDateFormat(isoVal),
    }))
  }

  const handlePaymentDateChange = (isoVal: string) => {
    setFormData((prev) => ({
      ...prev,
      payment_date: toDisplayDateFormat(isoVal),
    }))
  }

  const handleTaxChange = (tax: number) => {
    const calcNet = Math.max(0, Math.round((formData.total_earnings - tax) * 100) / 100)

    setFormData((prev) => ({
      ...prev,
      tax_amount: tax,
      tax_total: tax,
      net_pay: calcNet,
      payment_amount: calcNet,
    }))
  }

  const handleEmployeeNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      employee_name: name,
      account_name: name,
    }))
  }

  async function handleSave() {
    setSaving(true)
    setSaveSuccess(false)
    try {
      const res = await edlinkPayslipService.save(formData)
      if (res.success && res.data) {
        setFormData(res.data)
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 4000)
        if (!isEditing) {
          router.push('/edlink/payslips')
        }
      } else {
        alert(res.error || 'Failed to save payslip.')
      }
    } catch (err) {
      console.error('Failed to save payslip:', err)
      alert('Error saving payslip. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDownloadPDF() {
    setDownloading(true)
    const safeName = (formData.employee_name || 'EdLink-Employee')
      .trim()
      .replace(/[/\\?%*:|"<>]/g, '')
      .replace(/\s+/g, '_')
    const fileName = `EdLink_Payslip_${safeName}.pdf`

    try {
      // 1. Primary & Fastest: Server streaming endpoint
      try {
        const res = await fetch('/api/edlink-payslips-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })

        if (res.ok) {
          const blob = await res.blob()
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = fileName
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
          return
        }
      } catch (serverErr) {
        console.warn('Server streaming failed, trying client renderer:', serverErr)
      }

      // 2. Fallback: Client-side @react-pdf/renderer with timeout
      const doc = <EdLinkPayslipPDFTemplate payslip={formData} />
      const blobPromise = pdf(doc).toBlob()
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('PDF generation timed out')), 4000)
      )
      const blob = await Promise.race([blobPromise, timeoutPromise])
      if (blob && blob.size > 0) {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('Error generating PDF:', err)
      alert('Could not download PDF. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  const showAnnual = formData.show_annual_salary !== false

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#001E2F] border border-white/10 p-4 sm:p-5 rounded-2xl text-white shadow-xl">
        <div className="flex items-center gap-3">
          <Link
            href="/edlink/payslips"
            className="size-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-['Montserrat']">
              {isEditing ? 'Edit EdLink Payslip' : 'Generate EdLink Payslip'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Customize employee, pay frequency, dates, wages, and export replica PDF.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setShowPreviewMobile((prev) => !prev)}
            className="sm:hidden flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-700"
          >
            <Eye className="size-4 text-[#81F5F5]" />
            <span>{showPreviewMobile ? 'Edit Form' : 'View Preview'}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-[#0E3E5B] hover:bg-[#15537a] text-white rounded-xl text-xs sm:text-sm font-semibold transition-all border border-white/20 shadow-md cursor-pointer disabled:opacity-50"
          >
            <Save className="size-4 text-[#81F5F5]" />
            <span>{saving ? 'Saving...' : 'Save Payslip'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-[#81F5F5] hover:bg-[#6be0e0] text-[#002020] rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            <Download className="size-4 text-[#002020]" />
            <span>{downloading ? 'Exporting...' : 'Download PDF'}</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="flex items-center gap-2.5 p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm font-medium animate-in fade-in">
          <CheckCircle2 className="size-5 shrink-0 text-emerald-400" />
          <span>Payslip saved to database successfully! You can find it in All Payslips list.</span>
        </div>
      )}

      {/* Main Grid: Left Form (Col-5), Right Preview (Col-7) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Column */}
        <div
          className={`lg:col-span-5 space-y-5 ${
            showPreviewMobile ? 'hidden lg:block' : 'block'
          }`}
        >
          {/* Card 1: Employee Details */}
          <div className="bg-[#001E2F] border border-white/10 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center gap-2 text-[#81F5F5] font-semibold text-sm border-b border-white/10 pb-2.5">
              <User className="size-4" />
              <span>Employee Information (Editable)</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Employee Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.employee_name}
                  onChange={(e) => handleEmployeeNameChange(e.target.value)}
                  placeholder="e.g. Muhammad Usman"
                  className="w-full bg-[#001724] border border-white/20 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#81F5F5]/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={formData.address_line_1}
                    onChange={(e) =>
                      setFormData({ ...formData, address_line_1: e.target.value })
                    }
                    placeholder="e.g. 12 Collins Street"
                    className="w-full bg-[#001724] border border-white/20 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#81F5F5]/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Suburb, State & Postcode
                  </label>
                  <input
                    type="text"
                    value={formData.address_line_2}
                    onChange={(e) =>
                      setFormData({ ...formData, address_line_2: e.target.value })
                    }
                    placeholder="e.g. Melbourne VIC 3000"
                    className="w-full bg-[#001724] border border-white/20 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#81F5F5]/50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Employment Details (Pay Frequency, Employment Basis & Optional Annual Salary) */}
          <div className="bg-[#001E2F] border border-white/10 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center gap-2 text-[#81F5F5] font-semibold text-sm border-b border-white/10 pb-2.5">
              <Briefcase className="size-4" />
              <span>Employment & Frequency Details</span>
            </div>

            <div className="space-y-4">
              {/* 1. Pay Frequency (Weekly, Fortnightly, Monthly) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Pay Frequency <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Weekly', 'Fortnightly', 'Monthly'] as const).map((freq) => {
                    const active = (formData.pay_frequency || 'Fortnightly') === freq
                    return (
                      <button
                        key={freq}
                        type="button"
                        onClick={() => handleFrequencyChange(freq)}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          active
                            ? 'bg-[#81F5F5] text-[#002020] border-[#81F5F5] shadow-md'
                            : 'bg-[#001724] text-slate-300 border-white/15 hover:border-white/30 hover:text-white'
                        }`}
                      >
                        {active && <Check className="size-3.5 stroke-[3]" />}
                        <span>{freq}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 2. Employment Basis (Full-time vs Part-time) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Employment Basis <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Full-time employment', 'Part-time employment'] as const).map((basis) => {
                    const active = (formData.employment_basis || 'Full-time employment') === basis
                    return (
                      <button
                        key={basis}
                        type="button"
                        onClick={() => setFormData({ ...formData, employment_basis: basis })}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                          active
                            ? 'bg-[#0E3E5B] text-[#81F5F5] border-[#81F5F5]/60 shadow-xs'
                            : 'bg-[#001724] text-slate-300 border-white/15 hover:border-white/30 hover:text-white'
                        }`}
                      >
                        {active && <Check className="size-3.5 text-[#81F5F5]" />}
                        <span>{basis}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 3. Optional Annual Salary Section */}
              <div className="pt-2 border-t border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-200 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showAnnual}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          show_annual_salary: e.target.checked,
                          annual_salary:
                            e.target.checked && (!formData.annual_salary || formData.annual_salary === 0)
                              ? calculateAnnualSalary(formData.total_earnings || 0, formData.pay_frequency || 'Fortnightly')
                              : formData.annual_salary,
                        })
                      }
                      className="size-4 rounded bg-[#001724] border-white/20 text-[#81F5F5] focus:ring-[#81F5F5]/40"
                    />
                    <span>Show Annual Salary on Payslip</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Optional</span>
                </div>

                {showAnnual && (
                  <div className="pl-6 animate-in fade-in">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.annual_salary || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            annual_salary: parseFloat(e.target.value) || 0,
                          })
                        }
                        placeholder="e.g. 104000.00"
                        className="w-full bg-[#001724] border border-white/20 rounded-xl pl-7 pr-3 py-2 text-xs sm:text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#81F5F5]/50"
                      />
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Auto-calculated from {formData.pay_frequency || 'Fortnightly'} earnings ({formData.pay_frequency === 'Weekly' ? '×52' : formData.pay_frequency === 'Monthly' ? '×12' : '×26'}), or enter manual value.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Pay Period & Dates */}
          <div className="bg-[#001E2F] border border-white/10 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center gap-2 text-[#81F5F5] font-semibold text-sm border-b border-white/10 pb-2.5">
              <Calendar className="size-4" />
              <span>Pay Period & Dates</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Period Start Date
                </label>
                <input
                  type="date"
                  value={toInputDateFormat(formData.pay_period_start)}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full bg-[#001724] border border-white/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#81F5F5]/50 [color-scheme:dark]"
                />
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Selected: {formData.pay_period_start || 'N/A'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 truncate" title={`Period End Date (${formData.pay_frequency || 'Fortnightly'})`}>
                  Period End ({formData.pay_frequency || 'Fortnightly'})
                </label>
                <input
                  type="date"
                  value={toInputDateFormat(formData.pay_period_end)}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className="w-full bg-[#001724] border border-white/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#81F5F5]/50 [color-scheme:dark]"
                />
                <div className="text-[10px] text-[#81F5F5]/80 mt-0.5">
                  Selected: {formData.pay_period_end || 'N/A'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={toInputDateFormat(formData.payment_date)}
                  onChange={(e) => handlePaymentDateChange(e.target.value)}
                  className="w-full bg-[#001724] border border-white/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#81F5F5]/50 [color-scheme:dark]"
                />
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Selected: {formData.payment_date || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Salary, Wages & Hours Calculation */}
          <div className="bg-[#001E2F] border border-white/10 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center gap-2 text-[#81F5F5] font-semibold text-sm border-b border-white/10 pb-2.5">
              <DollarSign className="size-4" />
              <span>Salary & Wages Calculation</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ordinary Hours ({formData.pay_frequency === 'Weekly' ? 'e.g. 38' : formData.pay_frequency === 'Monthly' ? 'e.g. 164.67' : 'e.g. 76'})
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.ordinary_hours || ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : parseFloat(e.target.value)
                    handleHoursRateChange(val, formData.hourly_rate)
                  }}
                  placeholder={formData.pay_frequency === 'Weekly' ? '38' : '76'}
                  className="w-full bg-[#001724] border border-white/20 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#81F5F5]/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Hourly Rate ($ AUD)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={formData.hourly_rate}
                  onChange={(e) =>
                    handleHoursRateChange(
                      formData.ordinary_hours,
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className="w-full bg-[#001724] border border-white/20 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#81F5F5]/50"
                />
              </div>
            </div>

            {/* Wages & Tax Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Total Earnings ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.total_earnings}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0
                    const calcAnnual = calculateAnnualSalary(val, formData.pay_frequency || 'Fortnightly')
                    setFormData({
                      ...formData,
                      total_earnings: val,
                      wages_amount: val,
                      wages_total: val,
                      annual_salary: formData.show_annual_salary !== false ? calcAnnual : formData.annual_salary,
                      net_pay: Math.max(0, val - formData.tax_amount),
                      payment_amount: Math.max(0, val - formData.tax_amount),
                    })
                  }}
                  className="w-full bg-[#001724] border border-white/20 rounded-xl px-3 py-2 text-sm text-white font-bold text-emerald-400 focus:outline-none focus:ring-2 focus:ring-[#81F5F5]/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  PAYG Tax Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.tax_amount}
                  onChange={(e) => handleTaxChange(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#001724] border border-white/20 rounded-xl px-3 py-2 text-sm text-white font-bold text-amber-400 focus:outline-none focus:ring-2 focus:ring-[#81F5F5]/50"
                />
              </div>
            </div>

            {/* Live Calculated Net Pay & Annual Salary Banner */}
            <div className="bg-[#001724] border border-[#81F5F5]/20 p-3.5 rounded-xl flex items-center justify-between text-xs sm:text-sm">
              <div>
                <span className="text-slate-400">Calculated Net Pay: </span>
                <span className="font-bold text-[#81F5F5] text-base sm:text-lg">
                  ${formData.net_pay.toFixed(2)}
                </span>
              </div>
              {showAnnual && Number(formData.annual_salary || 0) > 0 && (
                <div>
                  <span className="text-slate-400">Annual Salary: </span>
                  <span className="font-bold text-white">
                    ${formData.annual_salary?.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Card 5: Payment Details (Bank & Account) */}
          <div className="bg-[#001E2F] border border-white/10 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center gap-2 text-[#81F5F5] font-semibold text-sm border-b border-white/10 pb-2.5">
              <CreditCard className="size-4" />
              <span>Bank Payment Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Bank Account / Masked Account
                </label>
                <input
                  type="text"
                  value={formData.bank_account_masked}
                  onChange={(e) =>
                    setFormData({ ...formData, bank_account_masked: e.target.value })
                  }
                  placeholder="(063-000)*****5678"
                  className="w-full bg-[#001724] border border-white/20 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#81F5F5]/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reference
                </label>
                <input
                  type="text"
                  value={formData.payment_reference}
                  onChange={(e) =>
                    setFormData({ ...formData, payment_reference: e.target.value })
                  }
                  placeholder="EdLink Pay"
                  className="w-full bg-[#001724] border border-white/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#81F5F5]/50"
                />
              </div>
            </div>
          </div>

          {/* Card 6: Fixed / Template Details (Pre-filled items) */}
          <details className="bg-[#001E2F] border border-white/10 rounded-2xl p-4 shadow-lg text-xs group">
            <summary className="font-semibold text-slate-300 cursor-pointer flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400">
                <Building className="size-4 text-[#81F5F5]" />
                <span>Template & Paid By Info (EdLink Australia Defaults)</span>
              </div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider group-open:hidden">
                Click to expand / override
              </span>
            </summary>
            <div className="mt-4 pt-3 border-t border-white/10 space-y-3 text-slate-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Paid By Name
                  </label>
                  <input
                    type="text"
                    value={formData.paid_by_name}
                    onChange={(e) =>
                      setFormData({ ...formData, paid_by_name: e.target.value })
                    }
                    className="w-full bg-[#001724] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    ABN Number
                  </label>
                  <input
                    type="text"
                    value={formData.paid_by_abn}
                    onChange={(e) =>
                      setFormData({ ...formData, paid_by_abn: e.target.value })
                    }
                    className="w-full bg-[#001724] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Address Line 1
                  </label>
                  <input
                    type="text"
                    value={formData.paid_by_address_1}
                    onChange={(e) =>
                      setFormData({ ...formData, paid_by_address_1: e.target.value })
                    }
                    className="w-full bg-[#001724] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    value={formData.paid_by_address_2}
                    onChange={(e) =>
                      setFormData({ ...formData, paid_by_address_2: e.target.value })
                    }
                    className="w-full bg-[#001724] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
            </div>
          </details>
        </div>

        {/* Right Preview Column */}
        <div
          className={`lg:col-span-7 sticky top-6 ${
            showPreviewMobile ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#81F5F5]">
              <Sparkles className="size-3.5" />
              <span>Live Visual Preview (Exact Replica)</span>
            </div>
            <span className="text-[11px] text-slate-400">Updates in real-time</span>
          </div>
          <div className="overflow-x-auto rounded-xl shadow-2xl">
            <EdLinkPayslipWebPreview payslip={formData} />
          </div>
        </div>
      </div>
    </div>
  )
}
