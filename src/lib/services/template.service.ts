import { createClient } from '@/lib/supabase/client'
import { Template } from '@/lib/supabase/database.types'

export const FALLBACK_TEMPLATE: Template = {
  id: 'edlink-pk-template-id',
  company_id: 'edlink-pk-id',
  name: 'EdLink Pakistan Standard Template',
  company_name: 'EdLink Pakistan',
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

const STORAGE_KEY = 'edlink_template_customizations'

function getStoredTemplateData(): Partial<Template> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function setStoredTemplateData(updates: Partial<Template>) {
  if (typeof window === 'undefined') return
  try {
    const existing = getStoredTemplateData() || {}
    const merged = { ...existing, ...updates }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
  } catch {
    // Ignore error
  }
}

const localTemplatesMap: Record<string, Template> = {
  'edlink-pk-template-id': { ...FALLBACK_TEMPLATE },
  'edlink-pk-id': { ...FALLBACK_TEMPLATE },
}

export async function getTemplates(): Promise<(Template & { companies?: { name: string; prefix: string } | null })[]> {
  const stored = getStoredTemplateData()
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('templates')
      .select('*, companies(name, prefix)')
      .order('created_at', { ascending: true })

    if (!error && data && data.length > 0) {
      data.forEach((t) => {
        localTemplatesMap[t.id] = { ...t, ...stored }
        if (t.company_id) localTemplatesMap[t.company_id] = { ...t, ...stored }
      })
      return data.map((t) => ({ ...t, ...stored }))
    }
  } catch (err) {
    // Ignore error
  }

  const fallbackItem = { ...(localTemplatesMap['edlink-pk-template-id'] || FALLBACK_TEMPLATE), ...stored }
  return [{ ...fallbackItem, companies: { name: fallbackItem.company_name || 'EdLink Pakistan', prefix: 'EDL' } }]
}

export async function getTemplateByCompanyId(companyId: string): Promise<Template | null> {
  const stored = getStoredTemplateData()
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('company_id', companyId)
      .single()

    if (!error && data) {
      const merged = { ...data, ...stored }
      localTemplatesMap[data.id] = merged
      localTemplatesMap[companyId] = merged
      return merged
    }
  } catch (err) {
    // Ignore error
  }

  const base = localTemplatesMap[companyId] || localTemplatesMap['edlink-pk-template-id'] || FALLBACK_TEMPLATE
  return { ...base, ...stored }
}

export async function getTemplateById(id: string): Promise<Template | null> {
  const stored = getStoredTemplateData()
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .single()

    if (!error && data) {
      const merged = { ...data, ...stored }
      localTemplatesMap[data.id] = merged
      if (data.company_id) localTemplatesMap[data.company_id] = merged
      return merged
    }
  } catch (err) {
    // Ignore error
  }

  const base = localTemplatesMap[id] || localTemplatesMap['edlink-pk-template-id'] || FALLBACK_TEMPLATE
  return { ...base, ...stored }
}

export async function updateTemplate(
  id: string,
  updates: Partial<Omit<Template, 'id' | 'company_id' | 'created_at'>>
): Promise<Template> {
  setStoredTemplateData(updates)
  const current = localTemplatesMap[id] || localTemplatesMap['edlink-pk-template-id'] || { ...FALLBACK_TEMPLATE, id }
  const updated: Template = {
    ...current,
    ...updates,
    updated_at: new Date().toISOString(),
  }

  localTemplatesMap[id] = updated
  if (updated.company_id) {
    localTemplatesMap[updated.company_id] = updated
  }
  Object.assign(FALLBACK_TEMPLATE, updates)

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

    if (!error && data) {
      const merged = { ...data, ...updates }
      localTemplatesMap[id] = merged
      if (data.company_id) localTemplatesMap[data.company_id] = merged
      Object.assign(FALLBACK_TEMPLATE, merged)
      return merged
    }
  } catch (err) {
    // Ignore error
  }

  return updated
}

export async function duplicateTemplate(
  templateId: string,
  newCompanyId: string,
  newTemplateName: string
): Promise<Template> {
  try {
    const supabase = createClient()

    const { data: copy, error: createErr } = await supabase
      .from('templates')
      .insert({
        company_id: newCompanyId,
        name: newTemplateName,
        company_name: FALLBACK_TEMPLATE.company_name,
        address: FALLBACK_TEMPLATE.address,
        phone: FALLBACK_TEMPLATE.phone,
        email: FALLBACK_TEMPLATE.email,
        payment_details: FALLBACK_TEMPLATE.payment_details,
        bank_details: FALLBACK_TEMPLATE.bank_details,
        currency: FALLBACK_TEMPLATE.currency,
        footer_terms: FALLBACK_TEMPLATE.footer_terms,
        primary_color: FALLBACK_TEMPLATE.primary_color,
        layout_type: FALLBACK_TEMPLATE.layout_type,
      })
      .select()
      .single()

    if (createErr || !copy) {
      return {
        ...FALLBACK_TEMPLATE,
        id: `tpl-${Date.now()}`,
        name: newTemplateName,
        company_id: newCompanyId,
      }
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
