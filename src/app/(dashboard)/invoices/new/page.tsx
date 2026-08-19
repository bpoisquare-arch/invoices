'use client'

export const dynamic = 'force-dynamic'

import React, { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Company, Template } from '@/lib/supabase/database.types'
import { getCompanies, getCompanyById } from '@/lib/services/company.service'
import { getTemplateByCompanyId } from '@/lib/services/template.service'
import InvoiceForm from '@/components/invoices/invoice-form'
import { Loader2 } from 'lucide-react'

function CreateInvoiceContent() {
  const searchParams = useSearchParams()
  const companyId = searchParams.get('companyId')
  const router = useRouter()

  const [company, setCompany] = useState<Company | null>(null)
  const [template, setTemplate] = useState<Template | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        await fetch('/api/setup-db')

        let targetCompanyId = companyId
        if (!targetCompanyId) {
          const comps = await getCompanies()
          if (comps.length > 0) {
            targetCompanyId = comps[0].id
          }
        }

        if (targetCompanyId) {
          const comp = await getCompanyById(targetCompanyId)
          if (comp) {
            setCompany(comp)
            const t = await getTemplateByCompanyId(targetCompanyId)
            setTemplate(t)
          }
        }
      } catch (err) {
        console.error('Error loading company for invoice creation:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [companyId])

  if (isLoading || !company) {
    return (
      <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#003D5C]" />
        <span>Loading EdLink Pakistan Invoice Template...</span>
      </div>
    )
  }

  return <InvoiceForm mode="create" company={company} template={template} />
}

export default function NewInvoicePage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#003D5C]" />
          <span>Loading...</span>
        </div>
      }
    >
      <CreateInvoiceContent />
    </Suspense>
  )
}
