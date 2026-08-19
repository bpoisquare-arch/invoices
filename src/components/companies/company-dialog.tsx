'use client'

import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Company, Template } from '@/lib/supabase/database.types'
import { createCompany, updateCompany, duplicateCompany } from '@/lib/services/company.service'
import { getTemplateByCompanyId, updateTemplate } from '@/lib/services/template.service'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
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
import { Loader2 } from 'lucide-react'

const companySchema = z.object({
  name: z.string().min(2, { message: 'Company name is required.' }),
  prefix: z.string().min(2, { message: 'Prefix must be at least 2 characters.' }).max(10),
  currency: z.string().min(2, { message: 'Currency is required.' }),
  address: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  payment_details: z.string().optional(),
  footer_terms: z.string().optional(),
})

type CompanyFormValues = z.infer<typeof companySchema>

interface CompanyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'add' | 'edit' | 'duplicate'
  company?: Company | null
  onSuccess: () => void
}

export default function CompanyDialog({
  open,
  onOpenChange,
  mode,
  company,
  onSuccess,
}: CompanyDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [currentTemplate, setCurrentTemplate] = React.useState<Template | null>(null)

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: '',
      prefix: '',
      currency: 'AUD',
      address: '',
      email: '',
      phone: '',
      payment_details: '',
      footer_terms: '',
    },
  })

  useEffect(() => {
    async function loadTemplateData() {
      if (company && (mode === 'edit' || mode === 'duplicate')) {
        const t = await getTemplateByCompanyId(company.id)
        setCurrentTemplate(t)

        form.reset({
          name: mode === 'duplicate' ? `${company.name} Copy` : company.name,
          prefix: mode === 'duplicate' ? `${company.prefix}C` : company.prefix,
          currency: company.currency || 'AUD',
          address: t?.address || '',
          email: t?.email || '',
          phone: t?.phone || '',
          payment_details: t?.payment_details || '',
          footer_terms: t?.footer_terms || '',
        })
      } else if (mode === 'add') {
        form.reset({
          name: '',
          prefix: '',
          currency: 'AUD',
          address: '',
          email: '',
          phone: '',
          payment_details: '',
          footer_terms: '',
        })
      }
    }
    if (open) {
      loadTemplateData()
    }
  }, [open, company, mode, form])

  async function onSubmit(values: CompanyFormValues) {
    setIsLoading(true)
    setError(null)
    try {
      if (mode === 'add') {
        await createCompany({
          name: values.name,
          prefix: values.prefix,
          currency: values.currency,
          template: {
            address: values.address,
            email: values.email,
            phone: values.phone,
            payment_details: values.payment_details,
            footer_terms: values.footer_terms,
          },
        })
      } else if (mode === 'edit' && company) {
        await updateCompany(company.id, {
          name: values.name,
          prefix: values.prefix,
          currency: values.currency,
        })
        if (currentTemplate) {
          await updateTemplate(currentTemplate.id, {
            company_name: values.name,
            address: values.address,
            email: values.email,
            phone: values.phone,
            payment_details: values.payment_details,
            footer_terms: values.footer_terms,
            currency: values.currency,
          })
        }
      } else if (mode === 'duplicate' && company) {
        const newComp = await duplicateCompany(company.id, values.name, values.prefix)
        const newTemplate = await getTemplateByCompanyId(newComp.id)
        if (newTemplate) {
          await updateTemplate(newTemplate.id, {
            address: values.address,
            email: values.email,
            phone: values.phone,
            payment_details: values.payment_details,
            footer_terms: values.footer_terms,
            currency: values.currency,
          })
        }
      }

      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      setError(err?.message || 'Operation failed')
    } finally {
      setIsLoading(false)
    }
  }

  const title =
    mode === 'add' ? 'Add New Company' : mode === 'edit' ? 'Edit Company' : 'Duplicate Company'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">{title}</DialogTitle>
          <DialogDescription>
            {mode === 'duplicate'
              ? 'Creates an independent copy of this company and its template.'
              : 'Configure company fixed information and template attributes.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Company Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="EdLink Pakistan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="prefix"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Prefix *</FormLabel>
                    <FormControl>
                      <Input placeholder="EDL" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency Code *</FormLabel>
                    <FormControl>
                      <Input placeholder="AUD, USD, PKR" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+61 432 536 123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Suit 3, Level 4/20 Collins Street, Melbourne 3000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="payment_details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Details / Bank Account Info</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Account Name: Riaz & Sons PTY Ltd&#10;BSB: 083-543&#10;Account No: 72-996-1834"
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
                  <FormLabel>Invoice Footer / Note</FormLabel>
                  <FormControl>
                    <Input placeholder="Thank you for getting services from us" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && <div className="text-sm font-medium text-destructive">{error}</div>}

            <DialogFooter className="pt-4 border-t border-slate-200">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'add' ? 'Create Company' : mode === 'edit' ? 'Save Changes' : 'Duplicate Company'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
