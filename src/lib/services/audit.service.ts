export interface AuditEventInput {
  action: string
  module: string
  record_id?: string | null
  metadata?: Record<string, any>
}

/**
 * Client-safe logger that sends events to /api/audit-log API endpoint.
 * Safe to import in Client Components ('use client') without causing bundle errors.
 */
export async function logAuditEvent(input: AuditEventInput) {
  try {
    const response = await fetch('/api/audit-log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const errData = await response.json()
      console.warn('API audit logger reported error:', errData.error)
      return { success: false, error: errData.error }
    }

    return { success: true }
  } catch (err: any) {
    console.error('API audit log execution error:', err)
    return { success: false, error: err?.message || 'Unknown API audit log error' }
  }
}
