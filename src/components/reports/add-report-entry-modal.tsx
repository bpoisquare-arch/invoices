'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  User,
  GraduationCap,
  DollarSign,
  Calendar,
  Mail,
  Phone,
  FileText,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calculator,
  Layers,
  Save,
  PlusCircle,
  Edit,
  Sparkles,
} from 'lucide-react'
import type { AimtReportRecord } from '@/lib/supabase/database.types'

interface AddReportEntryModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (savedRecord: AimtReportRecord, isEdit: boolean) => void
  editRecord?: AimtReportRecord | null
  activeImportId?: string | null
}

export default function AddReportEntryModal({
  isOpen,
  onClose,
  onSuccess,
  editRecord,
  activeImportId,
}: AddReportEntryModalProps) {
  const isEditMode = Boolean(editRecord)

  // 23 Fields Form State
  const [formData, setFormData] = useState({
    student_name: '',
    student_id: '',
    agent: '',
    scholarship: '',
    pending_invoice: '',
    pending_amount: '',
    yet_to_raised: '',
    remarks: '',
    dob: '',
    document: '',
    status: 'Enrolled',
    intake: '',
    end_date: '',
    course: '',
    admin_fee: '',
    resource_fee: '',
    tuition_fee: '',
    total_fee: '',
    paid_amount: '',
    coe_issued_date: '',
    email_id: '',
    phone_no: '',
    payment_status: 'Pending',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isManualTotalFee, setIsManualTotalFee] = useState(false)

  // Populate or reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null)
      if (editRecord) {
        setFormData({
          student_name: editRecord.student_name || '',
          student_id: editRecord.student_id || '',
          agent: editRecord.agent || '',
          scholarship: editRecord.scholarship || '',
          pending_invoice: editRecord.pending_invoice || '',
          pending_amount: editRecord.pending_amount ? String(editRecord.pending_amount) : '',
          yet_to_raised: editRecord.yet_to_raised || '',
          remarks: editRecord.remarks || '',
          dob: editRecord.dob || '',
          document: editRecord.document || '',
          status: editRecord.status || 'Enrolled',
          intake: editRecord.intake || '',
          end_date: editRecord.end_date || '',
          course: editRecord.course || '',
          admin_fee: editRecord.admin_fee ? String(editRecord.admin_fee) : '',
          resource_fee: editRecord.resource_fee ? String(editRecord.resource_fee) : '',
          tuition_fee: editRecord.tuition_fee ? String(editRecord.tuition_fee) : '',
          total_fee: editRecord.total_fee ? String(editRecord.total_fee) : '',
          paid_amount: editRecord.paid_amount ? String(editRecord.paid_amount) : '',
          coe_issued_date: editRecord.coe_issued_date || '',
          email_id: editRecord.email_id || '',
          phone_no: editRecord.phone_no || '',
          payment_status: editRecord.payment_status || 'Pending',
        })
        setIsManualTotalFee(Boolean(editRecord.total_fee))
      } else {
        setFormData({
          student_name: '',
          student_id: '',
          agent: '',
          scholarship: '',
          pending_invoice: '',
          pending_amount: '',
          yet_to_raised: '',
          remarks: '',
          dob: '',
          document: '',
          status: 'Enrolled',
          intake: '',
          end_date: '',
          course: '',
          admin_fee: '',
          resource_fee: '',
          tuition_fee: '',
          total_fee: '',
          paid_amount: '',
          coe_issued_date: '',
          email_id: '',
          phone_no: '',
          payment_status: 'Pending',
        })
        setIsManualTotalFee(false)
      }
    }
  }, [isOpen, editRecord])

  // Real-time auto-calculation of Total Fee
  const handleFeeChange = (
    field: 'admin_fee' | 'resource_fee' | 'tuition_fee',
    value: string
  ) => {
    const updated = { ...formData, [field]: value }
    const admin = parseFloat(updated.admin_fee) || 0
    const resource = parseFloat(updated.resource_fee) || 0
    const tuition = parseFloat(updated.tuition_fee) || 0
    const sum = admin + resource + tuition

    if (!isManualTotalFee) {
      updated.total_fee = sum > 0 ? String(sum) : ''
    }
    setFormData(updated)
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Validate email format
  const isValidEmail = (email: string) => {
    if (!email.trim()) return true
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    // Validation 1: Student Name is mandatory
    if (!formData.student_name.trim()) {
      setErrorMessage('Please enter the Student Name.')
      return
    }

    // Validation 2: Email format check
    if (formData.email_id && !isValidEmail(formData.email_id)) {
      setErrorMessage('Please enter a valid Email ID (e.g. student@example.com).')
      return
    }

    setIsSubmitting(true)

    try {
      if (isEditMode && editRecord) {
        // Update existing record
        const res = await fetch('/api/reports/records', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editRecord.id,
            ...formData,
          }),
        })

        const data = await res.json()
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to update student record.')
        }

        onSuccess(data.record, true)
        onClose()
      } else {
        // Create new record
        const res = await fetch('/api/reports/records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            importId: activeImportId,
            ...formData,
          }),
        })

        const data = await res.json()
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to save student record.')
        }

        onSuccess(data.record, false)
        onClose()
      }
    } catch (err: any) {
      console.error('Error saving student record:', err)
      setErrorMessage(err.message || 'An error occurred while saving record to database.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose()
      }}
    >
      <DialogContent className="w-[96vw] max-w-5xl lg:max-w-6xl max-h-[92vh] bg-white border border-slate-200 text-slate-900 p-0 overflow-hidden shadow-2xl rounded-2xl flex flex-col">
        {/* Modal Header */}
        <div className="bg-slate-50 p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-[#003D5C] text-cyan-300 flex items-center justify-center shadow-xs">
              {isEditMode ? <Edit className="size-5" /> : <PlusCircle className="size-5" />}
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 tracking-tight font-['Montserrat']">
                {isEditMode ? 'Edit Student Record' : 'Add New Student Entry'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                {isEditMode
                  ? 'Update details in database. Changes will reflect across all metrics and reports.'
                  : 'Add a new student invoice record directly to the database.'}
              </DialogDescription>
            </div>
          </div>

          <Badge className="bg-cyan-50 text-cyan-800 border-cyan-200 text-[11px] font-bold px-2.5 py-1">
            AIMT College
          </Badge>
        </div>

        {/* Modal Body Form: 2-Column Wide Grid on Desktop */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs">
            {/* Error banner */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 shadow-xs">
                <AlertCircle className="size-4.5 shrink-0 text-rose-600" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            {/* 2-Column Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
              {/* LEFT COLUMN: Student, Personal, Course & Agency Info */}
              <div className="space-y-4">
                {/* 1. Student & Personal Details */}
                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/90 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                    <User className="size-4 text-cyan-700" />
                    <span>1. Student & Personal Details</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Student Name */}
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs font-semibold text-slate-700">
                        Student Name <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        value={formData.student_name}
                        onChange={(e) => handleChange('student_name', e.target.value)}
                        placeholder="e.g. Abdul Rehman"
                        required
                        className="h-8.5 text-xs bg-white border-slate-200 text-slate-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg"
                      />
                    </div>

                    {/* Student ID */}
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Student ID</Label>
                      <Input
                        value={formData.student_id}
                        onChange={(e) => handleChange('student_id', e.target.value)}
                        placeholder="e.g. AIMT00195"
                        className="h-8.5 text-xs bg-white border-slate-200 text-slate-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg font-mono font-semibold text-cyan-800"
                      />
                    </div>

                    {/* Status */}
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Student ID Status</Label>
                      <select
                        value={formData.status}
                        onChange={(e) => handleChange('status', e.target.value)}
                        className="w-full h-8.5 text-xs bg-white border border-slate-200 text-slate-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg px-2.5"
                      >
                        <option value="Enrolled">Enrolled</option>
                        <option value="Active">Active</option>
                        <option value="Completed">Completed</option>
                        <option value="Pending">Pending</option>
                        <option value="Deferred">Deferred</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>

                    {/* DOB */}
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Date of Birth (DOB)</Label>
                      <Input
                        value={formData.dob}
                        onChange={(e) => handleChange('dob', e.target.value)}
                        placeholder="DD/MM/YYYY"
                        className="h-8.5 text-xs bg-white border-slate-200 text-slate-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg"
                      />
                    </div>

                    {/* Document Type */}
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Document Type</Label>
                      <Input
                        value={formData.document}
                        onChange={(e) => handleChange('document', e.target.value)}
                        placeholder="e.g. CoE Issued, Passport"
                        className="h-8.5 text-xs bg-white border-slate-200 text-slate-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg"
                      />
                    </div>

                    {/* Email ID */}
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Email ID</Label>
                      <Input
                        type="email"
                        value={formData.email_id}
                        onChange={(e) => handleChange('email_id', e.target.value)}
                        placeholder="student@example.com"
                        className="h-8.5 text-xs bg-white border-slate-200 text-slate-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg"
                      />
                    </div>

                    {/* Phone No */}
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Phone No</Label>
                      <Input
                        value={formData.phone_no}
                        onChange={(e) => handleChange('phone_no', e.target.value)}
                        placeholder="+61 400 123 456"
                        className="h-8.5 text-xs bg-white border-slate-200 text-slate-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Course & Agency Details */}
                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/90 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                    <GraduationCap className="size-4 text-cyan-700" />
                    <span>2. Course & Agency Details</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Course Name */}
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs font-semibold text-slate-700">Course Name</Label>
                      <Input
                        value={formData.course}
                        onChange={(e) => handleChange('course', e.target.value)}
                        placeholder="e.g. Certificate III in Solid Plastering"
                        className="h-8.5 text-xs bg-white border-slate-200 text-slate-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg"
                      />
                    </div>

                    {/* Agent */}
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs font-semibold text-slate-700">Agent / Agency</Label>
                      <Input
                        value={formData.agent}
                        onChange={(e) => handleChange('agent', e.target.value)}
                        placeholder="e.g. Edlink Australia"
                        className="h-8.5 text-xs bg-white border-slate-200 text-slate-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg"
                      />
                    </div>

                    {/* Intake Date */}
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Intake Date</Label>
                      <Input
                        value={formData.intake}
                        onChange={(e) => handleChange('intake', e.target.value)}
                        placeholder="DD/MM/YYYY"
                        className="h-8.5 text-xs bg-white border-slate-200 text-slate-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg"
                      />
                    </div>

                    {/* End Date */}
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Course End Date</Label>
                      <Input
                        value={formData.end_date}
                        onChange={(e) => handleChange('end_date', e.target.value)}
                        placeholder="DD/MM/YYYY"
                        className="h-8.5 text-xs bg-white border-slate-200 text-slate-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg"
                      />
                    </div>

                    {/* COE Issue Date */}
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">COE Issue Date</Label>
                      <Input
                        value={formData.coe_issued_date}
                        onChange={(e) => handleChange('coe_issued_date', e.target.value)}
                        placeholder="DD/MM/YYYY"
                        className="h-8.5 text-xs bg-white border-slate-200 text-slate-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg"
                      />
                    </div>

                    {/* Scholarship */}
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Scholarship</Label>
                      <Input
                        value={formData.scholarship}
                        onChange={(e) => handleChange('scholarship', e.target.value)}
                        placeholder="e.g. $500"
                        className="h-8.5 text-xs bg-white border-slate-200 text-slate-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Fees, Invoicing & Remarks */}
              <div className="space-y-4">
                {/* 3. Invoicing, Fees & Financials */}
                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/90 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                      <DollarSign className="size-4 text-emerald-600" />
                      <span>3. Invoicing & Fee Breakdown</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-cyan-800 bg-cyan-100/80 px-2 py-0.5 rounded-md font-semibold border border-cyan-200">
                      <Calculator className="size-3" />
                      <span>Auto Total Fee</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {/* Admin Fee */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-700">Admin Fee ($)</Label>
                      <Input
                        type="number"
                        step="any"
                        value={formData.admin_fee}
                        onChange={(e) => handleFeeChange('admin_fee', e.target.value)}
                        placeholder="0.00"
                        className="h-8.5 text-xs bg-white border-slate-200 text-slate-900 rounded-lg font-mono"
                      />
                    </div>

                    {/* Resource Fee */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-700">Resource Fee ($)</Label>
                      <Input
                        type="number"
                        step="any"
                        value={formData.resource_fee}
                        onChange={(e) => handleFeeChange('resource_fee', e.target.value)}
                        placeholder="0.00"
                        className="h-8.5 text-xs bg-white border-slate-200 text-slate-900 rounded-lg font-mono"
                      />
                    </div>

                    {/* Tuition Fee */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-700">Tuition Fee ($)</Label>
                      <Input
                        type="number"
                        step="any"
                        value={formData.tuition_fee}
                        onChange={(e) => handleFeeChange('tuition_fee', e.target.value)}
                        placeholder="0.00"
                        className="h-8.5 text-xs bg-white border-slate-200 text-slate-900 rounded-lg font-mono"
                      />
                    </div>

                    {/* Total Fee (Auto-Calculated) */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-bold text-slate-900">Total Fee ($)</Label>
                        <span className="text-[9px] text-cyan-700 font-bold">Auto</span>
                      </div>
                      <Input
                        type="number"
                        step="any"
                        value={formData.total_fee}
                        onChange={(e) => {
                          setIsManualTotalFee(true)
                          handleChange('total_fee', e.target.value)
                        }}
                        placeholder="0.00"
                        className="h-8.5 text-xs bg-emerald-50 border-emerald-300 text-emerald-900 font-bold rounded-lg font-mono"
                      />
                    </div>

                    {/* Paid Amount */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-700">Paid Amount ($)</Label>
                      <Input
                        type="number"
                        step="any"
                        value={formData.paid_amount}
                        onChange={(e) => handleChange('paid_amount', e.target.value)}
                        placeholder="0.00"
                        className="h-8.5 text-xs bg-white border-slate-200 text-slate-900 rounded-lg font-mono font-semibold text-emerald-700"
                      />
                    </div>

                    {/* Pending Invoice */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-700">Pending Inv</Label>
                      <Input
                        value={formData.pending_invoice}
                        onChange={(e) => handleChange('pending_invoice', e.target.value)}
                        placeholder="e.g. 1"
                        className="h-8.5 text-xs bg-white border-slate-200 text-slate-900 rounded-lg"
                      />
                    </div>

                    {/* Pending Amount */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-700">Pending Amt ($)</Label>
                      <Input
                        type="number"
                        step="any"
                        value={formData.pending_amount}
                        onChange={(e) => handleChange('pending_amount', e.target.value)}
                        placeholder="0.00"
                        className="h-8.5 text-xs bg-white border-slate-200 text-amber-700 font-bold rounded-lg font-mono"
                      />
                    </div>

                    {/* Yet to Raised */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-700">Yet to Raised</Label>
                      <Input
                        value={formData.yet_to_raised}
                        onChange={(e) => handleChange('yet_to_raised', e.target.value)}
                        placeholder="e.g. 8100"
                        className="h-8.5 text-xs bg-white border-slate-200 text-slate-900 rounded-lg font-mono"
                      />
                    </div>
                  </div>

                  {/* Payment Plan Status */}
                  <div className="pt-2 border-t border-slate-200/80">
                    <Label className="text-xs font-semibold text-slate-700">Payment Plan Status</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
                      {['Pending', 'Raised', 'Partially Paid', 'Completed'].map((st) => (
                        <button
                          type="button"
                          key={st}
                          onClick={() => handleChange('payment_status', st)}
                          className={`py-1 px-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                            formData.payment_status === st
                              ? 'bg-[#003D5C] text-white border-[#003D5C] shadow-xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 4. Remarks & Notes */}
                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/90 space-y-2">
                  <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <FileText className="size-4 text-slate-600" />
                    <span>Remarks & Notes</span>
                  </Label>
                  <textarea
                    value={formData.remarks}
                    onChange={(e) => handleChange('remarks', e.target.value)}
                    placeholder="Enter notes, payment installments breakdown or agent remarks..."
                    rows={3}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 text-slate-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="border-slate-200 bg-white text-slate-700 hover:bg-slate-100 h-9 px-4 rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#003D5C] hover:bg-[#002b42] text-white font-bold h-9 px-5 rounded-xl text-xs gap-2 shadow-sm transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Saving to Database...</span>
                </>
              ) : isEditMode ? (
                <>
                  <Save className="size-4" />
                  <span>Update Student Record</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  <span>Save Student Entry</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
