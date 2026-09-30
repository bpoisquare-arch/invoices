import { prisma } from '@/lib/prisma'
import { Company } from '@/types/database.types'

export const FALLBACK_COMPANY: Company = {
  id: 'edlink-pk-id',
  user_id: null,
  name: 'EdLink Australia',
  prefix: 'EDL',
  currency: 'AUD',
  logo_url: '/edlink-logo.png',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export const ANONYMOUS_COMPANY: Company = {
  id: 'anonymous-company-id',
  user_id: null,
  name: 'Anonymous',
  prefix: 'ANO',
  currency: 'AUD',
  logo_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export const NSC_COMPANY: Company = {
  id: 'nsc-company-id',
  user_id: null,
  name: 'Neighbourhood Shine Co.',
  prefix: 'NSC',
  currency: 'AUD',
  logo_url: '/Neighbourhood-Shine.png',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export const ISQUARE_COMPANY: Company = {
  id: 'isquare-bpo-company-id',
  user_id: null,
  name: 'ISquare BPO',
  prefix: 'ISQ',
  currency: 'USD',
  logo_url: '/isquarebpo.png',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

function prismaToCompany(c: any): Company {
  return {
    id: c.id,
    user_id: c.userId ?? null,
    name: c.name === 'EdLink Pakistan' ? 'EdLink Australia' : c.name,
    logo_url: c.logoUrl || (c.name === 'EdLink Pakistan' || c.name === 'EdLink Australia' ? '/edlink-logo.png' : null),
    prefix: c.prefix,
    currency: c.currency,
    created_at: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
    updated_at: c.updatedAt ? new Date(c.updatedAt).toISOString() : new Date().toISOString(),
  }
}

export async function getCompanies(includeAnonymous = false): Promise<Company[]> {
  try {
    const dbCompanies = await prisma.company.findMany({
      orderBy: { createdAt: 'asc' },
    })

    if (dbCompanies && dbCompanies.length > 0) {
      let result: Company[] = dbCompanies
        .filter((c) => (c.name || '').toLowerCase() !== 'anonymous')
        .map(prismaToCompany)

      const hasNsc = result.some((c) => c.prefix === 'NSC')
      if (!hasNsc) result.push(NSC_COMPANY)
      const hasIsq = result.some((c) => c.prefix === 'ISQ')
      if (!hasIsq) result.push(ISQUARE_COMPANY)
      if (includeAnonymous) {
        const hasAnon = result.some((c) => c.id === ANONYMOUS_COMPANY.id || c.prefix === 'ANO')
        if (!hasAnon) result.push(ANONYMOUS_COMPANY)
      }
      return result
    }
  } catch (err) {
    console.warn('MySQL getCompanies warning:', err)
  }

  const base = [FALLBACK_COMPANY, NSC_COMPANY, ISQUARE_COMPANY]
  if (includeAnonymous) base.push(ANONYMOUS_COMPANY)
  return base
}

function isValidUUID(str?: string | null): boolean {
  if (!str) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim())
}

export async function getCompanyById(id: string): Promise<Company | null> {
  const clean = (id || '').toLowerCase().trim()
  if (clean === 'anonymous-company-id' || clean === 'anonymous' || clean === 'ano' || clean === 'custom' || clean === 'edlink-pk') {
    return ANONYMOUS_COMPANY
  }

  if (clean === 'nsc' || clean === 'nsc-company-id' || clean === 'neighbourhood-shine' || clean === 'neighbourhood shine' || clean === 'neighbourhood shine co.') {
    try {
      const dbNsc = await prisma.company.findFirst({
        where: {
          OR: [{ prefix: 'NSC' }, { name: { contains: 'Neighbourhood' } }],
        },
      })
      if (dbNsc) {
        return {
          ...prismaToCompany(dbNsc),
          name: 'Neighbourhood Shine Co.',
          logo_url: dbNsc.logoUrl || '/Neighbourhood-Shine.png',
          prefix: 'NSC',
        }
      }
    } catch {}
    return NSC_COMPANY
  }

  if (clean === 'isq' || clean === 'isquare' || clean === 'isquare-bpo' || clean === 'isquare-bpo-company-id') {
    try {
      const dbIsq = await prisma.company.findFirst({
        where: {
          OR: [{ prefix: 'ISQ' }, { name: { contains: 'ISquare' } }],
        },
      })
      if (dbIsq) {
        return {
          ...prismaToCompany(dbIsq),
          name: 'ISquare BPO',
          logo_url: dbIsq.logoUrl || '/isquarebpo.png',
          prefix: 'ISQ',
        }
      }
    } catch {}
    return ISQUARE_COMPANY
  }

  if (clean === 'edlink' || clean === 'edlink-australia' || clean === 'edlink-au' || clean === 'eda' || clean === 'edl' || clean === 'edlink-pk-id') {
    try {
      const dbEdlink = await prisma.company.findFirst({
        where: {
          OR: [{ prefix: 'EDA' }, { name: { contains: 'Australia' } }, { prefix: 'EDL' }],
        },
      })
      if (dbEdlink) {
        return {
          ...prismaToCompany(dbEdlink),
          name: 'EdLink Australia',
          logo_url: dbEdlink.logoUrl || '/edlink-logo.png',
        }
      }
    } catch {}
    return FALLBACK_COMPANY
  }

  try {
    if (isValidUUID(id)) {
      const dbCompany = await prisma.company.findUnique({ where: { id } })
      if (dbCompany) return prismaToCompany(dbCompany)
    }
    const first = await prisma.company.findFirst({ orderBy: { createdAt: 'asc' } })
    if (first) return prismaToCompany(first)
  } catch (err) {
    return FALLBACK_COMPANY
  }

  return FALLBACK_COMPANY
}

export async function createCompany(params: {
  name: string
  prefix: string
  currency?: string
  logo_url?: string | null
  template?: {
    name?: string
    address?: string
    email?: string
    phone?: string
    payment_details?: string
    bank_details?: string
    footer_terms?: string
    primary_color?: string
    layout_type?: string
  }
}): Promise<Company> {
  try {
    const created = await prisma.company.create({
      data: {
        name: params.name,
        prefix: params.prefix.toUpperCase(),
        currency: params.currency || 'AUD',
        logoUrl: params.logo_url || null,
      },
    })

    const templateData = params.template || {}
    await prisma.template.create({
      data: {
        companyId: created.id,
        name: templateData.name || `${created.name} Default Template`,
        companyName: created.name,
        address: templateData.address || '',
        email: templateData.email || '',
        phone: templateData.phone || '',
        paymentDetails: templateData.payment_details || '',
        bankDetails: templateData.bank_details || '',
        currency: created.currency,
        footerTerms: templateData.footer_terms || 'Thank you for getting services from us',
        primaryColor: templateData.primary_color || '#2563eb',
        layoutType: templateData.layout_type || 'edlink_v1',
      },
    }).catch(() => {})

    return prismaToCompany(created)
  } catch (err) {
    return FALLBACK_COMPANY
  }
}

export async function updateCompany(
  id: string,
  params: {
    name?: string
    prefix?: string
    currency?: string
    logo_url?: string | null
  }
): Promise<Company> {
  try {
    const updateData: any = {}

    if (params.name !== undefined) updateData.name = params.name
    if (params.prefix !== undefined) updateData.prefix = params.prefix.toUpperCase()
    if (params.currency !== undefined) updateData.currency = params.currency
    if (params.logo_url !== undefined) updateData.logoUrl = params.logo_url

    const updated = await prisma.company.update({
      where: { id },
      data: updateData,
    })

    return prismaToCompany(updated)
  } catch (err) {
    return FALLBACK_COMPANY
  }
}

export async function duplicateCompany(
  companyId: string,
  newName: string,
  newPrefix: string
): Promise<Company> {
  try {
    const original = await prisma.company.findUnique({ where: { id: companyId } })
    const originalTemplate = await prisma.template.findFirst({ where: { companyId } })

    const duplicatedCompany = await prisma.company.create({
      data: {
        name: newName,
        prefix: newPrefix.toUpperCase(),
        currency: original?.currency || 'AUD',
        logoUrl: original?.logoUrl || null,
      },
    })

    if (originalTemplate) {
      await prisma.template.create({
        data: {
          companyId: duplicatedCompany.id,
          name: `${newName} Template`,
          companyName: newName,
          address: originalTemplate.address,
          phone: originalTemplate.phone,
          email: originalTemplate.email,
          paymentDetails: originalTemplate.paymentDetails,
          bankDetails: originalTemplate.bankDetails,
          currency: originalTemplate.currency,
          footerTerms: originalTemplate.footerTerms,
          primaryColor: originalTemplate.primaryColor,
          layoutType: originalTemplate.layoutType,
        },
      }).catch(() => {})
    }

    return prismaToCompany(duplicatedCompany)
  } catch (err) {
    return {
      ...FALLBACK_COMPANY,
      id: `dup-${Date.now()}`,
      name: newName,
      prefix: newPrefix.toUpperCase(),
    }
  }
}

export async function deleteCompany(id: string): Promise<void> {
  try {
    await prisma.company.delete({ where: { id } })
  } catch (err) {
    // Silent catch
  }
}
