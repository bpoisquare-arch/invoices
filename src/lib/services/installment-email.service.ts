import { prisma } from '@/lib/prisma'

export interface InstallmentEmailLog {
  id: string
  schedule_id: string
  from_email: string
  to_email: string
  subject: string
  message?: string
  email_type: 'initial' | 'resend'
  resend_number: number
  status: 'sent' | 'failed'
  provider_message_id?: string | null
  sent_at: string
  error_message?: string | null
  next_resend_at?: string | null
  created_at: string
}

export interface VerifiedSender {
  email: string
  label: string
}

export const VERIFIED_SENDERS: VerifiedSender[] = [
  { email: 'accounts@aimtedu.com.au', label: 'AIMT Accounts (accounts@aimtedu.com.au)' },
  { email: 'admin@aimtedu.com.au', label: 'AIMT Administration (admin@aimtedu.com.au)' },
  { email: 'finance@aimtedu.com.au', label: 'AIMT Finance (finance@aimtedu.com.au)' },
  { email: 'info@aimtedu.com.au', label: 'AIMT Student Services (info@aimtedu.com.au)' },
]

export const DEFAULT_FROM_EMAIL = 'accounts@aimtedu.com.au'

const EMAIL_LOGS_STORAGE_KEY = 'aimt_installment_email_logs'

// Server & client in-memory cache for email logs
let memoryEmailLogs: InstallmentEmailLog[] = []

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email.trim())
}

export function isVerifiedSender(email: string): boolean {
  if (!email) return false
  const trimmed = email.trim().toLowerCase()
  return VERIFIED_SENDERS.some((s) => s.email.toLowerCase() === trimmed)
}

export function getStoredEmailLogs(): InstallmentEmailLog[] {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(EMAIL_LOGS_STORAGE_KEY)
      if (raw) {
        const parsed: InstallmentEmailLog[] = JSON.parse(raw)
        parsed.forEach((item) => {
          if (!memoryEmailLogs.some((m) => m.id === item.id)) {
            memoryEmailLogs.push(item)
          }
        })
        return parsed
      }
    } catch {
      // Fallback to memory
    }
  }
  return memoryEmailLogs
}

export function saveStoredEmailLogs(logs: InstallmentEmailLog[]) {
  memoryEmailLogs = [...logs]
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(EMAIL_LOGS_STORAGE_KEY, JSON.stringify(logs))
    } catch {
      // Ignore
    }
  }
}

export async function getEmailLogsByScheduleId(scheduleId: string): Promise<InstallmentEmailLog[]> {
  const localLogs = getStoredEmailLogs().filter((log) => log.schedule_id === scheduleId)

  try {
    const data = await prisma.installmentEmailLog.findMany({
      where: { scheduleId },
      orderBy: { sentAt: 'desc' },
    })

    if (data && data.length > 0) {
      const dbLogs: InstallmentEmailLog[] = data.map((d) => ({
        id: d.id,
        schedule_id: d.scheduleId,
        from_email: d.fromEmail,
        to_email: d.toEmail,
        subject: d.subject,
        message: d.message || undefined,
        email_type: d.emailType as any,
        resend_number: d.resendNumber,
        status: d.status as any,
        provider_message_id: d.providerMessageId,
        sent_at: d.sentAt instanceof Date ? d.sentAt.toISOString() : String(d.sentAt),
        error_message: d.errorMessage,
        next_resend_at: d.nextResendAt ? (d.nextResendAt instanceof Date ? d.nextResendAt.toISOString() : String(d.nextResendAt)) : null,
        created_at: d.createdAt instanceof Date ? d.createdAt.toISOString() : String(d.createdAt),
      }))
      const combined = [...dbLogs, ...localLogs.filter((l) => !dbLogs.some((d) => d.id === l.id))]
      return combined.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())
    }
  } catch {
    // Fallback to local
  }

  return localLogs.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())
}

export interface ResendEligibility {
  allowed: boolean
  remainingResends: number
  nextResendAt: string | null
  countdownText: string | null
  successfulResendsInWindow: number
  message?: string
}

export async function checkResendEligibility(
  scheduleId: string,
  providedLogs?: InstallmentEmailLog[]
): Promise<ResendEligibility> {
  const logs = providedLogs || (await getEmailLogsByScheduleId(scheduleId))
  const now = Date.now()
  const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000

  const successfulResendsIn24h = logs.filter(
    (log) =>
      log.email_type === 'resend' &&
      log.status === 'sent' &&
      new Date(log.sent_at).getTime() >= twentyFourHoursAgo
  )

  successfulResendsIn24h.sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime())

  const count = successfulResendsIn24h.length

  if (count >= 2) {
    const oldestInWindow = successfulResendsIn24h[0]
    const oldestTime = new Date(oldestInWindow.sent_at).getTime()
    const nextAvailableTime = oldestTime + 24 * 60 * 60 * 1000
    const diffMs = nextAvailableTime - now

    if (diffMs > 0) {
      const hours = Math.floor(diffMs / (1000 * 60 * 60))
      const minutes = Math.ceil((diffMs % (1000 * 60 * 60)) / (1000 * 60))
      const countdownText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`

      return {
        allowed: false,
        remainingResends: 0,
        nextResendAt: new Date(nextAvailableTime).toISOString(),
        countdownText,
        successfulResendsInWindow: count,
        message: `Resend limit reached (maximum 2 per 24 hours). Resend available in ${countdownText}.`,
      }
    }
  }

  const remaining = Math.max(0, 2 - count)
  return {
    allowed: true,
    remainingResends: remaining,
    nextResendAt: null,
    countdownText: null,
    successfulResendsInWindow: count,
  }
}

export async function logEmailAttempt(
  logData: Omit<InstallmentEmailLog, 'id' | 'created_at'>
): Promise<InstallmentEmailLog> {
  const newLog: InstallmentEmailLog = {
    ...logData,
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    created_at: new Date().toISOString(),
  }

  const current = getStoredEmailLogs()
  current.unshift(newLog)
  saveStoredEmailLogs(current)

  try {
    await prisma.installmentEmailLog.create({
      data: {
        id: newLog.id,
        scheduleId: newLog.schedule_id,
        fromEmail: newLog.from_email,
        toEmail: newLog.to_email,
        subject: newLog.subject,
        message: newLog.message || null,
        emailType: newLog.email_type,
        resendNumber: newLog.resend_number,
        status: newLog.status,
        providerMessageId: newLog.provider_message_id || null,
        sentAt: new Date(newLog.sent_at),
        errorMessage: newLog.error_message || null,
        nextResendAt: newLog.next_resend_at ? new Date(newLog.next_resend_at) : null,
      },
    })
  } catch {
    // Local log is preserved
  }

  return newLog
}
