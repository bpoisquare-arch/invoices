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
  MessageSquare,
} from 'lucide-react'
import type { StcReportRecord } from '@/lib/supabase/database.types'

interface StcReportRecordDetailModalProps {
  isOpen: boolean
  onClose: () => void
  record: StcReportRecord | null
  onEdit?: (record: StcReportRecord) => void
}

export default function StcReportRecordDetailModal({
  isOpen,
  onClose,
  record,
  onEdit,
}: StcReportRecordDetailModalProps) {
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
        {/* Header with States College Emerald Gradient */}
        <div className="relative bg-gradient-to-r from-[#001E2F] via-[#0E3E5B] to-[#00BF8F]/40 p-5 sm:p-6 text-white flex items-center justify-between shrink-0 border-b border-[#001E2F]">
          <div className="flex items-center gap-3.5">
            <div className="size-12 rounded-2xl bg-white/10 backdrop-blur-md text-[#00BF8F] flex items-center justify-center font-extrabold text-sm border border-[#00BF8F]/30 shadow-inner">
              {record.sr_no ? `#${record.sr_no}` : '#'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  {record.student_name}
                </DialogTitle>
                <button
                  type="button"
                  onClick={() => copyToClipboard(record.student_name)}
                  className="p-1 text-emerald-300/70 hover:text-emerald-200 transition-colors cursor-pointer"
                  title="Copy student name"
                >
                  <Copy className="size-3.5" />
                </button>
              </div>
              <DialogDescription className="text-xs text-slate-300 font-medium flex items-center gap-2 mt-0.5">
                <span>States College Australia</span>
                <span>•</span>
                <span>ID: {record.student_id || 'Not Assigned'}</span>
                <span>•</span>
                <span>Status: {record.status || 'Current'}</span>
              </DialogDescription>
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
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold gap-1.5 h-9 rounded-xl backdrop-blur-md cursor-pointer"
              >
                <Edit2 className="size-3.5 text-[#00BF8F]" />
                <span>Edit Record</span>
              </Button>
            )}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Top Quick Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <p className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">Pending Amount</p>
              <p className="text-lg font-extrabold text-amber-600 font-mono mt-0.5">
                {formatAUD(record.pending_amount)}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <p className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">Pending Invoice</p>
              <p className="text-lg font-extrabold text-rose-600 font-mono mt-0.5">
                {record.pending_invoice || '-'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <p className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">Total Fee</p>
              <p className="text-lg font-extrabold text-slate-800 font-mono mt-0.5">
                {formatAUD(record.total_fee)}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <p className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">Initial Paid</p>
              <p className="text-lg font-extrabold text-emerald-600 font-mono mt-0.5">
                {formatAUD(record.paid_amount)}
              </p>
            </div>
          </div>

          {/* Section 1: Academic & Enrollment Information */}
          <div className="p-4 rounded-xl border border-slate-200/90 bg-white space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <BookOpen className="size-4 text-[#00BF8F]" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Academic & Enrollment Information
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
              <div>
                <span className="text-slate-400 text-[11px] block font-medium">Course Name</span>
                <span className="font-bold text-slate-900 mt-0.5 block">
                  {record.course || '-'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block font-medium">Intake Date</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {record.intake || '-'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block font-medium">Course End Date</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {record.end_date || '-'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block font-medium">Document Type</span>
                <Badge variant="outline" className="mt-0.5 font-bold border-emerald-300 bg-emerald-50 text-emerald-800">
                  {record.document || 'Not Uploaded'}
                </Badge>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block font-medium">COE Issued Date</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {record.coe_issued_date || '-'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block font-medium">Agent / Agency</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {record.agent || '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Financials & Fee Ledger */}
          <div className="p-4 rounded-xl border border-slate-200/90 bg-white space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <DollarSign className="size-4 text-[#00BF8F]" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Financials & Fee Ledger
              </h4>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs">
              <div>
                <span className="text-slate-400 text-[11px] block font-medium">Admin Fee</span>
                <span className="font-mono font-semibold text-slate-800 mt-0.5 block">
                  {formatAUD(record.admin_fee)}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block font-medium">Resource Fee</span>
                <span className="font-mono font-semibold text-slate-800 mt-0.5 block">
                  {formatAUD(record.resource_fee)}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block font-medium">Tuition Fee</span>
                <span className="font-mono font-semibold text-slate-800 mt-0.5 block">
                  {formatAUD(record.tuition_fee)}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block font-medium">Scholarship</span>
                <span className="font-mono font-semibold text-slate-800 mt-0.5 block">
                  {record.scholarship ? `$${record.scholarship}` : '$0'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block font-medium">Total Course Fee</span>
                <span className="font-mono font-extrabold text-slate-900 mt-0.5 block">
                  {formatAUD(record.total_fee)}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block font-medium">Total Paid / Initial</span>
                <span className="font-mono font-bold text-emerald-600 mt-0.5 block">
                  {formatAUD(record.total_paid || record.paid_amount)}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block font-medium">Pending Balance</span>
                <span className="font-mono font-extrabold text-amber-600 mt-0.5 block">
                  {formatAUD(record.pending_amount)}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block font-medium">Yet to Raised</span>
                <span className="font-mono font-bold text-slate-800 mt-0.5 block">
                  {record.yet_to_raised ? `$${record.yet_to_raised}` : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Student Personal Details & Contacts */}
          <div className="p-4 rounded-xl border border-slate-200/90 bg-white space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <User className="size-4 text-[#00BF8F]" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Personal Details & Contact
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
              <div>
                <span className="text-slate-400 text-[11px] block font-medium">Date of Birth (DOB)</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {record.dob || '-'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block font-medium">Email Address</span>
                <span className="font-semibold text-slate-800 mt-0.5 block truncate">
                  {record.email_id || '-'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block font-medium">Phone Number</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {record.phone_no || '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Remarks & Follow-Up Notes */}
          <div className="p-4 rounded-xl border border-slate-200/90 bg-white space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <MessageSquare className="size-4 text-[#00BF8F]" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Installment Breakup & Remarks
              </h4>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-400 text-[11px] block font-medium">Installment Breakup / Remarks</span>
                <p className="text-slate-800 font-medium whitespace-pre-wrap bg-slate-50 p-3 rounded-xl border border-slate-200/70 mt-1">
                  {record.remarks || 'No remarks recorded.'}
                </p>
              </div>

              {(record.follow_up || (record.extra_data as any)?.follow_up) && (
                <div>
                  <span className="text-slate-400 text-[11px] block font-medium">Follow-Up Note</span>
                  <p className="text-slate-800 font-medium whitespace-pre-wrap bg-emerald-50/50 p-3 rounded-xl border border-emerald-200/70 mt-1">
                    {record.follow_up || (record.extra_data as any)?.follow_up}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400">
            Database Record ID: {record.id}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs font-bold h-9 px-4 rounded-xl border-slate-300 hover:bg-slate-100 cursor-pointer"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
