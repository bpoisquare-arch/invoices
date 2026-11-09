'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LahoriLoungePayslip,
  DEFAULT_LAHORI_LOUNGE_PAYSLIP,
  lahoriLoungePayslipService,
} from '@/lib/services/lahori-lounge-payslip.service'
import LahoriLoungePayslipWebPreview from './lahori-lounge-payslip-web-preview'
import LahoriLoungePayslipPDFTemplate from '@/components/pdf/lahori-lounge-payslip-pdf-template'
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
  Calculator,
  RefreshCw,
} from 'lucide-react'

interface LahoriLoungePayslipFormProps {
  initialData?: LahoriLoungePayslip
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
    return Math.round(wages * 26 * 100) / 100
  }
}

interface YtdCalculationResult {
  wagesYtd: number
  taxYtd: number
  superYtd: number
  pastCount: number
  baseWages: number
  baseTax: number
  baseSuper: number
  lastPaymentDate?: string
}

function computeCumulativeYtdFromList(
  employeeName: string,
  currentWages: number,
  currentTax: number,
  currentSuper: number,
  savedList: LahoriLoungePayslip[],
  currentId?: string
): YtdCalculationResult {
  // All past saved payslips excluding current id if editing
  const allPast = (savedList || [])
    .filter((p) => !currentId || p.id !== currentId)
    .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime())

  if (allPast.length === 0) {
    return {
      wagesYtd: currentWages,
      taxYtd: currentTax,
      superYtd: currentSuper,
      pastCount: 0,
      baseWages: 0,
      baseTax: 0,
      baseSuper: 0,
    }
  }

  // 1. Try finding records for matching employee name if available
  const normalized = (employeeName || '').trim().toLowerCase()
  const employeePast = normalized
    ? allPast.filter(
        (p) =>
          p.employee_name &&
          (p.employee_name.trim().toLowerCase() === normalized ||
            p.employee_name.trim().toLowerCase().includes(normalized) ||
            normalized.includes(p.employee_name.trim().toLowerCase()))
      )
    : []

  // 2. If employee-specific record found use it, otherwise automatically use the previous record in the database
  const targetPast = employeePast.length > 0 ? employeePast : allPast

  // The latest previous record
  const latest = targetPast[targetPast.length - 1]

  const baseWages =
    Number(latest.wages_ytd ?? 0) > 0
      ? Number(latest.wages_ytd)
      : targetPast.reduce((acc, p) => acc + Number(p.wages_total || p.wages_amount || 0), 0)

  const baseTax =
    Number(latest.tax_ytd ?? 0) > 0
      ? Number(latest.tax_ytd)
      : targetPast.reduce((acc, p) => acc + Number(p.tax_total || p.tax_amount || 0), 0)

  const baseSuper =
    Number(latest.superannuation_ytd ?? 0) > 0
      ? Number(latest.superannuation_ytd)
      : targetPast.reduce(
          (acc, p) =>
            acc + Number(p.superannuation_total || p.superannuation_amount || 0),
          0
        )

  return {
    wagesYtd: Math.round((baseWages + currentWages) * 100) / 100,
    taxYtd: Math.round((baseTax + currentTax) * 100) / 100,
    superYtd: Math.round((baseSuper + currentSuper) * 100) / 100,
    pastCount: targetPast.length,
    baseWages: Math.round(baseWages * 100) / 100,
    baseTax: Math.round(baseTax * 100) / 100,
    baseSuper: Math.round(baseSuper * 100) / 100,
    lastPaymentDate: latest.payment_date || latest.pay_period_end || undefined,
  }
}

export default function LahoriLoungePayslipForm({
  initialData,
  isEditing = false,
}: LahoriLoungePayslipFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState<LahoriLoungePayslip>(
    initialData || {
      id: '',
      created_at: '',
      ...DEFAULT_LAHORI_LOUNGE_PAYSLIP,
    }
  )

  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [showPreviewMobile, setShowPreviewMobile] = useState(false)

  const [hasSaved, setHasSaved] = useState<boolean>(Boolean(isEditing && initialData?.id))
  const [showSavedModal, setShowSavedModal] = useState<boolean>(false)

  // Saved payslips from database for automatic YTD calculation & employee autofill
  const [savedPayslips, setSavedPayslips] = useState<LahoriLoungePayslip[]>([])
  const [pastCount, setPastCount] = useState<number>(0)
  const [baseHistory, setBaseHistory] = useState<{
    baseWages: number
    baseTax: number
    baseSuper: number
    lastDate?: string
  } | null>(null)

  // Manual override indicators for the 3 YTD fields
  const [isManualWagesYtd, setIsManualWagesYtd] = useState<boolean>(Boolean(isEditing))
  const [isManualTaxYtd, setIsManualTaxYtd] = useState<boolean>(Boolean(isEditing))
  const [isManualSuperYtd, setIsManualSuperYtd] = useState<boolean>(Boolean(isEditing))

  const [calculatingYtd, setCalculatingYtd] = useState(false)
  const [ytdCalculationMsg, setYtdCalculationMsg] = useState<string | null>(null)

  // Fetch all saved payslips on mount
  useEffect(() => {
    let mounted = true
    async function loadPastPayslips() {
      try {
        const list = await lahoriLoungePayslipService.getAll()
        if (!mounted) return
        setSavedPayslips(list)

        // Run automatic cumulative calculation from previous record if not editing existing payslip
        if (!isEditing) {
          const res = computeCumulativeYtdFromList(
            formData.employee_name,
            formData.wages_amount,
            formData.tax_amount,
            formData.include_superannuation ? Number(formData.superannuation_amount || 0) : 0,
            list,
            formData.id
          )
          setPastCount(res.pastCount)
          if (res.pastCount > 0) {
            setBaseHistory({
              baseWages: res.baseWages,
              baseTax: res.baseTax,
              baseSuper: res.baseSuper,
              lastDate: res.lastPaymentDate,
            })
            setFormData((prev) => ({
              ...prev,
              wages_ytd: res.wagesYtd,
              tax_ytd: res.taxYtd,
              superannuation_ytd: res.superYtd,
            }))
          }
        }
      } catch (err) {
        console.error('Error fetching payslips for cumulative YTD:', err)
      }
    }
    loadPastPayslips()
    return () => {
      mounted = false
    }
  }, [isEditing])

  // Recalculate YTD helper
  const syncCumulativeYtd = (
    employeeName: string,
    wages: number,
    tax: number,
    superAmt: number,
    list: LahoriLoungePayslip[] = savedPayslips,
    overrideManual: boolean = false
  ) => {
    const res = computeCumulativeYtdFromList(
      employeeName,
      wages,
      tax,
      superAmt,
      list,
      formData.id
    )

    setPastCount(res.pastCount)
    if (res.pastCount > 0) {
      setBaseHistory({
        baseWages: res.baseWages,
        baseTax: res.baseTax,
        baseSuper: res.baseSuper,
        lastDate: res.lastPaymentDate,
      })
    } else {
      setBaseHistory(null)
    }

    setFormData((prev) => ({
      ...prev,
      wages_ytd: (!isManualWagesYtd || overrideManual) ? res.wagesYtd : prev.wages_ytd,
      tax_ytd: (!isManualTaxYtd || overrideManual) ? res.taxYtd : prev.tax_ytd,
      superannuation_ytd: (!isManualSuperYtd || overrideManual) ? res.superYtd : prev.superannuation_ytd,
    }))

    return res
  }

  // Force button to recalculate YTD from database history
  const handleCalculateYtdFromHistory = async () => {
    setCalculatingYtd(true)
    setYtdCalculationMsg(null)
    try {
      const list = await lahoriLoungePayslipService.getAll()
      setSavedPayslips(list)

      const superVal = formData.include_superannuation ? Number(formData.superannuation_amount || 0) : 0
      const res = syncCumulativeYtd(
        formData.employee_name,
        formData.wages_amount,
        formData.tax_amount,
        superVal,
        list,
        true // force override manual
      )

      setIsManualWagesYtd(false)
      setIsManualTaxYtd(false)
      setIsManualSuperYtd(false)

      if (res.pastCount > 0) {
        setYtdCalculationMsg(
          `Accumulated YTD from ${res.pastCount} previous payslip(s): Wages $${res.wagesYtd.toFixed(
            2
          )}, Tax $${res.taxYtd.toFixed(2)}${
            formData.include_superannuation ? `, Super $${res.superYtd.toFixed(2)}` : ''
          }`
        )
      } else {
        setYtdCalculationMsg(
          `No past payslips found for "${formData.employee_name}". YTD reset to current pay values.`
        )
      }
      setTimeout(() => setYtdCalculationMsg(null), 6000)
    } catch (err) {
      console.error('Failed to calculate YTD:', err)
      setYtdCalculationMsg('Could not calculate YTD from history.')
      setTimeout(() => setYtdCalculationMsg(null), 4000)
    } finally {
      setCalculatingYtd(false)
    }
  }

  // Handle employee name change (with auto-suggest & cumulative YTD recalc)
  const handleEmployeeNameChange = (name: string) => {
    const normalized = name.trim().toLowerCase()
    const matchingPast = savedPayslips.filter(
      (p) => p.employee_name && p.employee_name.trim().toLowerCase() === normalized
    )

    let updatedAddress1 = formData.address_line_1
    let updatedAddress2 = formData.address_line_2
    let updatedMaskedBank = formData.bank_account_masked
    let updatedSuperDesc = formData.superannuation_description

    // If exact employee match found and fields are currently empty, auto-populate from past
    if (matchingPast.length > 0) {
      const latest = matchingPast[matchingPast.length - 1]
      if (!updatedAddress1 && latest.address_line_1) updatedAddress1 = latest.address_line_1
      if (!updatedAddress2 && latest.address_line_2) updatedAddress2 = latest.address_line_2
      if (!updatedMaskedBank && latest.bank_account_masked) updatedMaskedBank = latest.bank_account_masked
      if (!updatedSuperDesc && latest.superannuation_description) updatedSuperDesc = latest.superannuation_description
    }

    const superVal = formData.include_superannuation ? Number(formData.superannuation_amount || 0) : 0
    const res = computeCumulativeYtdFromList(
      name,
      formData.wages_amount,
      formData.tax_amount,
      superVal,
      savedPayslips,
      formData.id
    )

    setPastCount(res.pastCount)
    if (res.pastCount > 0) {
      setBaseHistory({
        baseWages: res.baseWages,
        baseTax: res.baseTax,
        baseSuper: res.baseSuper,
        lastDate: res.lastPaymentDate,
      })
    } else {
      setBaseHistory(null)
    }

    setFormData((prev) => ({
      ...prev,
      employee_name: name,
      account_name: name,
      address_line_1: updatedAddress1,
      address_line_2: updatedAddress2,
      bank_account_masked: updatedMaskedBank,
      superannuation_description: updatedSuperDesc,
      wages_ytd: !isManualWagesYtd ? res.wagesYtd : prev.wages_ytd,
      tax_ytd: !isManualTaxYtd ? res.taxYtd : prev.tax_ytd,
      superannuation_ytd: !isManualSuperYtd ? res.superYtd : prev.superannuation_ytd,
    }))
  }

  // Auto-calculation handler for hours and rate
  const handleHoursRateChange = (hours: number, rate: number) => {
    const calcWages = Math.round(hours * rate * 100) / 100
    const calcAnnual = calculateAnnualSalary(calcWages, formData.pay_frequency || 'Fortnightly')
    const calcNet = Math.max(0, Math.round((calcWages - formData.tax_amount) * 100) / 100)

    const superVal = formData.include_superannuation ? Number(formData.superannuation_amount || 0) : 0
    const res = computeCumulativeYtdFromList(
      formData.employee_name,
      calcWages,
      formData.tax_amount,
      superVal,
      savedPayslips,
      formData.id
    )

    setFormData((prev) => ({
      ...prev,
      ordinary_hours: hours,
      hourly_rate: rate,
      wages_amount: calcWages,
      wages_total: calcWages,
      wages_ytd: !isManualWagesYtd ? res.wagesYtd : prev.wages_ytd,
      total_earnings: calcWages,
      annual_salary: prev.show_annual_salary !== false ? calcAnnual : prev.annual_salary,
      net_pay: calcNet,
      payment_amount: calcNet,
    }))
  }

  // Handle Tax change
  const handleTaxChange = (tax: number) => {
    const calcNet = Math.max(0, Math.round((formData.total_earnings - tax) * 100) / 100)
    const superVal = formData.include_superannuation ? Number(formData.superannuation_amount || 0) : 0
    const res = computeCumulativeYtdFromList(
      formData.employee_name,
      formData.wages_amount,
      tax,
      superVal,
      savedPayslips,
      formData.id
    )

    setFormData((prev) => ({
      ...prev,
      tax_amount: tax,
      tax_total: tax,
      tax_ytd: !isManualTaxYtd ? res.taxYtd : prev.tax_ytd,
      net_pay: calcNet,
      payment_amount: calcNet,
    }))
  }

  // Handle Superannuation Toggle
  const handleSuperannuationToggle = (enabled: boolean) => {
    const defaultDesc =
      formData.superannuation_description ||
      'SGC - HOSTPLUS Superannuation Fund - Industry - 102860122'
    const superAmount = enabled ? (formData.superannuation_amount || 0) : 0

    const res = computeCumulativeYtdFromList(
      formData.employee_name,
      formData.wages_amount,
      formData.tax_amount,
      superAmount,
      savedPayslips,
      formData.id
    )

    setFormData((prev) => ({
      ...prev,
      include_superannuation: enabled,
      superannuation_description: defaultDesc,
      superannuation_amount: superAmount,
      superannuation_total: superAmount,
      superannuation_ytd: !isManualSuperYtd ? res.superYtd : prev.superannuation_ytd,
    }))
  }

  // Handle Superannuation Amount change
  const handleSuperannuationAmountChange = (amount: number) => {
    const res = computeCumulativeYtdFromList(
      formData.employee_name,
      formData.wages_amount,
      formData.tax_amount,
      amount,
      savedPayslips,
      formData.id
    )

    setFormData((prev) => ({
      ...prev,
      superannuation_amount: amount,
      superannuation_total: amount,
      superannuation_ytd: !isManualSuperYtd ? res.superYtd : prev.superannuation_ytd,
    }))
  }

  // Reset a specific YTD field back to auto-calculated
  const resetFieldToAuto = (field: 'wages' | 'tax' | 'super') => {
    const superVal = formData.include_superannuation ? Number(formData.superannuation_amount || 0) : 0
    const res = computeCumulativeYtdFromList(
      formData.employee_name,
      formData.wages_amount,
      formData.tax_amount,
      superVal,
      savedPayslips,
      formData.id
    )

    if (field === 'wages') {
      setIsManualWagesYtd(false)
      setFormData((prev) => ({ ...prev, wages_ytd: res.wagesYtd }))
    } else if (field === 'tax') {
      setIsManualTaxYtd(false)
      setFormData((prev) => ({ ...prev, tax_ytd: res.taxYtd }))
    } else if (field === 'super') {
      setIsManualSuperYtd(false)
      setFormData((prev) => ({ ...prev, superannuation_ytd: res.superYtd }))
    }
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

  // Handle Start Date change
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

  const handleSuperannuationDescriptionChange = (desc: string) => {
    setFormData((prev) => ({
      ...prev,
      superannuation_description: desc,
    }))
  }

  // Reset all YTD fields to auto
  const resetAllYtdToAuto = () => {
    setIsManualWagesYtd(false)
    setIsManualTaxYtd(false)
    setIsManualSuperYtd(false)
    const superVal = formData.include_superannuation ? Number(formData.superannuation_amount || 0) : 0
    syncCumulativeYtd(
      formData.employee_name,
      formData.wages_amount,
      formData.tax_amount,
      superVal,
      savedPayslips,
      true
    )
  }

  async function handleSave() {
    setSaving(true)
    setSaveSuccess(false)
    try {
      const isSuper = Boolean(formData.include_superannuation)
      const dataToSave: LahoriLoungePayslip = {
        ...formData,
        wages_ytd: Number(formData.wages_ytd !== undefined ? formData.wages_ytd : formData.wages_total),
        tax_ytd: Number(formData.tax_ytd !== undefined ? formData.tax_ytd : formData.tax_total),
        superannuation_ytd: isSuper
          ? Number(formData.superannuation_ytd !== undefined ? formData.superannuation_ytd : formData.superannuation_total || 0)
          : 0,
        include_superannuation: isSuper,
        superannuation_description: isSuper
          ? (formData.superannuation_description || '').trim()
          : '',
        superannuation_amount: isSuper ? Number(formData.superannuation_amount || 0) : 0,
        superannuation_total: isSuper
          ? Number(formData.superannuation_total || formData.superannuation_amount || 0)
          : 0,
      }
      const res = await lahoriLoungePayslipService.save(dataToSave)
      if (res.success && res.data) {
        setFormData(res.data)
        setHasSaved(true)
        setSaveSuccess(true)
        setShowSavedModal(true)
        if (!isEditing && typeof window !== 'undefined') {
          window.history.replaceState(null, '', `/lahori-lounge/payslips/${res.data.id}/edit`)
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
    const safeName = (formData.employee_name || 'LahoriLounge-Employee')
      .trim()
      .replace(/[/\\?%*:|"<>]/g, '')
      .replace(/\s+/g, '_')
    const fileName = `Lahori_Lounge_Payslip_${safeName}.pdf`

    try {
      const doc = <LahoriLoungePayslipPDFTemplate payslip={formData} />
      const blobPromise = pdf(doc).toBlob()
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('PDF generation timed out')), 6000)
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

  const uniqueEmployees = Array.from(
    new Set(
      savedPayslips
        .map((p) => (p.employee_name || '').trim())
        .filter((n) => n.length > 0)
    )
  )

  return (
    <div className="space-y-5 max-w-[1920px] mx-auto pb-16 font-sans">
      {/* 1. Header Toolbar Card */}
      <div className="bg-[#001E2F] border border-white/10 p-4 sm:p-5 rounded-2xl text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/lahori-lounge/payslips"
            className="size-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer border border-white/10"
            title="Back to All Payslips"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-['Montserrat']">
                {isEditing ? 'Edit The Lahori Lounge Payslip' : 'Generate The Lahori Lounge Payslip'}
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#0E3E5B] text-[#81F5F5] uppercase tracking-wider border border-[#81F5F5]/30">
                TLL
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
              Customize employee, pay frequency, dates, wages, and export replica PDF.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* View / Toggle Preview on Mobile */}
          <button
            type="button"
            onClick={() => setShowPreviewMobile((prev) => !prev)}
            className="lg:hidden flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 transition-all cursor-pointer"
          >
            <Eye className="size-3.5 text-[#81F5F5]" />
            <span>{showPreviewMobile ? 'Edit Form' : 'Live Preview'}</span>
          </button>

          {/* Save Payslip Button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-md cursor-pointer ${
              saveSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-[#0E3E5B] hover:bg-[#15537a] text-white border border-white/20 hover:border-[#81F5F5]/60'
            }`}
          >
            {saving ? (
              <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : saveSuccess ? (
              <CheckCircle2 className="size-4 text-white" />
            ) : (
              <Save className="size-4 text-[#81F5F5]" />
            )}
            <span>{saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Payslip'}</span>
          </button>

          {/* Download PDF Button */}
          {hasSaved && (
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#81F5F5] hover:bg-[#5ce1e6] text-[#001724] transition-all shadow-md cursor-pointer hover:shadow-cyan-500/20"
            >
              {downloading ? (
                <div className="size-4 border-2 border-[#001724] border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="size-4 text-[#001724]" />
              )}
              <span>{downloading ? 'Exporting...' : 'Export PDF'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Two-Column Split Layout (42% Form, 58% Preview) */}
      <div className="flex flex-col lg:flex-row gap-4 xl:gap-5 items-start">
        {/* LEFT COLUMN: Input Form Controls (42% width) */}
        <div
          className={`w-full lg:w-[42%] xl:w-[40%] 2xl:w-[38%] space-y-4 shrink-0 ${
            showPreviewMobile ? 'hidden lg:block' : 'block'
          }`}
        >
          {/* Section A: Employee Information */}
          <div className="bg-[#001E2F] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-sm text-slate-100 space-y-3.5">
            <div className="flex items-center gap-2 pb-2.5 border-b border-white/10">
              <User className="size-4 text-[#81F5F5]" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-['Montserrat']">
                Employee Information (Editable)
              </h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Employee Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  list="lahori-saved-employees"
                  value={formData.employee_name}
                  onChange={(e) => handleEmployeeNameChange(e.target.value)}
                  placeholder="e.g. Ubaid Raza"
                  className="w-full bg-[#001724] border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#81F5F5] focus:border-[#81F5F5] transition-all"
                />
                <datalist id="lahori-saved-employees">
                  {uniqueEmployees.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>

                {uniqueEmployees.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-2">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                      Quick Pick:
                    </span>
                    {uniqueEmployees.slice(0, 5).map((name) => {
                      const isCur = formData.employee_name.trim().toLowerCase() === name.toLowerCase()
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => handleEmployeeNameChange(name)}
                          className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-all cursor-pointer ${
                            isCur
                              ? 'bg-[#81F5F5] text-[#001724] border-[#81F5F5] font-bold shadow-xs'
                              : 'bg-white/5 text-slate-300 border-white/10 hover:border-[#81F5F5]/40 hover:text-white'
                          }`}
                        >
                          {name}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Street Address
                </label>
                <input
                  type="text"
                  value={formData.address_line_1}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, address_line_1: e.target.value }))
                  }
                  placeholder="e.g. 18 Petros St"
                  className="w-full bg-[#001724] border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#81F5F5] focus:border-[#81F5F5] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Suburb, State & Postcode
                </label>
                <input
                  type="text"
                  value={formData.address_line_2}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, address_line_2: e.target.value }))
                  }
                  placeholder="e.g. Fraser Rise VIC 3336"
                  className="w-full bg-[#001724] border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#81F5F5] focus:border-[#81F5F5] transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section B: Employment & Frequency Details */}
          <div className="bg-[#001E2F] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-sm text-slate-100 space-y-3.5">
            <div className="flex items-center gap-2 pb-2.5 border-b border-white/10">
              <Briefcase className="size-4 text-[#81F5F5]" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-['Montserrat']">
                Employment & Frequency Details
              </h2>
            </div>

            <div className="space-y-3.5">
              {/* Pay Frequency Pills */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Pay Frequency <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Weekly', 'Fortnightly', 'Monthly'] as const).map((freq) => {
                    const isSelected = formData.pay_frequency === freq
                    return (
                      <button
                        key={freq}
                        type="button"
                        onClick={() => handleFrequencyChange(freq)}
                        className={`py-2 px-2 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          isSelected
                            ? 'bg-[#81F5F5] text-[#001724] border-[#81F5F5] shadow-xs'
                            : 'bg-[#001724] text-slate-300 border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        {isSelected && <Check className="size-3" />}
                        <span>{freq}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Employment Basis */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Employment Basis <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Full-time employment', 'Part-time employment'] as const).map((basis) => {
                    const isSelected = formData.employment_basis === basis
                    return (
                      <button
                        key={basis}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, employment_basis: basis }))
                        }
                        className={`py-2 px-2 text-[11px] font-bold rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          isSelected
                            ? 'bg-[#0E3E5B] text-[#81F5F5] border-[#81F5F5]/40 shadow-xs'
                            : 'bg-[#001724] text-slate-300 border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        {isSelected && <Check className="size-3" />}
                        <span>{basis.replace(' employment', '')}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Annual Salary & Visibility Toggle */}
              <div className="pt-2 border-t border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showAnnual}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          show_annual_salary: e.target.checked,
                        }))
                      }
                      className="rounded border-slate-700 text-[#81F5F5] focus:ring-0 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-200">
                      Show Annual Salary
                    </span>
                  </label>
                  <span className="text-[11px] text-slate-400">Optional</span>
                </div>

                {showAnnual && (
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm font-semibold">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.annual_salary || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          annual_salary: parseFloat(e.target.value) || 0,
                        }))
                      }
                      placeholder="104000"
                      className="w-full bg-[#001724] border border-slate-700 rounded-lg pl-8 pr-3.5 py-2 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#81F5F5] focus:border-[#81F5F5] transition-all"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section C: Pay Period & Payment Dates */}
          <div className="bg-[#001E2F] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-sm text-slate-100 space-y-3.5">
            <div className="flex items-center gap-2 pb-2.5 border-b border-white/10">
              <Calendar className="size-4 text-[#81F5F5]" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-['Montserrat']">
                Pay Period & Payment Dates
              </h2>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Start Date <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={toInputDateFormat(formData.pay_period_start)}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full bg-[#001724] border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#81F5F5] focus:border-[#81F5F5] transition-all"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
                    {formData.pay_period_start || '-'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    End Date <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={toInputDateFormat(formData.pay_period_end)}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    className="w-full bg-[#001724] border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#81F5F5] focus:border-[#81F5F5] transition-all"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
                    {formData.pay_period_end || '-'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Payment Date <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  value={toInputDateFormat(formData.payment_date)}
                  onChange={(e) => handlePaymentDateChange(e.target.value)}
                  className="w-full bg-[#001724] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#81F5F5] focus:border-[#81F5F5] transition-all"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Displays: {formData.payment_date || '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick YTD Auto-Calculate Banner */}
          <div className="bg-[#001E2F] border border-[#81F5F5]/30 rounded-2xl p-4 shadow-sm text-slate-100 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-lg bg-[#0E3E5B] text-[#81F5F5] shrink-0 mt-0.5">
                  <Calculator className="size-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-['Montserrat']">
                      Cumulative Year-To-Date (YTD)
                    </h3>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        pastCount > 0
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-700/50 text-slate-300'
                      }`}
                    >
                      {pastCount > 0 ? `${pastCount} Past Record(s)` : 'Initial Record'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                    {pastCount > 0 ? (
                      <span>
                        Automatically accumulated from previous record ({pastCount} saved in database): <strong className="text-[#81F5F5]">Previous Base YTD + This Pay</strong>.
                      </span>
                    ) : (
                      <span>
                        Auto-calculated from previous database records. If no history exists, YTD equals this pay. You can also type custom values manually anytime.
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {baseHistory && pastCount > 0 && (
              <div className="bg-[#001724] border border-slate-700/80 rounded-xl p-2.5 text-[11px] space-y-1">
                <div className="text-slate-400 flex items-center justify-between">
                  <span>Previous Base YTD (from latest payslip):</span>
                  {baseHistory.lastDate && (
                    <span className="text-slate-500 text-[10px]">Date: {baseHistory.lastDate}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 font-mono text-slate-300">
                  <div>
                    Wages Base: <strong className="text-white">${baseHistory.baseWages.toFixed(2)}</strong>
                  </div>
                  <div>
                    Tax Base: <strong className="text-white">${baseHistory.baseTax.toFixed(2)}</strong>
                  </div>
                  {formData.include_superannuation && (
                    <div>
                      Super Base: <strong className="text-white">${baseHistory.baseSuper.toFixed(2)}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCalculateYtdFromHistory}
                disabled={calculatingYtd}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-[#003D5C] hover:bg-[#0E3E5B] text-[#81F5F5] border border-[#81F5F5]/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                {calculatingYtd ? (
                  <div className="size-3.5 border-2 border-[#81F5F5] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5 text-[#81F5F5]" />
                )}
                <span>{calculatingYtd ? 'Recalculating...' : 'Recalculate YTD from Database'}</span>
              </button>

              {(isManualWagesYtd || isManualTaxYtd || isManualSuperYtd) && (
                <button
                  type="button"
                  onClick={resetAllYtdToAuto}
                  className="py-2 px-3 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all cursor-pointer whitespace-nowrap"
                  title="Reset all manual overrides to auto-calculated"
                >
                  Reset All to Auto
                </button>
              )}
            </div>

            {ytdCalculationMsg && (
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] flex items-center gap-1.5 animate-in fade-in-50">
                <CheckCircle2 className="size-3.5 shrink-0" />
                <span>{ytdCalculationMsg}</span>
              </div>
            )}
          </div>

          {/* Section D: Salary, Wages & Hours Calculation */}
          <div className="bg-[#001E2F] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-sm text-slate-100 space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <DollarSign className="size-4 text-[#81F5F5]" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider font-['Montserrat']">
                  Salary & Wages
                </h2>
              </div>
              <span className="text-xs font-mono font-bold text-[#81F5F5]">
                ${formData.wages_total.toFixed(2)}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Wages Description
                </label>
                <input
                  type="text"
                  value={formData.wages_description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, wages_description: e.target.value }))
                  }
                  placeholder="Ordinary Hours"
                  className="w-full bg-[#001724] border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#81F5F5] focus:border-[#81F5F5] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Hours <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.ordinary_hours || ''}
                    onChange={(e) =>
                      handleHoursRateChange(
                        parseFloat(e.target.value) || 0,
                        formData.hourly_rate
                      )
                    }
                    placeholder="76.0"
                    className="w-full bg-[#001724] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-[#81F5F5] focus:border-[#81F5F5] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Rate ($) <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 text-xs font-semibold">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.0001"
                      value={formData.hourly_rate || ''}
                      onChange={(e) =>
                        handleHoursRateChange(
                          formData.ordinary_hours,
                          parseFloat(e.target.value) || 0
                        )
                      }
                      placeholder="52.6316"
                      className="w-full bg-[#001724] border border-slate-700 rounded-lg pl-6 pr-2.5 py-2 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-[#81F5F5] focus:border-[#81F5F5] transition-all"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span>Wages YTD ($)</span>
                    {isManualWagesYtd ? (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 font-medium">
                        Manual
                      </span>
                    ) : (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30 font-medium">
                        {pastCount > 0 ? `Auto (${pastCount} past)` : 'Auto'}
                      </span>
                    )}
                  </div>
                  {isManualWagesYtd && (
                    <button
                      type="button"
                      onClick={() => resetFieldToAuto('wages')}
                      className="text-[#81F5F5] text-[10px] hover:underline cursor-pointer"
                    >
                      Reset to Auto
                    </button>
                  )}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2 text-slate-400 text-sm font-semibold">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.wages_ytd ?? ''}
                    onChange={(e) => {
                      setIsManualWagesYtd(true)
                      setFormData((prev) => ({
                        ...prev,
                        wages_ytd: parseFloat(e.target.value) || 0,
                      }))
                    }}
                    placeholder="e.g. 18695.04"
                    className={`w-full bg-[#001724] border rounded-lg pl-8 pr-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-[#81F5F5] transition-all ${
                      isManualWagesYtd
                        ? 'border-amber-500/60 focus:border-amber-400'
                        : 'border-slate-700 focus:border-[#81F5F5]'
                    }`}
                  />
                </div>
              </div>

              {/* Total Wages Display Bar */}
              <div className="bg-[#001724] p-3 rounded-lg border border-slate-700/80 space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">This Pay Wages:</span>
                  <span className="font-bold text-white font-mono">${formData.wages_amount.toFixed(2)} AUD</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Cumulative Wages YTD:</span>
                  <span className="font-bold text-[#81F5F5] font-mono">
                    ${(formData.wages_ytd !== undefined ? formData.wages_ytd : formData.wages_total).toFixed(2)} AUD
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section E: Tax Deduction Details */}
          <div className="bg-[#001E2F] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-sm text-slate-100 space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-[#81F5F5]" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider font-['Montserrat']">
                  Tax Withholding
                </h2>
              </div>
              <span className="text-xs font-mono font-bold text-rose-400">
                -${formData.tax_total.toFixed(2)}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tax Description
                </label>
                <input
                  type="text"
                  value={formData.tax_description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, tax_description: e.target.value }))
                  }
                  placeholder="PAYG"
                  className="w-full bg-[#001724] border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#81F5F5] focus:border-[#81F5F5] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    This Pay Tax <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 text-xs font-semibold">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.tax_amount || ''}
                      onChange={(e) => handleTaxChange(parseFloat(e.target.value) || 0)}
                      placeholder="928.00"
                      className="w-full bg-[#001724] border border-slate-700 rounded-lg pl-6 pr-2.5 py-2 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-[#81F5F5] focus:border-[#81F5F5] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span>Tax YTD ($)</span>
                      {isManualTaxYtd ? (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 font-medium">
                          Manual
                        </span>
                      ) : (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30 font-medium">
                          {pastCount > 0 ? `Auto (${pastCount} past)` : 'Auto'}
                        </span>
                      )}
                    </div>
                    {isManualTaxYtd && (
                      <button
                        type="button"
                        onClick={() => resetFieldToAuto('tax')}
                        className="text-[#81F5F5] text-[10px] hover:underline cursor-pointer"
                      >
                        Reset to Auto
                      </button>
                    )}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 text-xs font-semibold">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.tax_ytd ?? ''}
                      onChange={(e) => {
                        setIsManualTaxYtd(true)
                        setFormData((prev) => ({
                          ...prev,
                          tax_ytd: parseFloat(e.target.value) || 0,
                        }))
                      }}
                      placeholder="e.g. 4215.00"
                      className={`w-full bg-[#001724] border rounded-lg pl-6 pr-2.5 py-2 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-[#81F5F5] transition-all ${
                        isManualTaxYtd
                          ? 'border-amber-500/60 focus:border-amber-400'
                          : 'border-slate-700 focus:border-[#81F5F5]'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section E-2: Superannuation Details (Optional) */}
          <div className="bg-[#001E2F] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-sm text-slate-100 space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-[#81F5F5]" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider font-['Montserrat']">
                  Superannuation
                </h2>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(formData.include_superannuation)}
                  onChange={(e) => handleSuperannuationToggle(e.target.checked)}
                  className="rounded border-slate-700 text-[#81F5F5] focus:ring-0 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-300">
                  Include
                </span>
              </label>
            </div>

            {formData.include_superannuation && (
              <div className="space-y-3 pt-1 animate-in fade-in-50">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Fund Description
                  </label>
                  <input
                    type="text"
                    value={formData.superannuation_description || ''}
                    onChange={(e) => handleSuperannuationDescriptionChange(e.target.value)}
                    placeholder="SGC - HOSTPLUS Superannuation Fund - Industry - 102860122"
                    className="w-full bg-[#001724] border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#81F5F5] focus:border-[#81F5F5] transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Amount ($)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400 text-xs font-semibold">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.superannuation_amount ?? 0}
                        onChange={(e) =>
                          handleSuperannuationAmountChange(parseFloat(e.target.value) || 0)
                        }
                        placeholder="0.00"
                        className="w-full bg-[#001724] border border-slate-700 rounded-lg pl-6 pr-2.5 py-2 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-[#81F5F5] focus:border-[#81F5F5] transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span>Super YTD ($)</span>
                        {isManualSuperYtd ? (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 font-medium">
                            Manual
                          </span>
                        ) : (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30 font-medium">
                            {pastCount > 0 ? `Auto (${pastCount} past)` : 'Auto'}
                          </span>
                        )}
                      </div>
                      {isManualSuperYtd && (
                        <button
                          type="button"
                          onClick={() => resetFieldToAuto('super')}
                          className="text-[#81F5F5] text-[10px] hover:underline cursor-pointer"
                        >
                          Reset to Auto
                        </button>
                      )}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400 text-xs font-semibold">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.superannuation_ytd ?? ''}
                        onChange={(e) => {
                          setIsManualSuperYtd(true)
                          setFormData((prev) => ({
                            ...prev,
                            superannuation_ytd: parseFloat(e.target.value) || 0,
                          }))
                        }}
                        placeholder="e.g. 2243.40"
                        className={`w-full bg-[#001724] border rounded-lg pl-6 pr-2.5 py-2 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-[#81F5F5] transition-all ${
                          isManualSuperYtd
                            ? 'border-amber-500/60 focus:border-amber-400'
                            : 'border-slate-700 focus:border-[#81F5F5]'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section F: Payment & Banking Details */}
          <div className="bg-[#001E2F] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-sm text-slate-100 space-y-3.5">
            <div className="flex items-center gap-2 pb-2.5 border-b border-white/10">
              <CreditCard className="size-4 text-[#81F5F5]" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-['Montserrat']">
                Payment Details
              </h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Masked Bank Account <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.bank_account_masked}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      bank_account_masked: e.target.value,
                    }))
                  }
                  placeholder="(013-481)*****6474"
                  className="w-full bg-[#001724] border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#81F5F5] focus:border-[#81F5F5] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Account Name
                </label>
                <input
                  type="text"
                  value={formData.account_name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, account_name: e.target.value }))
                  }
                  placeholder="e.g. Ubaid Raza"
                  className="w-full bg-[#001724] border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#81F5F5] focus:border-[#81F5F5] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Payment Reference
                  </label>
                  <input
                    type="text"
                    value={formData.payment_reference}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, payment_reference: e.target.value }))
                    }
                    placeholder="Lahori Lounge Pay"
                    className="w-full bg-[#001724] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#81F5F5] focus:border-[#81F5F5] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Net Pay ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 text-xs font-semibold">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.payment_amount || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          payment_amount: parseFloat(e.target.value) || 0,
                          net_pay: parseFloat(e.target.value) || 0,
                        }))
                      }
                      placeholder="3072.00"
                      className="w-full bg-[#001724] border border-slate-700 rounded-lg pl-6 pr-2 py-2 text-xs text-emerald-400 font-bold font-mono focus:outline-none focus:ring-1 focus:ring-[#81F5F5] focus:border-[#81F5F5] transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section G: The Lahori Lounge Paid By Details */}
          <div className="bg-[#001E2F] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-sm text-slate-100 space-y-3.5">
            <div className="flex items-center gap-2 pb-2.5 border-b border-white/10">
              <Building className="size-4 text-[#81F5F5]" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-['Montserrat']">
                Paid By (The Lahori Lounge Entity)
              </h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={formData.paid_by_name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, paid_by_name: e.target.value }))
                  }
                  className="w-full bg-[#001724] border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#81F5F5] focus:border-[#81F5F5] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Address Line 1
                </label>
                <input
                  type="text"
                  value={formData.paid_by_address_1}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, paid_by_address_1: e.target.value }))
                  }
                  className="w-full bg-[#001724] border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#81F5F5] focus:border-[#81F5F5] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={formData.paid_by_address_2}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, paid_by_address_2: e.target.value }))
                  }
                  className="w-full bg-[#001724] border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#81F5F5] focus:border-[#81F5F5] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  ABN
                </label>
                <input
                  type="text"
                  value={formData.paid_by_abn}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, paid_by_abn: e.target.value }))
                  }
                  placeholder="e.g. 50 683 299 461"
                  className="w-full bg-[#001724] border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#81F5F5] focus:border-[#81F5F5] transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Visual Preview (58% width) */}
        <div
          className={`w-full lg:w-[58%] xl:w-[60%] 2xl:w-[62%] flex-1 min-w-0 ${
            showPreviewMobile ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-[#81F5F5]" />
              Live Visual Preview (Exact Replica)
            </span>
            <span className="text-[11px] text-slate-400">Updates in real-time</span>
          </div>

          {/* Container for Web Preview */}
          <div className="rounded-2xl overflow-x-auto border border-slate-300/80 shadow-2xl bg-slate-100/90 p-2 sm:p-3 md:p-4 flex justify-center">
            <LahoriLoungePayslipWebPreview payslip={formData} />
          </div>
        </div>
      </div>

      {/* Confirmation Modal when Saved */}
      {showSavedModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in-0 duration-200">
          <div className="bg-[#001E2F] border border-slate-700 rounded-2xl max-w-md w-full p-6 text-slate-100 shadow-2xl space-y-4">
            <div className="size-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="size-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-white font-['Montserrat']">
                Payslip Saved Successfully!
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                The Lahori Lounge payslip for{' '}
                <strong className="text-[#81F5F5]">{formData.employee_name}</strong> has been
                saved in the live database. You can now export the official replica PDF.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSavedModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSavedModal(false)
                  handleDownloadPDF()
                }}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-[#81F5F5] hover:bg-[#5ce1e6] text-[#001724] transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Download className="size-3.5" />
                <span>Export PDF Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

