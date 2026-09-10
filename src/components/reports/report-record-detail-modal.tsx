'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  User,
  GraduationCap,
  Calendar,
  BookOpen,
  DollarSign,
  Mail,
  Phone,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Edit2,
  Copy,
  Building2,
  ShieldCheck,
  CreditCard,
} from 'lucide-react'
import type { AimtReportRecord } from '@/lib/supabase/database.types'

interface ReportRecordDetailModalProps {
  isOpen: boolean
  onClose: () => void
  record: AimtReportRecord | null
  onEdit?: (record: AimtReportRecord) => void
}

export default function ReportRecordDetailModal({
  isOpen,
  onClose,
  record,
  onEdit,
}: ReportRecordDetailModalProps) {
  if (!record) return null

  const formatAUD = (amount: number | null | undefined) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      maximumFractionDigits: 2,
    }).format(amount || 0)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[96vw] max-w-4xl lg:max-w-5xl max-h-[92vh] bg-white border border-slate-200 text-slate-900 p-0 overflow-hidden shadow-2xl rounded-2xl flex flex-col">
        {/* Header */}
        <div className="bg-slate-50 p-5 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-[#003D5C] text-cyan-300 flex items-center justify-center font-bold text-sm shadow-xs">
              {record.sr_no ? `#${record.sr_no}` : '#'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight font-['Montserrat']">
                  {record.student_name}
                </DialogTitle>
                <button
                  type="button"
                  onClick={() => copyToClipboard(record.student_name)}
                  className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                  title="Copy student name"
                >
                  <Copy className="size-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                {record.student_id && (
                  <span className="font-mono text-cyan-700 font-bold bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                    {record.student_id}
                  </span>
                )}
                {record.status && (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold px-2 py-0.5">
                    {record.status}
                  </Badge>
                )}
                {record.payment_status && (
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-semibold px-2 py-0.5">
                    Plan: {record.payment_status}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose()
                  onEdit(record)
                }}
                className="border-slate-200 bg-white text-slate-700 hover:bg-slate-100 h-8.5 px-3 rounded-lg text-xs gap-1.5 font-semibold"
              >
                <Edit2 className="size-3.5 text-cyan-600" />
                <span>Edit Entry</span>
              </Button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Core Highlights 4-Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200/80">
              <span className="text-[10px] uppercase font-bold text-rose-600 block tracking-wider">
                Pending Invoice
              </span>
              <span className="text-lg font-bold text-rose-700 mt-1 block font-mono">
                {record.pending_invoice || '-'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80">
              <span className="text-[10px] uppercase font-bold text-amber-600 block tracking-wider">
                Pending Amount
              </span>
              <span className="text-lg font-bold text-amber-700 mt-1 block font-mono">
                {formatAUD(record.pending_amount)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
              <span className="text-[10px] uppercase font-bold text-emerald-600 block tracking-wider">
                Yet to Raised
              </span>
              <span className="text-lg font-bold text-emerald-700 mt-1 block font-mono">
                {record.yet_to_raised || '-'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200/80">
              <span className="text-[10px] uppercase font-bold text-sky-600 block tracking-wider">
                Intake Date
              </span>
              <span className="text-lg font-bold text-sky-800 mt-1 block font-mono">
                {record.intake || '-'}
              </span>
            </div>
          </div>

          {/* Academic & Agency Details */}
          <div className="space-y-3 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <BookOpen className="size-4 text-cyan-600" /> Course & Agency Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block font-medium">Course Name:</span>
                <span className="text-slate-900 font-bold block mt-0.5">
                  {record.course || 'Not Specified'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Agent / Agency:</span>
                <span className="text-slate-900 font-bold block mt-0.5">
                  {record.agent || 'Direct / None'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Intake Date:</span>
                <span className="text-slate-800 font-semibold block mt-0.5 font-mono">
                  {record.intake || '-'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Course End Date:</span>
                <span className="text-slate-800 font-semibold block mt-0.5 font-mono">
                  {record.end_date || '-'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Document Type / CoE Status:</span>
                <span className="text-slate-800 font-semibold block mt-0.5">
                  {record.document || '-'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">COE Issue Date:</span>
                <span className="text-slate-800 font-semibold block mt-0.5 font-mono">
                  {record.coe_issued_date || '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Fee & Financial Summary */}
          <div className="space-y-3 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <DollarSign className="size-4 text-emerald-600" /> Invoicing & Fees Breakdown
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs">
              <div className="p-2.5 bg-white rounded-lg border border-slate-200/60">
                <span className="text-slate-500 block text-[11px]">Admin Fee:</span>
                <span className="text-slate-900 font-bold font-mono">{formatAUD(record.admin_fee)}</span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200/60">
                <span className="text-slate-500 block text-[11px]">Resource Fee:</span>
                <span className="text-slate-900 font-bold font-mono">{formatAUD(record.resource_fee)}</span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200/60">
                <span className="text-slate-500 block text-[11px]">Tuition Fee:</span>
                <span className="text-slate-900 font-bold font-mono">{formatAUD(record.tuition_fee)}</span>
              </div>
              <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                <span className="text-emerald-700 block text-[11px] font-semibold">Total Fee:</span>
                <span className="text-emerald-900 font-extrabold font-mono text-sm">
                  {formatAUD(record.total_fee)}
                </span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200/60">
                <span className="text-slate-500 block text-[11px]">Paid Amount:</span>
                <span className="text-emerald-600 font-bold font-mono">{formatAUD(record.paid_amount)}</span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200/60">
                <span className="text-slate-500 block text-[11px]">Scholarship:</span>
                <span className="text-slate-800 font-semibold">{record.scholarship || '-'}</span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200/60">
                <span className="text-slate-500 block text-[11px]">Payment Status:</span>
                <span className="text-slate-800 font-semibold">{record.payment_status || 'Pending'}</span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200/60">
                <span className="text-slate-500 block text-[11px]">Pending Amount:</span>
                <span className="text-amber-600 font-bold font-mono">{formatAUD(record.pending_amount)}</span>
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-3 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <User className="size-4 text-cyan-600" /> Personal & Contact Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 bg-white rounded-lg border border-slate-200/60 flex items-center gap-2">
                <Mail className="size-4 text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 block uppercase">Email</span>
                  <span className="text-slate-800 font-medium truncate block">{record.email_id || '-'}</span>
                </div>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-slate-200/60 flex items-center gap-2">
                <Phone className="size-4 text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 block uppercase">Phone</span>
                  <span className="text-slate-800 font-medium font-mono">{record.phone_no || '-'}</span>
                </div>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-slate-200/60 flex items-center gap-2">
                <Calendar className="size-4 text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 block uppercase">Date of Birth</span>
                  <span className="text-slate-800 font-medium font-mono">{record.dob || '-'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Remarks */}
          {record.remarks && (
            <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-1">
              <span className="font-bold flex items-center gap-1 text-amber-800">
                <FileText className="size-3.5" /> Remarks / Notes:
              </span>
              <p className="whitespace-pre-wrap">{record.remarks}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-slate-200 bg-white text-slate-700 hover:bg-slate-100 px-5 rounded-xl text-xs font-semibold"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
