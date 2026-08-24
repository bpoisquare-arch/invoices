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

  const [activeEntity, setActiveEntity] = useState<string>('edlink-pk')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('active_entity') || 'edlink-pk'
      setActiveEntity(stored)
    }
  }, [])

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        const comps = await getCompanies(true)
        setCompanies(comps)
      } catch (err) {
        console.error('Error fetching companies:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  function handleSelectCompany(company: Company) {
    const isAnon = company.prefix === 'ANO' || company.name.toLowerCase() === 'anonymous'
    const slug = isAnon ? 'anonymous' : 'edlink'
    router.push(`/invoices/new?company=${slug}`)
  }

  const isEdLinkAu = activeEntity === 'edlink-au'
  const isEdLinkPk = !isEdLinkAu

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-4">
      <div className="text-center max-w-xl mx-auto space-y-2 px-2">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
          <FilePlus className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Select Company</h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Choose which company template to load for generating your new invoice.
        </p>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span>Loading available companies...</span>
        </div>
      ) : companies.length === 0 ? (
        <div className="p-8 sm:p-12 text-center text-slate-500 bg-white border border-slate-200 rounded-lg space-y-3">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {companies
            .filter((c) => {
              const nameLower = c.name.toLowerCase()
              const isAnon = c.prefix === 'ANO' || nameLower === 'anonymous'
              if (isEdLinkPk) {
                return isAnon
              }
              if (isEdLinkAu) {
                return !isAnon && (c.prefix === 'EDL' || nameLower.includes('edlink'))
              }
              return true
            })
            .map((company) => {
              const isAnon = company.prefix === 'ANO' || company.name.toLowerCase() === 'anonymous'
              const displayName = isAnon ? 'Anonymous / Custom' : 'EdLink Australia'
              const logoSrc = isAnon ? '' : '/edlink-logo.png'

              return (
                <Card
                  key={company.id}
                  className="shadow-xs border-slate-200 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between rounded-xl bg-white"
                  onClick={() => handleSelectCompany(company)}
                >
                  <CardHeader className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="h-12 w-32 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center p-2 overflow-hidden group-hover:bg-blue-50/50 group-hover:border-blue-200 transition-colors">
                        {isAnon ? (
                          <div className="flex items-center gap-1.5 text-blue-600 font-bold text-xs">
                            <Sparkles className="w-4 h-4 text-blue-500" />
                            <span>Flexible / Custom</span>
                          </div>
                        ) : (
                          <img
                            src={logoSrc}
                            alt={displayName}
                            className="max-h-full max-w-full object-contain"
                          />
                        )}
                      </div>
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200 uppercase tracking-wider font-mono">
                        {company.prefix}
                      </span>
                    </div>
                    <CardTitle className="text-xl font-bold text-slate-900 mt-4 group-hover:text-blue-600 transition-colors font-['Montserrat']">
                      {displayName}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-1">
                      {isAnon
                        ? 'Upload custom logo or text, manual details & currency'
                        : `Loads ${displayName}'s assigned template`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <Button className="w-full bg-[#81F5F5]/30 hover:bg-blue-600 text-blue-900 hover:text-white justify-between text-xs font-semibold h-10 border border-teal-200/60 group-hover:border-blue-600 transition-colors">
                      <span>Generate Invoice</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
        </div>
      )}
    </div>
  )
}
