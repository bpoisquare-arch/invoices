'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Briefcase, Loader2, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface AddDesignationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialValue?: string
  onDesignationAdded: (designation: string) => void
  addDesignationFn: (designation: string) => Promise<string>
}

export default function AddDesignationModal({
  open,
  onOpenChange,
  initialValue = '',
  onDesignationAdded,
  addDesignationFn,
}: AddDesignationModalProps) {
  const [designationName, setDesignationName] = useState(initialValue)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setDesignationName(initialValue || '')
      setError(null)
      setSuccessMsg(null)
    }
  }, [open, initialValue])

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = designationName.trim()
    if (!trimmed) {
      setError('Please enter a designation title.')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)
      const added = await addDesignationFn(trimmed)
      setSuccessMsg(`Designation "${added}" added and applied!`)
      onDesignationAdded(added)
      setTimeout(() => {
        setIsSubmitting(false)
        onOpenChange(false)
      }, 350)
    } catch (err: any) {
      setError(err?.message || 'Failed to add designation.')
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 rounded-2xl bg-white shadow-2xl border border-slate-200">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-100 text-[#009D9E]">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-800">
                Add New Designation
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Saved live across the entire attendance module and immediately applied.
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Designation Title *
            </Label>
            <Input
              type="text"
              autoFocus
              placeholder="e.g. Senior Software Engineer"
              value={designationName}
              onChange={(e) => {
                setDesignationName(e.target.value)
                if (error) setError(null)
              }}
              disabled={isSubmitting}
              className="text-sm border-slate-200 focus:border-[#009D9E] focus:ring-1 focus:ring-[#009D9E]"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-medium flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              {successMsg}
            </div>
          )}

          <DialogFooter className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
              className="text-xs border-slate-200 text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !designationName.trim()}
              className="bg-[#009D9E] hover:bg-[#008080] text-white font-semibold text-xs shadow-sm flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Add Designation
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
