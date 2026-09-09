import { createClient } from '@/lib/supabase/client'

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
  paid_by_name: 'EdLink Australia PTY Ltd',
  paid_by_address_1: 'Suite 3, Level 4',
  paid_by_address_2: '20 Collins Street, Melbourne VIC 3000',
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

/**
 * Sanitize frontend payload to match exact database columns
 */
function toDbPayload(payslip: EdlinkPayslip) {
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
    payment_reference: payslip.payment_reference || 'EdLink Pay',
    payment_amount: Number(payslip.payment_amount || 0),
    created_at: payslip.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

function fromDbRow(row: any): EdlinkPayslip {
  return {
    ...row,
    show_annual_salary: Number(row.annual_salary || 0) > 0,
  }
}

export const edlinkPayslipService = {
  /**
   * Fetch all EdLink payslips from the database in real-time.
   */
  async getAll(): Promise<EdlinkPayslip[]> {
    try {
      const supabase = createClient()

      // 1. Primary: Query dedicated edlink_payslips table
      const { data, error } = await (supabase as any)
        .from('edlink_payslips')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        return (data as any[]).map(fromDbRow)
      }

      // 2. Fallback: Query aimt_payslips table filtered by EdLink identifier
      if (error && (error.code === 'PGRST205' || error.message?.includes('edlink_payslips'))) {
        const { data: fallbackData, error: fallbackError } = await (supabase as any)
          .from('aimt_payslips')
          .select('*')
          .or('paid_by_name.ilike.%EdLink%,payment_reference.ilike.%EdLink%,id.ilike.edlink_%')
          .order('created_at', { ascending: false })

        if (!fallbackError && fallbackData) {
          return (fallbackData as any[]).map(fromDbRow)
        }
      }
    } catch (e) {
      console.error('Database fetch failed for edlink payslips:', e)
    }
    return []
  },

  /**
   * Fetch a single EdLink payslip by ID directly from database.
   */
  async getById(id: string): Promise<EdlinkPayslip | null> {
    try {
      const supabase = createClient()

      // 1. Primary: Try edlink_payslips table
      const { data, error } = await (supabase as any)
        .from('edlink_payslips')
        .select('*')
        .eq('id', id)
        .single()

      if (!error && data) {
        return fromDbRow(data)
      }

      // 2. Fallback: Try aimt_payslips table
      const { data: fallbackData } = await (supabase as any)
        .from('aimt_payslips')
        .select('*')
        .eq('id', id)
        .single()

      if (fallbackData) {
        return fromDbRow(fallbackData)
      }
    } catch (e) {
      console.error('Database fetchById failed for edlink payslip:', e)
    }
    return null
  },

  /**
   * Save (Insert/Update) an EdLink payslip directly to the database in real-time.
   */
  async save(
    payload: Omit<EdlinkPayslip, 'id' | 'created_at'> & { id?: string }
  ): Promise<{ success: boolean; data?: EdlinkPayslip; error?: string }> {
    const id =
      payload.id && payload.id.trim() !== ''
        ? payload.id
        : typeof crypto !== 'undefined' && crypto.randomUUID
        ? `edlink_${crypto.randomUUID()}`
        : `edlink_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    const now = new Date().toISOString()

    const payslip: EdlinkPayslip = {
      ...payload,
      id,
      created_at: now,
      updated_at: now,
    }

    const dbPayload = toDbPayload(payslip)

    try {
      const supabase = createClient()

      // 1. Primary: Try upsert into edlink_payslips table
      const { data, error } = await (supabase as any)
        .from('edlink_payslips')
        .upsert(dbPayload)
        .select()
        .single()

      if (!error && data) {
        return { success: true, data: fromDbRow(data) }
      }

      // 2. Fallback: If table is not created yet, upsert into aimt_payslips
      if (error && (error.code === 'PGRST205' || error.message?.includes('edlink_payslips'))) {
        const { data: fallbackData, error: fallbackError } = await (supabase as any)
          .from('aimt_payslips')
          .upsert(dbPayload)
          .select()
          .single()

        if (!fallbackError && fallbackData) {
          return { success: true, data: fromDbRow(fallbackData) }
        }

        if (fallbackError) {
          return { success: false, error: fallbackError.message }
        }
      }

      if (error) {
        return { success: false, error: error.message }
      }
    } catch (e: any) {
      console.error('Database save failed for edlink payslip:', e)
      return { success: false, error: e?.message || 'Database error' }
    }

    return { success: true, data: payslip }
  },

  /**
   * Delete an EdLink payslip directly from the database in real-time.
   */
  async delete(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient()

      // 1. Delete from edlink_payslips
      const { error } = await (supabase as any).from('edlink_payslips').delete().eq('id', id)
      if (!error) {
        return { success: true }
      }

      // 2. Fallback: Delete from aimt_payslips if applicable
      const { error: fallbackError } = await (supabase as any)
        .from('aimt_payslips')
        .delete()
        .eq('id', id)

      if (!fallbackError) {
        return { success: true }
      }

      return { success: false, error: fallbackError.message }
    } catch (e: any) {
      console.error('Database delete failed for edlink payslip:', e)
      return { success: false, error: e?.message || 'Database delete error' }
    }
  },

  /**
   * Subscribe to real-time changes on payslip tables.
   */
  subscribeToChanges(onUpdate: () => void) {
    try {
      const supabase = createClient()
      const channel = supabase
        .channel('edlink_payslips_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'edlink_payslips' },
          () => onUpdate()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'aimt_payslips' },
          () => onUpdate()
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    } catch (e) {
      console.warn('Realtime subscription not available:', e)
      return () => {}
    }
  },
}
