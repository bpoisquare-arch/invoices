import { createClient } from '@/lib/supabase/server'

export async function ensureSeedData() {
  try {
    const supabase = await createClient()

    // Check if companies exist
    const { data: existingCompanies, error: fetchErr } = await supabase
      .from('companies')
      .select('id, name')

    if (fetchErr) {
      console.warn('Could not query companies table:', fetchErr.message)
      return { success: false, error: fetchErr.message }
    }

    if (existingCompanies && existingCompanies.length > 0) {
      // 1. Remove any inadvertently created Anonymous company
      const { data: anonComps } = await supabase.from('companies').select('id').ilike('name', 'anonymous')
      if (anonComps && anonComps.length > 0) {
        for (const ac of anonComps) {
          await supabase.from('templates').delete().eq('company_id', ac.id)
          await supabase.from('companies').delete().eq('id', ac.id)
        }
      }

      // 2. Ensure EdLink Australia company & template has full details restored
      await supabase
        .from('companies')
        .update({
          name: 'EdLink Australia',
          prefix: 'EDL',
          currency: 'AUD',
          logo_url: '/edlink-logo.png',
        })
        .or('name.eq.EdLink Pakistan,name.eq.EdLink Australia,name.eq.Anonymous')

      await supabase
        .from('templates')
        .update({
          name: 'EdLink Australia Standard Template',
          company_name: 'EdLink Australia',
          address: 'Suit 3, Level 4/20 Collins Street, Melbourne 3000',
          email: 'finance@edlink.com.au',
          phone: '+61 432 536 123',
          payment_details: 'Account Name: Riaz & Sons PTY Ltd\nBSB: 083-543\nAccount No: 72-996-1834\nABN: 62 658 488 469',
          bank_details: 'Riaz & Sons PTY Ltd (BSB: 083-543, Account: 72-996-1834)',
          currency: 'AUD',
          footer_terms: 'Thank you for getting services from us',
          primary_color: '#2563eb',
          layout_type: 'edlink_v1',
        })
        .or('company_name.eq.EdLink Pakistan,company_name.eq.EdLink Australia,company_name.eq.Anonymous')

      return { success: true, message: 'Companies updated and restored.', count: existingCompanies.length }
    }

    // 1. EdLink Pakistan
    const { data: comp1, error: e1 } = await supabase
      .from('companies')
      .insert({
        name: 'EdLink Pakistan',
        prefix: 'EDL',
        currency: 'AUD',
        logo_url: null,
      })
      .select()
      .single()

    if (comp1) {
      await supabase.from('templates').insert({
        company_id: comp1.id,
        name: 'EdLink Pakistan Standard Template',
        company_name: 'EdLink Pakistan',
        address: 'Suit 3, Level 4/20 Collins Street, Melbourne 3000',
        email: 'finance@edlink.com.au',
        phone: '+61 432 536 123',
        payment_details: 'Account Name: Riaz & Sons PTY Ltd\nBSB: 083-543\nAccount No: 72-996-1834\nABN: 62 658 488 469',
        bank_details: 'Riaz & Sons PTY Ltd (BSB: 083-543, Account: 72-996-1834)',
        currency: 'AUD',
        footer_terms: 'Thank you for getting services from us',
        primary_color: '#2563eb',
        layout_type: 'edlink_v1',
      })
    }

    // 2. EdLink Australia
    const { data: comp2 } = await supabase
      .from('companies')
      .insert({
        name: 'EdLink Australia',
        prefix: 'EDA',
        currency: 'AUD',
        logo_url: null,
      })
      .select()
      .single()

    if (comp2) {
      await supabase.from('templates').insert({
        company_id: comp2.id,
        name: 'EdLink Australia Standard Template',
        company_name: 'EdLink Australia',
        address: 'Level 1, 100 Collins Street, Melbourne VIC 3000',
        email: 'australia@edlink.com.au',
        phone: '+61 3 9000 1234',
        payment_details: 'Account Name: EdLink Australia PTY Ltd\nBSB: 063-000\nAccount No: 1234 5678',
        bank_details: 'EdLink Australia PTY Ltd',
        currency: 'AUD',
        footer_terms: 'Thank you for choosing EdLink Australia.',
        primary_color: '#0284c7',
        layout_type: 'default_v1',
      })
    }

    // 3. iSquare BPO
    const { data: comp3 } = await supabase
      .from('companies')
      .insert({
        name: 'iSquare BPO',
        prefix: 'ISQ',
        currency: 'USD',
        logo_url: null,
      })
      .select()
      .single()

    if (comp3) {
      await supabase.from('templates').insert({
        company_id: comp3.id,
        name: 'iSquare BPO Standard Template',
        company_name: 'iSquare BPO',
        address: 'Suite 500, Tech Park, Islamabad, Pakistan',
        email: 'invoicing@isquarebpo.com',
        phone: '+92 51 111 222 333',
        payment_details: 'Account Name: iSquare BPO Solutions\nSWIFT: ISQBPOPK\nAccount No: 9876543210',
        bank_details: 'iSquare BPO Solutions',
        currency: 'USD',
        footer_terms: 'Payment due within 15 days of invoice date.',
        primary_color: '#7c3aed',
        layout_type: 'default_v1',
      })
    }

    return { success: true, message: 'Initial companies and templates seeded successfully.' }
  } catch (err: any) {
    console.error('Seed error:', err)
    return { success: false, error: err.message }
  }
}
