import { createClient } from '@/lib/supabase/client'

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

/**
 * Sanitize frontend payload to match exact database columns
 */
function toDbPayload(payslip: AIMTPayslip) {
  return {
    id: payslip.id,
    paid_by_name: payslip.paid_by_name,
    paid_by_address_1: payslip.paid_by_address_1,
    paid_by_address_2: payslip.paid_by_address_2,
    paid_by_abn: payslip.paid_by_abn,
    employee_name: payslip.employee_name,
    address_line_1: payslip.address_line_1,
    address_line_2: payslip.address_line_2,
    pay_frequency: payslip.pay_frequency || 'Fortnightly',
    annual_salary: payslip.show_annual_salary === false ? 0 : Number(payslip.annual_salary || 0),
    employment_basis: payslip.employment_basis || 'Full-time employment',
    pay_period_start: payslip.pay_period_start,
    pay_period_end: payslip.pay_period_end,
    payment_date: payslip.payment_date,
    total_earnings: Number(payslip.total_earnings || 0),
    net_pay: Number(payslip.net_pay || 0),
    wages_description: payslip.wages_description || 'Ordinary Hours',
    ordinary_hours: Number(payslip.ordinary_hours || 0),
    hourly_rate: Number(payslip.hourly_rate || 0),
    wages_amount: Number(payslip.wages_amount || 0),
    wages_total: Number(payslip.wages_total || 0),
    tax_description: payslip.tax_description || 'PAYG',
    tax_amount: Number(payslip.tax_amount || 0),
    tax_total: Number(payslip.tax_total || 0),
    bank_account_masked: payslip.bank_account_masked || '',
    account_name: payslip.account_name || '',
    payment_reference: payslip.payment_reference || 'AIMT Pay',
    payment_amount: Number(payslip.payment_amount || 0),
    created_at: payslip.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

function fromDbRow(row: any): AIMTPayslip {
  return {
    ...row,
    show_annual_salary: Number(row.annual_salary || 0) > 0,
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
    console.error('Error reading local payslips:', e)
    return []
  }
}

function saveLocalPayslips(items: AIMTPayslip[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch (e) {
    console.error('Error saving local payslips:', e)
  }
}

export const aimtPayslipService = {
  async getAll(): Promise<AIMTPayslip[]> {
    try {
      const supabase = createClient()
      const { data, error } = await (supabase as any)
        .from('aimt_payslips')
        .select('*')
        .not('paid_by_name', 'ilike', '%EdLink%')
        .not('payment_reference', 'ilike', '%EdLink%')
        .not('id', 'ilike', 'edlink_%')
        .order('created_at', { ascending: false })

      if (!error && data) {
        const mapped = (data as any[]).map(fromDbRow)
        // Sync local storage with DB data
        saveLocalPayslips(mapped)
        return mapped
      }
    } catch (e) {
      console.warn('Supabase fetch failed, using local storage fallback:', e)
    }
    return getLocalPayslips().filter(
      (p) =>
        !p.paid_by_name?.toLowerCase().includes('edlink') &&
        !p.payment_reference?.toLowerCase().includes('edlink') &&
        !p.id?.startsWith('edlink_')
    )
  },

  async getById(id: string): Promise<AIMTPayslip | null> {
    try {
      const supabase = createClient()
      const { data, error } = await (supabase as any)
        .from('aimt_payslips')
        .select('*')
        .eq('id', id)
        .single()

      if (!error && data) {
        return fromDbRow(data)
      }
    } catch (e) {
      console.warn('Supabase fetchById failed, using local storage fallback:', e)
    }

    const locals = getLocalPayslips()
    return locals.find((p) => p.id === id) || null
  },

  async save(
    payload: Omit<AIMTPayslip, 'id' | 'created_at'> & { id?: string }
  ): Promise<{ success: boolean; data?: AIMTPayslip; error?: string }> {
    const id = payload.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `payslip_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`)
    const now = new Date().toISOString()

    const payslip: AIMTPayslip = {
      ...payload,
      id,
      created_at: now,
      updated_at: now,
    }

    // Always update local storage first for offline/immediate response
    const locals = getLocalPayslips()
    const existingIndex = locals.findIndex((p) => p.id === id)
    if (existingIndex >= 0) {
      locals[existingIndex] = { ...locals[existingIndex], ...payslip }
    } else {
      locals.unshift(payslip)
    }
    saveLocalPayslips(locals)

    const dbPayload = toDbPayload(payslip)

    // Attempt Supabase insert/upsert
    try {
      const supabase = createClient()
      const { data, error } = await (supabase as any)
        .from('aimt_payslips')
        .upsert(dbPayload)
        .select()
        .single()

      if (!error && data) {
        return { success: true, data: fromDbRow(data) }
      }
    } catch (e) {
      console.warn('Supabase upsert failed, stored in local storage:', e)
    }

    return { success: true, data: payslip }
  },

  async delete(id: string): Promise<{ success: boolean; error?: string }> {
    // Remove from local storage
    const locals = getLocalPayslips()
    const filtered = locals.filter((p) => p.id !== id)
    saveLocalPayslips(filtered)

    // Attempt delete in Supabase
    try {
      const supabase = createClient()
      await (supabase as any).from('aimt_payslips').delete().eq('id', id)
    } catch (e) {
      console.warn('Supabase delete failed, deleted from local storage:', e)
    }

    return { success: true }
  },

  async syncLocalToCloud(): Promise<{ success: boolean; syncedCount: number; totalCount: number; error?: string }> {
    const locals = getLocalPayslips()
    if (locals.length === 0) {
      return { success: true, syncedCount: 0, totalCount: 0 }
    }

    try {
      const supabase = createClient()
      let successCount = 0
      let lastError: string | null = null

      for (const payslip of locals) {
        const dbPayload = toDbPayload(payslip)
        const { error } = await (supabase as any)
          .from('aimt_payslips')
          .upsert(dbPayload, { onConflict: 'id' })

        if (!error) {
          successCount++
        } else {
          lastError = error.message
        }
      }

      if (lastError && successCount === 0) {
        return {
          success: false,
          syncedCount: 0,
          totalCount: locals.length,
          error: lastError,
        }
      }

      // Refresh local cache with latest cloud rows
      const { data } = await (supabase as any)
        .from('aimt_payslips')
        .select('*')
        .order('created_at', { ascending: false })

      if (data && data.length > 0) {
        saveLocalPayslips((data as any[]).map(fromDbRow))
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
        error: e?.message || 'Failed to connect to cloud database',
      }
    }
  },
}
