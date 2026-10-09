import { NextRequest, NextResponse } from 'next/server'
import { logAuditEventServer } from '@/lib/services/audit-server'
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
    const session = await verifySessionToken(token)

    const body = await request.json()
    const { action, module, record_id, metadata } = body

    if (!action || !module) {
      return NextResponse.json({ success: false, error: 'Action and module are required.' }, { status: 400 })
    }

    // Enrich metadata with cryptographically verified identity if available
    const enrichedMetadata = {
      ...metadata,
      verified_user: session?.email || null,
      verified_role: session?.role || null,
    }

    const result = await logAuditEventServer({
      action,
      module,
      record_id,
      metadata: enrichedMetadata,
    })

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('Audit Log API Error:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal audit log API error' },
      { status: 500 }
    )
  }
}
