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

const INVOICES_STORAGE_KEY = 'edlink_invoices_local_store'

function getStoredInvoices(): InvoiceWithDetails[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(INVOICES_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveStoredInvoices(invoices: InvoiceWithDetails[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(invoices))
  } catch {
    // Ignore
  }
}

let localInvoicesStore: InvoiceWithDetails[] = []

function initLocalInvoices() {
  const stored = getStoredInvoices()
  if (stored.length > 0) {
    stored.forEach((inv) => {
      const idx = localInvoicesStore.findIndex((item) => item.id === inv.id)
      if (idx >= 0) {
        localInvoicesStore[idx] = inv
      } else {
        localInvoicesStore.push(inv)
      }
    })
  }
}

export async function generateNextInvoiceNumber(companyId: string): Promise<string> {
  initLocalInvoices()

  const allNumbers: string[] = ['00327']
  localInvoicesStore.forEach((inv) => {
    if (inv.invoice_number) allNumbers.push(inv.invoice_number)
  })

  try {
    const supabase = createClient()
    const { data: existingInvoices } = await supabase
      .from('invoices')
      .select('invoice_number')

    if (existingInvoices && existingInvoices.length > 0) {
      existingInvoices.forEach((inv) => {
        if (inv.invoice_number) allNumbers.push(inv.invoice_number)
      })
    }
  } catch (e) {
    // Ignore error
  }

  let maxSeq = 326 // Baseline so the next generated invoice starts from 00328+

  for (const str of allNumbers) {
    const match = str.match(/\d+/)
    if (match) {
      const num = parseInt(match[0], 10)
      if (num > maxSeq) {
        maxSeq = num
      }
    }
  }

  const nextSeq = maxSeq + 1
  return String(nextSeq).padStart(5, '0')
}

export async function createInvoice(input: CreateInvoiceInput): Promise<InvoiceWithDetails> {
  initLocalInvoices()
  const supabase = createClient()

  let companyName = 'EdLink Pakistan'
  let address = 'Suit 3, Level 4/20 Collins Street, Melbourne 3000'
  let email = 'finance@edlink.com.au'
  let phone = '+61 432 536 123'
  let paymentDetails = `Account Name: Riaz & Sons PTY Ltd\nBSB: 083-543\nAccount No: 72-996-1834\nABN: 62 658 488 469`

  try {
    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('id', input.company_id)
      .single()

    if (company) companyName = company.name

    const activeTemplate = await getTemplateByCompanyId(input.company_id)

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

  const invoiceNumber = input.invoice_number || await generateNextInvoiceNumber(input.company_id)

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

  const newId = `inv-${Date.now()}`
  const createdInv: InvoiceWithDetails = {
    id: newId,
    user_id: null,
    company_id: input.company_id,
    template_id: null,
    template_snapshot: templateSnapshot,
    invoice_number: invoiceNumber,
    reference_name: input.reference_name || null,
    customer_name: input.customer_name,
    invoice_date: input.invoice_date,
    due_date: input.due_date,
    subtotal,
    total_amount: subtotal,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    invoice_items: preparedItems.map((item, idx) => ({
      id: `item-${idx}`,
      invoice_id: newId,
      description: item.description,
      quantity: item.quantity,
      amount: item.amount,
      line_total: item.line_total,
      created_at: new Date().toISOString(),
    })),
  }

  try {
    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        company_id: input.company_id,
        template_id: input.template_id || null,
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

    if (!error && invoice) {
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
      if (fetched) {
        localInvoicesStore.unshift(fetched)
        saveStoredInvoices(localInvoicesStore)
        return fetched
      }
    }
  } catch (err) {
    // Ignore error
  }

  localInvoicesStore.unshift(createdInv)
  saveStoredInvoices(localInvoicesStore)
  return createdInv
}

export async function updateInvoice(
  invoiceId: string,
  input: UpdateInvoiceInput
): Promise<InvoiceWithDetails> {
  initLocalInvoices()
  const localInv = localInvoicesStore.find((i) => i.id === invoiceId)

  const preparedItems = input.items && input.items.length > 0 ? input.items.map((item, idx) => {
    const qty = Number(item.quantity) || 0
    const amt = Number(item.amount) || 0
    return {
      id: `item-${idx}`,
      invoice_id: invoiceId,
      description: item.description,
      quantity: qty,
      amount: amt,
      line_total: Number((qty * amt).toFixed(2)),
      created_at: new Date().toISOString(),
    }
  }) : localInv?.invoice_items || []

  const subtotal = Number(preparedItems.reduce((sum, item) => sum + item.line_total, 0).toFixed(2))

  if (localInv) {
    if (input.customer_name !== undefined) localInv.customer_name = input.customer_name
    if (input.reference_name !== undefined) localInv.reference_name = input.reference_name
    if (input.invoice_date !== undefined) localInv.invoice_date = input.invoice_date
    if (input.due_date !== undefined) localInv.due_date = input.due_date
    localInv.invoice_items = preparedItems
    localInv.subtotal = subtotal
    localInv.total_amount = subtotal
    localInv.updated_at = new Date().toISOString()
    saveStoredInvoices(localInvoicesStore)
  }

  try {
    const supabase = createClient()
    const updateData: any = { updated_at: new Date().toISOString() }
    if (input.customer_name !== undefined) updateData.customer_name = input.customer_name
    if (input.reference_name !== undefined) updateData.reference_name = input.reference_name
    if (input.invoice_date !== undefined) updateData.invoice_date = input.invoice_date
    if (input.due_date !== undefined) updateData.due_date = input.due_date
    updateData.subtotal = subtotal
    updateData.total_amount = subtotal

    await supabase.from('invoices').update(updateData).eq('id', invoiceId)
    if (input.items && input.items.length > 0) {
      await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId)
      await supabase.from('invoice_items').insert(
        preparedItems.map((item) => ({
          invoice_id: invoiceId,
          description: item.description,
          quantity: item.quantity,
          amount: item.amount,
          line_total: item.line_total,
        }))
      )
    }
  } catch (err) {
    // Ignore error
  }

  return localInv || (await getInvoiceById(invoiceId)) as InvoiceWithDetails
}

export async function renameInvoiceReference(invoiceId: string, referenceName: string): Promise<void> {
  initLocalInvoices()
  const localInv = localInvoicesStore.find((i) => i.id === invoiceId)
  if (localInv) {
    localInv.reference_name = referenceName
    saveStoredInvoices(localInvoicesStore)
  }
  try {
    const supabase = createClient()
    await supabase.from('invoices').update({ reference_name: referenceName }).eq('id', invoiceId)
  } catch (err) {
    // Ignore error
  }
}

export async function duplicateInvoice(invoiceId: string): Promise<InvoiceWithDetails> {
  const original = await getInvoiceById(invoiceId)
  const newInvoiceInput: CreateInvoiceInput = {
    company_id: original?.company_id || 'edlink-pk-id',
    template_id: original?.template_id || null,
    customer_name: original?.customer_name || '',
    reference_name: original?.reference_name ? `${original.reference_name} (Copy)` : 'Copied Invoice',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    items: original?.invoice_items?.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      amount: item.amount,
    })) || [{ description: '', quantity: 1, amount: 0 }],
  }

  return createInvoice(newInvoiceInput)
}

const DELETED_INVOICES_KEY = 'edlink_deleted_invoices_key'

function getDeletedInvoiceIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(DELETED_INVOICES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function markInvoiceDeleted(id: string) {
  if (typeof window === 'undefined') return
  try {
    const list = getDeletedInvoiceIds()
    if (!list.includes(id)) {
      list.push(id)
      localStorage.setItem(DELETED_INVOICES_KEY, JSON.stringify(list))
    }
  } catch {
    // Ignore
  }
}

export async function deleteInvoice(invoiceId: string): Promise<void> {
  initLocalInvoices()
  localInvoicesStore = localInvoicesStore.filter((i) => i.id !== invoiceId)
  saveStoredInvoices(localInvoicesStore)
  markInvoiceDeleted(invoiceId)

  try {
    const supabase = createClient()
    await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId)
    await supabase.from('invoices').delete().eq('id', invoiceId)
  } catch (err) {
    // Ignore error
  }
}

export async function getInvoiceById(invoiceId: string): Promise<InvoiceWithDetails | null> {
  const deletedIds = getDeletedInvoiceIds()
  if (deletedIds.includes(invoiceId)) return null

  initLocalInvoices()
  const localMatch = localInvoicesStore.find((i) => i.id === invoiceId)
  if (localMatch) return localMatch

  const stored = getStoredInvoices()
  const storedMatch = stored.find((i) => i.id === invoiceId)
  if (storedMatch) {
    localInvoicesStore.push(storedMatch)
    return storedMatch
  }

  try {
    const supabase = createClient()
    const { data: invoice } = await supabase
      .from('invoices')
      .select('*, companies(*), templates(*), invoice_items(*)')
      .eq('id', invoiceId)
      .single()

    if (invoice) {
      localInvoicesStore.unshift(invoice as InvoiceWithDetails)
      return invoice as InvoiceWithDetails
    }
  } catch (err) {
    // Ignore error
  }

  return null
}

export async function getInvoices(params: InvoiceFilterParams = {}): Promise<{
  invoices: InvoiceWithDetails[]
  totalCount: number
  page: number
  pageSize: number
}> {
  initLocalInvoices()
  const deletedIds = new Set(getDeletedInvoiceIds())
  const page = params.page && params.page > 0 ? params.page : 1
  const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 20

  let combined: InvoiceWithDetails[] = localInvoicesStore.filter((inv) => !deletedIds.has(inv.id))

  try {
    const supabase = createClient()
    const { data } = await supabase
      .from('invoices')
      .select('*, companies(*), templates(*), invoice_items(*)')
      .order('created_at', { ascending: false })

    if (data && data.length > 0) {
      const existingIds = new Set(combined.map((d) => d.id))
      data.forEach((d: any) => {
        if (!existingIds.has(d.id) && !deletedIds.has(d.id)) {
          combined.push(d)
        }
      })
    }
  } catch (err) {
    // Ignore error
  }

  if (params.companyId && params.companyId !== 'all') {
    combined = combined.filter((i) => i.company_id === params.companyId)
  }

  if (params.search && params.search.trim() !== '') {
    const s = params.search.trim().toLowerCase()
    combined = combined.filter(
      (i) =>
        i.invoice_number?.toLowerCase().includes(s) ||
        i.customer_name?.toLowerCase().includes(s) ||
        i.reference_name?.toLowerCase().includes(s)
    )
  }

  if (params.sortBy === 'oldest') {
    combined.sort((a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime())
  } else if (params.sortBy === 'amount_desc') {
    combined.sort((a, b) => (b.total_amount || 0) - (a.total_amount || 0))
  } else if (params.sortBy === 'amount_asc') {
    combined.sort((a, b) => (a.total_amount || 0) - (b.total_amount || 0))
  } else if (params.sortBy === 'number') {
    combined.sort((a, b) => (b.invoice_number || '').localeCompare(a.invoice_number || ''))
  } else {
    combined.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
  }

  const totalCount = combined.length
  const from = (page - 1) * pageSize
  const paged = combined.slice(from, from + pageSize)

  return {
    invoices: paged,
    totalCount,
    page,
    pageSize,
  }
}
