'use client'

export const dynamic = 'force-dynamic'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Template } from '@/lib/supabase/database.types'
import { getTemplateById, updateTemplate } from '@/lib/services/template.service'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save, Loader2, CheckCircle2 } from 'lucide-react'

const templateSchema = z.object({
  name: z.string().min(2, { message: 'Template name required.' }),
  company_name: z.string().min(2, { message: 'Company name required.' }),
  address: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  payment_details: z.string().optional(),
  bank_details: z.string().optional(),
  currency: z.string().min(2),
  footer_terms: z.string().optional(),
  primary_color: z.string().optional(),
  layout_type: z.string().optional(),
})

type TemplateFormValues = z.infer<typeof templateSchema>

export default function TemplateEditorPage() {
  const params = useParams()
  const templateId = params.id as string
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: '',
      company_name: '',
      address: '',
      email: '',
      phone: '',
      payment_details: '',
      bank_details: '',
      currency: 'AUD',
      footer_terms: '',
      primary_color: '#2563eb',
      layout_type: 'edlink_v1',
    },
  })

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        const t = await getTemplateById(templateId)
        if (t) {
          form.reset({
            name: t.name,
            company_name: t.company_name,
            address: t.address || '',
            email: t.email || '',
            phone: t.phone || '',
            payment_details: t.payment_details || '',
            bank_details: t.bank_details || '',
            currency: t.currency || 'AUD',
            footer_terms: t.footer_terms || '',
            primary_color: t.primary_color || '#2563eb',
            layout_type: t.layout_type || 'edlink_v1',
          })
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load template')
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [templateId, form])

  async function onSubmit(values: TemplateFormValues) {
    setIsSaving(true)
    setError(null)
    setSuccessMsg(false)
    try {
      await updateTemplate(templateId, values)
      setSuccessMsg(true)
      setTimeout(() => setSuccessMsg(false), 3000)
    } catch (err: any) {
      setError(err?.message || 'Failed to update template')
    } finally {
      setIsSaving(false)
    }
  }

  function onInvalid(errors: any) {
    console.error('Validation errors:', errors)
    const firstKey = Object.keys(errors)[0]
    if (firstKey) {
      setError(`Please check field: ${firstKey} (${errors[firstKey]?.message || 'invalid'})`)
    }
  }

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span>Loading Template Editor...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/companies')}
            className="gap-2 text-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Companies
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Edit Template Fixed Fields</h1>
            <p className="text-xs text-slate-500">
              Values updated here automatically appear on all future invoices created for this company.
            </p>
          </div>
        </div>

        <Button
          onClick={form.handleSubmit(onSubmit, onInvalid)}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2 font-semibold"
          disabled={isSaving}
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Template
        </Button>
      </div>

      {successMsg && (
        <div className="p-3 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Template updated successfully!</span>
        </div>
      )}

      {error && (
        <div className="p-3 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-md">
          {error}
        </div>
      )}

      {/* Editor Form */}
      <Card className="shadow-xs border-slate-200">
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-900">Fixed Company & Template Metadata</CardTitle>
          <CardDescription className="text-xs text-slate-500">
            These values are locked during invoice creation and can only be modified here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="company_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Company Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Email</FormLabel>
                      <FormControl>
                        <Input placeholder="finance@edlink.com.au" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+61 432 536 123" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <FormControl>
                        <Input placeholder="AUD" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fixed Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Suit 3, Level 4/20 Collins Street, Melbourne 3000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payment_details"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Details / Bank Account Information</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="Account Name: Riaz & Sons PTY Ltd&#10;BSB: 083-543&#10;Account No: 72-996-1834&#10;ABN: 62 658 488 469"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="footer_terms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Footer Terms / Notes</FormLabel>
                    <FormControl>
                      <Input placeholder="Thank you for getting services from us" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
