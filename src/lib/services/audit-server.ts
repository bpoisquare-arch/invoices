import { createClient as createServerClient } from '@/lib/supabase/server'

export interface AuditEventInput {
  action: string
  module: string
  record_id?: string | null
  metadata?: Record<string, any>
}

/**
 * Server-only logger that writes audit events directly to the database.
 * Safe to import in Server Components, API Routes, and Server Actions.
 */
export async function logAuditEventServer(input: AuditEventInput) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('security_audit_logs').insert([
      {
        user_id: user?.id || null,
        user_email: user?.email || 'anonymous',
        action: input.action,
        module: input.module,
        record_id: input.record_id || null,
        metadata: input.metadata || {},
      },
    ])

    if (error) {
      console.warn('Direct database audit log write error:', error.message)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    console.error('Direct database audit log exception:', err)
    return { success: false, error: err?.message || 'Unknown direct audit log error' }
  }
}
