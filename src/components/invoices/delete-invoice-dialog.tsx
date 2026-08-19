'use client'

import React, { useState } from 'react'
import { InvoiceWithDetails } from '@/lib/supabase/database.types'
import { deleteInvoice } from '@/lib/services/invoice.service'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react'

interface DeleteInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: InvoiceWithDetails | null
  onSuccess: () => void
}

export default function DeleteInvoiceDialog({
  open,
  onOpenChange,
  invoice,
  onSuccess,
}: DeleteInvoiceDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (!invoice) return
    setIsLoading(true)
    setError(null)
    try {
      await deleteInvoice(invoice.id)
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      setError(err?.message || 'Failed to delete invoice')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md font-sans border border-[#E2E8F0] shadow-xl rounded-xl">
        <DialogHeader className="space-y-3 pb-2 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200">
              <Trash2 className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <DialogTitle className="font-['Montserrat'] text-base font-bold text-[#003D5C]">
                Delete Invoice
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Confirm permanent removal of this invoice record.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {invoice && (
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3.5 my-2 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">Invoice Number:</span>
              <span className="font-mono font-bold text-[#003D5C] bg-white px-2 py-0.5 rounded border border-slate-200">
                {invoice.invoice_number}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">Client Name:</span>
              <span className="font-bold text-slate-800">{invoice.customer_name || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">Total Amount:</span>
              <span className="font-bold text-[#009D9E]">
                {Number(invoice.total_amount || 0).toFixed(2)} AUD
              </span>
            </div>
          </div>
        )}

        <div className="bg-rose-50/90 border border-rose-200/90 rounded-lg p-3 text-xs text-rose-900 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span className="leading-relaxed">
            Are you sure you want to delete invoice <strong className="text-rose-950 font-bold">{invoice?.invoice_number}</strong>? This will permanently erase the record from the database and system.
          </span>
        </div>

        {error && (
          <div className="p-2.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-md">
            {error}
          </div>
        )}

        <DialogFooter className="pt-3 border-t border-[#E2E8F0] gap-2 flex items-center justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="text-xs font-semibold h-9 px-4 border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold uppercase text-xs h-9 px-4 rounded-md shadow-xs gap-1.5 transition-colors cursor-pointer"
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                Confirm Delete
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
