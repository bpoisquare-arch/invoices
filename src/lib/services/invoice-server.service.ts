import { prisma } from '@/lib/prisma'
import { InvoiceWithDetails, TemplateSnapshot } from '@/types/database.types'
import { subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns'
import { numberToWords } from '@/lib/utils/number-to-words'
import {
  CreateInvoiceInput,
  UpdateInvoiceInput,
  InvoiceFilterParams,
} from './invoice.service'

function isValidUUID(str?: string | null): boolean {
  if (!str) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim())
}

export function toInvoiceWithDetails(inv: any): InvoiceWithDetails {
  return {
    id: inv.id,
    user_id: inv.userId ?? inv.user_id ?? null,
    company_id: inv.companyId ?? inv.company_id,
    entity: inv.entity ?? null,
    template_id: inv.templateId ?? inv.template_id ?? null,
    template_snapshot: inv.templateSnapshot ?? inv.template_snapshot,
    invoice_number: inv.invoiceNumber ?? inv.invoice_number,
    reference_name: inv.referenceName ?? inv.reference_name ?? null,
    customer_name: inv.customerName ?? inv.customer_name,
    invoice_date: inv.invoiceDate instanceof Date
      ? inv.invoiceDate.toISOString().slice(0, 10)
      : String(inv.invoice_date || inv.invoiceDate || '').slice(0, 10),
    due_date: inv.dueDate instanceof Date
      ? inv.dueDate.toISOString().slice(0, 10)
      : String(inv.due_date || inv.dueDate || '').slice(0, 10),
    subtotal: Number(inv.subtotal ?? 0),
    total_amount: Number(inv.totalAmount ?? inv.total_amount ?? 0),
    created_at: inv.createdAt instanceof Date ? inv.createdAt.toISOString() : String(inv.created_at || inv.createdAt || new Date().toISOString()),
    updated_at: inv.updatedAt instanceof Date ? inv.updatedAt.toISOString() : String(inv.updated_at || inv.updatedAt || new Date().toISOString()),
    companies: inv.company
      ? {
          id: inv.company.id,
          user_id: inv.company.userId ?? null,
          name: inv.company.name,
          logo_url: inv.company.logoUrl ?? null,
          prefix: inv.company.prefix,
          currency: inv.company.currency,
          created_at: inv.company.createdAt instanceof Date ? inv.company.createdAt.toISOString() : String(inv.company.createdAt),
          updated_at: inv.company.updatedAt instanceof Date ? inv.company.updatedAt.toISOString() : String(inv.company.updatedAt),
        }
      : (inv.companies ?? null),
    invoice_items: (inv.items || inv.invoice_items || []).map((it: any) => ({
      id: it.id,
      invoice_id: it.invoiceId ?? it.invoice_id,
      description: it.description,
      quantity: Number(it.quantity ?? 1),
      amount: Number(it.amount ?? 0),
      line_total: Number(it.lineTotal ?? it.line_total ?? 0),
      created_at: it.createdAt instanceof Date ? it.createdAt.toISOString() : String(it.created_at || it.createdAt || new Date().toISOString()),
    })),
  }
}

export function normalizeInvoice(inv: InvoiceWithDetails): InvoiceWithDetails {
  if (!inv) return inv
  return inv
}

export async function generateNextInvoiceNumberServer(companyId: string, isAnonymous?: boolean, entityHint?: string): Promise<string> {
  let maxSeq = 1000

  let targetEntity: 'nsc' | 'isq' | 'edlink-pk' | 'edlink-au' = 'edlink-au'
  if (entityHint === 'nsc' || companyId === 'nsc-company-id' || companyId === 'nsc') {
    targetEntity = 'nsc'
  } else if (entityHint === 'isquare-bpo' || entityHint === 'isq' || companyId === 'isquare-bpo-company-id' || companyId === 'isquare-bpo' || companyId === 'isq') {
    targetEntity = 'isq'
  } else if (entityHint === 'edlink-au' || companyId === 'edlink-au' || companyId === 'edlink') {
    targetEntity = 'edlink-au'
  } else if (entityHint === 'edlink-pk' || isAnonymous || companyId === 'anonymous-company-id' || companyId === 'edlink-pk') {
    targetEntity = 'edlink-pk'
  } else if (isValidUUID(companyId)) {
    try {
      const comp = await prisma.company.findUnique({
        where: { id: companyId },
        select: { prefix: true, name: true },
      })
      if (comp) {
        const cname = (comp.name || '').toLowerCase()
        if (comp.prefix === 'NSC' || cname.includes('neighbourhood')) {
          targetEntity = 'nsc'
        } else if (comp.prefix === 'ISQ' || cname.includes('isquare')) {
          targetEntity = 'isq'
        } else if (comp.prefix === 'EDA' || (cname.includes('australia') && !cname.includes('pakistan'))) {
          targetEntity = 'edlink-au'
        } else {
          targetEntity = 'edlink-pk'
        }
      }
    } catch {}
  }

  try {
    const existingInvoices = await prisma.invoice.findMany({
      where: {
        OR: [
          { entity: targetEntity === 'isq' ? 'isquare-bpo' : targetEntity },
          ...(targetEntity === 'isq' ? [{ entity: 'isq' }, { company: { prefix: 'ISQ' } }] : []),
          ...(targetEntity === 'nsc' ? [{ company: { prefix: 'NSC' } }] : []),
          ...(targetEntity === 'edlink-au' ? [{ company: { prefix: 'EDA' } }] : []),
          ...(targetEntity === 'edlink-pk' ? [{ company: { prefix: 'EDL' } }, { company: { prefix: 'ANO' } }] : []),
        ],
      },
      take: 200,
      orderBy: { createdAt: 'desc' },
      select: {
        invoiceNumber: true,
      },
    })

    if (existingInvoices && existingInvoices.length > 0) {
      existingInvoices.forEach((inv: any) => {
        if (inv.invoiceNumber) {
          const match = inv.invoiceNumber.match(/\d+/)
          if (match) {
            const num = parseInt(match[0], 10)
            if (num > maxSeq) {
              maxSeq = num
            }
          }
        }
      })
    }
  } catch (err) {
    console.warn('MySQL generateNextInvoiceNumberServer warning:', err)
  }

  const nextSeq = maxSeq + 1
  return String(nextSeq)
}

export async function getInvoiceByIdServer(invoiceId: string): Promise<InvoiceWithDetails | null> {
  if (!isValidUUID(invoiceId)) return null

  try {
    const inv = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        company: true,
        items: true,
      },
    })
    if (inv) {
      return normalizeInvoice(toInvoiceWithDetails(inv))
    }
  } catch (err) {
    console.warn('MySQL getInvoiceByIdServer warning:', err)
  }

  return null
}

export async function getInvoicesServer(params: InvoiceFilterParams = {}): Promise<{
  invoices: InvoiceWithDetails[]
  totalCount: number
  page: number
  pageSize: number
}> {
  const page = params.page && params.page > 0 ? params.page : 1
  const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 20
  const skip = (page - 1) * pageSize

  try {
    const where: any = {}
    const conditions: any[] = []

    // 1. Entity filter
    if (params.entityType === 'nsc') {
      conditions.push({
        OR: [
          { entity: 'nsc' },
          { company: { prefix: 'NSC' } },
          { company: { name: { contains: 'Neighbourhood' } } },
          { templateSnapshot: { path: '$.layout_type', equals: 'nsc_v1' } },
        ],
      })
    } else if (params.entityType === 'isquare-bpo' || (params.entityType as any) === 'isq') {
      conditions.push({
        OR: [
          { entity: 'isquare-bpo' },
          { entity: 'isq' },
          { company: { prefix: 'ISQ' } },
          { company: { name: { contains: 'ISquare' } } },
          { templateSnapshot: { path: '$.company_name', string_contains: 'ISquare' } },
        ],
      })
    } else if (params.entityType === 'edlink-au') {
      conditions.push({
        OR: [
          { entity: 'edlink-au' },
          { company: { prefix: 'EDA' } },
          {
            AND: [
              { company: { name: { contains: 'Australia' } } },
              { NOT: { company: { name: { contains: 'Pakistan' } } } },
            ],
          },
        ],
      })
      conditions.push({
        NOT: {
          OR: [
            { entity: 'nsc' },
            { entity: 'isquare-bpo' },
            { entity: 'edlink-pk' },
            { company: { prefix: 'NSC' } },
            { company: { prefix: 'ISQ' } },
            { company: { prefix: 'EDL' } },
            { company: { prefix: 'ANO' } },
          ],
        },
      })
    } else if (params.entityType === 'edlink-pk') {
      conditions.push({
        OR: [
          { entity: 'edlink-pk' },
          { company: { prefix: 'EDL' } },
          { company: { prefix: 'ANO' } },
          { company: { name: { contains: 'Pakistan' } } },
          { company: { name: { contains: 'Anonymous' } } },
          { templateSnapshot: { path: '$.layout_type', equals: 'anonymous_v1' } },
          { templateSnapshot: { path: '$.is_anonymous', equals: true } },
        ],
      })
      conditions.push({
        NOT: {
          OR: [
            { entity: 'nsc' },
            { entity: 'isquare-bpo' },
            { entity: 'edlink-au' },
            { company: { prefix: 'NSC' } },
            { company: { prefix: 'ISQ' } },
            { company: { prefix: 'EDA' } },
          ],
        },
      })
    }

    if (params.companyId && params.companyId !== 'all' && isValidUUID(params.companyId)) {
      conditions.push({ companyId: params.companyId })
    }

    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    if (params.dateFilter === 'today') {
      conditions.push({ invoiceDate: new Date(todayStr) })
    } else if (params.dateFilter === '7days') {
      const d = subDays(now, 7).toISOString().split('T')[0]
      conditions.push({ invoiceDate: { gte: new Date(d), lte: new Date(todayStr) } })
    } else if (params.dateFilter === '30days') {
      const d = subDays(now, 30).toISOString().split('T')[0]
      conditions.push({ invoiceDate: { gte: new Date(d), lte: new Date(todayStr) } })
    } else if (params.dateFilter === 'this_month') {
      const s = startOfMonth(now).toISOString().split('T')[0]
      const e = endOfMonth(now).toISOString().split('T')[0]
      conditions.push({ invoiceDate: { gte: new Date(s), lte: new Date(e) } })
    } else if (params.dateFilter === 'last_month') {
      const lastMonth = subMonths(now, 1)
      const s = startOfMonth(lastMonth).toISOString().split('T')[0]
      const e = endOfMonth(lastMonth).toISOString().split('T')[0]
      conditions.push({ invoiceDate: { gte: new Date(s), lte: new Date(e) } })
    } else if (params.dateFilter === 'this_year') {
      const s = startOfYear(now).toISOString().split('T')[0]
      const e = endOfYear(now).toISOString().split('T')[0]
      conditions.push({ invoiceDate: { gte: new Date(s), lte: new Date(e) } })
    } else if (params.dateFilter === 'custom') {
      const dateCond: any = {}
      if (params.startDate) dateCond.gte = new Date(params.startDate)
      if (params.endDate) dateCond.lte = new Date(params.endDate)
      if (Object.keys(dateCond).length > 0) {
        conditions.push({ invoiceDate: dateCond })
      }
    }

    if (params.search && params.search.trim() !== '') {
      const s = params.search.trim()
      conditions.push({
        OR: [
          { invoiceNumber: { contains: s } },
          { customerName: { contains: s } },
          { referenceName: { contains: s } },
        ],
      })
    }

    if (conditions.length > 0) {
      where.AND = conditions
    }

    let orderBy: any = { createdAt: 'desc' }
    if (params.sortBy === 'oldest') {
      orderBy = { createdAt: 'asc' }
    } else if (params.sortBy === 'amount_desc') {
      orderBy = { totalAmount: 'desc' }
    } else if (params.sortBy === 'amount_asc') {
      orderBy = { totalAmount: 'asc' }
    } else if (params.sortBy === 'number') {
      orderBy = { invoiceNumber: 'desc' }
    }

    const [rows, count] = await Promise.all([
      prisma.invoice.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: {
          company: true,
          items: true,
        },
      }),
      prisma.invoice.count({ where }),
    ])

    const invoices = (rows || []).map(toInvoiceWithDetails).map(normalizeInvoice)
    return {
      invoices,
      totalCount: count ?? invoices.length,
      page,
      pageSize,
    }
  } catch (err) {
    console.error('getInvoicesServer error:', err)
    return { invoices: [], totalCount: 0, page, pageSize }
  }
}

export async function createInvoiceServer(input: CreateInvoiceInput): Promise<InvoiceWithDetails> {
  let companyName = 'EdLink Pakistan'
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
  } else if (input.company_id === 'edlink-au' || input.company_id === 'edlink') {
    companyName = 'EdLink Australia'
    companyLogo = '/edlink-logo.png'
    layoutType = 'default_v1'
    primaryColor = '#0284c7'
    address = 'Level 1, 100 Collins Street, Melbourne VIC 3000'
    email = 'australia@edlink.com.au'
    phone = '+61 3 9000 1234'
    paymentDetails = 'Account Name: EdLink Australia PTY Ltd\nBSB: 063-000\nAccount No: 1234 5678'
    footerTerms = 'Thank you for choosing EdLink Australia.'
  }

  let resolvedCompanyId = input.company_id
  try {
    if (isValidUUID(input.company_id)) {
      const comp = await prisma.company.findUnique({ where: { id: input.company_id } })
      if (comp) {
        companyName = comp.name
        resolvedCompanyId = comp.id
        if (comp.logoUrl) companyLogo = comp.logoUrl
      }
    } else {
      let matchedComp = null
      if (input.company_id === 'nsc-company-id' || input.company_id === 'nsc') {
        matchedComp = await prisma.company.findFirst({
          where: { OR: [{ prefix: 'NSC' }, { name: { contains: 'Neighbourhood' } }] }
        })
      } else if (input.company_id === 'isquare-bpo-company-id' || input.company_id === 'isquare-bpo' || input.company_id === 'isq') {
        matchedComp = await prisma.company.findFirst({
          where: { OR: [{ prefix: 'ISQ' }, { name: { contains: 'ISquare' } }] }
        })
      } else if (input.company_id === 'edlink-au' || input.company_id === 'edlink') {
        matchedComp = await prisma.company.findFirst({
          where: { OR: [{ prefix: 'EDA' }, { AND: [{ name: { contains: 'Australia' } }, { NOT: { name: { contains: 'Pakistan' } } }] }] }
        })
      } else if (input.company_id === 'edlink-pk' || input.company_id === 'anonymous' || input.company_id === 'anonymous-company-id') {
        matchedComp = await prisma.company.findFirst({
          where: { OR: [{ prefix: 'EDL' }, { name: { contains: 'Pakistan' } }] }
        })
      }

      if (matchedComp) {
        resolvedCompanyId = matchedComp.id
        if (!input.company_id?.includes('anonymous') && matchedComp.name) {
          companyName = matchedComp.name
        }
      } else {
        const firstCompany = await prisma.company.findFirst()
        if (firstCompany) {
          resolvedCompanyId = firstCompany.id
        }
      }
    }
  } catch {}

  let validTemplateId: string | null = null
  if (isValidUUID(input.template_id)) {
    validTemplateId = input.template_id!
  }

  let resolvedEntity = input.entity || ''
  if (!resolvedEntity) {
    const cid = (input.company_id || '').toLowerCase()
    const cnm = companyName.toLowerCase()
    if (cid === 'nsc-company-id' || cid === 'nsc' || cnm.includes('neighbourhood')) {
      resolvedEntity = 'nsc'
    } else if (cid === 'isquare-bpo-company-id' || cid === 'isquare-bpo' || cid === 'isq' || cnm.includes('isquare')) {
      resolvedEntity = 'isquare-bpo'
    } else if (cid === 'edlink-au' || cid === 'edlink' || (cnm.includes('australia') && !cnm.includes('pakistan'))) {
      resolvedEntity = 'edlink-au'
    } else {
      resolvedEntity = 'edlink-pk'
    }
  }

  const isAnonymous = Boolean(
    input.is_anonymous ||
    input.company_id === 'anonymous-company-id' ||
    input.company_id === 'anonymous' ||
    resolvedEntity === 'edlink-pk' ||
    companyName.toLowerCase().includes('pakistan') ||
    companyName.toLowerCase() === 'anonymous'
  ) &&
    resolvedEntity !== 'nsc' &&
    resolvedEntity !== 'isquare-bpo' &&
    resolvedEntity !== 'edlink-au' &&
    input.company_id !== 'nsc-company-id' &&
    input.company_id !== 'nsc' &&
    input.company_id !== 'isquare-bpo-company-id' &&
    input.company_id !== 'isquare-bpo' &&
    input.company_id !== 'isq' &&
    input.company_id !== 'edlink-au' &&
    input.company_id !== 'edlink' &&
    !companyName.toLowerCase().includes('australia')

  const templateSnapshot: TemplateSnapshot = isAnonymous
    ? {
        company_name: input.custom_company_name?.trim() || companyName || 'EdLink Pakistan',
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

  const invoiceNumber = input.invoice_number || (await generateNextInvoiceNumberServer(resolvedCompanyId, isAnonymous, resolvedEntity))

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

  templateSnapshot.gst_rate = gstRate
  templateSnapshot.gst_amount = gstAmount
  templateSnapshot.amount_in_words = amountInWords
  templateSnapshot.includes_gst = gstRate > 0

  const createdInvoice = await prisma.invoice.create({
    data: {
      companyId: resolvedCompanyId,
      entity: resolvedEntity,
      templateId: validTemplateId,
      templateSnapshot: templateSnapshot as any,
      invoiceNumber,
      customerName: input.customer_name,
      referenceName: input.reference_name || null,
      invoiceDate: new Date(input.invoice_date),
      dueDate: new Date(input.due_date || input.invoice_date),
      subtotal,
      totalAmount,
      items: {
        create: preparedItems.map((it) => ({
          description: it.description,
          quantity: it.quantity,
          amount: it.amount,
          lineTotal: it.line_total,
        })),
      },
    },
    include: {
      company: true,
      items: true,
    },
  })

  return normalizeInvoice(toInvoiceWithDetails(createdInvoice))
}

export async function updateInvoiceServer(
  invoiceId: string,
  input: UpdateInvoiceInput
): Promise<InvoiceWithDetails> {
  const existing = await getInvoiceByIdServer(invoiceId)
  if (!existing) throw new Error('Invoice not found to update')

  const preparedItems = input.items && input.items.length > 0 ? input.items.map((item) => {
    const qty = Number(item.quantity) || 0
    const amt = Number(item.amount) || 0
    return {
      invoiceId,
      description: item.description,
      quantity: qty,
      amount: amt,
      lineTotal: Number((qty * amt).toFixed(2)),
    }
  }) : null

  const items = preparedItems || (existing?.invoice_items || []).map((it) => ({
    invoiceId,
    description: it.description,
    quantity: it.quantity,
    amount: it.amount,
    lineTotal: it.line_total,
  }))

  const subtotal = Number(items.reduce((sum: number, item: any) => sum + (Number(item.lineTotal) || 0), 0).toFixed(2))
  const gstRate = Number(
    input.gst_rate !== undefined && input.gst_rate !== null
      ? input.gst_rate
      : (existing?.template_snapshot?.gst_rate ?? (existing?.companies?.prefix === 'NSC' ? 10 : 0))
  )
  const gstAmount = Number(((subtotal * gstRate) / 100).toFixed(2))
  const totalAmount = Number((subtotal + gstAmount).toFixed(2))
  const currencyToUse = String(input.currency || existing?.template_snapshot?.currency || 'AUD')
  const amountInWords = numberToWords(totalAmount, currencyToUse)

  const updatedSnapshot: TemplateSnapshot = {
    ...(existing?.template_snapshot || {}),
    gst_rate: gstRate,
    gst_amount: gstAmount,
    amount_in_words: amountInWords,
    includes_gst: gstRate > 0,
  }

  const updatedEntity = input.entity || existing.entity || (existing.companies?.prefix === 'NSC' ? 'nsc' : existing.companies?.prefix === 'ISQ' ? 'isquare-bpo' : existing.companies?.prefix === 'EDA' ? 'edlink-au' : 'edlink-pk')

  await prisma.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        entity: updatedEntity,
        customerName: input.customer_name !== undefined ? input.customer_name : existing.customer_name,
        referenceName: input.reference_name !== undefined ? input.reference_name : existing.reference_name,
        invoiceDate: input.invoice_date ? new Date(input.invoice_date) : undefined,
        dueDate: input.due_date ? new Date(input.due_date) : undefined,
        subtotal,
        totalAmount,
        templateSnapshot: updatedSnapshot as any,
      },
    })

    if (preparedItems) {
      await tx.invoiceItem.deleteMany({ where: { invoiceId } })
      await tx.invoiceItem.createMany({
        data: preparedItems.map((it) => ({
          invoiceId,
          description: it.description,
          quantity: it.quantity,
          amount: it.amount,
          lineTotal: it.lineTotal,
        })),
      })
    }
  })

  const fetched = await getInvoiceByIdServer(invoiceId)
  if (!fetched) {
    throw new Error('Updated invoice could not be loaded.')
  }
  return fetched
}

export async function deleteInvoiceServer(invoiceId: string): Promise<void> {
  await prisma.invoiceItem.deleteMany({ where: { invoiceId } })
  await prisma.invoice.deleteMany({ where: { id: invoiceId } })
}

export async function renameInvoiceReferenceServer(invoiceId: string, referenceName: string): Promise<void> {
  await prisma.invoice.updateMany({
    where: { id: invoiceId },
    data: { referenceName },
  })
}
