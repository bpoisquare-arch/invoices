import { prisma } from '@/lib/prisma'
import { Template } from '@/types/database.types'

export const FALLBACK_TEMPLATE: Template = {
  id: 'edlink-pk-template-id',
  company_id: 'edlink-pk-id',
  name: 'EdLink Australia Standard Template',
  company_name: 'EdLink Australia',
  address: 'Suit 3, Level 4/20 Collins Street, Melbourne 3000',
  email: 'finance@edlink.com.au',
  phone: '+61 432 536 123',
  payment_details: `Account Name: Riaz & Sons PTY Ltd\nBSB: 083-543\nAccount No: 72-996-1834\nABN: 62 658 488 469`,
  bank_details: 'Riaz & Sons PTY Ltd (BSB: 083-543, Account: 72-996-1834)',
  currency: 'AUD',
  footer_terms: 'Thank you for getting services from us',
  primary_color: '#2563eb',
  layout_type: 'edlink_v1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export const ANONYMOUS_TEMPLATE: Template = {
  id: 'anonymous-template-id',
  company_id: 'anonymous-company-id',
  name: 'Anonymous Flexible Template',
  company_name: '',
  address: '',
  email: '',
  phone: '',
  payment_details: '',
  bank_details: '',
  currency: 'AUD',
  footer_terms: 'Thank you for getting services from us',
  primary_color: '#2563eb',
  layout_type: 'anonymous_v1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export const NSC_TEMPLATE: Template = {
  id: 'nsc-template-id',
  company_id: 'nsc-company-id',
  name: 'Neighbourhood Shine Co. Standard Template',
  company_name: 'Neighbourhood Shine Co.',
  address: '22 Cheviot Avenue Berwick',
  email: '',
  phone: '',
  payment_details: `BANK ACCOUNT DETAILS\nBank Name: Common Wealth Bank\nAccount Name: Neighbourhood Shine Co\nAccount Number: 313369861\nBSB / IFSC: 083-004\n\nPAY ID DETAILS\nAccount Name: Neighbourhood Shine Co\nPAY ID: 0421 953 400`,
  bank_details: 'Common Wealth Bank (BSB: 083-004, Acc: 313369861, PAY ID: 0421 953 400)',
  currency: 'AUD',
  footer_terms: `• Payment is required on arrival on the day of service.\n• The customer is responsible for arranging suitable parking for our service vehicle.\n• Access to electricity and running hot water must be available at the property.\n• While we make every effort, complete removal of pet hair cannot be guaranteed.\n• The property must be vacant at the time of cleaning.\n• Quoted pricing is based on properties in standard/normal condition. Heavily soiled properties may incur additional charges.\n• Ceilings and garage walls are excluded from the service.\n• Payment can be made via cash, bank transfer, or Pay ID.`,
  primary_color: '#8CB34E',
  layout_type: 'nsc_v1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export const ISQUARE_TEMPLATE: Template = {
  id: 'isquare-bpo-template-id',
  company_id: 'isquare-bpo-company-id',
  name: 'ISquare BPO Standard Template',
  company_name: 'ISquare BPO',
  address: 'Suite 500, Tech Park, Islamabad, Pakistan',
  email: 'invoicing@isquarebpo.com',
  phone: '+92 51 111 222 333',
  payment_details: 'Account Name: iSquare BPO Solutions\nSWIFT: ISQBPOPK\nAccount No: 9876543210',
  bank_details: 'iSquare BPO Solutions',
  currency: 'USD',
  footer_terms: 'Payment due within 15 days of invoice date.',
  primary_color: '#003D5C',
  layout_type: 'edlink_v1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

function isValidUUID(str?: string | null): boolean {
  if (!str) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim())
}

function prismaToTemplate(row: any): Template {
  if (!row) return row
  const companyName = row.companyName === 'EdLink Pakistan' ? 'EdLink Australia' : (row.companyName || '')
  const name = row.name === 'EdLink Pakistan Standard Template' ? 'EdLink Australia Standard Template' : (row.name || '')
  return {
    id: row.id,
    company_id: row.companyId,
    name: name,
    company_name: companyName,
    address: row.address || null,
    phone: row.phone || null,
    email: row.email || null,
    payment_details: row.paymentDetails || null,
    bank_details: row.bankDetails || null,
    currency: row.currency || 'AUD',
    footer_terms: row.footerTerms || null,
    primary_color: row.primaryColor || '#2563eb',
    layout_type: row.layoutType || 'edlink_v1',
    created_at: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
    updated_at: row.updatedAt ? new Date(row.updatedAt).toISOString() : new Date().toISOString(),
  }
}

export async function getTemplates(): Promise<(Template & { companies?: { name: string; prefix: string } | null })[]> {
  try {
    const list = await prisma.template.findMany({
      include: { company: true },
      orderBy: { createdAt: 'asc' },
    })

    if (list && list.length > 0) {
      const valid = list
        .filter(
          (t) =>
            (t.companyName || '').toLowerCase() !== 'anonymous' &&
            (t.company?.name || '').toLowerCase() !== 'anonymous'
        )
        .map((t) => {
          const norm = prismaToTemplate(t)
          const comp = t.company ? { name: t.company.name === 'EdLink Pakistan' ? 'EdLink Australia' : t.company.name, prefix: t.company.prefix } : null
          return { ...norm, companies: comp }
        })

      if (valid.length > 0) return valid
    }
  } catch (err) {
    console.error('Error fetching templates:', err)
  }

  return [{ ...FALLBACK_TEMPLATE, companies: { name: FALLBACK_TEMPLATE.company_name || 'EdLink Australia', prefix: 'EDL' } }]
}

export async function getTemplateByCompanyId(companyId: string): Promise<Template | null> {
  const clean = (companyId || '').toLowerCase().trim()
  if (clean === 'anonymous-company-id' || clean === 'anonymous' || clean === 'ano' || clean === 'custom' || clean === 'edlink-pk') {
    return ANONYMOUS_TEMPLATE
  }

  if (clean === 'nsc' || clean === 'nsc-company-id' || clean === 'nsc-template-id' || clean === 'neighbourhood-shine' || clean === 'neighbourhood shine' || clean === 'neighbourhood shine co.') {
    try {
      const row = await prisma.template.findFirst({
        where: {
          OR: [
            { name: { contains: 'Neighbourhood' } },
            { companyName: { contains: 'Neighbourhood' } },
          ],
        },
      })
      if (row) return { ...prismaToTemplate(row), layout_type: 'nsc_v1' }
    } catch {}
    return NSC_TEMPLATE
  }

  if (clean === 'isq' || clean === 'isquare' || clean === 'isquare-bpo' || clean === 'isquare-bpo-company-id' || clean === 'isquare-bpo-template-id') {
    try {
      const row = await prisma.template.findFirst({
        where: {
          OR: [
            { name: { contains: 'ISquare' } },
            { companyName: { contains: 'ISquare' } },
          ],
        },
      })
      if (row) return prismaToTemplate(row)
    } catch {}
    return ISQUARE_TEMPLATE
  }

  try {
    if (isValidUUID(companyId)) {
      const row = await prisma.template.findFirst({
        where: { companyId: companyId },
      })
      if (row) return prismaToTemplate(row)
    }

    const list = await prisma.template.findMany({ orderBy: { createdAt: 'asc' } })
    if (list && list.length > 0) {
      const valid = list.find(
        (t) =>
          (t.companyName || '').toLowerCase() !== 'anonymous' &&
          (t.name || '').toLowerCase() !== 'anonymous'
      )
      if (valid) return prismaToTemplate(valid)
      return prismaToTemplate(list[0])
    }
  } catch (err) {}

  return FALLBACK_TEMPLATE
}

export async function getTemplateById(id: string): Promise<Template | null> {
  try {
    if (isValidUUID(id)) {
      const row = await prisma.template.findUnique({ where: { id } })
      if (row) return prismaToTemplate(row)
    }

    const first = await prisma.template.findFirst({ orderBy: { createdAt: 'asc' } })
    if (first) return prismaToTemplate(first)
  } catch (err) {}

  return FALLBACK_TEMPLATE
}

export async function updateTemplate(
  id: string,
  updates: Partial<Omit<Template, 'id' | 'company_id' | 'created_at'>>
): Promise<Template> {
  try {
    let targetId = id

    if (!isValidUUID(targetId)) {
      const first = await prisma.template.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } })
      if (first) {
        targetId = first.id
      }
    }

    if (isValidUUID(targetId)) {
      const data: any = {}
      if (updates.name !== undefined) data.name = updates.name
      if (updates.company_name !== undefined) data.companyName = updates.company_name
      if (updates.address !== undefined) data.address = updates.address
      if (updates.phone !== undefined) data.phone = updates.phone
      if (updates.email !== undefined) data.email = updates.email
      if (updates.payment_details !== undefined) data.paymentDetails = updates.payment_details
      if (updates.bank_details !== undefined) data.bankDetails = updates.bank_details
      if (updates.currency !== undefined) data.currency = updates.currency
      if (updates.footer_terms !== undefined) data.footerTerms = updates.footer_terms
      if (updates.primary_color !== undefined) data.primaryColor = updates.primary_color
      if (updates.layout_type !== undefined) data.layoutType = updates.layout_type

      const updated = await prisma.template.update({
        where: { id: targetId },
        data,
      })

      if (updated.companyId && (updates.company_name || updates.currency)) {
        const compData: any = {}
        if (updates.company_name) compData.name = updates.company_name
        if (updates.currency) compData.currency = updates.currency
        await prisma.company.update({
          where: { id: updated.companyId },
          data: compData,
        }).catch(() => {})
      }

      return prismaToTemplate(updated)
    }
  } catch (err: any) {
    throw new Error(err?.message || 'Failed to update template')
  }

  return { ...FALLBACK_TEMPLATE, ...updates }
}

export async function duplicateTemplate(
  templateId: string,
  newCompanyId: string,
  newTemplateName: string
): Promise<Template> {
  try {
    const original = await getTemplateById(templateId)
    const base = original || FALLBACK_TEMPLATE

    const created = await prisma.template.create({
      data: {
        companyId: newCompanyId,
        name: newTemplateName,
        companyName: base.company_name,
        address: base.address,
        phone: base.phone,
        email: base.email,
        paymentDetails: base.payment_details,
        bankDetails: base.bank_details,
        currency: base.currency,
        footerTerms: base.footer_terms,
        primaryColor: base.primary_color,
        layoutType: base.layout_type,
      },
    })

    return prismaToTemplate(created)
  } catch (err) {
    return {
      ...FALLBACK_TEMPLATE,
      id: `tpl-${Date.now()}`,
      name: newTemplateName,
      company_id: newCompanyId,
    }
  }
}
