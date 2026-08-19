'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Template } from '@/lib/supabase/database.types'
import { getTemplates, duplicateTemplate } from '@/lib/services/template.service'
import { getCompanies } from '@/lib/services/company.service'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LayoutTemplate, Edit3, Copy, Loader2, Sparkles, Building2 } from 'lucide-react'

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  async function loadTemplates() {
    try {
      setIsLoading(true)
      const data = await getTemplates()
      setTemplates(data)
    } catch (err) {
      console.error('Error loading templates:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  async function handleDuplicateTemplate(t: any) {
    const newName = prompt('Enter name for duplicated template:', `${t.name} Copy`)
    if (!newName) return
    try {
      await duplicateTemplate(t.id, t.company_id, newName)
      loadTemplates()
    } catch (err: any) {
      alert(err?.message || 'Failed to duplicate template')
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Invoice Templates</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure company fixed information, layouts, colors, and payment instructions
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span>Loading templates...</span>
        </div>
      ) : templates.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-white border border-slate-200 rounded-lg">
          <LayoutTemplate className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No templates available</h3>
          <p className="text-xs text-slate-500 mt-1">Add a company to generate its default invoice template.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="shadow-xs border-slate-200 hover:shadow-md transition-shadow flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
                    <LayoutTemplate className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[11px] border border-indigo-200 uppercase tracking-wider">
                    {template.layout_type || 'edlink_v1'}
                  </span>
                </div>
                <CardTitle className="text-lg font-bold text-slate-900 mt-3">{template.name}</CardTitle>
                <CardDescription className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  Company: <span className="font-semibold text-slate-700">{template.companies?.name || template.company_name}</span>
                </CardDescription>
              </CardHeader>

              <CardContent className="py-2 text-xs text-slate-600 space-y-1.5 border-t border-slate-100 mt-2">
                <p className="truncate"><span className="font-semibold text-slate-700">Email:</span> {template.email || 'N/A'}</p>
                <p className="truncate"><span className="font-semibold text-slate-700">Phone:</span> {template.phone || 'N/A'}</p>
                <p className="truncate"><span className="font-semibold text-slate-700">Currency:</span> {template.currency || 'AUD'}</p>
              </CardContent>

              <CardFooter className="pt-3 pb-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <Link href={`/templates/${template.id}/edit`} className="w-full">
                  <Button variant="default" size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2 text-xs">
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit Fixed Template Info
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-xs text-slate-700 hover:bg-slate-50"
                  onClick={() => handleDuplicateTemplate(template)}
                  title="Duplicate Template"
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
