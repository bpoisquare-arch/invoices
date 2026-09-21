import { createClient } from '@/lib/supabase/client'
import { InvoiceWithDetails, TemplateSnapshot } from '@/lib/supabase/database.types'
import { subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns'
import { getTemplateByCompanyId } from '@/lib/services/template.service'
import { numberToWords } from '@/lib/utils/number-to-words'

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
  let maxSeq = 1000 // Each entity starts at 1001 (1000 + 1)

  try {
    const supabase = createClient()

    // 1. Identify target entity category
    let targetEntity: 'nsc' | 'isq' | 'edlink-pk' | 'edlink-au' = 'edlink-au'
    if (isAnonymous || companyId === 'anonymous-company-id') {
      targetEntity = 'edlink-pk'
    } else if (companyId === 'nsc-company-id' || companyId === 'nsc') {
      targetEntity = 'nsc'
    } else if (companyId === 'isquare-bpo-company-id' || companyId === 'isquare-bpo' || companyId === 'isq') {
      targetEntity = 'isq'
    } else if (isValidUUID(companyId)) {
      const { data: comp } = await supabase.from('companies').select('prefix, name').eq('id', companyId).single()
      if (comp) {
        const cname = (comp.name || '').toLowerCase()
        if (comp.prefix === 'NSC' || cname.includes('neighbourhood')) {
          targetEntity = 'nsc'
        } else if (comp.prefix === 'ISQ' || cname.includes('isquare')) {
          targetEntity = 'isq'
        } else if (comp.prefix === 'ANO' || cname.includes('anonymous')) {
          targetEntity = 'edlink-pk'
        }
      }
    }

    // 2. Query invoices from DB to find the maximum existing sequence for THIS entity
    const { data: existingInvoices } = await supabase
      .from('invoices')
      .select('invoice_number, template_snapshot, companies(prefix, name)')

    if (existingInvoices && existingInvoices.length > 0) {
      existingInvoices.forEach((inv: any) => {
        const compName = (inv.template_snapshot?.company_name || inv.companies?.name || '').toLowerCase()
        const isAnon = Boolean(
          inv.template_snapshot?.is_anonymous ||
          inv.template_snapshot?.layout_type === 'anonymous_v1' ||
          inv.companies?.prefix === 'ANO' ||
          inv.companies?.name?.toLowerCase() === 'anonymous'
        )
        const isNsc = inv.companies?.prefix === 'NSC' || inv.template_snapshot?.layout_type === 'nsc_v1' || compName.includes('neighbourhood')
        const isIsq = inv.companies?.prefix === 'ISQ' || compName.includes('isquare')

        let entity: 'nsc' | 'isq' | 'edlink-pk' | 'edlink-au' = 'edlink-au'
        if (isNsc) entity = 'nsc'
        else if (isIsq) entity = 'isq'
        else if (isAnon || compName.includes('edlink pakistan')) entity = 'edlink-pk'

        if (entity === targetEntity && inv.invoice_number) {
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
  return String(nextSeq)
}

export async function createInvoice(input: CreateInvoiceInput): Promise<InvoiceWithDetails> {
  const supabase = createClient()

  let companyName = 'EdLink Australia'
  let address = 'Suit 3, Level 4/20 Collins Street, Melbourne 3000'
  let email = 'finance@edlink.com.au'
  let phone = '+61 432 536 123'
  let paymentDetails = `Account Name: Riaz & Sons PTY Ltd\nBSB: 083-543\nAccount No: 72-996-1834\nABN: 62 658 488 469`
  let companyLogo: string | null = '/edlink-logo.png'
  let layoutType = 'edlink_v1'
  let primaryColor = '#2563eb'
  let footerTerms = 'Thank you for getting services from us'

  if (input.company_id === 'nsc-company-id' || input.company_id === 'nsc') {
    companyName = 'Neighbourhood Shine Co.'
    companyLogo = '/Neighbourhood-Shine.png'
    layoutType = 'nsc_v1'
    primaryColor = '#8CB34E'
    address = '22 Cheviot Avenue Berwick'
    paymentDetails = `BANK ACCOUNT DETAILS\nBank Name: Common Wealth Bank\nAccount Name: Neighbourhood Shine Co\nAccount Number: 313369861\nBSB / IFSC: 083-004\n\nPAY ID DETAILS\nAccount Name: Neighbourhood Shine Co\nPAY ID: 0421 953 400`
    footerTerms = `• Payment is required on arrival on the day of service.\n• The customer is responsible for arranging suitable parking for our service vehicle.\n• Access to electricity and running hot water must be available at the property.\n• While we make every effort, complete removal of pet hair cannot be guaranteed.\n• The property must be vacant at the time of cleaning.\n• Quoted pricing is based on properties in standard/normal condition. Heavily soiled properties may incur additional charges.\n• Ceilings and garage walls are excluded from the service.\n• Payment can be made via cash, bank transfer, or Pay ID.`
  } else if (input.company_id === 'isquare-bpo-company-id' || input.company_id === 'isquare-bpo' || input.company_id === 'isq') {
    companyName = 'ISquare BPO'
    companyLogo = '/isquarebpo.png'
    layoutType = 'edlink_v1'
    primaryColor = '#003D5C'
    address = 'Suite 500, Tech Park, Islamabad, Pakistan'
    email = 'invoicing@isquarebpo.com'
    phone = '+92 51 111 222 333'
    paymentDetails = 'Account Name: iSquare BPO Solutions\nSWIFT: ISQBPOPK\nAccount No: 9876543210'
    footerTerms = 'Payment due within 15 days of invoice date.'
  }

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
        if (company.logo_url) companyLogo = company.logo_url
      }
    } else {
      // If company_id is not a valid UUID (e.g. fallback string), get the first company from DB
      const { data: firstCompany } = await supabase
        .from('companies')
        .select('*')
        .limit(1)
        .single()

      if (firstCompany) {
        resolvedCompanyId = firstCompany.id
      }
    }

    const activeTemplate = await getTemplateByCompanyId(input.company_id || resolvedCompanyId)
    if (activeTemplate) {
      if (activeTemplate.company_name) companyName = activeTemplate.company_name
      if (activeTemplate.address) address = activeTemplate.address
      if (activeTemplate.email) email = activeTemplate.email
      if (activeTemplate.phone) phone = activeTemplate.phone
      if (activeTemplate.payment_details) paymentDetails = activeTemplate.payment_details
      if (activeTemplate.footer_terms) footerTerms = activeTemplate.footer_terms
      if (activeTemplate.layout_type) layoutType = activeTemplate.layout_type
      if (activeTemplate.primary_color) primaryColor = activeTemplate.primary_color
    }
  } catch (err) {
    // Ignore error
  }

  // 2. Resolve Template ID: only send to DB if it is a valid UUID
  let validTemplateId: string | null = null
  if (isValidUUID(input.template_id)) {
    validTemplateId = input.template_id!
  }

  const isAnonymous = Boolean(
    input.is_anonymous ||
    input.company_id === 'anonymous-company-id' ||
    companyName.toLowerCase() === 'anonymous'
  ) &&
    input.company_id !== 'nsc-company-id' &&
    input.company_id !== 'nsc' &&
    input.company_id !== 'isquare-bpo-company-id' &&
    input.company_id !== 'isquare-bpo' &&
    input.company_id !== 'isq'

  const templateSnapshot: TemplateSnapshot = isAnonymous
    ? {
      company_name: input.custom_company_name?.trim() || 'Company Name',
      address: input.custom_address || '',
      phone: input.custom_phone || '',
      email: input.custom_email || '',
      payment_details: input.custom_payment_details || '',
      currency: input.currency || 'AUD',
      footer_terms: input.footer_terms || 'Thank you for getting services from us',
      primary_color: '#2563eb',
      logo_url: input.custom_logo_url || null,
      layout_type: 'anonymous_v1',
      header_mode: input.header_mode || (input.custom_logo_url ? 'logo' : 'text'),
      bill_to_label: input.bill_to_label || 'Issued to:',
      is_anonymous: true,
      logo_size: input.logo_size || 60,
    }
    : {
      company_name: companyName,
      address,
      phone,
      email,
      payment_details: paymentDetails,
      currency: input.currency || (input.company_id === 'isquare-bpo-company-id' || input.company_id === 'isq' ? 'USD' : 'AUD'),
      footer_terms: input.footer_terms || footerTerms,
      primary_color: primaryColor,
      layout_type: layoutType,
      logo_url: companyLogo,
      header_mode: 'logo',
      bill_to_label: 'BILL TO',
      is_anonymous: false,
    }

  const invoiceNumber = input.invoice_number || (await generateNextInvoiceNumber(resolvedCompanyId, isAnonymous))

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
  const gstRate = input.gst_rate !== undefined && input.gst_rate !== null ? Number(input.gst_rate) : (input.company_id === 'nsc-company-id' || input.company_id === 'nsc' ? 10 : 0)
  const gstAmount = Number(((subtotal * gstRate) / 100).toFixed(2))
  const totalAmount = Number((subtotal + gstAmount).toFixed(2))
  const currencyToUse = input.currency || (input.company_id === 'isquare-bpo-company-id' || input.company_id === 'isq' ? 'USD' : 'AUD')
  const amountInWords = numberToWords(totalAmount, currencyToUse)

  // Attach GST info into templateSnapshot
  templateSnapshot.gst_rate = gstRate
  templateSnapshot.gst_amount = gstAmount
  templateSnapshot.amount_in_words = amountInWords
  templateSnapshot.includes_gst = gstRate > 0

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
      due_date: input.due_date || input.invoice_date,
      subtotal,
      total_amount: totalAmount,
    })
    .select('*, companies(*)')
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

  const existing = await getInvoiceById(invoiceId)
  if (preparedItems || input.gst_rate !== undefined) {
    const items = preparedItems || existing?.invoice_items || []
    const subtotal = Number(items.reduce((sum: number, item: any) => sum + (Number(item.line_total) || 0), 0).toFixed(2))
    const gstRate = Number(
      input.gst_rate !== undefined && input.gst_rate !== null
        ? input.gst_rate
        : (existing?.template_snapshot?.gst_rate ?? (existing?.companies?.prefix === 'NSC' ? 10 : 0))
    )
    const gstAmount = Number(((subtotal * gstRate) / 100).toFixed(2))
    const totalAmount = Number((subtotal + gstAmount).toFixed(2))
    const currencyToUse = String(input.currency || existing?.template_snapshot?.currency || 'AUD')
    const amountInWords = numberToWords(totalAmount, currencyToUse)

    updateData.subtotal = subtotal
    updateData.total_amount = totalAmount
    if (existing?.template_snapshot) {
      updateData.template_snapshot = {
        ...existing.template_snapshot,
        gst_rate: gstRate,
        gst_amount: gstAmount,
        amount_in_words: amountInWords,
        includes_gst: gstRate > 0,
      }
    }
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

function normalizeInvoice(inv: InvoiceWithDetails): InvoiceWithDetails {
  if (!inv) return inv
  const companyName = inv.template_snapshot?.company_name === 'EdLink Pakistan' ? 'EdLink Australia' : inv.template_snapshot?.company_name
  const templateSnapshot = inv.template_snapshot
    ? {
      ...inv.template_snapshot,
      company_name: companyName || inv.template_snapshot.company_name,
      logo_url: inv.template_snapshot.logo_url || '/edlink-logo.png',
    }
    : inv.template_snapshot

  const companies = inv.companies
    ? {
      ...inv.companies,
      name: inv.companies.name === 'EdLink Pakistan' ? 'EdLink Australia' : inv.companies.name,
      logo_url: inv.companies.logo_url || '/edlink-logo.png',
    }
    : inv.companies

  return {
    ...inv,
    template_snapshot: templateSnapshot,
    companies: companies,
  }
}

export async function getInvoiceById(invoiceId: string): Promise<InvoiceWithDetails | null> {
  if (!isValidUUID(invoiceId)) return null

  try {
    const supabase = createClient()
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*, companies(*), invoice_items(*)')
      .eq('id', invoiceId)
      .single()

    if (error || !invoice) return null
    return normalizeInvoice(invoice as InvoiceWithDetails)
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

    // Optimized select: omit redundant templates join which triggers Postgres timeout
    let query = supabase
      .from('invoices')
      .select('*, companies(*), invoice_items(*)', { count: 'exact' })

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

    const filterByEntity = (invoices: InvoiceWithDetails[], entityType?: string): InvoiceWithDetails[] => {
      if (!entityType || entityType === 'all') return invoices

      if (entityType === 'nsc') {
        return invoices.filter((inv) => {
          const compName = (inv.template_snapshot?.company_name || inv.companies?.name || '').toLowerCase()
          return (
            inv.companies?.prefix === 'NSC' ||
            inv.company_id === 'nsc-company-id' ||
            inv.template_snapshot?.layout_type === 'nsc_v1' ||
            compName.includes('neighbourhood')
          )
        })
      }

      if (entityType === 'isquare-bpo') {
        return invoices.filter((inv) => {
          const compName = (inv.template_snapshot?.company_name || inv.companies?.name || '').toLowerCase()
          return (
            inv.companies?.prefix === 'ISQ' ||
            inv.company_id === 'isquare-bpo-company-id' ||
            compName.includes('isquare')
          )
        })
      }

      if (entityType === 'edlink-pk') {
        return invoices.filter((inv) => {
          const compName = (inv.template_snapshot?.company_name || inv.companies?.name || '').toLowerCase()
          if (compName.includes('neighbourhood') || compName.includes('isquare') || inv.template_snapshot?.layout_type === 'nsc_v1') {
            return false
          }
          const isAnon = Boolean(
            inv.template_snapshot?.is_anonymous ||
            inv.template_snapshot?.layout_type === 'anonymous_v1' ||
            inv.companies?.prefix === 'ANO' ||
            inv.companies?.name?.toLowerCase() === 'anonymous'
          )
          return isAnon || compName.includes('edlink pakistan')
        })
      }

      if (entityType === 'edlink-au') {
        return invoices.filter((inv) => {
          const compName = (inv.template_snapshot?.company_name || inv.companies?.name || '').toLowerCase()
          const isNsc = compName.includes('neighbourhood') || inv.template_snapshot?.layout_type === 'nsc_v1' || inv.companies?.prefix === 'NSC'
          const isIsq = compName.includes('isquare') || inv.companies?.prefix === 'ISQ'
          const isAnon = Boolean(
            inv.template_snapshot?.is_anonymous ||
            inv.template_snapshot?.layout_type === 'anonymous_v1' ||
            inv.companies?.prefix === 'ANO' ||
            inv.companies?.name?.toLowerCase() === 'anonymous'
          )
          return !isAnon && !isNsc && !isIsq
        })
      }

      return invoices
    }

    if (error) {
      console.warn('Primary invoice fetch failed, running fallback query:', error.message)

      // Fallback query without count: 'exact' to prevent statement timeout
      const fallback = await supabase
        .from('invoices')
        .select('*, companies(*), invoice_items(*)')
        .order('created_at', { ascending: false })
        .range(from, to)

      if (fallback.data) {
        const rawInvoices = (fallback.data as InvoiceWithDetails[]) || []
        const filteredInvoices = filterByEntity(rawInvoices.map(normalizeInvoice), params.entityType)
        return {
          invoices: filteredInvoices,
          totalCount: filteredInvoices.length,
          page,
          pageSize,
        }
      }

      return { invoices: [], totalCount: 0, page, pageSize }
    }

    const rawInvoices = ((data || []) as InvoiceWithDetails[]).map(normalizeInvoice)
    const filteredInvoices = filterByEntity(rawInvoices, params.entityType)

    return {
      invoices: filteredInvoices,
      totalCount: params.entityType ? filteredInvoices.length : (count ?? rawInvoices.length),
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
