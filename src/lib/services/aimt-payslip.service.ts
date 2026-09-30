import { prisma } from '@/lib/prisma'

export interface AIMTPayslip {
  id: string
  created_at: string
  updated_at?: string

  // Paid By (AIMT default details)
  paid_by_name: string
  paid_by_address_1: string
  paid_by_address_2: string
  paid_by_abn: string

  // Employee Details (Manual Input)
  employee_name: string
  address_line_1: string
  address_line_2: string

  // Employment Details
  pay_frequency: string
  show_annual_salary?: boolean
  annual_salary: number
  employment_basis: string

  // Pay Summary Bar
  pay_period_start: string // formatted DD/MM/YYYY or YYYY-MM-DD
  pay_period_end: string
  payment_date: string
  total_earnings: number
  net_pay: number

  // Salary & Wages Table
  wages_description: string
  ordinary_hours: number
  hourly_rate: number
  wages_amount: number
  wages_total: number

  // Tax Table
  tax_description: string
  tax_amount: number
  tax_total: number

  // Superannuation Table (Optional)
  include_superannuation?: boolean
  superannuation_description?: string
  superannuation_amount?: number
  superannuation_total?: number

  // Payment Details Table
  bank_account_masked: string
  account_name: string
  payment_reference: string
  payment_amount: number
}

export const DEFAULT_AIMT_PAID_BY = {
  paid_by_name: 'Australian Institute of Management and Technology',
  paid_by_address_1: '84 Buckley Street',
  paid_by_address_2: 'Footscray VIC 3011',
  paid_by_abn: '85 136 626 956',
}

export const DEFAULT_AIMT_PAYSLIP: Omit<AIMTPayslip, 'id' | 'created_at'> = {
  ...DEFAULT_AIMT_PAID_BY,
  employee_name: 'Ubaid Raza',
  address_line_1: '18 Petros St',
  address_line_2: 'Fraser Rise VIC 3336',
  pay_frequency: 'Fortnightly',
  show_annual_salary: true,
  annual_salary: 104000.0,
  employment_basis: 'Full-time employment',
  pay_period_start: '01/04/2025',
  pay_period_end: '14/04/2025',
  payment_date: '05/05/2025',
  total_earnings: 4000.0,
  net_pay: 3072.0,
  wages_description: 'Ordinary Hours',
  ordinary_hours: 76.0,
  hourly_rate: 52.6316,
  wages_amount: 4000.0,
  wages_total: 4000.0,
  tax_description: 'PAYG',
  tax_amount: 928.0,
  tax_total: 928.0,
  include_superannuation: false,
  superannuation_description: 'SGC - HOSTPLUS Superannuation Fund - Industry - 102860122',
  superannuation_amount: 0.0,
  superannuation_total: 0.0,
  bank_account_masked: '(013-481)*****6474',
  account_name: 'Ubaid Raza',
  payment_reference: 'AIMT Pay',
  payment_amount: 3072.0,
}

const STORAGE_KEY = 'aimt_payslips_v1'

// Helper for formatting currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function fromDbRow(row: any): AIMTPayslip {
  const hasSuper = Boolean(
    Number(row.superannuationAmount ?? row.superannuation_amount ?? 0) > 0 ||
    (row.superannuationDescription && row.superannuationDescription.trim() !== '') ||
    (row.superannuation_description && row.superannuation_description.trim() !== '')
  )

  return {
    id: row.id,
    created_at: row.createdAt instanceof Date ? row.createdAt.toISOString() : (row.created_at || new Date().toISOString()),
    updated_at: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : (row.updated_at || new Date().toISOString()),
    paid_by_name: row.paidByName || row.paid_by_name || 'Australian Institute of Management and Technology',
    paid_by_address_1: row.paidByAddress1 || row.paid_by_address_1 || '84 Buckley Street',
    paid_by_address_2: row.paidByAddress2 || row.paid_by_address_2 || 'Footscray VIC 3011',
    paid_by_abn: row.paidByAbn || row.paid_by_abn || '85 136 626 956',
    employee_name: row.employeeName || row.employee_name || '',
    address_line_1: row.addressLine1 || row.address_line_1 || '',
    address_line_2: row.addressLine2 || row.address_line_2 || '',
    pay_frequency: row.payFrequency || row.pay_frequency || 'Fortnightly',
    show_annual_salary: Number(row.annualSalary ?? row.annual_salary ?? 0) > 0,
    annual_salary: Number(row.annualSalary ?? row.annual_salary ?? 0),
    employment_basis: row.employmentBasis || row.employment_basis || 'Full-time employment',
    pay_period_start: row.payPeriodStart || row.pay_period_start || '',
    pay_period_end: row.payPeriodEnd || row.pay_period_end || '',
    payment_date: row.paymentDate || row.payment_date || '',
    total_earnings: Number(row.totalEarnings ?? row.total_earnings ?? 0),
    net_pay: Number(row.netPay ?? row.net_pay ?? 0),
    wages_description: row.wagesDescription || row.wages_description || 'Ordinary Hours',
    ordinary_hours: Number(row.ordinaryHours ?? row.ordinary_hours ?? 0),
    hourly_rate: Number(row.hourlyRate ?? row.hourly_rate ?? 0),
    wages_amount: Number(row.wagesAmount ?? row.wages_amount ?? 0),
    wages_total: Number(row.wagesTotal ?? row.wages_total ?? 0),
    tax_description: row.taxDescription || row.tax_description || 'PAYG',
    tax_amount: Number(row.taxAmount ?? row.tax_amount ?? 0),
    tax_total: Number(row.taxTotal ?? row.tax_total ?? 0),
    include_superannuation: hasSuper,
    superannuation_description:
      row.superannuationDescription || row.superannuation_description || 'SGC - HOSTPLUS Superannuation Fund - Industry - 102860122',
    superannuation_amount: Number(row.superannuationAmount ?? row.superannuation_amount ?? 0),
    superannuation_total: Number(row.superannuationTotal ?? row.superannuation_total ?? row.superannuationAmount ?? 0),
    bank_account_masked: row.bankAccountMasked || row.bank_account_masked || '',
    account_name: row.accountName || row.account_name || '',
    payment_reference: row.paymentReference || row.payment_reference || 'AIMT Pay',
    payment_amount: Number(row.paymentAmount ?? row.payment_amount ?? 0),
  }
}

// Local storage fallback helpers
function getLocalPayslips(): AIMTPayslip[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch (e) {
    return []
  }
}

function saveLocalPayslips(items: AIMTPayslip[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch (e) {
    // Ignore
  }
}

export const aimtPayslipService = {
  async getAll(): Promise<AIMTPayslip[]> {
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/aimt-payslips')
        if (res.ok) {
          const data = await res.json()
          const mapped = data.map(fromDbRow)
          saveLocalPayslips(mapped)
          return mapped
        }
      } catch (e) {
        console.warn('API fetch failed for AIMT payslips, using local storage fallback:', e)
      }
      return getLocalPayslips()
    }

    try {
      const rows = await prisma.aimtPayslip.findMany({
        orderBy: { createdAt: 'desc' },
      })
      return rows.map(fromDbRow)
    } catch (e) {
      console.error('Prisma fetch failed for AIMT payslips:', e)
      return []
    }
  },

  async getById(id: string): Promise<AIMTPayslip | null> {
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch(`/api/aimt-payslips?id=${encodeURIComponent(id)}`)
        if (res.ok) {
          const data = await res.json()
          return fromDbRow(data)
        }
      } catch (e) {
        console.warn('API getById failed for AIMT payslip, using local storage fallback:', e)
      }
      const locals = getLocalPayslips()
      return locals.find((p) => p.id === id) || null
    }

    try {
      const row = await prisma.aimtPayslip.findUnique({ where: { id } })
      return row ? fromDbRow(row) : null
    } catch (e) {
      console.error('Prisma getById failed for AIMT payslip:', e)
      return null
    }
  },

  async save(
    payload: Omit<AIMTPayslip, 'id' | 'created_at'> & { id?: string }
  ): Promise<{ success: boolean; data?: AIMTPayslip; error?: string }> {
    const id = payload.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `aimt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`)
    const now = new Date().toISOString()

    const payslip: AIMTPayslip = {
      ...payload,
      id,
      created_at: now,
      updated_at: now,
    }

    // Always update local storage first for immediate response
    const locals = getLocalPayslips()
    const existingIndex = locals.findIndex((p) => p.id === id)
    if (existingIndex >= 0) {
      locals[existingIndex] = { ...locals[existingIndex], ...payslip }
    } else {
      locals.unshift(payslip)
    }
    saveLocalPayslips(locals)

    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/aimt-payslips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payslip),
        })
        if (res.ok) {
          const data = await res.json()
          return { success: true, data: fromDbRow(data) }
        }
        const errJson = await res.json()
        return { success: false, error: errJson.error || 'Failed to save payslip' }
      } catch (e: any) {
        return { success: true, data: payslip }
      }
    }

    try {
      const row = await prisma.aimtPayslip.upsert({
        where: { id },
        update: {
          paidByName: payload.paid_by_name || 'Australian Institute of Management and Technology',
          paidByAddress1: payload.paid_by_address_1 || '84 Buckley Street',
          paidByAddress2: payload.paid_by_address_2 || 'Footscray VIC 3011',
          paidByAbn: payload.paid_by_abn || '85 136 626 956',
          employeeName: payload.employee_name || '',
          addressLine1: payload.address_line_1 || '',
          addressLine2: payload.address_line_2 || '',
          payFrequency: payload.pay_frequency || 'Fortnightly',
          annualSalary: payload.show_annual_salary === false ? 0 : Number(payload.annual_salary || 0),
          employmentBasis: payload.employment_basis || 'Full-time employment',
          payPeriodStart: payload.pay_period_start || '',
          payPeriodEnd: payload.pay_period_end || '',
          paymentDate: payload.payment_date || '',
          totalEarnings: Number(payload.total_earnings || 0),
          netPay: Number(payload.net_pay || 0),
          wagesDescription: payload.wages_description || 'Ordinary Hours',
          ordinaryHours: Number(payload.ordinary_hours || 0),
          hourlyRate: Number(payload.hourly_rate || 0),
          wagesAmount: Number(payload.wages_amount || 0),
          wagesTotal: Number(payload.wages_total || 0),
          taxDescription: payload.tax_description || 'PAYG',
          taxAmount: Number(payload.tax_amount || 0),
          taxTotal: Number(payload.tax_total || 0),
          superannuationDescription: payload.superannuation_description || '',
          superannuationAmount: Number(payload.superannuation_amount || 0),
          superannuationTotal: Number(payload.superannuation_total || payload.superannuation_amount || 0),
          bankAccountMasked: payload.bank_account_masked || '',
          accountName: payload.account_name || '',
          paymentReference: payload.payment_reference || 'AIMT Pay',
          paymentAmount: Number(payload.payment_amount || 0),
        },
        create: {
          id,
          paidByName: payload.paid_by_name || 'Australian Institute of Management and Technology',
          paidByAddress1: payload.paid_by_address_1 || '84 Buckley Street',
          paidByAddress2: payload.paid_by_address_2 || 'Footscray VIC 3011',
          paidByAbn: payload.paid_by_abn || '85 136 626 956',
          employeeName: payload.employee_name || '',
          addressLine1: payload.address_line_1 || '',
          addressLine2: payload.address_line_2 || '',
          payFrequency: payload.pay_frequency || 'Fortnightly',
          annualSalary: payload.show_annual_salary === false ? 0 : Number(payload.annual_salary || 0),
          employmentBasis: payload.employment_basis || 'Full-time employment',
          payPeriodStart: payload.pay_period_start || '',
          payPeriodEnd: payload.pay_period_end || '',
          paymentDate: payload.payment_date || '',
          totalEarnings: Number(payload.total_earnings || 0),
          netPay: Number(payload.net_pay || 0),
          wagesDescription: payload.wages_description || 'Ordinary Hours',
          ordinaryHours: Number(payload.ordinary_hours || 0),
          hourlyRate: Number(payload.hourly_rate || 0),
          wagesAmount: Number(payload.wages_amount || 0),
          wagesTotal: Number(payload.wages_total || 0),
          taxDescription: payload.tax_description || 'PAYG',
          taxAmount: Number(payload.tax_amount || 0),
          taxTotal: Number(payload.tax_total || 0),
          superannuationDescription: payload.superannuation_description || '',
          superannuationAmount: Number(payload.superannuation_amount || 0),
          superannuationTotal: Number(payload.superannuation_total || payload.superannuation_amount || 0),
          bankAccountMasked: payload.bank_account_masked || '',
          accountName: payload.account_name || '',
          paymentReference: payload.payment_reference || 'AIMT Pay',
          paymentAmount: Number(payload.payment_amount || 0),
        },
      })
      return { success: true, data: fromDbRow(row) }
    } catch (e: any) {
      return { success: false, error: e?.message || 'Prisma error' }
    }
  },

  async delete(id: string): Promise<{ success: boolean; error?: string }> {
    const locals = getLocalPayslips()
    const filtered = locals.filter((p) => p.id !== id)
    saveLocalPayslips(filtered)

    if (typeof window !== 'undefined') {
      try {
        const res = await fetch(`/api/aimt-payslips?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
        })
        if (res.ok) {
          return { success: true }
        }
      } catch (e) {
        // Fallback to local delete
      }
      return { success: true }
    }

    try {
      await prisma.aimtPayslip.delete({ where: { id } })
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e?.message || 'Prisma error' }
    }
  },

  async syncLocalToCloud(): Promise<{ success: boolean; syncedCount: number; totalCount: number; error?: string }> {
    const locals = getLocalPayslips()
    if (locals.length === 0) {
      return { success: true, syncedCount: 0, totalCount: 0 }
    }

    try {
      let successCount = 0
      let lastError: string | null = null

      for (const payslip of locals) {
        const res = await this.save(payslip)
        if (res.success) {
          successCount++
        } else {
          lastError = res.error || 'Failed to sync'
        }
      }

      return {
        success: true,
        syncedCount: successCount,
        totalCount: locals.length,
        error: lastError || undefined,
      }
    } catch (e: any) {
      return {
        success: false,
        syncedCount: 0,
        totalCount: locals.length,
        error: e?.message || 'Failed to sync local payslips',
      }
    }
  },
}
