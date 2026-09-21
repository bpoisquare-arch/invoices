'use client'

export const dynamic = 'force-dynamic'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { InvoiceWithDetails } from '@/lib/supabase/database.types'
import { getInvoiceById, getInvoicePdfFilename } from '@/lib/services/invoice.service'
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
      // 1. Fetch from server endpoint first (reliable, handles local filesystem images & base64)
      try {
        const response = await fetch(`/api/pdf/${invoice.id}`)
        if (response.ok) {
          const blob = await response.blob()
          if (blob && blob.size > 0) {
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = getInvoicePdfFilename(invoice)
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
            return
          }
        }
      } catch (serverErr) {
        console.warn('Server streaming failed, trying client renderer:', serverErr)
      }

      // 2. Client-side fallback with timeout to never hang
      const doc = renderInvoicePDFDocument(invoice, invoice.template_snapshot)
      const blobPromise = pdf(doc).toBlob()
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('PDF generation timed out')), 4000)
      )
      const blob = await Promise.race([blobPromise, timeoutPromise])
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = getInvoicePdfFilename(invoice)
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error('PDF download error:', err)
      // Direct browser fallback
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
            className="gap-2 text-slate-700 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Invoices</span>
            <span className="sm:hidden">Back</span>
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
              Invoice Preview: {invoice.invoice_number}
            </h1>
            <p className="text-xs text-slate-500 truncate">
              Customer: <span className="font-semibold text-slate-700">{invoice.customer_name}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/invoices/${invoice.id}/edit`)}
            className="flex-1 sm:flex-none gap-2 text-slate-700 justify-center"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Invoice</span>
          </Button>

          <Button
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white gap-2 font-semibold shadow-sm cursor-pointer justify-center"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Render Web Replica Preview Component */}
      <div className="py-2 sm:py-4 w-full overflow-x-auto flex justify-center">
        {renderInvoiceWebPreview(invoice, invoice.template_snapshot)}
      </div>
    </div>
  )
}
