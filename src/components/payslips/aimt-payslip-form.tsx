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
  Briefcase,
  Check,
  Calculator,
  RefreshCw,
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

// Helper to calculate End Date based on Pay Frequency
function calculatePeriodEnd(startIso: string, frequency: string): string {
  if (!startIso) return ''
  try {
    const [y, m, d] = startIso.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    if (frequency === 'Weekly') {
      date.setDate(date.getDate() + 6)
    } else if (frequency === 'Monthly') {
      // Add 1 month and minus 1 day
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
  savedList: AIMTPayslip[],
  currentId?: string
): YtdCalculationResult {
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

  // 2. If employee-specific records found use them, otherwise use the previous database record
  const targetPast = employeePast.length > 0 ? employeePast : allPast
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
          (acc, p) => acc + Number(p.superannuation_total || p.superannuation_amount || 0),
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

  const [hasSaved, setHasSaved] = useState<boolean>(Boolean(isEditing && initialData?.id))
  const [showSavedModal, setShowSavedModal] = useState<boolean>(false)

  // Cumulative Year-To-Date (YTD) states
  const [savedPayslips, setSavedPayslips] = useState<AIMTPayslip[]>([])
  const [calculatingYtd, setCalculatingYtd] = useState<boolean>(false)
  const [ytdCalculationMsg, setYtdCalculationMsg] = useState<string>('')
  const [pastCount, setPastCount] = useState<number>(0)
  const [baseHistory, setBaseHistory] = useState<{
    baseWages: number
    baseTax: number
    baseSuper: number
    lastDate?: string
  } | null>(null)
  const [isManualWagesYtd, setIsManualWagesYtd] = useState<boolean>(
    Boolean(initialData?.wages_ytd && initialData.wages_ytd > 0 && isEditing)
  )
  const [isManualTaxYtd, setIsManualTaxYtd] = useState<boolean>(
    Boolean(initialData?.tax_ytd && initialData.tax_ytd > 0 && isEditing)
  )
  const [isManualSuperYtd, setIsManualSuperYtd] = useState<boolean>(
    Boolean(initialData?.superannuation_ytd && initialData.superannuation_ytd > 0 && isEditing)
  )

  // Pre-load past payslips to compute cumulative YTD
  useEffect(() => {
    let isMounted = true
    aimtPayslipService.getAll().then((list) => {
      if (!isMounted) return
      const validList = list || []
      setSavedPayslips(validList)

      const res = computeCumulativeYtdFromList(
        formData.employee_name || '',
        formData.wages_total || 0,
        formData.tax_amount || 0,
        formData.superannuation_amount || 0,
        validList,
        formData.id
      )
      setPastCount(res.pastCount)
      setBaseHistory({
        baseWages: res.baseWages,
        baseTax: res.baseTax,
        baseSuper: res.baseSuper,
        lastDate: res.lastPaymentDate,
      })

      if (formData.include_ytd && !isEditing) {
        setFormData((prev) => ({
          ...prev,
          wages_ytd: prev.wages_ytd ?? res.wagesYtd,
          tax_ytd: prev.tax_ytd ?? res.taxYtd,
          superannuation_ytd: prev.superannuation_ytd ?? res.superYtd,
        }))
      }
    })
    return () => {
      isMounted = false
    }
  }, [])

  // Toggle YTD on/off
  const handleYtdToggle = (enabled: boolean) => {
    if (enabled) {
      const res = computeCumulativeYtdFromList(
        formData.employee_name || '',
        formData.wages_total || 0,
        formData.tax_amount || 0,
        formData.superannuation_amount || 0,
        savedPayslips,
        formData.id
      )
      setPastCount(res.pastCount)
      setBaseHistory({
        baseWages: res.baseWages,
        baseTax: res.baseTax,
        baseSuper: res.baseSuper,
        lastDate: res.lastPaymentDate,
      })
      setFormData((prev) => ({
        ...prev,
        include_ytd: true,
        wages_ytd: isManualWagesYtd && prev.wages_ytd ? prev.wages_ytd : res.wagesYtd,
        tax_ytd: isManualTaxYtd && prev.tax_ytd ? prev.tax_ytd : res.taxYtd,
        superannuation_ytd:
          isManualSuperYtd && prev.superannuation_ytd ? prev.superannuation_ytd : res.superYtd,
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        include_ytd: false,
      }))
    }
  }

  // Recalculate YTD from database history
  const handleCalculateYtdFromHistory = async () => {
    setCalculatingYtd(true)
    setYtdCalculationMsg('')
    try {
      const list = await aimtPayslipService.getAll()
      const validList = list || []
      setSavedPayslips(validList)
      const res = computeCumulativeYtdFromList(
        formData.employee_name || '',
        formData.wages_total || 0,
        formData.tax_amount || 0,
        formData.superannuation_amount || 0,
        validList,
        formData.id
      )
      setPastCount(res.pastCount)
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
      setIsManualWagesYtd(false)
      setIsManualTaxYtd(false)
      setIsManualSuperYtd(false)
      setYtdCalculationMsg(
        res.pastCount > 0
          ? `Successfully recalculated YTD using ${res.pastCount} previous record(s)!`
          : 'No prior records found; YTD set equal to current pay.'
      )
      setTimeout(() => setYtdCalculationMsg(''), 4000)
    } catch (err) {
      console.error('Failed to recalculate YTD:', err)
    } finally {
      setCalculatingYtd(false)
    }
  }

  // Reset a specific manual field back to auto-calculation
  const resetFieldToAuto = (field: 'wages' | 'tax' | 'super') => {
    const res = computeCumulativeYtdFromList(
      formData.employee_name || '',
      formData.wages_total || 0,
      formData.tax_amount || 0,
      formData.superannuation_amount || 0,
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

  const resetAllYtdToAuto = () => {
    handleCalculateYtdFromHistory()
  }

  // Auto-calculation handler for hours and rate
  const handleHoursRateChange = (hours: number, rate: number) => {
    const calcWages = Math.round(hours * rate * 100) / 100
    const calcAnnual = calculateAnnualSalary(calcWages, formData.pay_frequency || 'Fortnightly')
    const calcNet = Math.max(0, Math.round((calcWages - formData.tax_amount) * 100) / 100)

    setFormData((prev) => {
      const nextWagesYtd =
        prev.include_ytd && !isManualWagesYtd
          ? Math.round(((baseHistory?.baseWages || 0) + calcWages) * 100) / 100
          : prev.wages_ytd

      return {
        ...prev,
        ordinary_hours: hours,
        hourly_rate: rate,
        wages_amount: calcWages,
        wages_total: calcWages,
        total_earnings: calcWages,
        annual_salary: prev.show_annual_salary !== false ? calcAnnual : prev.annual_salary,
        net_pay: calcNet,
        payment_amount: calcNet,
        wages_ytd: nextWagesYtd,
      }
    })
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

    setFormData((prev) => {
      const nextTaxYtd =
        prev.include_ytd && !isManualTaxYtd
          ? Math.round(((baseHistory?.baseTax || 0) + tax) * 100) / 100
          : prev.tax_ytd

      return {
        ...prev,
        tax_amount: tax,
        tax_total: tax,
        net_pay: calcNet,
        payment_amount: calcNet,
        tax_ytd: nextTaxYtd,
      }
    })
  }

  const handleSuperannuationToggle = (enabled: boolean) => {
    const defaultDesc =
      formData.superannuation_description ||
      'SGC - HOSTPLUS Superannuation Fund - Industry - 102860122'

    setFormData((prev) => ({
      ...prev,
      include_superannuation: enabled,
      superannuation_description: defaultDesc,
    }))
  }

  const handleSuperannuationAmountChange = (amount: number) => {
    setFormData((prev) => {
      const nextSuperYtd =
        prev.include_ytd && !isManualSuperYtd
          ? Math.round(((baseHistory?.baseSuper || 0) + amount) * 100) / 100
          : prev.superannuation_ytd

      return {
        ...prev,
        superannuation_amount: amount,
        superannuation_total: amount,
        superannuation_ytd: nextSuperYtd,
      }
    })
  }

  const handleSuperannuationDescriptionChange = (desc: string) => {
    setFormData((prev) => ({
      ...prev,
      superannuation_description: desc,
    }))
  }

  const handleEmployeeNameChange = (name: string) => {
    setFormData((prev) => {
      let nextWagesYtd = prev.wages_ytd
      let nextTaxYtd = prev.tax_ytd
      let nextSuperYtd = prev.superannuation_ytd

      if (prev.include_ytd && savedPayslips.length > 0) {
        const res = computeCumulativeYtdFromList(
          name,
          prev.wages_total || 0,
          prev.tax_amount || 0,
          prev.superannuation_amount || 0,
          savedPayslips,
          prev.id
        )
        setPastCount(res.pastCount)
        setBaseHistory({
          baseWages: res.baseWages,
          baseTax: res.baseTax,
          baseSuper: res.baseSuper,
          lastDate: res.lastPaymentDate,
        })
        if (!isManualWagesYtd) nextWagesYtd = res.wagesYtd
        if (!isManualTaxYtd) nextTaxYtd = res.taxYtd
        if (!isManualSuperYtd) nextSuperYtd = res.superYtd
      }

      return {
        ...prev,
        employee_name: name,
        account_name: name,
        wages_ytd: nextWagesYtd,
        tax_ytd: nextTaxYtd,
        superannuation_ytd: nextSuperYtd,
      }
    })
  }

  async function handleSave() {
    setSaving(true)
    setSaveSuccess(false)
    try {
      const res = await aimtPayslipService.save(formData)
      if (res.success && res.data) {
        setFormData(res.data)
        setHasSaved(true)
        setSaveSuccess(true)
        setShowSavedModal(true)
        if (!isEditing && typeof window !== 'undefined') {
          window.history.replaceState(null, '', `/payslips/${res.data.id}/edit`)
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

  const showAnnual = formData.show_annual_salary !== false

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
              {isEditing || hasSaved ? 'Edit AIMT Payslip' : 'Generate AIMT Payslip'}
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
            <span>{saving ? 'Saving...' : hasSaved ? 'Save Changes' : 'Save Payslip'}</span>
          </button>

          {/* Download PDF button appears ONLY after saving or when editing an existing saved payslip */}
          {hasSaved && (
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-[#81F5F5] hover:bg-[#6be0e0] text-[#002020] rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 animate-in fade-in duration-200"
            >
              <Download className="size-4 text-[#002020]" />
              <span>{downloading ? 'Exporting...' : 'Download PDF'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Banner with Download PDF quick action */}
      {saveSuccess && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm font-medium animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="size-5 shrink-0 text-emerald-400" />
            <span>
              Payslip saved successfully! You can download the PDF or find it in All Payslips.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#81F5F5] hover:bg-[#6be0e0] text-[#002020] font-bold rounded-lg text-xs transition-all cursor-pointer shadow"
            >
              <Download className="size-3.5" />
              <span>{downloading ? 'Exporting...' : 'Download PDF'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Post-Save Success & Download PDF Modal */}
      {showSavedModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#001E2F] border border-[#81F5F5]/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-200">
            <div className="size-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="size-9" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white font-['Montserrat']">
                Payslip Saved Successfully!
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                The payslip for <span className="text-[#81F5F5] font-semibold">{formData.employee_name || 'Employee'}</span> has been saved to the database.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  handleDownloadPDF()
                }}
                disabled={downloading}
                className="w-full flex items-center justify-center gap-2.5 px-5 py-3 bg-[#81F5F5] hover:bg-[#6be0e0] text-[#002020] rounded-xl text-sm font-bold transition-all shadow-lg cursor-pointer disabled:opacity-50"
              >
                <Download className="size-5 text-[#002020]" />
                <span>{downloading ? 'Exporting PDF...' : 'Download PDF Now'}</span>
              </button>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowSavedModal(false)}
                  className="w-full py-2.5 px-3 bg-white/10 hover:bg-white/15 text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Continue Editing
                </button>
                <Link
                  href="/payslips"
                  className="w-full py-2.5 px-3 bg-[#0E3E5B] hover:bg-[#15537a] text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center cursor-pointer"
                >
                  All Payslips
                </Link>
              </div>
            </div>
          </div>
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

          {/* Card: Cumulative Year-To-Date (YTD) Optional Setup */}
          <div className="bg-[#001E2F] border border-white/10 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
              <div className="flex items-center gap-2 text-[#81F5F5] font-semibold text-sm">
                <Calculator className="size-4" />
                <span>Cumulative Year-To-Date (YTD)</span>
              </div>
              <span className="text-[10px] text-slate-400">Optional</span>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={Boolean(formData.include_ytd)}
                  onChange={(e) => handleYtdToggle(e.target.checked)}
                  className="size-4 rounded bg-[#001724] border-white/20 text-[#81F5F5] focus:ring-[#81F5F5]/40 cursor-pointer"
                />
                <span>Include Cumulative YTD on Payslip</span>
              </label>

              {formData.include_ytd && (
                <div className="pt-2 border-t border-white/10 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                        pastCount > 0
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-700/50 text-slate-300 border border-white/10'
                      }`}
                    >
                      {pastCount > 0 ? `${pastCount} Past Record(s) in DB` : 'Initial Record (No History)'}
                    </span>
                    {(isManualWagesYtd || isManualTaxYtd || isManualSuperYtd) && (
                      <span className="text-[10px] text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                        Manual Override Active
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {pastCount > 0 ? (
                      <span>
                        Auto-accumulating: <strong className="text-[#81F5F5]">Previous Base YTD + This Pay</strong>. You can click &quot;Recalculate&quot; to pull fresh history or override any field below.
                      </span>
                    ) : (
                      <span>
                        Initial record. YTD equals this pay. You can also manually type custom cumulative starting values below.
                      </span>
                    )}
                  </p>

                  {baseHistory && pastCount > 0 && (
                    <div className="bg-[#001724] border border-white/15 rounded-xl p-3 text-[11px] space-y-1">
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

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCalculateYtdFromHistory}
                      disabled={calculatingYtd}
                      className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-[#003D5C] hover:bg-[#0E3E5B] text-[#81F5F5] border border-[#81F5F5]/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
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
              )}
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

            {/* Optional Wages YTD Input */}
            {formData.include_ytd && (
              <div className="pt-1">
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span>Wages YTD ($)</span>
                    {isManualWagesYtd ? (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 font-medium">
                        Manual Override
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
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">$</span>
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
                    className={`w-full bg-[#001724] border rounded-xl pl-7 pr-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#81F5F5]/50 ${
                      isManualWagesYtd ? 'border-amber-500/60' : 'border-white/20'
                    }`}
                  />
                </div>
              </div>
            )}

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
                    const calcNet = Math.max(0, Math.round((val - formData.tax_amount) * 100) / 100)
                    setFormData((prev) => ({
                      ...prev,
                      total_earnings: val,
                      wages_amount: val,
                      wages_total: val,
                      annual_salary: prev.show_annual_salary !== false ? calcAnnual : prev.annual_salary,
                      net_pay: calcNet,
                      payment_amount: calcNet,
                      wages_ytd:
                        prev.include_ytd && !isManualWagesYtd
                          ? Math.round(((baseHistory?.baseWages || 0) + val) * 100) / 100
                          : prev.wages_ytd,
                    }))
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

            {/* Optional Tax YTD Input */}
            {formData.include_ytd && (
              <div className="pt-1">
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span>Tax YTD ($)</span>
                    {isManualTaxYtd ? (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 font-medium">
                        Manual Override
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
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">$</span>
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
                    placeholder="e.g. 4316.00"
                    className={`w-full bg-[#001724] border rounded-xl pl-7 pr-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#81F5F5]/50 ${
                      isManualTaxYtd ? 'border-amber-500/60' : 'border-white/20'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* Superannuation Section (Optional Toggle + Description + Amount) */}
            <div className="pt-2 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.include_superannuation)}
                    onChange={(e) => handleSuperannuationToggle(e.target.checked)}
                    className="size-4 rounded border-white/20 bg-[#001724] text-[#81F5F5] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <span>Include Superannuation</span>
                </label>
                <span className="text-[10px] text-slate-400">Optional</span>
              </div>

              {formData.include_superannuation && (
                <div className="space-y-3 pl-6 animate-in fade-in">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Superannuation Fund / Description
                    </label>
                    <input
                      type="text"
                      value={formData.superannuation_description ?? 'SGC - HOSTPLUS Superannuation Fund - Industry - 102860122'}
                      onChange={(e) => handleSuperannuationDescriptionChange(e.target.value)}
                      placeholder="e.g. SGC - HOSTPLUS Superannuation Fund - Industry - 102860122"
                      className="w-full bg-[#001724] border border-white/20 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#81F5F5]/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Superannuation Amount ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.superannuation_amount || ''}
                      onChange={(e) => handleSuperannuationAmountChange(parseFloat(e.target.value) || 0)}
                      placeholder="e.g. 369.23"
                      className="w-full bg-[#001724] border border-white/20 rounded-xl px-3 py-2 text-sm text-white font-bold text-sky-400 focus:outline-none focus:ring-2 focus:ring-[#81F5F5]/50"
                    />
                    <div className="text-[10px] text-slate-400 mt-1">
                      Superannuation is an employer contribution and only appears on the payslip without deducting from Net Pay.
                    </div>
                  </div>

                  {/* Optional Superannuation YTD Input */}
                  {formData.include_ytd && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span>Superannuation YTD ($)</span>
                          {isManualSuperYtd ? (
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 font-medium">
                              Manual Override
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
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">$</span>
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
                          placeholder="e.g. 2150.00"
                          className={`w-full bg-[#001724] border rounded-xl pl-7 pr-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#81F5F5]/50 ${
                            isManualSuperYtd ? 'border-amber-500/60' : 'border-white/20'
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
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

          {/* Card 6: Fixed / Template Details (Pre-filled items) */}
          <details className="bg-[#001E2F] border border-white/10 rounded-2xl p-4 shadow-lg text-xs group">
            <summary className="font-semibold text-slate-300 cursor-pointer flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400">
                <Building className="size-4 text-[#81F5F5]" />
                <span>Template & Paid By Info (Fixed Items)</span>
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
            <AIMTPayslipWebPreview payslip={formData} />
          </div>
        </div>
      </div>
    </div>
  )
}
