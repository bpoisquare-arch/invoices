import { createClient } from '@/lib/supabase/client'
import { Company } from '@/lib/supabase/database.types'

export const FALLBACK_COMPANY: Company = {
  id: 'edlink-pk-id',
  user_id: null,
  name: 'EdLink Pakistan',
  prefix: 'EDL',
  currency: 'AUD',
  logo_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export async function getCompanies(): Promise<Company[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: true })

    if (error || !data || data.length === 0) {
      return [FALLBACK_COMPANY]
    }

    return data
  } catch (err) {
    return [FALLBACK_COMPANY]
  }
}

function isValidUUID(str?: string | null): boolean {
  if (!str) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim())
}

export async function getCompanyById(id: string): Promise<Company | null> {
  try {
    const supabase = createClient()
    if (isValidUUID(id)) {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .single()

      if (!error && data) {
        return data
      }
    }
    // If not a valid UUID or not found, try to return first company in DB
    const { data: first } = await supabase.from('companies').select('*').limit(1).single()
    if (first) return first
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
    const supabase = createClient()

    const { data: company, error: companyErr } = await supabase
      .from('companies')
      .insert({
        name: params.name,
        prefix: params.prefix.toUpperCase(),
        currency: params.currency || 'AUD',
        logo_url: params.logo_url || null,
      })
      .select()
      .single()

    if (companyErr || !company) {
      return {
        ...FALLBACK_COMPANY,
        name: params.name,
        prefix: params.prefix.toUpperCase(),
      }
    }

    const templateData = params.template || {}
    await supabase.from('templates').insert({
      company_id: company.id,
      name: templateData.name || `${company.name} Default Template`,
      company_name: company.name,
      address: templateData.address || '',
      email: templateData.email || '',
      phone: templateData.phone || '',
      payment_details: templateData.payment_details || '',
      bank_details: templateData.bank_details || '',
      currency: company.currency,
      footer_terms: templateData.footer_terms || 'Thank you for getting services from us',
      primary_color: templateData.primary_color || '#2563eb',
      layout_type: templateData.layout_type || 'edlink_v1',
    })

    return company
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
    const supabase = createClient()
    const updateData: any = { updated_at: new Date().toISOString() }

    if (params.name !== undefined) updateData.name = params.name
    if (params.prefix !== undefined) updateData.prefix = params.prefix.toUpperCase()
    if (params.currency !== undefined) updateData.currency = params.currency
    if (params.logo_url !== undefined) updateData.logo_url = params.logo_url

    const { data, error } = await supabase
      .from('companies')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      return {
        ...FALLBACK_COMPANY,
        ...params,
        prefix: params.prefix ? params.prefix.toUpperCase() : FALLBACK_COMPANY.prefix,
      }
    }

    return data
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
    const supabase = createClient()

    const { data: original } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single()

    const { data: originalTemplate } = await supabase
      .from('templates')
      .select('*')
      .eq('company_id', companyId)
      .single()

    const { data: duplicatedCompany, error: createErr } = await supabase
      .from('companies')
      .insert({
        name: newName,
        prefix: newPrefix.toUpperCase(),
        currency: original?.currency || 'AUD',
        logo_url: original?.logo_url || null,
      })
      .select()
      .single()

    if (createErr || !duplicatedCompany) {
      return {
        ...FALLBACK_COMPANY,
        id: `dup-${Date.now()}`,
        name: newName,
        prefix: newPrefix.toUpperCase(),
      }
    }

    if (originalTemplate) {
      await supabase.from('templates').insert({
        company_id: duplicatedCompany.id,
        name: `${newName} Template`,
        company_name: newName,
        address: originalTemplate.address,
        phone: originalTemplate.phone,
        email: originalTemplate.email,
        payment_details: originalTemplate.payment_details,
        bank_details: originalTemplate.bank_details,
        currency: originalTemplate.currency,
        footer_terms: originalTemplate.footer_terms,
        primary_color: originalTemplate.primary_color,
        layout_type: originalTemplate.layout_type,
      })
    }

    return duplicatedCompany
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
    const supabase = createClient()
    await supabase.from('companies').delete().eq('id', id)
  } catch (err) {
    // Silent catch
  }
}
