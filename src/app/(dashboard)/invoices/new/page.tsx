'use client'

export const dynamic = 'force-dynamic'

import React, { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Company, Template } from '@/types/database.types'
import { getCompanies, getCompanyById } from '@/lib/services/company.service'
import { getTemplateByCompanyId } from '@/lib/services/template.service'
import InvoiceForm from '@/components/invoices/invoice-form'
import { Loader2 } from 'lucide-react'

function CreateInvoiceContent() {
  const searchParams = useSearchParams()
  const rawParam = searchParams.get('company') || searchParams.get('companyId')
  const [companyParam, setCompanyParam] = useState<string>(rawParam || 'edlink-pk')
  const router = useRouter()

  const [company, setCompany] = useState<Company | null>(null)
  const [template, setTemplate] = useState<Template | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (rawParam) {
      setCompanyParam(rawParam)
    } else if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('active_entity')
      if (stored === 'nsc') setCompanyParam('nsc')
      else if (stored === 'isquare-bpo') setCompanyParam('isq')
      else if (stored === 'edlink-au') setCompanyParam('edlink')
      else setCompanyParam('edlink-pk')
    }
  }, [rawParam])

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        await fetch('/api/setup-db')

        const comp = await getCompanyById(companyParam)
        if (comp) {
          setCompany(comp)
          const isEdlinkPk = comp.prefix === 'EDL' || comp.name.toLowerCase().includes('pakistan') || companyParam === 'edlink-pk' || companyParam === 'anonymous'
          const target = (comp.id === 'anonymous-company-id' || comp.name.toLowerCase() === 'anonymous' || isEdlinkPk) ? 'anonymous' : comp.id
          const t = await getTemplateByCompanyId(target)
          setTemplate(t)
        }
      } catch (err) {
        console.error('Error loading company for invoice creation:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [companyParam])

  if (isLoading || !company) {
    return (
      <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#003D5C]" />
        <span>Loading Invoice Template...</span>
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
