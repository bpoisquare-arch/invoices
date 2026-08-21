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

export async function getTemplateByCompanyId(companyId: string): Promise<Template | null> {
  if (companyId === 'anonymous-company-id' || companyId === 'anonymous') {
    return ANONYMOUS_TEMPLATE
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
    } else {
      // If companyId is not a UUID, return first template in DB or fallback
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .limit(1)
        .single()

      if (!error && data) {
        return normalizeTemplate(data)
      }
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
    } else {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .limit(1)
        .single()

      if (!error && data) {
        return normalizeTemplate(data)
      }
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
  if (!isValidUUID(id)) {
    return { ...FALLBACK_TEMPLATE, ...updates }
  }

  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('templates')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      throw new Error(error?.message || 'Failed to update template in database')
    }

    return data
  } catch (err: any) {
    throw new Error(err?.message || 'Failed to update template')
  }
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
