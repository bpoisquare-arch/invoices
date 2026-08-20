import { createClient } from '@/lib/supabase/client'
import { InvoiceWithDetails, TemplateSnapshot } from '@/lib/supabase/database.types'
import { subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns'
import { getTemplateByCompanyId } from '@/lib/services/template.service'

export interface InvoiceItemInput {
  description: string
  quantity: number
  amount: number
}

export interface CreateInvoiceInput {
  company_id: string
  template_id?: string | null
  invoice_number?: string
  customer_name: string
  reference_name?: string | null
  invoice_date: string
  due_date: string
  items: InvoiceItemInput[]
}

export interface UpdateInvoiceInput {
  customer_name?: string
  reference_name?: string | null
  invoice_date?: string
  due_date?: string
  items?: InvoiceItemInput[]
}

export interface InvoiceFilterParams {
  search?: string
  companyId?: string
  dateFilter?: 'all' | 'today' | '7days' | '30days' | 'this_month' | 'last_month' | 'this_year' | 'custom'
  startDate?: string
  endDate?: string
  sortBy?: 'newest' | 'oldest' | 'number' | 'amount_desc' | 'amount_asc'
  page?: number
  pageSize?: number
}

function isValidUUID(str?: string | null): boolean {
  if (!str) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim())
}

// Clean up any stale localStorage keys from previous versions
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('edlink_invoices_local_store')
    localStorage.removeItem('edlink_deleted_invoices_key')
  } catch {
    // Ignore
  }
}

export async function generateNextInvoiceNumber(companyId: string): Promise<string> {
  let maxSeq = 326 // Baseline starting number

  try {
    const supabase = createClient()
    const { data: existingInvoices } = await supabase
      .from('invoices')
      .select('invoice_number')

    if (existingInvoices && existingInvoices.length > 0) {
      existingInvoices.forEach((inv) => {
        if (inv.invoice_number) {
          const match = inv.invoice_number.match(/\d+/)
          if (match) {
            const num = parseInt(match[0], 10)
            if (num > maxSeq) {
              maxSeq = num
            }
          }
        }
      })
    }
  } catch (e) {
    // Ignore error
  }

  const nextSeq = maxSeq + 1
  return String(nextSeq).padStart(5, '0')
}

export async function createInvoice(input: CreateInvoiceInput): Promise<InvoiceWithDetails> {
  const supabase = createClient()

  let companyName = 'EdLink Pakistan'
  let address = 'Suit 3, Level 4/20 Collins Street, Melbourne 3000'
  let email = 'finance@edlink.com.au'
  let phone = '+61 432 536 123'
  let paymentDetails = `Account Name: Riaz & Sons PTY Ltd\nBSB: 083-543\nAccount No: 72-996-1834\nABN: 62 658 488 469`

  // 1. Resolve Company ID to a valid database UUID
  let resolvedCompanyId = input.company_id
  try {
    if (isValidUUID(input.company_id)) {
      const { data: company } = await supabase
        .from('companies')
        .select('*')
        .eq('id', input.company_id)
        .single()

      if (company) {
        companyName = company.name
        resolvedCompanyId = company.id
      }
    } else {
      // If company_id is not a valid UUID (e.g. fallback string), get the first company from DB
      const { data: firstCompany } = await supabase
        .from('companies')
        .select('*')
        .limit(1)
        .single()

      if (firstCompany) {
        companyName = firstCompany.name
        resolvedCompanyId = firstCompany.id
      }
    }

    const activeTemplate = await getTemplateByCompanyId(resolvedCompanyId)
    if (activeTemplate) {
      if (activeTemplate.company_name) companyName = activeTemplate.company_name
      if (activeTemplate.address) address = activeTemplate.address
      if (activeTemplate.email) email = activeTemplate.email
      if (activeTemplate.phone) phone = activeTemplate.phone
      if (activeTemplate.payment_details) paymentDetails = activeTemplate.payment_details
    }
  } catch (err) {
    // Ignore error
  }

  // 2. Resolve Template ID: only send to DB if it is a valid UUID
  let validTemplateId: string | null = null
  if (isValidUUID(input.template_id)) {
    validTemplateId = input.template_id!
  }

  const templateSnapshot: TemplateSnapshot = {
    company_name: companyName,
    address,
    phone,
    email,
    payment_details: paymentDetails,
    currency: 'AUD',
    footer_terms: 'Thank you for getting services from us',
    primary_color: '#2563eb',
    layout_type: 'edlink_v1',
  }

  const invoiceNumber = input.invoice_number || (await generateNextInvoiceNumber(resolvedCompanyId))

  const preparedItems = input.items.map((item) => {
    const qty = Number(item.quantity) || 0
    const amt = Number(item.amount) || 0
    const line_total = Number((qty * amt).toFixed(2))
    return {
      description: item.description,
      quantity: qty,
      amount: amt,
      line_total,
    }
  })

  const subtotal = Number(preparedItems.reduce((sum, item) => sum + item.line_total, 0).toFixed(2))

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      company_id: resolvedCompanyId,
      template_id: validTemplateId,
      template_snapshot: templateSnapshot,
      invoice_number: invoiceNumber,
      customer_name: input.customer_name,
      reference_name: input.reference_name || null,
      invoice_date: input.invoice_date,
      due_date: input.due_date,
      subtotal,
      total_amount: subtotal,
    })
    .select('*, companies(*), templates(*)')
    .single()

  if (error || !invoice) {
    throw new Error(error?.message || 'Failed to create invoice in database')
  }

  if (preparedItems.length > 0) {
    const itemsToInsert = preparedItems.map((item) => ({
      invoice_id: invoice.id,
      description: item.description,
      quantity: item.quantity,
      amount: item.amount,
      line_total: item.line_total,
    }))
    await supabase.from('invoice_items').insert(itemsToInsert)
  }

  const fetched = await getInvoiceById(invoice.id)
  if (!fetched) {
    throw new Error('Invoice was created but could not be loaded from database')
  }
  return fetched
}

export async function updateInvoice(
  invoiceId: string,
  input: UpdateInvoiceInput
): Promise<InvoiceWithDetails> {
  const supabase = createClient()

  const preparedItems = input.items && input.items.length > 0 ? input.items.map((item) => {
    const qty = Number(item.quantity) || 0
    const amt = Number(item.amount) || 0
    return {
      invoice_id: invoiceId,
      description: item.description,
      quantity: qty,
      amount: amt,
      line_total: Number((qty * amt).toFixed(2)),
    }
  }) : null

  const updateData: any = { updated_at: new Date().toISOString() }
  if (input.customer_name !== undefined) updateData.customer_name = input.customer_name
  if (input.reference_name !== undefined) updateData.reference_name = input.reference_name
  if (input.invoice_date !== undefined) updateData.invoice_date = input.invoice_date
  if (input.due_date !== undefined) updateData.due_date = input.due_date

  if (preparedItems) {
    const subtotal = Number(preparedItems.reduce((sum, item) => sum + item.line_total, 0).toFixed(2))
    updateData.subtotal = subtotal
    updateData.total_amount = subtotal
  }

  const { error } = await supabase.from('invoices').update(updateData).eq('id', invoiceId)
  if (error) {
    throw new Error(error.message || 'Failed to update invoice in database')
  }

  if (preparedItems) {
    await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId)
    await supabase.from('invoice_items').insert(preparedItems)
  }

  const fetched = await getInvoiceById(invoiceId)
  if (!fetched) {
    throw new Error('Updated invoice could not be loaded from database')
  }
  return fetched
}

export async function renameInvoiceReference(invoiceId: string, referenceName: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('invoices')
    .update({ reference_name: referenceName, updated_at: new Date().toISOString() })
    .eq('id', invoiceId)

  if (error) {
    throw new Error(error.message || 'Failed to rename invoice')
  }
}

export async function duplicateInvoice(invoiceId: string): Promise<InvoiceWithDetails> {
  const original = await getInvoiceById(invoiceId)
  if (!original) throw new Error('Invoice not found to duplicate')

  const newInvoiceInput: CreateInvoiceInput = {
    company_id: original.company_id,
    template_id: isValidUUID(original.template_id) ? original.template_id : null,
    customer_name: original.customer_name || '',
    reference_name: original.reference_name ? `${original.reference_name} (Copy)` : 'Copied Invoice',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    items: original.invoice_items?.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      amount: item.amount,
    })) || [{ description: '', quantity: 1, amount: 0 }],
  }

  return createInvoice(newInvoiceInput)
}

export async function deleteInvoice(invoiceId: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId)
  const { error } = await supabase.from('invoices').delete().eq('id', invoiceId)
  if (error) {
    throw new Error(error.message || 'Failed to delete invoice from database')
  }
}

export async function getInvoiceById(invoiceId: string): Promise<InvoiceWithDetails | null> {
  if (!isValidUUID(invoiceId)) return null

  try {
    const supabase = createClient()
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*, companies(*), templates(*), invoice_items(*)')
      .eq('id', invoiceId)
      .single()

    if (error || !invoice) return null
    return invoice as InvoiceWithDetails
  } catch (err) {
    return null
  }
}

export async function getInvoices(params: InvoiceFilterParams = {}): Promise<{
  invoices: InvoiceWithDetails[]
  totalCount: number
  page: number
  pageSize: number
}> {
  const page = params.page && params.page > 0 ? params.page : 1
  const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 20
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  try {
    const supabase = createClient()
    let query = supabase
      .from('invoices')
      .select('*, companies(*), templates(*), invoice_items(*)', { count: 'exact' })

    if (params.companyId && params.companyId !== 'all' && isValidUUID(params.companyId)) {
      query = query.eq('company_id', params.companyId)
    }

    // Date filters
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    if (params.dateFilter === 'today') {
      query = query.eq('invoice_date', todayStr)
    } else if (params.dateFilter === '7days') {
      const d = subDays(now, 7).toISOString().split('T')[0]
      query = query.gte('invoice_date', d).lte('invoice_date', todayStr)
    } else if (params.dateFilter === '30days') {
      const d = subDays(now, 30).toISOString().split('T')[0]
      query = query.gte('invoice_date', d).lte('invoice_date', todayStr)
    } else if (params.dateFilter === 'this_month') {
      const s = startOfMonth(now).toISOString().split('T')[0]
      const e = endOfMonth(now).toISOString().split('T')[0]
      query = query.gte('invoice_date', s).lte('invoice_date', e)
    } else if (params.dateFilter === 'last_month') {
      const lastMonth = subMonths(now, 1)
      const s = startOfMonth(lastMonth).toISOString().split('T')[0]
      const e = endOfMonth(lastMonth).toISOString().split('T')[0]
      query = query.gte('invoice_date', s).lte('invoice_date', e)
    } else if (params.dateFilter === 'this_year') {
      const s = startOfYear(now).toISOString().split('T')[0]
      const e = endOfYear(now).toISOString().split('T')[0]
      query = query.gte('invoice_date', s).lte('invoice_date', e)
    } else if (params.dateFilter === 'custom') {
      if (params.startDate) query = query.gte('invoice_date', params.startDate)
      if (params.endDate) query = query.lte('invoice_date', params.endDate)
    }

    // Search filter
    if (params.search && params.search.trim() !== '') {
      const s = params.search.trim()
      query = query.or(`invoice_number.ilike.%${s}%,customer_name.ilike.%${s}%,reference_name.ilike.%${s}%`)
    }

    // Sorting
    if (params.sortBy === 'oldest') {
      query = query.order('created_at', { ascending: true })
    } else if (params.sortBy === 'amount_desc') {
      query = query.order('total_amount', { ascending: false })
    } else if (params.sortBy === 'amount_asc') {
      query = query.order('total_amount', { ascending: true })
    } else if (params.sortBy === 'number') {
      query = query.order('invoice_number', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    query = query.range(from, to)

    const { data, count, error } = await query

    if (error) {
      console.error('Error fetching invoices from Supabase:', error.message)
      return { invoices: [], totalCount: 0, page, pageSize }
    }

    return {
      invoices: (data as InvoiceWithDetails[]) || [],
      totalCount: count || 0,
      page,
      pageSize,
    }
  } catch (err) {
    console.error('Exception fetching invoices:', err)
    return { invoices: [], totalCount: 0, page, pageSize }
  }
}

// Deprecated no-op for backward compatibility
export async function syncLocalInvoicesToSupabase(): Promise<{ syncedCount: number; error?: string }> {
  return { syncedCount: 0 }
}
