'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Template } from '@/lib/supabase/database.types'
import { getTemplates, duplicateTemplate } from '@/lib/services/template.service'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Edit3, Copy, Loader2, Building2, ShieldCheck, Mail, Phone, MapPin, Coins, CreditCard } from 'lucide-react'

export default function CompaniesPage() {
  const [templates, setTemplates] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  async function loadTemplates() {
    try {
      setIsLoading(true)
      await fetch('/api/setup-db')
      const data = await getTemplates()
      setTemplates(data)
    } catch (err) {
      console.error('Error loading company templates:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  async function handleDuplicateTemplate(t: any) {
    const newName = prompt('Enter name for duplicated company template:', `${t.name} Copy`)
    if (!newName) return
    try {
      await duplicateTemplate(t.id, t.company_id, newName)
      loadTemplates()
    } catch (err: any) {
      alert(err?.message || 'Failed to duplicate template')
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="font-['Montserrat'] text-2xl font-bold text-[#003D5C] tracking-tight">
            Registered Companies
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage registered billing entities, fixed contact information, and payment details
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#003D5C]" />
          <span>Loading company details...</span>
        </div>
      ) : templates.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-white border border-slate-200 rounded-lg">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No companies available</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="shadow-xs border-slate-200 hover:shadow-md transition-shadow flex flex-col justify-between rounded-xl overflow-hidden bg-white">
              <CardHeader className="bg-[#003D5C]/5 border-b border-slate-100 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src="/edlink-logo.png"
                      alt={template.companies?.name || template.company_name || 'EdLink Logo'}
                      className="h-10 object-contain"
                    />
                    <div>
                      <CardTitle className="font-['Montserrat'] text-lg font-bold text-[#003D5C]">
                        {template.companies?.name || template.company_name || template.name}
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#009D9E]" />
                        Primary Registered Billing Entity
                      </CardDescription>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-[#81F5F5] text-[#002020] font-mono font-bold text-[11px] border border-teal-200 uppercase tracking-wider">
                    PREFIX: {template.companies?.prefix || 'EDL'}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-700">
                <div className="space-y-2">
                  <h4 className="font-bold text-[#003D5C] uppercase tracking-wider text-[11px] border-b border-slate-100 pb-1 mb-2">
                    Fixed Contact Details
                  </h4>
                  <p className="flex items-start gap-2 text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span><strong className="text-slate-800">Add:</strong> {template.address || 'N/A'}</span>
                  </p>
                  <p className="flex items-center gap-2 text-slate-600">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span><strong className="text-slate-800">Email:</strong> {template.email || 'N/A'}</span>
                  </p>
                  <p className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span><strong className="text-slate-800">Phone:</strong> {template.phone || 'N/A'}</span>
                  </p>
                  <p className="flex items-center gap-2 text-slate-600">
                    <Coins className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span><strong className="text-slate-800">Currency:</strong> <span className="font-mono font-bold">{template.currency || 'AUD'}</span></span>
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-[#003D5C] uppercase tracking-wider text-[11px] border-b border-slate-100 pb-1 mb-2">
                    Payment Instructions
                  </h4>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[10px] whitespace-pre-line text-slate-700 leading-relaxed">
                    <div className="flex items-center gap-1.5 font-sans font-bold text-slate-800 mb-1">
                      <CreditCard className="w-3 h-3 text-[#009D9E]" />
                      Bank Account Details
                    </div>
                    {template.payment_details || 'N/A'}
                  </div>
                </div>
              </CardContent>

              <CardFooter className="p-4 bg-slate-50 border-t border-slate-100">
                <Link href={`/templates/${template.id}/edit`} className="w-full">
                  <Button variant="default" size="sm" className="w-full bg-[#009D9E] hover:bg-[#007A7A] text-white gap-2 text-xs font-semibold">
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit Fixed Information
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
