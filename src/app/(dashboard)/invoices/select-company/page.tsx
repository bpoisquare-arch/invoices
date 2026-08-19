'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Company } from '@/lib/supabase/database.types'
import { getCompanies } from '@/lib/services/company.service'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, ArrowRight, Loader2, FilePlus, Sparkles } from 'lucide-react'

export default function SelectCompanyPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        const comps = await getCompanies()
        setCompanies(comps)
      } catch (err) {
        console.error('Error fetching companies:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  function handleSelectCompany(companyId: string) {
    router.push(`/invoices/new?companyId=${companyId}`)
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-4">
      <div className="text-center max-w-xl mx-auto space-y-2">
        <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
          <FilePlus className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Select Company</h1>
        <p className="text-sm text-slate-500">
          Choose which company template to load for generating your new invoice.
        </p>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span>Loading available companies...</span>
        </div>
      ) : companies.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-white border border-slate-200 rounded-lg space-y-3">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No companies found</h3>
          <p className="text-xs text-slate-500">You must create a company before generating invoices.</p>
          <Link href="/companies">
            <Button className="bg-blue-600 text-white gap-2">
              <Building2 className="w-4 h-4" />
              Go to Companies
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {companies.map((company) => (
            <Card
              key={company.id}
              className="shadow-xs border-slate-200 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              onClick={() => handleSelectCompany(company.id)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200 uppercase tracking-wider">
                    {company.prefix}
                  </span>
                </div>
                <CardTitle className="text-lg font-bold text-slate-900 mt-4 group-hover:text-blue-600 transition-colors">
                  {company.name}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Loads {company.name}'s assigned template
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button className="w-full bg-slate-100 hover:bg-blue-600 text-slate-800 group-hover:text-white justify-between text-xs font-semibold">
                  <span>Generate Invoice</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
