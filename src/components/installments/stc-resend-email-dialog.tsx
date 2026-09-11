'use client'

import React, { useState, useEffect } from 'react'
import {
  STCStudentInstallmentSchedule,
  getSTCFixedInfo,
} from '@/lib/services/stc-installment.service'
import {
  STC_VERIFIED_SENDERS,
  DEFAULT_STC_FROM_EMAIL,
  isValidEmail,
  STCInstallmentEmailLog,
  ResendEligibility,
  checkSTCResendEligibility,
  getSTCEmailLogsByScheduleId,
} from '@/lib/services/stc-installment-email.service'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Mail,
  Send,
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle,
  History,
  ShieldCheck,
  RotateCw,
} from 'lucide-react'

interface STCResendEmailDialogProps {
  schedule: STCStudentInstallmentSchedule | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export default function STCResendEmailDialog({
  schedule,
  open,
  onOpenChange,
  onSuccess,
}: STCResendEmailDialogProps) {
  const [fromEmail, setFromEmail] = useState<string>(DEFAULT_STC_FROM_EMAIL)
  const [toEmail, setToEmail] = useState<string>('')
  const [subject, setSubject] = useState<string>('')
  const [message, setMessage] = useState<string>('')

  const [isLoadingEligibility, setIsLoadingEligibility] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [eligibility, setEligibility] = useState<ResendEligibility>({
    allowed: true,
    remainingResends: 2,
    nextResendAt: null,
    countdownText: null,
    successfulResendsInWindow: 0,
  })
  const [logs, setLogs] = useState<STCInstallmentEmailLog[]>([])
  const [showLogs, setShowLogs] = useState(false)

  useEffect(() => {
    if (schedule && open) {
      setError(null)
      setSuccessMessage(null)
      setShowLogs(false)

      const initialTo = schedule.recipient_email || ''
      setToEmail(initialTo)
      setFromEmail(schedule.from_email || DEFAULT_STC_FROM_EMAIL)

      const defaultSubject =
        schedule.email_subject ||
        `Installment Schedule - ${schedule.student_name} (${schedule.student_id}) - States College Australia`
      setSubject(defaultSubject)

      const defaultMsg =
        schedule.email_message ||
        `Dear ${schedule.student_name},\n\nPlease find attached your official Student Installment Schedule for ${schedule.course_name}.\n\nKind regards,\nAccounts & Finance Department\nStates College Australia`
      setMessage(defaultMsg)

      loadEligibilityAndLogs(schedule.id)
    }
  }, [schedule, open])

  async function loadEligibilityAndLogs(scheduleId: string) {
    try {
      setIsLoadingEligibility(true)
      const fetchedLogs = await getSTCEmailLogsByScheduleId(scheduleId)
      setLogs(fetchedLogs)
      const el = await checkSTCResendEligibility(scheduleId, fetchedLogs)
      setEligibility(el)
    } catch (err) {
      console.error('Error loading STC email logs:', err)
    } finally {
      setIsLoadingEligibility(false)
    }
  }

  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!schedule) return
    setError(null)
    setSuccessMessage(null)

    if (!isValidEmail(toEmail)) {
      setError('Please provide a valid recipient email address.')
      return
    }

    if (!eligibility.allowed) {
      setError(eligibility.message || 'Resend rate limit exceeded.')
      return
    }

    try {
      setIsSending(true)
      const response = await fetch('/api/stc/installments/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleId: schedule.id,
          toEmail: toEmail.trim(),
          fromEmail: fromEmail.trim(),
          subject: subject.trim(),
          message: message.trim(),
          isResend: true,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to send email.')
      }

      setSuccessMessage('Email sent successfully with STC schedule PDF attachment.')
      await loadEligibilityAndLogs(schedule.id)

      if (onSuccess) {
        onSuccess()
      }
    } catch (err: any) {
      console.error('STC Email sending failed:', err)
      setError(err?.message || 'Failed to send email. Please check configuration.')
    } finally {
      setIsSending(false)
    }
  }

  if (!schedule) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] bg-white border border-slate-200 text-slate-900 shadow-2xl p-6 rounded-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#009D9E]/10 text-[#009D9E] flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <DialogTitle className="text-lg font-bold font-['Montserrat'] text-[#003D5C]">
              Send STC Installment Schedule Email
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Send official States College Australia Installment Schedule PDF to student or agency.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Rate Limit Info Card */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#009D9E]" />
              Resend Quota:
            </span>
            <span
              className={`font-bold font-mono ${
                eligibility.allowed ? 'text-[#009D9E]' : 'text-rose-600'
              }`}
            >
              {eligibility.remainingResends} / 2 remaining (24h)
            </span>
          </div>
          {!eligibility.allowed && eligibility.countdownText && (
            <p className="text-[11px] text-amber-700 font-medium">
              Rate limit active. Available again in {eligibility.countdownText}.
            </p>
          )}
        </div>

        <form onSubmit={handleSendEmail} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">From Verified Sender</Label>
            <select
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-slate-200 text-slate-800 text-xs rounded-xl focus:outline-none focus:border-[#009D9E]"
            >
              {STC_VERIFIED_SENDERS.map((s) => (
                <option key={s.email} value={s.email} className="bg-white text-slate-800">
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Recipient Email</Label>
            <Input
              type="email"
              placeholder="student@example.com"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              className="bg-white border-slate-200 text-slate-900 text-xs rounded-xl focus:border-[#009D9E]"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Subject</Label>
            <Input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="bg-white border-slate-200 text-slate-900 text-xs rounded-xl focus:border-[#009D9E]"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Message</Label>
            <Textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-white border-slate-200 text-slate-900 text-xs rounded-xl focus:border-[#009D9E] resize-none"
            />
          </div>

          <DialogFooter className="pt-2 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowLogs(!showLogs)}
              className="text-slate-500 hover:text-slate-900 text-xs cursor-pointer"
            >
              <History className="w-3.5 h-3.5 mr-1" />
              {showLogs ? 'Hide History' : `History (${logs.length})`}
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="border-slate-200 text-slate-600 hover:bg-slate-50 text-xs rounded-xl cursor-pointer"
              >
                Close
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSending || !eligibility.allowed}
                className="bg-[#003D5C] hover:bg-[#002b40] text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    Send Email
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>

        {/* History Logs Drawer/Dropdown */}
        {showLogs && (
          <div className="mt-4 pt-4 border-t border-slate-100 max-h-48 overflow-y-auto space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Recent Dispatches
            </p>
            {logs.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No email logs found for this schedule.</p>
            ) : (
              logs.map((l) => (
                <div
                  key={l.id}
                  className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between"
                >
                  <div>
                    <span className="font-semibold text-slate-800">{l.to_email}</span>
                    <span className="text-[10px] text-slate-500 block">
                      {new Date(l.sent_at).toLocaleString()}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      l.status === 'sent'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {l.status}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
