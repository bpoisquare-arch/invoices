import { createClient } from '@/lib/supabase/client'
import { Template } from '@/lib/supabase/database.types'

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

function isValidUUID(str?: string | null): boolean {
  if (!str) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim())
}

// Clean up stale localStorage cache from previous versions
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('edlink_template_customizations')
  } catch {
    // Ignore
  }
}

function normalizeTemplate<T extends Template>(t: T): T {
  if (!t) return t
  const companyName = t.company_name === 'EdLink Pakistan' ? 'EdLink Australia' : t.company_name
  const name = t.name === 'EdLink Pakistan Standard Template' ? 'EdLink Australia Standard Template' : t.name
  return {
    ...t,
    company_name: companyName,
    name: name,
  }
}

export async function getTemplates(): Promise<(Template & { companies?: { name: string; prefix: string } | null })[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('templates')
      .select('*, companies(name, prefix)')
      .order('created_at', { ascending: true })

    if (!error && data && data.length > 0) {
      const valid = data
        .filter(
          (t) =>
            (t.company_name || '').toLowerCase() !== 'anonymous' &&
            (t.companies?.name || '').toLowerCase() !== 'anonymous'
        )
        .map((t) => {
          const normalized = normalizeTemplate(t)
          if (normalized.companies && normalized.companies.name === 'EdLink Pakistan') {
            normalized.companies.name = 'EdLink Australia'
          }
          return normalized
        })

      if (valid.length > 0) return valid
    }
  } catch (err) {
    console.error('Error fetching templates:', err)
  }

  return [{ ...FALLBACK_TEMPLATE, companies: { name: FALLBACK_TEMPLATE.company_name || 'EdLink Australia', prefix: 'EDL' } }]
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

export async function getTemplateByCompanyId(companyId: string): Promise<Template | null> {
  const clean = (companyId || '').toLowerCase().trim()
  if (clean === 'anonymous-company-id' || clean === 'anonymous' || clean === 'ano' || clean === 'custom' || clean === 'edlink-pk') {
    return ANONYMOUS_TEMPLATE
  }

  if (clean === 'nsc' || clean === 'nsc-company-id' || clean === 'nsc-template-id' || clean === 'neighbourhood-shine' || clean === 'neighbourhood shine' || clean === 'neighbourhood shine co.') {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('templates')
        .select('*')
        .or('name.ilike.%Neighbourhood%,company_name.ilike.%Neighbourhood%')
        .limit(1)
        .maybeSingle()
      if (data) return normalizeTemplate({ ...data, layout_type: 'nsc_v1' })
    } catch {
      // Ignore
    }
    return NSC_TEMPLATE
  }

  if (clean === 'isq' || clean === 'isquare' || clean === 'isquare-bpo' || clean === 'isquare-bpo-company-id' || clean === 'isquare-bpo-template-id') {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('templates')
        .select('*')
        .or('name.ilike.%ISquare%,company_name.ilike.%ISquare%')
        .limit(1)
        .maybeSingle()
      if (data) return normalizeTemplate(data)
    } catch {
      // Ignore
    }
    return ISQUARE_TEMPLATE
  }

  try {
    const supabase = createClient()
    if (isValidUUID(companyId)) {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('company_id', companyId)
        .single()

      if (!error && data) {
        return normalizeTemplate(data)
      }
    }

    // Try finding template for non-anonymous company
    const { data: list, error: listErr } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: true })

    if (!listErr && list && list.length > 0) {
      const valid = list.find(
        (t) =>
          (t.company_name || '').toLowerCase() !== 'anonymous' &&
          (t.name || '').toLowerCase() !== 'anonymous'
      )
      if (valid) return normalizeTemplate(valid)
      return normalizeTemplate(list[0])
    }
  } catch (err) {
    // Fallback below
  }

  return FALLBACK_TEMPLATE
}

export async function getTemplateById(id: string): Promise<Template | null> {
  try {
    const supabase = createClient()
    if (isValidUUID(id)) {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('id', id)
        .single()

      if (!error && data) {
        return normalizeTemplate(data)
      }
    }

    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (!error && data) {
      return normalizeTemplate(data)
    }
  } catch (err) {
    // Fallback below
  }

  return FALLBACK_TEMPLATE
}

export async function updateTemplate(
  id: string,
  updates: Partial<Omit<Template, 'id' | 'company_id' | 'created_at'>>
): Promise<Template> {
  try {
    const supabase = createClient()
    let targetId = id

    if (!isValidUUID(targetId)) {
      const { data: first } = await supabase
        .from('templates')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
        .single()
      if (first) {
        targetId = first.id
      }
    }

    if (isValidUUID(targetId)) {
      const { data, error } = await supabase
        .from('templates')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetId)
        .select()
        .single()

      if (error || !data) {
        throw new Error(error?.message || 'Failed to update template in database')
      }

      // Also sync company name/currency with parent company record if exists
      if (data.company_id && (updates.company_name || updates.currency)) {
        await supabase
          .from('companies')
          .update({
            ...(updates.company_name ? { name: updates.company_name } : {}),
            ...(updates.currency ? { currency: updates.currency } : {}),
          })
          .eq('id', data.company_id)
      }

      return normalizeTemplate(data)
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
    const supabase = createClient()

    const original = await getTemplateById(templateId)
    const base = original || FALLBACK_TEMPLATE

    const { data: copy, error: createErr } = await supabase
      .from('templates')
      .insert({
        company_id: newCompanyId,
        name: newTemplateName,
        company_name: base.company_name,
        address: base.address,
        phone: base.phone,
        email: base.email,
        payment_details: base.payment_details,
        bank_details: base.bank_details,
        currency: base.currency,
        footer_terms: base.footer_terms,
        primary_color: base.primary_color,
        layout_type: base.layout_type,
      })
      .select()
      .single()

    if (createErr || !copy) {
      throw new Error(createErr?.message || 'Failed to duplicate template')
    }

    return copy
  } catch (err) {
    return {
      ...FALLBACK_TEMPLATE,
      id: `tpl-${Date.now()}`,
      name: newTemplateName,
      company_id: newCompanyId,
    }
  }
}
