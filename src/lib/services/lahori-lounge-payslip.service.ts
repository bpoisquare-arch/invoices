import { prisma } from '@/lib/prisma'

export interface LahoriLoungePayslip {
  id: string
  created_at: string
  updated_at?: string

  // Paid By (The Lahori Lounge default details)
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
  wages_ytd: number

  // Tax Table
  tax_description: string
  tax_amount: number
  tax_total: number
  tax_ytd: number

  // Superannuation Table (Optional)
  include_superannuation?: boolean
  superannuation_description?: string
  superannuation_amount?: number
  superannuation_total?: number
  superannuation_ytd?: number

  // Payment Details Table
  bank_account_masked: string
  account_name: string
  payment_reference: string
  payment_amount: number
}

export const DEFAULT_LAHORI_LOUNGE_PAID_BY = {
  paid_by_name: 'The Lahori Lounge Restaurant',
  paid_by_address_1: '34 Abernethy Rd',
  paid_by_address_2: 'BELMONT WA 6104',
  paid_by_abn: '50 683 299 461',
}

export const DEFAULT_LAHORI_LOUNGE_PAYSLIP: Omit<LahoriLoungePayslip, 'id' | 'created_at'> = {
  ...DEFAULT_LAHORI_LOUNGE_PAID_BY,
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
  wages_ytd: 4000.0,
  tax_description: 'PAYG',
  tax_amount: 928.0,
  tax_total: 928.0,
  tax_ytd: 928.0,
  include_superannuation: false,
  superannuation_description: 'SGC - HOSTPLUS Superannuation Fund - Industry - 102860122',
  superannuation_amount: 0.0,
  superannuation_total: 0.0,
  superannuation_ytd: 0.0,
  bank_account_masked: '(013-481)*****6474',
  account_name: 'Ubaid Raza',
  payment_reference: 'Lahori Lounge Pay',
  payment_amount: 3072.0,
}

const STORAGE_KEY = 'lahori_lounge_payslips_v1'

// Helper for formatting currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function fromDbRow(row: any): LahoriLoungePayslip {
  const hasSuper = Boolean(
    (row.includeSuperannuation ?? false) ||
    Number(row.superannuationAmount ?? row.superannuation_amount ?? 0) > 0 ||
    (row.superannuationDescription && row.superannuationDescription.trim() !== '') ||
    (row.superannuation_description && row.superannuation_description.trim() !== '')
  )

  const wagesTotal = Number(row.wagesTotal ?? row.wages_total ?? 0)
  const taxTotal = Number(row.taxTotal ?? row.tax_total ?? 0)
  const superTotal = Number(row.superannuationTotal ?? row.superannuation_total ?? row.superannuationAmount ?? 0)

  return {
    id: row.id,
    created_at: row.createdAt instanceof Date ? row.createdAt.toISOString() : (row.created_at || new Date().toISOString()),
    updated_at: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : (row.updated_at || new Date().toISOString()),
    paid_by_name: row.paidByName || row.paid_by_name || DEFAULT_LAHORI_LOUNGE_PAID_BY.paid_by_name,
    paid_by_address_1: row.paidByAddress1 || row.paid_by_address_1 || DEFAULT_LAHORI_LOUNGE_PAID_BY.paid_by_address_1,
    paid_by_address_2: row.paidByAddress2 || row.paid_by_address_2 || DEFAULT_LAHORI_LOUNGE_PAID_BY.paid_by_address_2,
    paid_by_abn: row.paidByAbn || row.paid_by_abn || DEFAULT_LAHORI_LOUNGE_PAID_BY.paid_by_abn,
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
    wages_total: wagesTotal,
    wages_ytd: Number(row.wagesYtd ?? row.wages_ytd ?? wagesTotal),
    tax_description: row.taxDescription || row.tax_description || 'PAYG',
    tax_amount: Number(row.taxAmount ?? row.tax_amount ?? 0),
    tax_total: taxTotal,
    tax_ytd: Number(row.taxYtd ?? row.tax_ytd ?? taxTotal),
    include_superannuation: hasSuper,
    superannuation_description:
      row.superannuationDescription || row.superannuation_description || 'SGC - HOSTPLUS Superannuation Fund - Industry - 102860122',
    superannuation_amount: Number(row.superannuationAmount ?? row.superannuation_amount ?? 0),
    superannuation_total: superTotal,
    superannuation_ytd: Number(row.superannuationYtd ?? row.superannuation_ytd ?? superTotal),
    bank_account_masked: row.bankAccountMasked || row.bank_account_masked || '',
    account_name: row.accountName || row.account_name || '',
    payment_reference: row.paymentReference || row.payment_reference || 'Lahori Lounge Pay',
    payment_amount: Number(row.paymentAmount ?? row.payment_amount ?? 0),
  }
}

// Local storage fallback helpers
function getLocalPayslips(): LahoriLoungePayslip[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch (e) {
    return []
  }
}

function saveLocalPayslips(items: LahoriLoungePayslip[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch (e) {
    // Ignore
  }
}

export const lahoriLoungePayslipService = {
  async getAll(): Promise<LahoriLoungePayslip[]> {
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/lahori-lounge-payslips')
        if (res.ok) {
          const data = await res.json()
          const mapped = data.map(fromDbRow)
          saveLocalPayslips(mapped)
          return mapped
        }
      } catch (e) {
        console.warn('API fetch failed for Lahori Lounge payslips, using local storage fallback:', e)
      }
      return getLocalPayslips()
    }

    try {
      const rows: any = await prisma.$queryRawUnsafe(
        'SELECT * FROM lahori_lounge_payslips ORDER BY created_at DESC'
      )
      return (rows || []).map(fromDbRow)
    } catch (e) {
      console.error('Database fetch failed for Lahori Lounge payslips:', e)
      return []
    }
  },

  async getById(id: string): Promise<LahoriLoungePayslip | null> {
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch(`/api/lahori-lounge-payslips?id=${id}`)
        if (res.ok) {
          const data = await res.json()
          return fromDbRow(data)
        }
      } catch (e) {
        console.warn('API fetch failed for Lahori Lounge payslip, trying local storage:', e)
      }
      const list = getLocalPayslips()
      return list.find((p) => p.id === id) || null
    }

    try {
      const rows: any = await prisma.$queryRawUnsafe(
        'SELECT * FROM lahori_lounge_payslips WHERE id = ? LIMIT 1',
        id
      )
      return rows && rows.length > 0 ? fromDbRow(rows[0]) : null
    } catch (e) {
      console.error('Database getById failed for Lahori Lounge payslip:', e)
      return null
    }
  },

  /**
   * Helper to automatically calculate cumulative YTD from previous record(s)
   * Automatically picks up previous database record and adds current pay
   */
  async calculateYTD(
    employeeName: string,
    currentWages: number,
    currentTax: number,
    currentSuper: number,
    excludeId?: string
  ): Promise<{ wagesYtd: number; taxYtd: number; superYtd: number; pastCount: number }> {
    try {
      const all = await this.getAll()
      const normalizedName = (employeeName || '').trim().toLowerCase()

      // Exclude current payslip if editing
      const allPast = all
        .filter((p) => !excludeId || p.id !== excludeId)
        .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime())

      if (allPast.length === 0) {
        return { wagesYtd: currentWages, taxYtd: currentTax, superYtd: currentSuper, pastCount: 0 }
      }

      // Check if employee-specific past records exist, otherwise fallback to all past records
      const employeePast = normalizedName
        ? allPast.filter((p) => p.employee_name && p.employee_name.trim().toLowerCase() === normalizedName)
        : []

      const targetPast = employeePast.length > 0 ? employeePast : allPast

      // Latest previous payslip:
      const latest = targetPast[targetPast.length - 1]

      // If the latest payslip has a valid YTD, add current pay to it:
      // Otherwise, sum all past pay wages + current pay:
      const baseWages = Number(latest.wages_ytd ?? 0) > 0
        ? Number(latest.wages_ytd)
        : targetPast.reduce((acc, p) => acc + Number(p.wages_total || p.wages_amount || 0), 0)

      const baseTax = Number(latest.tax_ytd ?? 0) > 0
        ? Number(latest.tax_ytd)
        : targetPast.reduce((acc, p) => acc + Number(p.tax_total || p.tax_amount || 0), 0)

      const baseSuper = Number(latest.superannuation_ytd ?? 0) > 0
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
      }
    } catch (err) {
      console.error('Failed to calculate YTD from past records:', err)
      return { wagesYtd: currentWages, taxYtd: currentTax, superYtd: currentSuper, pastCount: 0 }
    }
  },

  async save(payload: Omit<LahoriLoungePayslip, 'created_at'> & { id?: string; created_at?: string }): Promise<{ success: boolean; data?: LahoriLoungePayslip; error?: string }> {
    const payslipId = payload.id || `lahori_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const nowStr = new Date().toISOString()

    const wagesTotal = Number(payload.wages_total || payload.total_earnings || 0)
    const taxTotal = Number(payload.tax_total || payload.tax_amount || 0)
    const superTotal = Number(payload.superannuation_total || payload.superannuation_amount || 0)

    const payslip: LahoriLoungePayslip = {
      ...payload,
      id: payslipId,
      created_at: payload.created_at || nowStr,
      updated_at: nowStr,
      show_annual_salary: payload.show_annual_salary ?? true,
      include_superannuation: payload.include_superannuation ?? false,
      superannuation_description: payload.superannuation_description || '',
      superannuation_amount: Number(payload.superannuation_amount || 0),
      superannuation_total: superTotal,
      wages_ytd: payload.wages_ytd !== undefined ? Number(payload.wages_ytd) : wagesTotal,
      tax_ytd: payload.tax_ytd !== undefined ? Number(payload.tax_ytd) : taxTotal,
      superannuation_ytd: payload.superannuation_ytd !== undefined ? Number(payload.superannuation_ytd) : superTotal,
    }

    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/lahori-lounge-payslips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payslip),
        })
        if (res.ok) {
          const savedDb = await res.json()
          const mapped = fromDbRow(savedDb)
          const current = getLocalPayslips().filter((p) => p.id !== payslipId)
          saveLocalPayslips([mapped, ...current])
          return { success: true, data: mapped }
        }
        const errJson = await res.json()
        return { success: false, error: errJson.error || 'Failed to save payslip' }
      } catch (e: any) {
        console.warn('API save failed for Lahori Lounge payslip, falling back to local storage:', e)
        const current = getLocalPayslips().filter((p) => p.id !== payslipId)
        saveLocalPayslips([payslip, ...current])
        return { success: true, data: payslip }
      }
    }

    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO lahori_lounge_payslips (
          id, paid_by_name, paid_by_address_1, paid_by_address_2, paid_by_abn,
          employee_name, address_line_1, address_line_2, pay_frequency, annual_salary,
          employment_basis, pay_period_start, pay_period_end, payment_date,
          total_earnings, net_pay, wages_description, ordinary_hours, hourly_rate,
          wages_amount, wages_total, wages_ytd, tax_description, tax_amount,
          tax_total, tax_ytd, include_superannuation, superannuation_description,
          superannuation_amount, superannuation_total, superannuation_ytd,
          bank_account_masked, account_name, payment_reference, payment_amount,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?,
          NOW(), NOW()
        )
        ON DUPLICATE KEY UPDATE
          paid_by_name = VALUES(paid_by_name),
          paid_by_address_1 = VALUES(paid_by_address_1),
          paid_by_address_2 = VALUES(paid_by_address_2),
          paid_by_abn = VALUES(paid_by_abn),
          employee_name = VALUES(employee_name),
          address_line_1 = VALUES(address_line_1),
          address_line_2 = VALUES(address_line_2),
          pay_frequency = VALUES(pay_frequency),
          annual_salary = VALUES(annual_salary),
          employment_basis = VALUES(employment_basis),
          pay_period_start = VALUES(pay_period_start),
          pay_period_end = VALUES(pay_period_end),
          payment_date = VALUES(payment_date),
          total_earnings = VALUES(total_earnings),
          net_pay = VALUES(net_pay),
          wages_description = VALUES(wages_description),
          ordinary_hours = VALUES(ordinary_hours),
          hourly_rate = VALUES(hourly_rate),
          wages_amount = VALUES(wages_amount),
          wages_total = VALUES(wages_total),
          wages_ytd = VALUES(wages_ytd),
          tax_description = VALUES(tax_description),
          tax_amount = VALUES(tax_amount),
          tax_total = VALUES(tax_total),
          tax_ytd = VALUES(tax_ytd),
          include_superannuation = VALUES(include_superannuation),
          superannuation_description = VALUES(superannuation_description),
          superannuation_amount = VALUES(superannuation_amount),
          superannuation_total = VALUES(superannuation_total),
          superannuation_ytd = VALUES(superannuation_ytd),
          bank_account_masked = VALUES(bank_account_masked),
          account_name = VALUES(account_name),
          payment_reference = VALUES(payment_reference),
          payment_amount = VALUES(payment_amount),
          updated_at = NOW()`,
        payslipId,
        payslip.paid_by_name,
        payslip.paid_by_address_1,
        payslip.paid_by_address_2,
        payslip.paid_by_abn,
        payslip.employee_name,
        payslip.address_line_1,
        payslip.address_line_2,
        payslip.pay_frequency,
        payslip.show_annual_salary ? payslip.annual_salary : 0,
        payslip.employment_basis,
        payslip.pay_period_start,
        payslip.pay_period_end,
        payslip.payment_date,
        payslip.total_earnings,
        payslip.net_pay,
        payslip.wages_description,
        payslip.ordinary_hours,
        payslip.hourly_rate,
        payslip.wages_amount,
        wagesTotal,
        payslip.wages_ytd,
        payslip.tax_description,
        payslip.tax_amount,
        taxTotal,
        payslip.tax_ytd,
        payslip.include_superannuation ? 1 : 0,
        payslip.superannuation_description || '',
        payslip.superannuation_amount || 0,
        superTotal,
        payslip.superannuation_ytd || 0,
        payslip.bank_account_masked,
        payslip.account_name,
        payslip.payment_reference,
        payslip.payment_amount
      )
      const rows: any = await prisma.$queryRawUnsafe(
        'SELECT * FROM lahori_lounge_payslips WHERE id = ? LIMIT 1',
        payslipId
      )
      return { success: true, data: fromDbRow(rows[0]) }
    } catch (e: any) {
      console.error('Database save failed for Lahori Lounge payslip:', e)
      return { success: false, error: e?.message || 'Database error' }
    }
  },

  async delete(id: string): Promise<{ success: boolean; error?: string }> {
    const locals = getLocalPayslips()
    const filtered = locals.filter((p) => p.id !== id)
    saveLocalPayslips(filtered)

    if (typeof window !== 'undefined') {
      try {
        const res = await fetch(`/api/lahori-lounge-payslips?id=${id}`, {
          method: 'DELETE',
        })
        if (res.ok) {
          return { success: true }
        }
        const errJson = await res.json()
        return { success: false, error: errJson.error || 'Failed to delete' }
      } catch (e: any) {
        return { success: true }
      }
    }

    try {
      await prisma.$executeRawUnsafe('DELETE FROM lahori_lounge_payslips WHERE id = ?', id)
      return { success: true }
    } catch (e: any) {
      console.error('Database delete failed for Lahori Lounge payslip:', e)
      return { success: false, error: e?.message || 'Database delete error' }
    }
  },
}
