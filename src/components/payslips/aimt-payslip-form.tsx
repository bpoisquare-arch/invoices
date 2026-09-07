'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  AIMTPayslip,
  DEFAULT_AIMT_PAYSLIP,
  aimtPayslipService,
} from '@/lib/services/aimt-payslip.service'
import AIMTPayslipWebPreview from './aimt-payslip-web-preview'
import AIMTPayslipPDFTemplate from '@/components/pdf/aimt-payslip-pdf-template'
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
} from 'lucide-react'

interface AIMTPayslipFormProps {
  initialData?: AIMTPayslip
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

// Helper to calculate Fortnight end (+13 days)
function calculateFortnightEnd(startIso: string): string {
  try {
    const [y, m, d] = startIso.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    date.setDate(date.getDate() + 13)
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  } catch {
    return startIso
  }
}

export default function AIMTPayslipForm({ initialData, isEditing = false }: AIMTPayslipFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState<AIMTPayslip>(
    initialData || {
      id: '',
      created_at: '',
      ...DEFAULT_AIMT_PAYSLIP,
    }
  )

  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [showPreviewMobile, setShowPreviewMobile] = useState(false)

  // Auto-calculation handler for hours and rate
  const handleHoursRateChange = (hours: number, rate: number) => {
    const calcWages = Math.round(hours * rate * 100) / 100
    const calcAnnual = Math.round(calcWages * 26 * 100) / 100
    const calcNet = Math.max(0, Math.round((calcWages - formData.tax_amount) * 100) / 100)

    setFormData((prev) => ({
      ...prev,
      ordinary_hours: hours,
      hourly_rate: rate,
      wages_amount: calcWages,
      wages_total: calcWages,
      total_earnings: calcWages,
      annual_salary: calcAnnual,
      net_pay: calcNet,
      payment_amount: calcNet,
    }))
  }

  // Handle Start Date change with Auto Fortnightly selection
  const handleStartDateChange = (isoVal: string) => {
    if (!isoVal) return
    const endIso = calculateFortnightEnd(isoVal)
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
      const res = await aimtPayslipService.save(formData)
      if (res.success && res.data) {
        setFormData(res.data)
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 4000)
        if (!isEditing) {
          router.push('/payslips')
        }
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
    const safeName = (formData.employee_name || 'AIMT-Employee')
      .trim()
      .replace(/[/\\?%*:|"<>]/g, '')
      .replace(/\s+/g, '_')
    const fileName = `AIMT_Payslip_${safeName}.pdf`

    try {
      // 1. Primary & Fastest: Server streaming endpoint
      try {
        const res = await fetch('/api/payslips-pdf', {
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
      const doc = <AIMTPayslipPDFTemplate payslip={formData} />
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

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#001E2F] border border-white/10 p-4 sm:p-5 rounded-2xl text-white shadow-xl">
        <div className="flex items-center gap-3">
          <Link
            href="/payslips"
            className="size-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-['Montserrat']">
              {isEditing ? 'Edit AIMT Payslip' : 'Generate AIMT Payslip'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Fill in manual details or use default template info to generate and export exact replica PDF.
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
          <span>Payslip saved successfully! You can find it in All Payslips list.</span>
        </div>
      )}

      {/* Main Grid: Left Form (Col-5), Right Preview (Col-7) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Column (Slightly more compact width) */}
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
                  placeholder="e.g. Ubaid Raza"
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
                    placeholder="e.g. 18 Petros St"
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
                    placeholder="e.g. Fraser Rise VIC 3336"
                    className="w-full bg-[#001724] border border-white/20 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#81F5F5]/50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Pay Period & Dates */}
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
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Period End Date (Fortnightly)
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

          {/* Card 3: Salary, Wages & Hours Calculation */}
          <div className="bg-[#001E2F] border border-white/10 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center gap-2 text-[#81F5F5] font-semibold text-sm border-b border-white/10 pb-2.5">
              <DollarSign className="size-4" />
              <span>Salary & Wages Calculation</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ordinary Hours (e.g. 76)
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.ordinary_hours || ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : parseFloat(e.target.value)
                    handleHoursRateChange(val, formData.hourly_rate)
                  }}
                  placeholder="76"
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
                    setFormData({
                      ...formData,
                      total_earnings: val,
                      wages_amount: val,
                      wages_total: val,
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
              <div>
                <span className="text-slate-400">Annual Salary: </span>
                <span className="font-bold text-white">
                  ${formData.annual_salary.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Payment Details (Bank & Account) */}
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
                  placeholder="(013-481)*****6474"
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
                  placeholder="AIMT Pay"
                  className="w-full bg-[#001724] border border-white/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#81F5F5]/50"
                />
              </div>
            </div>
          </div>

          {/* Card 5: Fixed / Template Details (Pre-filled Green items) */}
          <details className="bg-[#001E2F] border border-white/10 rounded-2xl p-4 shadow-lg text-xs group">
            <summary className="font-semibold text-slate-300 cursor-pointer flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400">
                <Building className="size-4 text-[#81F5F5]" />
                <span>Template & Paid By Info (Fixed Green Items)</span>
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
                    Pay Frequency
                  </label>
                  <input
                    type="text"
                    value={formData.pay_frequency}
                    onChange={(e) =>
                      setFormData({ ...formData, pay_frequency: e.target.value })
                    }
                    className="w-full bg-[#001724] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Employment Basis
                  </label>
                  <input
                    type="text"
                    value={formData.employment_basis}
                    onChange={(e) =>
                      setFormData({ ...formData, employment_basis: e.target.value })
                    }
                    className="w-full bg-[#001724] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
            </div>
          </details>
        </div>

        {/* Right Preview Column (Expanded Width) */}
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
            <AIMTPayslipWebPreview payslip={formData} />
          </div>
        </div>
      </div>
    </div>
  )
}
