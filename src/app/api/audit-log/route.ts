import { NextRequest, NextResponse } from 'next/server'
import { logAuditEventServer } from '@/lib/services/audit-server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, module, record_id, metadata } = body

    if (!action || !module) {
      return NextResponse.json({ success: false, error: 'Action and module are required.' }, { status: 400 })
    }

    const result = await logAuditEventServer({
      action,
      module,
      record_id,
      metadata,
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
