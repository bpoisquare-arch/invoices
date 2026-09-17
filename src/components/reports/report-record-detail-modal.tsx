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
  Sparkles,
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
      <DialogContent className="w-[96vw] max-w-4xl lg:max-w-5xl max-h-[92vh] bg-white border border-slate-200/90 text-slate-900 p-0 overflow-hidden shadow-2xl rounded-2xl flex flex-col font-sans">
        {/* Header with Deep Navy & Cyan Gradient */}
        <div className="relative bg-gradient-to-r from-[#002D42] via-[#003D5C] to-[#00283d] p-5 sm:p-6 text-white flex items-center justify-between shrink-0 border-b border-[#002D42]">
          <div className="flex items-center gap-3.5">
            <div className="size-12 rounded-2xl bg-white/10 backdrop-blur-md text-cyan-300 flex items-center justify-center font-extrabold text-sm border border-cyan-400/20 shadow-inner">
              {record.sr_no ? `#${record.sr_no}` : '#'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl sm:text-2xl font-extrabold text-white tracking-tight font-['Montserrat']">
                  {record.student_name}
                </DialogTitle>
                <button
                  type="button"
                  onClick={() => copyToClipboard(record.student_name)}
                  className="p-1 text-cyan-300/70 hover:text-cyan-200 transition-colors cursor-pointer"
                  title="Copy student name"
                >
                  <Copy className="size-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs">
                {record.student_id && (
                  <span className="font-mono text-cyan-300 font-bold bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-500/30">
                    ID: {record.student_id}
                  </span>
                )}
                {record.status && (
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                    record.status.toLowerCase() === 'current'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                      : record.status.toLowerCase() === 'future'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                      : record.status.toLowerCase() === 'cancelled'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                  }`}>
                    {record.status}
                  </span>
                )}
                {record.payment_status && (
                  <span className="bg-sky-500/20 text-sky-200 border border-sky-400/30 text-[10px] font-bold px-2 py-0.5 rounded-md">
                    Plan: {record.payment_status}
                  </span>
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
                className="border-cyan-400/30 bg-white/10 hover:bg-white/20 text-white h-9 px-3.5 rounded-xl text-xs gap-1.5 font-bold backdrop-blur-xs transition-all cursor-pointer"
              >
                <Edit2 className="size-3.5 text-cyan-300" />
                <span>Edit Entry</span>
              </Button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs bg-slate-50/50">
          {/* Core Highlights 4-Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-white border border-rose-200/80 shadow-2xs relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-rose-500" />
              <span className="text-[10px] uppercase font-bold text-rose-600 block tracking-wider">
                Pending Invoice
              </span>
              <span className="text-xl font-extrabold text-rose-700 mt-1 block font-mono">
                {record.pending_invoice || '-'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-amber-200/80 shadow-2xs relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-amber-500" />
              <span className="text-[10px] uppercase font-bold text-amber-600 block tracking-wider">
                Pending Amount
              </span>
              <span className="text-xl font-extrabold text-amber-600 mt-1 block font-mono">
                {formatAUD(record.pending_amount)}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-emerald-200/80 shadow-2xs relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-emerald-500" />
              <span className="text-[10px] uppercase font-bold text-emerald-600 block tracking-wider">
                Yet to Raised
              </span>
              <span className="text-xl font-extrabold text-emerald-700 mt-1 block font-mono">
                {record.yet_to_raised || '-'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-cyan-200/80 shadow-2xs relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-cyan-500" />
              <span className="text-[10px] uppercase font-bold text-cyan-700 block tracking-wider">
                Intake Date
              </span>
              <span className="text-xl font-extrabold text-cyan-900 mt-1 block font-mono">
                {record.intake || '-'}
              </span>
            </div>
          </div>

          {/* Academic & Agency Details */}
          <div className="space-y-3 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#003D5C] flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <BookOpen className="size-4 text-[#009D9E]" /> Course & Agency Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
              <div>
                <span className="text-slate-400 block font-semibold text-[11px]">Course Name</span>
                <span className="text-slate-900 font-bold block mt-0.5">
                  {record.course || 'Not Specified'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[11px]">Agent / Agency</span>
                <span className="text-slate-900 font-bold block mt-0.5">
                  {record.agent || 'Direct / None'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[11px]">Intake Date</span>
                <span className="text-slate-800 font-bold block mt-0.5 font-mono">
                  {record.intake || '-'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[11px]">Course End Date</span>
                <span className="text-slate-800 font-bold block mt-0.5 font-mono">
                  {record.end_date || '-'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[11px]">Document Type / CoE Status</span>
                <span className="text-slate-800 font-bold block mt-0.5">
                  {record.document || '-'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[11px]">COE Issue Date</span>
                <span className="text-slate-800 font-bold block mt-0.5 font-mono">
                  {record.coe_issued_date || '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Fee & Financial Summary */}
          <div className="space-y-3 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <DollarSign className="size-4 text-emerald-600" /> Invoicing & Fees Breakdown
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/60">
                <span className="text-slate-500 block text-[10.5px] font-semibold uppercase">Admin Fee</span>
                <span className="text-slate-900 font-bold font-mono text-sm">{formatAUD(record.admin_fee)}</span>
              </div>
              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/60">
                <span className="text-slate-500 block text-[10.5px] font-semibold uppercase">Resource Fee</span>
                <span className="text-slate-900 font-bold font-mono text-sm">{formatAUD(record.resource_fee)}</span>
              </div>
              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/60">
                <span className="text-slate-500 block text-[10.5px] font-semibold uppercase">Tuition Fee</span>
                <span className="text-slate-900 font-bold font-mono text-sm">{formatAUD(record.tuition_fee)}</span>
              </div>
              <div className="p-3 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-300 shadow-2xs">
                <span className="text-emerald-800 block text-[10.5px] font-extrabold uppercase">Total Fee</span>
                <span className="text-emerald-900 font-extrabold font-mono text-base">
                  {formatAUD(record.total_fee)}
                </span>
              </div>
              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/60">
                <span className="text-slate-500 block text-[10.5px] font-semibold uppercase">Initial Payment</span>
                <span className="text-emerald-600 font-bold font-mono text-sm">{formatAUD(record.paid_amount || (record as any).initial_payment)}</span>
              </div>
              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/60">
                <span className="text-slate-500 block text-[10.5px] font-semibold uppercase">Total Paid</span>
                <span className="text-teal-700 font-bold font-mono text-sm">
                  {formatAUD((record as any).total_paid !== undefined && (record as any).total_paid !== null ? (record as any).total_paid : (record.extra_data as any)?.total_paid)}
                </span>
              </div>
              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/60">
                <span className="text-slate-500 block text-[10.5px] font-semibold uppercase">Scholarship</span>
                <span className="text-slate-800 font-bold text-xs">{record.scholarship || '-'}</span>
              </div>
              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/60">
                <span className="text-slate-500 block text-[10.5px] font-semibold uppercase">Payment Plan</span>
                <span className="text-slate-800 font-bold text-xs">{record.payment_status || 'Pending'}</span>
              </div>
              <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200">
                <span className="text-amber-700 block text-[10.5px] font-bold uppercase">Pending Balance</span>
                <span className="text-amber-700 font-extrabold font-mono text-sm">{formatAUD(record.pending_amount)}</span>
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-3 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#003D5C] flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <User className="size-4 text-[#009D9E]" /> Personal & Contact Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/60 flex items-center gap-2.5">
                <Mail className="size-4 text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Email</span>
                  <span className="text-slate-900 font-semibold truncate block">{record.email_id || '-'}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/60 flex items-center gap-2.5">
                <Phone className="size-4 text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Phone</span>
                  <span className="text-slate-900 font-semibold font-mono">{record.phone_no || '-'}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/60 flex items-center gap-2.5">
                <Calendar className="size-4 text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Date of Birth</span>
                  <span className="text-slate-900 font-semibold font-mono">{record.dob || '-'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Remarks */}
          {record.remarks && (
            <div className="p-4.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-xs text-amber-900 space-y-1 shadow-2xs">
              <span className="font-extrabold flex items-center gap-1.5 text-amber-800">
                <FileText className="size-4" /> Remarks / Ledger Notes:
              </span>
              <p className="whitespace-pre-wrap font-medium">{record.remarks}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4.5 bg-white border-t border-slate-200 flex justify-end shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100 px-6 rounded-xl text-xs font-bold cursor-pointer"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
