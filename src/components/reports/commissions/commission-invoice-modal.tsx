'use client'

import React, { useRef, useState } from 'react'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, Check, Copy, FileText, Loader2, X } from 'lucide-react'
import { downloadCommissionInvoicePdf } from '@/lib/utils/generate-commission-invoice-pdf'
import { AIMT_LOGO_BASE64 } from '@/lib/utils/aimt-logo-base64'

export interface CommissionInvoiceModalData {
  referenceNumber: string
  invoiceDate: string
  agencyName: string
  amount: number
  description?: string
  notes?: string
}

interface CommissionInvoiceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: CommissionInvoiceModalData | null
}

export default function CommissionInvoiceModal({
  open,
  onOpenChange,
  data,
}: CommissionInvoiceModalProps) {
  const invoiceRef = useRef<HTMLDivElement>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [copiedRef, setCopiedRef] = useState(false)

  if (!data) return null

  // Format date to "13 Nov 2026" or similar
  const formatDateDisplay = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      }
    } catch {}
    return dateStr
  }

  const formattedDate = formatDateDisplay(data.invoiceDate)
  const formattedAmount = data.amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  const descriptionText = data.description || `${data.agencyName} - Paid by AIMT`

  const handleCopyRef = () => {
    if (data.referenceNumber) {
      navigator.clipboard.writeText(data.referenceNumber)
      setCopiedRef(true)
      setTimeout(() => setCopiedRef(false), 2000)
    }
  }

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true)
    try {
      downloadCommissionInvoicePdf({
        referenceNumber: data.referenceNumber,
        invoiceDate: data.invoiceDate,
        agencyName: data.agencyName,
        amount: data.amount,
        description: data.description,
        notes: data.notes,
      })
    } catch (err) {
      console.warn('Direct jsPDF download failed, falling back to server PDF route:', err)
      try {
        const url = `/api/reports/commissions/invoices/pdf?reference=${encodeURIComponent(data.referenceNumber)}`
        const link = document.createElement('a')
        link.href = url
        link.download = `Invoice-${data.referenceNumber}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } catch (fallbackErr) {
        window.open(`/api/reports/commissions/invoices/pdf?reference=${encodeURIComponent(data.referenceNumber)}`, '_blank')
      }
    } finally {
      setTimeout(() => setIsGeneratingPdf(false), 400)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full p-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl font-sans">
        {/* Top Control Bar */}
        <div className="bg-[#001724] px-6 py-4 text-white flex items-center justify-between border-b border-cyan-500/20">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
              <FileText className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">
                  Commission Payout Invoice
                </h3>
                <span className="font-mono font-bold text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 px-2 py-0.5 rounded-md">
                  {data.referenceNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Generated for <strong className="text-white">{data.agencyName}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyRef}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 h-8 px-2.5 text-xs rounded-lg gap-1.5 cursor-pointer"
              title="Copy Reference"
            >
              {copiedRef ? (
                <>
                  <Check className="size-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5 text-slate-300" />
                  <span>Copy Ref</span>
                </>
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold h-8 px-3 text-xs rounded-lg gap-1.5 cursor-pointer shadow-md"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <Download className="size-3.5" />
                  <span>Download PDF</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Scrollable Printable Invoice Sheet View */}
        <div className="p-6 overflow-y-auto max-h-[75vh] bg-slate-100 flex justify-center">
          <div
            ref={invoiceRef}
            className="w-full max-w-[700px] bg-white text-slate-900 p-8 sm:p-10 shadow-md border border-slate-200 rounded-lg text-[13px] leading-relaxed"
            style={{ minHeight: '800px' }}
          >
            {/* 1. Header Row */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-200 pb-7">
              {/* Left Column: AIMT Logo & College Details */}
              <div className="space-y-3 max-w-[340px]">
                {/* AIMT Logo */}
                <div className="w-[180px] h-auto">
                  <img
                    src={AIMT_LOGO_BASE64 || '/aimt-logo.png'}
                    alt="AIMT Logo"
                    className="w-full h-auto object-contain"
                  />
                </div>

                <div className="text-slate-700 text-xs space-y-0.5 pt-1">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    To:
                  </div>
                  <div className="font-extrabold text-slate-900 text-sm">
                    Australian Institute of Management and Technology
                  </div>
                  <div>84 Buckley Street</div>
                  <div>FOOTSCRAY VIC 3011</div>
                  <div className="font-semibold text-slate-800">AUSTRALIA</div>
                </div>
              </div>

              {/* Right Column: Agency Name, Invoice Date, Reference Number */}
              <div className="text-right sm:self-start space-y-3">
                <div className="font-black text-slate-900 text-base uppercase tracking-tight">
                  {data.agencyName}
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <div className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                      Invoice Date
                    </div>
                    <div className="font-bold text-slate-800 text-sm mt-0.5">
                      {formattedDate}
                    </div>
                  </div>

                  <div>
                    <div className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                      Reference Number
                    </div>
                    <div className="font-mono font-extrabold text-slate-900 text-sm mt-0.5 bg-slate-100 inline-block px-2.5 py-1 rounded border border-slate-200">
                      {data.referenceNumber}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Main Line Items Table */}
            <div className="mt-8">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 text-[11px] font-black uppercase tracking-wider text-slate-700">
                    <th className="py-2.5 pr-4">Description</th>
                    <th className="py-2.5 px-4 text-center w-24">Quantity</th>
                    <th className="py-2.5 px-4 text-right w-28">Unit Price</th>
                    <th className="py-2.5 pl-4 text-right w-32">Amount AUD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr className="text-xs">
                    <td className="py-4 pr-4 font-medium text-slate-800">
                      <div>{descriptionText}</div>
                      {data.notes && (
                        <div className="text-[11px] text-slate-500 mt-1 italic">
                          Note: {data.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center font-mono text-slate-700">
                      1.00
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-medium text-slate-800">
                      ${formattedAmount}
                    </td>
                    <td className="py-4 pl-4 text-right font-mono font-bold text-slate-900">
                      ${formattedAmount}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 3. Financial Summary Breakdown Table (Right-aligned, matching PDF layout) */}
            <div className="mt-6 flex justify-end">
              <div className="w-full sm:w-[320px] space-y-2 border-t border-slate-200 pt-3 text-xs">
                <div className="flex justify-between py-1 text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-mono font-medium">${formattedAmount}</span>
                </div>

                <div className="flex justify-between py-1.5 border-t border-slate-900/80 font-extrabold text-slate-900 text-sm">
                  <span>TOTAL AUD</span>
                  <span className="font-mono">${formattedAmount}</span>
                </div>

                <div className="flex justify-between py-1 text-slate-600 border-t border-slate-200">
                  <span>Less Amount Paid</span>
                  <span className="font-mono font-medium text-emerald-700">
                    ${formattedAmount}
                  </span>
                </div>

                <div className="flex justify-between py-1.5 border-t-2 border-slate-900 font-black text-slate-900 text-sm">
                  <span>AMOUNT DUE</span>
                  <span className="font-mono text-emerald-700">$0.00</span>
                </div>

                <div className="flex justify-between py-1 text-slate-500 text-[11px] border-t border-slate-100">
                  <span className="font-bold uppercase tracking-wider">Due Date</span>
                  <span className="font-medium">{formattedDate}</span>
                </div>
              </div>
            </div>

            {/* 4. Footer Note */}
            <div className="mt-20 pt-6 border-t border-slate-200 text-center text-xs text-slate-400 italic">
              This is not a tax invoice
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <DialogFooter className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-between items-center sm:justify-between">
          <div className="text-xs text-slate-500 font-medium">
            Unique Voucher Ref: <span className="font-mono font-bold text-slate-800">{data.referenceNumber}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 text-xs font-semibold rounded-xl"
          >
            Close Preview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

