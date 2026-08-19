'use client'

export const dynamic = 'force-dynamic'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { InvoiceWithDetails } from '@/lib/supabase/database.types'
import { getInvoiceById } from '@/lib/services/invoice.service'
import { renderInvoiceWebPreview, renderInvoicePDFDocument } from '@/lib/services/template-registry'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, Edit3, Loader2 } from 'lucide-react'
import { pdf } from '@react-pdf/renderer'

export default function InvoicePreviewPage() {
  const params = useParams()
  const invoiceId = params.id as string
  const router = useRouter()

  const [invoice, setInvoice] = useState<InvoiceWithDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)

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
      } catch (err) {
        console.error('Error loading invoice:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadInvoice()
  }, [invoiceId, router])

  async function handleDownloadPDF() {
    if (!invoice) return
    try {
      setIsDownloading(true)
      const doc = renderInvoicePDFDocument(invoice, invoice.template_snapshot)
      const blob = await pdf(doc).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Invoice-${invoice.invoice_number || 'EDL'}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error('PDF download error:', err)
      // Fallback to server route
      window.open(`/api/pdf/${invoice.id}`, '_blank')
    } finally {
      setIsDownloading(false)
    }
  }

  if (isLoading || !invoice) {
    return (
      <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span>Loading Invoice Preview...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/invoices')}
            className="gap-2 text-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Invoices
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Invoice Preview: {invoice.invoice_number}
            </h1>
            <p className="text-xs text-slate-500">
              Customer: <span className="font-semibold text-slate-700">{invoice.customer_name}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/invoices/${invoice.id}/edit`)}
            className="gap-2 text-slate-700"
          >
            <Edit3 className="w-4 h-4" />
            Edit Invoice
          </Button>

          <Button
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 font-semibold shadow-sm cursor-pointer"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download PDF ({invoice.invoice_number}.pdf)
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Render Web Replica Preview Component */}
      <div className="py-4 flex justify-center">
        {renderInvoiceWebPreview(invoice, invoice.template_snapshot)}
      </div>
    </div>
  )
}
