'use client'

import React, { useEffect, useState } from 'react'
import { InvoiceWithDetails } from '@/lib/supabase/database.types'
import { renameInvoiceReference } from '@/lib/services/invoice.service'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface RenameInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: InvoiceWithDetails | null
  onSuccess: () => void
}

export default function RenameInvoiceDialog({
  open,
  onOpenChange,
  invoice,
  onSuccess,
}: RenameInvoiceDialogProps) {
  const [referenceName, setReferenceName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (invoice) {
      setReferenceName(invoice.reference_name || '')
    }
  }, [invoice])

  async function handleSave() {
    if (!invoice) return
    setIsLoading(true)
    setError(null)
    try {
      await renameInvoiceReference(invoice.id, referenceName)
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      setError(err?.message || 'Failed to update reference name')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900">
            Rename Invoice Reference
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Invoice Number (<span className="font-bold text-slate-800">{invoice?.invoice_number}</span>) is non-editable.
            You can modify the optional Reference Name below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs font-bold text-slate-700">Invoice Reference Name</Label>
            <Input
              placeholder="e.g. Khizar Raza Website Project"
              value={referenceName}
              onChange={(e) => setReferenceName(e.target.value)}
              className="mt-1.5"
            />
          </div>

          {error && <div className="text-xs font-semibold text-rose-600">{error}</div>}
        </div>

        <DialogFooter className="pt-4 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Reference Name
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
