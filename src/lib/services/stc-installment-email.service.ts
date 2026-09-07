import { createClient } from '@/lib/supabase/client'

export interface STCInstallmentEmailLog {
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

export const STC_VERIFIED_SENDERS: VerifiedSender[] = [
  { email: 'accounts@statescollege.edu.au', label: 'STC Accounts (accounts@statescollege.edu.au)' },
  { email: 'admin@statescollege.edu.au', label: 'STC Administration (admin@statescollege.edu.au)' },
  { email: 'finance@statescollege.edu.au', label: 'STC Finance (finance@statescollege.edu.au)' },
  { email: 'info@statescollege.edu.au', label: 'STC Student Services (info@statescollege.edu.au)' },
  { email: 'admin@isquarebpo.com', label: 'System Admin (admin@isquarebpo.com)' },
]

export const DEFAULT_STC_FROM_EMAIL = 'accounts@statescollege.edu.au'

const STC_EMAIL_LOGS_STORAGE_KEY = 'stc_installment_email_logs'

let memoryEmailLogs: STCInstallmentEmailLog[] = []

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email.trim())
}

export function isVerifiedSender(email: string): boolean {
  if (!email) return false
  const trimmed = email.trim().toLowerCase()
  return STC_VERIFIED_SENDERS.some((s) => s.email.toLowerCase() === trimmed)
}

export function getStoredEmailLogs(): STCInstallmentEmailLog[] {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STC_EMAIL_LOGS_STORAGE_KEY)
      if (raw) {
        const parsed: STCInstallmentEmailLog[] = JSON.parse(raw)
        parsed.forEach((item) => {
          if (!memoryEmailLogs.some((m) => m.id === item.id)) {
            memoryEmailLogs.push(item)
          }
        })
        return parsed
      }
    } catch {
      // Fallback
    }
  }
  return memoryEmailLogs
}

export function saveStoredEmailLogs(logs: STCInstallmentEmailLog[]) {
  memoryEmailLogs = [...logs]
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STC_EMAIL_LOGS_STORAGE_KEY, JSON.stringify(logs))
    } catch {
      // Ignore
    }
  }
}

export async function getSTCEmailLogsByScheduleId(scheduleId: string): Promise<STCInstallmentEmailLog[]> {
  const localLogs = getStoredEmailLogs().filter((log) => log.schedule_id === scheduleId)

  try {
    const supabase = createClient()
    const { data, error } = await (supabase as any)
      .from('stc_installment_email_logs')
      .select('*')
      .eq('schedule_id', scheduleId)
      .order('sent_at', { ascending: false })

    if (!error && data && data.length > 0) {
      const dbLogs = data as unknown as STCInstallmentEmailLog[]
      const combined = [...dbLogs, ...localLogs.filter((l) => !dbLogs.some((d) => d.id === l.id))]
      return combined.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())
    }
  } catch {
    // Fallback
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

export async function checkSTCResendEligibility(
  scheduleId: string,
  providedLogs?: STCInstallmentEmailLog[]
): Promise<ResendEligibility> {
  const logs = providedLogs || (await getSTCEmailLogsByScheduleId(scheduleId))
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

export async function logSTCEmailAttempt(
  logData: Omit<STCInstallmentEmailLog, 'id' | 'created_at'>
): Promise<STCInstallmentEmailLog> {
  const newLog: STCInstallmentEmailLog = {
    ...logData,
    id: `stc-log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    created_at: new Date().toISOString(),
  }

  const current = getStoredEmailLogs()
  current.unshift(newLog)
  saveStoredEmailLogs(current)

  try {
    const supabase = createClient()
    await (supabase as any).from('stc_installment_email_logs').insert([
      {
        schedule_id: newLog.schedule_id,
        from_email: newLog.from_email,
        to_email: newLog.to_email,
        subject: newLog.subject,
        message: newLog.message || null,
        email_type: newLog.email_type,
        resend_number: newLog.resend_number,
        status: newLog.status,
        provider_message_id: newLog.provider_message_id || null,
        sent_at: newLog.sent_at,
        error_message: newLog.error_message || null,
        next_resend_at: newLog.next_resend_at || null,
      },
    ])
  } catch {
    // Ignore error
  }

  return newLog
}
