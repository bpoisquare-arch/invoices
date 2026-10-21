'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  STCPayslip,
  DEFAULT_STC_PAYSLIP,
  stcPayslipService,
} from '@/lib/services/stc-payslip.service'
import STCPayslipWebPreview from './stc-payslip-web-preview'
import STCPayslipPDFTemplate from '@/components/pdf/stc-payslip-pdf-template'
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

interface STCPayslipFormProps {
  initialData?: STCPayslip
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

export default function STCPayslipForm({ initialData, isEditing = false }: STCPayslipFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState<STCPayslip>(
    initialData || {
      id: '',
      created_at: '',
      ...DEFAULT_STC_PAYSLIP,
    }
  )

  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [showPreviewMobile, setShowPreviewMobile] = useState(false)

  const [hasSaved, setHasSaved] = useState<boolean>(Boolean(isEditing && initialData?.id))
  const [showSavedModal, setShowSavedModal] = useState<boolean>(false)

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

  const handleSuperannuationToggle = (enabled: boolean) => {
    const defaultDesc =
      formData.superannuation_description || 'SGC - HOSTPLUS Superannuation Fund - Industry - 102860122'

    setFormData((prev) => ({
      ...prev,
      include_superannuation: enabled,
      superannuation_description: defaultDesc,
    }))
  }

  const handleSuperannuationAmountChange = (amount: number) => {
    setFormData((prev) => ({
      ...prev,
      superannuation_amount: amount,
      superannuation_total: amount,
    }))
  }

  const handleSuperannuationDescriptionChange = (desc: string) => {
    setFormData((prev) => ({
      ...prev,
      superannuation_description: desc,
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
      const res = await stcPayslipService.save(formData)
      if (res.success && res.data) {
        setFormData(res.data)
        setHasSaved(true)
        setSaveSuccess(true)
        setShowSavedModal(true)
        if (!isEditing && typeof window !== 'undefined') {
          window.history.replaceState(null, '', `/stc/payslips/${res.data.id}/edit`)
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
    const safeName = (formData.employee_name || 'STC-Employee')
      .trim()
      .replace(/[/\\?%*:|"<>]/g, '')
      .replace(/\s+/g, '_')
    const fileName = `STC_Payslip_${safeName}.pdf`

    try {
      // 1. Primary & Fastest: Server streaming endpoint
      try {
        const res = await fetch('/api/stc/payslips-pdf', {
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
      const doc = <STCPayslipPDFTemplate payslip={formData} />
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
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16 font-sans">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#001E2F] border border-white/10 p-4 sm:p-5 rounded-2xl text-white shadow-xl">
        <div className="flex items-center gap-3">
          <Link
            href="/stc/payslips"
            className="size-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-['Montserrat']">
              {isEditing || hasSaved ? 'Edit STC Payslip' : 'Generate STC Payslip'}
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
            <Eye className="size-4 text-[#00BF8F]" />
            <span>{showPreviewMobile ? 'Edit Form' : 'View Preview'}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-[#00BF8F] hover:bg-[#00a87e] text-[#001E2F] rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            <Save className="size-4 text-[#001E2F]" />
            <span>{saving ? 'Saving...' : 'Save Payslip'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all border border-white/20 cursor-pointer disabled:opacity-50"
          >
            <Download className="size-4 text-[#00BF8F]" />
            <span>{downloading ? 'Exporting...' : 'Export PDF'}</span>
          </button>
        </div>
      </div>

      {/* Main Split Layout: Left Form vs Right Visual Replica Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Input Form Controls */}
        <div className={`lg:col-span-6 space-y-6 ${showPreviewMobile ? 'hidden sm:block' : 'block'}`}>
          {/* Card 1: Employee Information */}
          <div className="bg-[#001E2F] border border-white/10 rounded-2xl p-5 text-white shadow-lg space-y-4">
            <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
              <User className="size-4 text-[#00BF8F]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Employee Information (Editable)
              </h2>
            </div>

            <div className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-xs">
                  Employee Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.employee_name}
                  onChange={(e) => handleEmployeeNameChange(e.target.value)}
                  placeholder="e.g. Ubaid Raza"
                  className="w-full bg-[#001724] border border-white/15 focus:border-[#00BF8F] focus:ring-1 focus:ring-[#00BF8F] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 font-medium outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 text-xs">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={formData.address_line_1}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, address_line_1: e.target.value }))
                    }
                    placeholder="e.g. 18 Petros St"
                    className="w-full bg-[#001724] border border-white/15 focus:border-[#00BF8F] focus:ring-1 focus:ring-[#00BF8F] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1 text-xs">
                    Suburb, State &amp; Postcode
                  </label>
                  <input
                    type="text"
                    value={formData.address_line_2}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, address_line_2: e.target.value }))
                    }
                    placeholder="e.g. Fraser Rise VIC 3336"
                    className="w-full bg-[#001724] border border-white/15 focus:border-[#00BF8F] focus:ring-1 focus:ring-[#00BF8F] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Employment & Frequency Details */}
          <div className="bg-[#001E2F] border border-white/10 rounded-2xl p-5 text-white shadow-lg space-y-4">
            <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
              <Briefcase className="size-4 text-[#00BF8F]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Employment &amp; Frequency Details
              </h2>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              {/* Pay Frequency Selection */}
              <div>
                <label className="block text-slate-300 font-semibold mb-2 text-xs">
                  Pay Frequency <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Weekly', 'Fortnightly', 'Monthly'] as const).map((freq) => {
                    const active = formData.pay_frequency === freq
                    return (
                      <button
                        key={freq}
                        type="button"
                        onClick={() => handleFrequencyChange(freq)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          active
                            ? 'bg-[#00BF8F] text-[#001E2F] shadow-md'
                            : 'bg-[#001724] text-slate-300 hover:text-white hover:bg-white/10 border border-white/10'
                        }`}
                      >
                        {active && <Check className="size-3.5 stroke-[3]" />}
                        <span>{freq}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Employment Basis */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-xs">
                  Employment Basis <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['Full-time employment', 'Part-time employment'].map((basis) => {
                    const active = formData.employment_basis === basis
                    return (
                      <button
                        key={basis}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, employment_basis: basis }))
                        }
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          active
                            ? 'bg-[#0E3E5B] text-white border border-[#00BF8F]'
                            : 'bg-[#001724] text-slate-300 hover:text-white hover:bg-white/10 border border-white/10'
                        }`}
                      >
                        {active && <Check className="size-3.5 text-[#00BF8F] stroke-[3]" />}
                        <span>{basis}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Annual Salary Toggle & Value */}
              <div className="pt-2 border-t border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-200">
                    <input
                      type="checkbox"
                      checked={showAnnual}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          show_annual_salary: e.target.checked,
                        }))
                      }
                      className="size-4 rounded accent-[#00BF8F] cursor-pointer"
                    />
                    <span>Show Annual Salary on Payslip</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Optional</span>
                </div>

                {showAnnual && (
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      step="any"
                      value={formData.annual_salary || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          annual_salary: parseFloat(e.target.value) || 0,
                        }))
                      }
                      placeholder="e.g. 104000"
                      className="w-full bg-[#001724] border border-white/15 focus:border-[#00BF8F] focus:ring-1 focus:ring-[#00BF8F] rounded-xl pl-8 pr-3.5 py-2 text-white outline-none font-medium"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Auto-calculated from {formData.pay_frequency} earnings, or enter manual value.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Pay Period & Dates */}
          <div className="bg-[#001E2F] border border-white/10 rounded-2xl p-5 text-white shadow-lg space-y-4">
            <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
              <Calendar className="size-4 text-[#00BF8F]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Pay Period &amp; Dates
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Period Start <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  value={toInputDateFormat(formData.pay_period_start)}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full bg-[#001724] border border-white/15 focus:border-[#00BF8F] focus:ring-1 focus:ring-[#00BF8F] rounded-xl px-3 py-2 text-white outline-none cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Display: {formData.pay_period_start || 'DD/MM/YYYY'}
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Period End <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  value={toInputDateFormat(formData.pay_period_end)}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className="w-full bg-[#001724] border border-white/15 focus:border-[#00BF8F] focus:ring-1 focus:ring-[#00BF8F] rounded-xl px-3 py-2 text-white outline-none cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Display: {formData.pay_period_end || 'DD/MM/YYYY'}
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Payment Date <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  value={toInputDateFormat(formData.payment_date)}
                  onChange={(e) => handlePaymentDateChange(e.target.value)}
                  className="w-full bg-[#001724] border border-white/15 focus:border-[#00BF8F] focus:ring-1 focus:ring-[#00BF8F] rounded-xl px-3 py-2 text-white outline-none cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Display: {formData.payment_date || 'DD/MM/YYYY'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Salary & Wages Calculation */}
          <div className="bg-[#001E2F] border border-white/10 rounded-2xl p-5 text-white shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <DollarSign className="size-4 text-[#00BF8F]" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                  Salary &amp; Wages
                </h2>
              </div>
              <span className="text-xs font-mono font-bold text-[#00BF8F]">
                Total: ${(formData.wages_total || 0).toFixed(2)}
              </span>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-xs">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.wages_description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, wages_description: e.target.value }))
                  }
                  placeholder="e.g. Ordinary Hours"
                  className="w-full bg-[#001724] border border-white/15 focus:border-[#00BF8F] focus:ring-1 focus:ring-[#00BF8F] rounded-xl px-3.5 py-2 text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 text-xs">
                    Ordinary Hours
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.ordinary_hours || ''}
                    onChange={(e) =>
                      handleHoursRateChange(
                        parseFloat(e.target.value) || 0,
                        formData.hourly_rate || 0
                      )
                    }
                    placeholder="76"
                    className="w-full bg-[#001724] border border-white/15 focus:border-[#00BF8F] focus:ring-1 focus:ring-[#00BF8F] rounded-xl px-3.5 py-2 text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1 text-xs">
                    Hourly Rate ($)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.hourly_rate || ''}
                    onChange={(e) =>
                      handleHoursRateChange(
                        formData.ordinary_hours || 0,
                        parseFloat(e.target.value) || 0
                      )
                    }
                    placeholder="52.6316"
                    className="w-full bg-[#001724] border border-white/15 focus:border-[#00BF8F] focus:ring-1 focus:ring-[#00BF8F] rounded-xl px-3.5 py-2 text-white outline-none font-mono"
                  />
                </div>
              </div>

              {/* Readonly Summary box */}
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex justify-between items-center text-xs">
                <span className="text-slate-300">Total Earnings (Gross):</span>
                <span className="font-bold text-white text-sm">
                  ${(formData.total_earnings || 0).toFixed(2)} AUD
                </span>
              </div>
            </div>
          </div>

          {/* Card 5: Tax (PAYG) */}
          <div className="bg-[#001E2F] border border-white/10 rounded-2xl p-5 text-white shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <CreditCard className="size-4 text-[#00BF8F]" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                  Tax Withholding
                </h2>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400">
                PAYG: ${(formData.tax_amount || 0).toFixed(2)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-xs">
                  Tax Description
                </label>
                <input
                  type="text"
                  value={formData.tax_description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, tax_description: e.target.value }))
                  }
                  placeholder="PAYG"
                  className="w-full bg-[#001724] border border-white/15 focus:border-[#00BF8F] focus:ring-1 focus:ring-[#00BF8F] rounded-xl px-3.5 py-2 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-xs">
                  Tax Amount ($)
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.tax_amount || ''}
                  onChange={(e) => handleTaxChange(parseFloat(e.target.value) || 0)}
                  placeholder="928"
                  className="w-full bg-[#001724] border border-white/15 focus:border-[#00BF8F] focus:ring-1 focus:ring-[#00BF8F] rounded-xl px-3.5 py-2 text-white outline-none font-mono"
                />
              </div>
            </div>

            {/* Net Pay Callout */}
            <div className="p-3.5 bg-[#00BF8F]/15 border border-[#00BF8F]/30 rounded-xl flex justify-between items-center text-xs">
              <div>
                <div className="font-bold text-white text-sm">Calculated Net Pay</div>
                <div className="text-[11px] text-slate-300">
                  Gross (${(formData.total_earnings || 0).toFixed(2)}) - Tax ($
                  {(formData.tax_amount || 0).toFixed(2)})
                </div>
              </div>
              <div className="text-lg font-bold text-[#00BF8F] font-mono">
                ${(formData.net_pay || 0).toFixed(2)} AUD
              </div>
            </div>
          </div>

          {/* Card 5b: Superannuation (Optional) */}
          <div className="bg-[#001E2F] border border-white/10 rounded-2xl p-5 text-white shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <Sparkles className="size-4 text-[#00BF8F]" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                  Superannuation
                </h2>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-200">
                <input
                  type="checkbox"
                  checked={
                    formData.include_superannuation ||
                    Number(formData.superannuation_amount || 0) > 0
                  }
                  onChange={(e) => handleSuperannuationToggle(e.target.checked)}
                  className="size-4 rounded accent-[#00BF8F] cursor-pointer"
                />
                <span>Include Superannuation Table</span>
              </label>
            </div>

            {(formData.include_superannuation ||
              Number(formData.superannuation_amount || 0) > 0) && (
              <div className="space-y-3 text-xs sm:text-sm">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 text-xs">
                    Superannuation Description / Fund
                  </label>
                  <input
                    type="text"
                    value={formData.superannuation_description}
                    onChange={(e) => handleSuperannuationDescriptionChange(e.target.value)}
                    placeholder="e.g. SGC - HOSTPLUS Superannuation Fund - Industry - 102860122"
                    className="w-full bg-[#001724] border border-white/15 focus:border-[#00BF8F] focus:ring-1 focus:ring-[#00BF8F] rounded-xl px-3.5 py-2 text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1 text-xs">
                    Superannuation Amount ($)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.superannuation_amount || ''}
                    onChange={(e) =>
                      handleSuperannuationAmountChange(parseFloat(e.target.value) || 0)
                    }
                    placeholder="0.00"
                    className="w-full bg-[#001724] border border-white/15 focus:border-[#00BF8F] focus:ring-1 focus:ring-[#00BF8F] rounded-xl px-3.5 py-2 text-white outline-none font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Superannuation is displayed for reporting purposes and does not deduct from Net Pay.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Card 6: Payment Details */}
          <div className="bg-[#001E2F] border border-white/10 rounded-2xl p-5 text-white shadow-lg space-y-4">
            <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
              <CreditCard className="size-4 text-[#00BF8F]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Payment Details
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-xs">
                  Bank Account (Masked)
                </label>
                <input
                  type="text"
                  value={formData.bank_account_masked}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, bank_account_masked: e.target.value }))
                  }
                  placeholder="e.g. (013-481)*****6474"
                  className="w-full bg-[#001724] border border-white/15 focus:border-[#00BF8F] focus:ring-1 focus:ring-[#00BF8F] rounded-xl px-3.5 py-2 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-xs">
                  Account Name
                </label>
                <input
                  type="text"
                  value={formData.account_name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, account_name: e.target.value }))
                  }
                  placeholder="e.g. Ubaid Raza"
                  className="w-full bg-[#001724] border border-white/15 focus:border-[#00BF8F] focus:ring-1 focus:ring-[#00BF8F] rounded-xl px-3.5 py-2 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-xs">
                  Payment Reference
                </label>
                <input
                  type="text"
                  value={formData.payment_reference}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, payment_reference: e.target.value }))
                  }
                  placeholder="STC Pay"
                  className="w-full bg-[#001724] border border-white/15 focus:border-[#00BF8F] focus:ring-1 focus:ring-[#00BF8F] rounded-xl px-3.5 py-2 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-xs">
                  Payment Amount ($)
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.payment_amount || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      payment_amount: parseFloat(e.target.value) || 0,
                    }))
                  }
                  placeholder="3072"
                  className="w-full bg-[#001724] border border-white/15 focus:border-[#00BF8F] focus:ring-1 focus:ring-[#00BF8F] rounded-xl px-3.5 py-2 text-white outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* Card 7: Paid By Details (States College Defaults) */}
          <div className="bg-[#001E2F] border border-white/10 rounded-2xl p-5 text-white shadow-lg space-y-4">
            <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
              <Building className="size-4 text-[#00BF8F]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Paid By Details (States College)
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
              <div className="sm:col-span-2">
                <label className="block text-slate-300 font-semibold mb-1 text-xs">
                  Institution Name
                </label>
                <input
                  type="text"
                  value={formData.paid_by_name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, paid_by_name: e.target.value }))
                  }
                  className="w-full bg-[#001724] border border-white/15 focus:border-[#00BF8F] focus:ring-1 focus:ring-[#00BF8F] rounded-xl px-3.5 py-2 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-xs">
                  Street Address
                </label>
                <input
                  type="text"
                  value={formData.paid_by_address_1}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, paid_by_address_1: e.target.value }))
                  }
                  className="w-full bg-[#001724] border border-white/15 focus:border-[#00BF8F] focus:ring-1 focus:ring-[#00BF8F] rounded-xl px-3.5 py-2 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-xs">
                  City, State &amp; Postcode
                </label>
                <input
                  type="text"
                  value={formData.paid_by_address_2}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, paid_by_address_2: e.target.value }))
                  }
                  className="w-full bg-[#001724] border border-white/15 focus:border-[#00BF8F] focus:ring-1 focus:ring-[#00BF8F] rounded-xl px-3.5 py-2 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-xs">ABN</label>
                <input
                  type="text"
                  value={formData.paid_by_abn}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, paid_by_abn: e.target.value }))
                  }
                  className="w-full bg-[#001724] border border-white/15 focus:border-[#00BF8F] focus:ring-1 focus:ring-[#00BF8F] rounded-xl px-3.5 py-2 text-white outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Visual Preview */}
        <div
          className={`lg:col-span-6 sticky top-6 ${
            showPreviewMobile ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="bg-[#001E2F] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-[#00BF8F]" />
                <span className="text-xs font-bold text-[#00BF8F] uppercase tracking-wider">
                  Live Visual Preview (Exact Replica)
                </span>
              </div>
              <span className="text-[11px] text-slate-400">Updates in real-time</span>
            </div>

            {/* The A4 Replica Paper Canvas */}
            <div className="overflow-x-auto pb-4 max-h-[82vh] overflow-y-auto rounded-xl">
              <STCPayslipWebPreview payslip={formData} />
            </div>
          </div>
        </div>
      </div>

      {/* Save Confirmation Modal */}
      {showSavedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in-0">
          <div className="bg-[#001E2F] border border-white/15 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-5 animate-in zoom-in-95">
            <div className="size-14 rounded-full bg-[#00BF8F]/20 text-[#00BF8F] flex items-center justify-center mx-auto border border-[#00BF8F]/40 shadow-inner">
              <CheckCircle2 className="size-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white font-['Montserrat']">
                Payslip Saved Successfully!
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
                Payslip for <strong className="text-white">{formData.employee_name}</strong> has been saved to the live STC database.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={downloading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#00BF8F] hover:bg-[#00a87e] text-[#001E2F] rounded-xl text-sm font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                <Download className="size-4" />
                <span>{downloading ? 'Downloading...' : 'Download Official PDF'}</span>
              </button>

              <button
                type="button"
                onClick={() => router.push('/stc/payslips')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-semibold transition-all border border-white/15 cursor-pointer"
              >
                <span>View All Payslips</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowSavedModal(false)
                  if (!isEditing) {
                    setFormData({
                      id: '',
                      created_at: '',
                      ...DEFAULT_STC_PAYSLIP,
                    })
                    setHasSaved(false)
                  }
                }}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors pt-1 cursor-pointer"
              >
                {isEditing ? 'Continue Editing' : 'Create Another Payslip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
