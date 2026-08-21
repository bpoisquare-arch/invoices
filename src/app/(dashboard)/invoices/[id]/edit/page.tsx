'use client'

export const dynamic = 'force-dynamic'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Company, InvoiceWithDetails, Template } from '@/lib/supabase/database.types'
import { getInvoiceById } from '@/lib/services/invoice.service'
import { getCompanyById } from '@/lib/services/company.service'
import { getTemplateByCompanyId } from '@/lib/services/template.service'
import InvoiceForm from '@/components/invoices/invoice-form'
import { Loader2 } from 'lucide-react'

export default function EditInvoicePage() {
  const params = useParams()
  const invoiceId = params.id as string
  const router = useRouter()

  const [invoice, setInvoice] = useState<InvoiceWithDetails | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [template, setTemplate] = useState<Template | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadInvoice() {
      try {
        setIsLoading(true)
        const inv = await getInvoiceById(invoiceId)
        if (!inv) {
          router.push('/invoices')
          return
        }
        setInvoice(inv)

        // Resolve company
        let comp: Company | null = inv.companies || null
        if (!comp && inv.company_id) {
          comp = await getCompanyById(inv.company_id)
        }
        if (!comp) {
          comp = {
            id: inv.company_id || 'edlink-pk-id',
            user_id: null,
            name: inv.template_snapshot?.company_name || 'EdLink Australia',
            prefix: 'EDL',
            currency: inv.template_snapshot?.currency || 'AUD',
            logo_url: inv.template_snapshot?.logo_url || '/edlink-logo.png',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        }
        setCompany(comp)

        // Resolve template
        let tmpl: Template | null = inv.templates || null
        if (!tmpl && comp?.id) {
          tmpl = await getTemplateByCompanyId(comp.id)
        }
        setTemplate(tmpl)
      } catch (err) {
        console.error('Error loading invoice for edit:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadInvoice()
  }, [invoiceId, router])

  if (isLoading || !invoice || !company) {
    return (
      <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span>Loading Invoice Data...</span>
      </div>
    )
  }

  return (
    <InvoiceForm
      mode="edit"
      company={company}
      template={template}
      existingInvoice={invoice}
    />
  )
}
