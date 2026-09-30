import { InvoiceWithDetails } from '@/types/database.types'
import {
  generateNextInvoiceNumberServer,
  getInvoiceByIdServer,
  getInvoicesServer,
  createInvoiceServer,
  updateInvoiceServer,
  deleteInvoiceServer,
  renameInvoiceReferenceServer,
} from './invoice-server.service'

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
  due_date?: string | null
  items: InvoiceItemInput[]
  custom_company_name?: string | null
  custom_address?: string | null
  custom_phone?: string | null
  custom_email?: string | null
  custom_payment_details?: string | null
  custom_logo_url?: string | null
  currency?: string | null
  header_mode?: 'logo' | 'text' | null
  bill_to_label?: string | null
  footer_terms?: string | null
  is_anonymous?: boolean | null
  logo_size?: number | string | null
  gst_rate?: number | null
  gst_amount?: number | null
}

export interface UpdateInvoiceInput {
  customer_name?: string
  reference_name?: string | null
  invoice_date?: string
  due_date?: string | null
  items?: InvoiceItemInput[]
  custom_company_name?: string | null
  custom_address?: string | null
  custom_phone?: string | null
  custom_email?: string | null
  custom_payment_details?: string | null
  custom_logo_url?: string | null
  currency?: string | null
  header_mode?: 'logo' | 'text' | null
  bill_to_label?: string | null
  footer_terms?: string | null
  is_anonymous?: boolean | null
  logo_size?: number | string | null
  gst_rate?: number | null
  gst_amount?: number | null
}

export interface InvoiceFilterParams {
  search?: string
  companyId?: string
  entityType?: 'edlink-pk' | 'edlink-au' | 'nsc' | 'isquare-bpo' | 'all'
  dateFilter?: 'all' | 'today' | '7days' | '30days' | 'this_month' | 'last_month' | 'this_year' | 'custom'
  startDate?: string
  endDate?: string
  sortBy?: 'newest' | 'oldest' | 'number' | 'amount_desc' | 'amount_asc'
  page?: number
  pageSize?: number
}

export function getInvoicePdfFilename(invoice: Partial<InvoiceWithDetails>): string {
  const isAnonymous = Boolean(
    invoice.template_snapshot?.is_anonymous ||
    invoice.template_snapshot?.layout_type === 'anonymous_v1' ||
    invoice.companies?.prefix === 'ANO' ||
    invoice.companies?.name?.toLowerCase() === 'anonymous'
  )

  const compName = (invoice.template_snapshot?.company_name || invoice.companies?.name || '').toLowerCase()
  let entityName = 'EdLink Australia'
  if (isAnonymous) {
    entityName = 'EdLink Pakistan'
  } else if (
    invoice.companies?.prefix === 'NSC' ||
    invoice.template_snapshot?.layout_type === 'nsc_v1' ||
    compName.includes('neighbourhood')
  ) {
    entityName = 'Neighbourhood Shine'
  } else if (
    invoice.companies?.prefix === 'ISQ' ||
    compName.includes('isquare')
  ) {
    entityName = 'Isquare BPO'
  } else if (compName.includes('edlink')) {
    entityName = 'EdLink Australia'
  } else if (invoice.template_snapshot?.company_name) {
    entityName = invoice.template_snapshot.company_name
  } else if (invoice.companies?.name) {
    entityName = invoice.companies.name
  }

  const safeEntity = entityName.replace(/[/\\?%*:|"<>]/g, '').trim()
  const safeCustomer = (invoice.customer_name || 'Customer').replace(/[/\\?%*:|"<>]/g, '').trim()
  const safeNumber = (invoice.invoice_number || '1001').replace(/[/\\?%*:|"<>]/g, '').trim()

  return `${safeEntity}-${safeCustomer}-${safeNumber}.pdf`
}

export async function generateNextInvoiceNumber(companyId: string, isAnonymous?: boolean): Promise<string> {
  if (typeof window !== 'undefined') {
    try {
      const q = new URLSearchParams({
        companyId: companyId || '',
        isAnonymous: isAnonymous ? 'true' : 'false',
      })
      const res = await fetch(`/api/invoices/next-number?${q.toString()}`)
      if (res.ok) {
        const json = await res.json()
        if (json.nextNumber) return json.nextNumber
      }
    } catch (err) {}
  }
  return generateNextInvoiceNumberServer(companyId, isAnonymous)
}

export async function createInvoice(input: CreateInvoiceInput): Promise<InvoiceWithDetails> {
  if (typeof window !== 'undefined') {
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (res.ok) {
      return await res.json()
    }
  }
  return createInvoiceServer(input)
}

export async function updateInvoice(
  invoiceId: string,
  input: UpdateInvoiceInput
): Promise<InvoiceWithDetails> {
  if (typeof window !== 'undefined') {
    const res = await fetch(`/api/invoices/${encodeURIComponent(invoiceId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (res.ok) {
      return await res.json()
    }
  }
  return updateInvoiceServer(invoiceId, input)
}

export async function renameInvoiceReference(invoiceId: string, referenceName: string): Promise<void> {
  if (typeof window !== 'undefined') {
    const res = await fetch(`/api/invoices/${encodeURIComponent(invoiceId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referenceName }),
    })
    if (res.ok) return
  }
  return renameInvoiceReferenceServer(invoiceId, referenceName)
}

export async function duplicateInvoice(invoiceId: string): Promise<InvoiceWithDetails> {
  const original = await getInvoiceById(invoiceId)
  if (!original) throw new Error('Invoice not found to duplicate')

  const newInvoiceInput: CreateInvoiceInput = {
    company_id: original.company_id,
    template_id: original.template_id,
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
  if (typeof window !== 'undefined') {
    const res = await fetch(`/api/invoices/${encodeURIComponent(invoiceId)}`, {
      method: 'DELETE',
    })
    if (res.ok) return
  }
  return deleteInvoiceServer(invoiceId)
}

export async function getInvoiceById(invoiceId: string): Promise<InvoiceWithDetails | null> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/invoices/${encodeURIComponent(invoiceId)}`)
      if (res.ok) {
        const json = await res.json()
        if (json && json.id) return json
      }
    } catch (err) {}
  }
  return getInvoiceByIdServer(invoiceId)
}

export async function getInvoices(params: InvoiceFilterParams = {}): Promise<{
  invoices: InvoiceWithDetails[]
  totalCount: number
  page: number
  pageSize: number
}> {
  if (typeof window !== 'undefined') {
    try {
      const q = new URLSearchParams()
      if (params.companyId) q.set('companyId', params.companyId)
      if (params.entityType) q.set('entityType', params.entityType)
      if (params.dateFilter) q.set('dateFilter', params.dateFilter)
      if (params.startDate) q.set('startDate', params.startDate)
      if (params.endDate) q.set('endDate', params.endDate)
      if (params.sortBy) q.set('sortBy', params.sortBy)
      if (params.search) q.set('search', params.search)
      if (params.page) q.set('page', String(params.page))
      if (params.pageSize) q.set('pageSize', String(params.pageSize))

      const res = await fetch(`/api/invoices?${q.toString()}`)
      if (res.ok) {
        const json = await res.json()
        if (json && Array.isArray(json.invoices)) {
          return json
        }
      }
    } catch (err) {}
  }
  return getInvoicesServer(params)
}

export async function syncLocalInvoicesToSupabase(): Promise<{ syncedCount: number; error?: string }> {
  return { syncedCount: 0 }
}
