'use client'

import React, { useState, useEffect } from 'react'
import {
  StudentInstallmentSchedule,
  getAimtFixedInfo,
} from '@/lib/services/installment.service'
import {
  VERIFIED_SENDERS,
  DEFAULT_FROM_EMAIL,
  isValidEmail,
  InstallmentEmailLog,
  ResendEligibility,
  checkResendEligibility,
  getEmailLogsByScheduleId,
} from '@/lib/services/installment-email.service'
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

interface ResendEmailDialogProps {
  schedule: StudentInstallmentSchedule | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export default function ResendEmailDialog({
  schedule,
  open,
  onOpenChange,
  onSuccess,
}: ResendEmailDialogProps) {
  const [fromEmail, setFromEmail] = useState<string>(DEFAULT_FROM_EMAIL)
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
  const [logs, setLogs] = useState<InstallmentEmailLog[]>([])
  const [showLogs, setShowLogs] = useState(false)

  // Initialize or reset form when schedule changes or modal opens
  useEffect(() => {
    if (schedule && open) {
      setError(null)
      setSuccessMessage(null)
      setShowLogs(false)

      const initialTo = schedule.recipient_email || ''
      setToEmail(initialTo)
      setFromEmail(schedule.from_email || DEFAULT_FROM_EMAIL)

      const defaultSubject =
        schedule.email_subject ||
        `Installment Schedule - ${schedule.student_name} (${schedule.student_id}) - Australian Institute of Management and Technology`
      setSubject(defaultSubject)

      const defaultMsg =
        schedule.email_message ||
        `Dear ${schedule.student_name},\n\nPlease find attached your official Student Installment Schedule for ${schedule.course_name}.\n\nKind regards,\nAccounts & Finance Department\nAustralian Institute of Management and Technology`
      setMessage(defaultMsg)

      loadEligibilityAndLogs(schedule.id)
    }
  }, [schedule, open])

  async function loadEligibilityAndLogs(scheduleId: string) {
    try {
      setIsLoadingEligibility(true)
      const fetchedLogs = await getEmailLogsByScheduleId(scheduleId)
      setLogs(fetchedLogs)
      const res = await checkResendEligibility(scheduleId, fetchedLogs)
      setEligibility(res)
    } catch (e) {
      console.error('Failed to load email eligibility:', e)
    } finally {
      setIsLoadingEligibility(false)
    }
  }

  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!schedule) return

    setError(null)
    setSuccessMessage(null)

    // 1. Validation for To Email
    const trimmedTo = toEmail.trim()
    if (!trimmedTo) {
      setError('Please enter a recipient email address.')
      return
    }

    if (!isValidEmail(trimmedTo)) {
      setError('Please enter a valid recipient email address.')
      return
    }

    // 2. Validation for From Email
    const trimmedFrom = fromEmail.trim()
    if (!trimmedFrom) {
      setError('Please select a sender email address.')
      return
    }

    if (!isValidEmail(trimmedFrom)) {
      setError('Please enter a valid sender email address.')
      return
    }

    // 3. Frontend rate limit check
    if (!eligibility.allowed) {
      setError(
        eligibility.message ||
          `Resend limit reached (maximum 2 per 24 hours). Next resend available in ${eligibility.countdownText || '24h'}.`
      )
      return
    }

    setIsSending(true)

    try {
      const fixedInfo = getAimtFixedInfo()
      const res = await fetch('/api/installments/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schedule_id: schedule.id,
          to_email: trimmedTo,
          from_email: trimmedFrom,
          subject: subject.trim(),
          message: message.trim(),
          email_type: 'resend',
          schedule_data: schedule,
          fixed_info: fixedInfo,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        if (res.status === 429) {
          setError(data.error || 'Resend limit reached. Please wait for cooldown to expire.')
          if (data.eligibility) {
            setEligibility(data.eligibility)
          }
        } else {
          setError(data.error || 'Failed to send email. Please try again.')
        }
        setIsSending(false)
        return
      }

      setSuccessMessage(`Email sent successfully to ${trimmedTo}!`)
      await loadEligibilityAndLogs(schedule.id)
      if (onSuccess) onSuccess()

      setTimeout(() => {
        onOpenChange(false)
      }, 1500)
    } catch (err: any) {
      setError(err?.message || 'Network error while attempting to send email.')
    } finally {
      setIsSending(false)
    }
  }

  if (!schedule) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden bg-white text-slate-900 border-slate-200">
        <DialogHeader className="p-6 pb-4 bg-slate-50/80 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#003D5C] text-white rounded-lg">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-[#003D5C]">
                  Resend Installment Schedule
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Student: <span className="font-semibold text-slate-800">{schedule.student_name}</span> ({schedule.student_id})
                </DialogDescription>
              </div>
            </div>

            {/* Rate limit status pill */}
            <div className="text-right">
              {isLoadingEligibility ? (
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Checking quota...
                </span>
              ) : eligibility.allowed ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  {eligibility.remainingResends} resend{eligibility.remainingResends === 1 ? '' : 's'} left in 24h
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Cooldown: {eligibility.countdownText}
                </span>
              )}
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSendEmail} className="p-6 space-y-4">
          {/* Notifications */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs font-semibold text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs font-semibold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {!eligibility.allowed && !error && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900 flex items-start gap-2">
              <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">24-Hour Resend Limit Reached</p>
                <p className="mt-0.5 text-amber-800">
                  This schedule has reached its maximum of 2 successful resends in the current 24-hour window. Resend will be available in{' '}
                  <span className="font-bold">{eligibility.countdownText}</span>.
                </p>
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                FROM EMAIL (SENDER) *
              </Label>
              <select
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                disabled={isSending}
                className="mt-1.5 w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#009D9E]"
              >
                {VERIFIED_SENDERS.map((s) => (
                  <option key={s.email} value={s.email}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                TO EMAIL (RECIPIENT) *
              </Label>
              <Input
                type="email"
                placeholder="student@example.com"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                disabled={isSending}
                className="mt-1.5 h-9 text-xs"
                required
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px]">
              EMAIL SUBJECT
            </Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isSending}
              className="mt-1.5 h-9 text-xs font-medium text-slate-800"
            />
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px]">
              MESSAGE
            </Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSending}
              rows={3}
              className="mt-1.5 text-xs text-slate-800 font-sans resize-none"
            />
          </div>

          {/* Email History Accordion/Toggle */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowLogs(!showLogs)}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-[#009D9E]" />
                {showLogs ? 'Hide Email History' : `View Email History (${logs.length})`}
              </button>

              <button
                type="button"
                onClick={() => loadEligibilityAndLogs(schedule.id)}
                className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1"
                title="Refresh Status"
              >
                <RotateCw className="w-3 h-3" /> Refresh
              </button>
            </div>

            {showLogs && (
              <div className="mt-2 p-3 bg-slate-50 rounded-md border border-slate-200 max-h-36 overflow-y-auto space-y-2 text-xs">
                {logs.length === 0 ? (
                  <p className="text-slate-400 text-center py-2">No past emails recorded for this schedule.</p>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between py-1.5 border-b border-slate-200 last:border-0"
                    >
                      <div>
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase ${
                              log.email_type === 'initial'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}
                          >
                            {log.email_type === 'initial' ? 'Initial' : `Resend #${log.resend_number}`}
                          </span>
                          <span>To: {log.to_email}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {new Date(log.sent_at).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            log.status === 'sent'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {log.status === 'sent' ? 'Sent' : 'Failed'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSending}
              className="text-xs"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={isSending || !eligibility.allowed}
              className="bg-[#009D9E] hover:bg-[#007A7A] text-white font-bold text-xs h-9 gap-2 shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending PDF Email...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Email
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
