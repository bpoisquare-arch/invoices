import { prisma } from '@/lib/prisma'

export interface AuditEventInput {
  action: string
  module: string
  record_id?: string | null
  metadata?: Record<string, any>
}

/**
 * Server-only logger that writes audit events directly to MySQL via Prisma.
 * Safe to import in Server Components, API Routes, and Server Actions.
 */
export async function logAuditEventServer(input: AuditEventInput) {
  try {
    await prisma.securityAuditLog.create({
      data: {
        action: input.action,
        module: input.module,
        recordId: input.record_id || null,
        metadata: input.metadata || {},
      },
    })

    return { success: true }
  } catch (err: any) {
    console.error('Direct database audit log exception:', err)
    return { success: false, error: err?.message || 'Unknown direct audit log error' }
  }
}
