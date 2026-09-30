import { prisma } from '@/lib/prisma'

export interface EdlinkPayslip {
  id: string
  created_at: string
  updated_at?: string

  // Paid By (EdLink default details)
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

  // Payment Details Table
  bank_account_masked: string
  account_name: string
  payment_reference: string
  payment_amount: number
}

export const DEFAULT_EDLINK_PAID_BY = {
  paid_by_name: 'EdLink Education & Visa Services',
  paid_by_address_1: 'Suit 3, Level 4/20',
  paid_by_address_2: 'Collins Street, Melbourne 3000',
  paid_by_abn: '62 658 488 469',
}

export const DEFAULT_EDLINK_PAYSLIP: Omit<EdlinkPayslip, 'id' | 'created_at'> = {
  ...DEFAULT_EDLINK_PAID_BY,
  employee_name: 'Muhammad Usman',
  address_line_1: '12 Collins Street',
  address_line_2: 'Melbourne VIC 3000',
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
  bank_account_masked: '(063-000)*****5678',
  account_name: 'Muhammad Usman',
  payment_reference: 'EdLink Pay',
  payment_amount: 3072.0,
}

// Helper for formatting currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function fromDbRow(row: any): EdlinkPayslip {
  return {
    id: row.id,
    created_at: row.createdAt instanceof Date ? row.createdAt.toISOString() : (row.created_at || new Date().toISOString()),
    updated_at: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : (row.updated_at || new Date().toISOString()),
    paid_by_name: row.paidByName || row.paid_by_name || 'EdLink Education & Visa Services',
    paid_by_address_1: row.paidByAddress1 || row.paid_by_address_1 || 'Suit 3, Level 4/20',
    paid_by_address_2: row.paidByAddress2 || row.paid_by_address_2 || 'Collins Street, Melbourne 3000',
    paid_by_abn: row.paidByAbn || row.paid_by_abn || '62 658 488 469',
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
    bank_account_masked: row.bankAccountMasked || row.bank_account_masked || '',
    account_name: row.accountName || row.account_name || '',
    payment_reference: row.paymentReference || row.payment_reference || 'EdLink Pay',
    payment_amount: Number(row.paymentAmount ?? row.payment_amount ?? 0),
  }
}

export const edlinkPayslipService = {
  async getAll(): Promise<EdlinkPayslip[]> {
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/edlink-payslips')
        if (res.ok) {
          const data = await res.json()
          return data.map(fromDbRow)
        }
      } catch (e) {
        console.error('API fetch failed for edlink payslips:', e)
      }
      return []
    }

    try {
      const rows = await prisma.edlinkPayslip.findMany({
        orderBy: { createdAt: 'desc' },
      })
      return rows.map(fromDbRow)
    } catch (e) {
      console.error('Prisma fetch failed for edlink payslips:', e)
      return []
    }
  },

  async getById(id: string): Promise<EdlinkPayslip | null> {
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch(`/api/edlink-payslips?id=${encodeURIComponent(id)}`)
        if (res.ok) {
          const data = await res.json()
          return fromDbRow(data)
        }
      } catch (e) {
        console.error('API getById failed for edlink payslip:', e)
      }
      return null
    }

    try {
      const row = await prisma.edlinkPayslip.findUnique({ where: { id } })
      return row ? fromDbRow(row) : null
    } catch (e) {
      console.error('Prisma getById failed for edlink payslip:', e)
      return null
    }
  },

  async save(
    payload: Omit<EdlinkPayslip, 'id' | 'created_at'> & { id?: string }
  ): Promise<{ success: boolean; data?: EdlinkPayslip; error?: string }> {
    const id =
      payload.id && payload.id.trim() !== ''
        ? payload.id
        : typeof crypto !== 'undefined' && crypto.randomUUID
        ? `edlink_${crypto.randomUUID()}`
        : `edlink_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    const body = { ...payload, id }

    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/edlink-payslips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (res.ok) {
          const data = await res.json()
          return { success: true, data: fromDbRow(data) }
        }
        const errJson = await res.json()
        return { success: false, error: errJson.error || 'Failed to save payslip' }
      } catch (e: any) {
        return { success: false, error: e?.message || 'Network error' }
      }
    }

    try {
      const row = await prisma.edlinkPayslip.upsert({
        where: { id },
        update: {
          paidByName: payload.paid_by_name || 'EdLink Education & Visa Services',
          paidByAddress1: payload.paid_by_address_1 || 'Suit 3, Level 4/20',
          paidByAddress2: payload.paid_by_address_2 || 'Collins Street, Melbourne 3000',
          paidByAbn: payload.paid_by_abn || '62 658 488 469',
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
          bankAccountMasked: payload.bank_account_masked || '',
          accountName: payload.account_name || '',
          paymentReference: payload.payment_reference || 'EdLink Pay',
          paymentAmount: Number(payload.payment_amount || 0),
        },
        create: {
          id,
          paidByName: payload.paid_by_name || 'EdLink Education & Visa Services',
          paidByAddress1: payload.paid_by_address_1 || 'Suit 3, Level 4/20',
          paidByAddress2: payload.paid_by_address_2 || 'Collins Street, Melbourne 3000',
          paidByAbn: payload.paid_by_abn || '62 658 488 469',
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
          bankAccountMasked: payload.bank_account_masked || '',
          accountName: payload.account_name || '',
          paymentReference: payload.payment_reference || 'EdLink Pay',
          paymentAmount: Number(payload.payment_amount || 0),
        },
      })
      return { success: true, data: fromDbRow(row) }
    } catch (e: any) {
      return { success: false, error: e?.message || 'Prisma error' }
    }
  },

  async delete(id: string): Promise<{ success: boolean; error?: string }> {
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch(`/api/edlink-payslips?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
        })
        if (res.ok) {
          return { success: true }
        }
        const errJson = await res.json()
        return { success: false, error: errJson.error || 'Failed to delete payslip' }
      } catch (e: any) {
        return { success: false, error: e?.message || 'Network error' }
      }
    }

    try {
      await prisma.edlinkPayslip.delete({ where: { id } })
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e?.message || 'Prisma error' }
    }
  },

  subscribeToChanges(onUpdate: () => void) {
    // No-op for standard API fetching
    return () => {}
  },
}
