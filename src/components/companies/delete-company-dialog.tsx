'use client'

import React, { useState } from 'react'
import { Company } from '@/lib/supabase/database.types'
import { deleteCompany } from '@/lib/services/company.service'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Loader2 } from 'lucide-react'

interface DeleteCompanyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  company: Company | null
  onSuccess: () => void
}

export default function DeleteCompanyDialog({
  open,
  onOpenChange,
  company,
  onSuccess,
}: DeleteCompanyDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (!company) return
    setIsLoading(true)
    setError(null)
    try {
      await deleteCompany(company.id)
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      setError(err?.message || 'Failed to delete company')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3 text-amber-600">
            <div className="p-2 rounded-full bg-amber-50">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Delete Company
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-600 pt-1">
            Are you sure you want to delete <span className="font-bold text-slate-900">{company?.name}</span>?
            This will permanently remove the company and its template settings.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-md">
            {error}
          </div>
        )}

        <DialogFooter className="pt-4 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-rose-600 hover:bg-rose-700 text-white"
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
