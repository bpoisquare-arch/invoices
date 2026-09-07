import { NextRequest, NextResponse } from 'next/server'
import {
  getSTCEmailLogsByScheduleId,
  checkSTCResendEligibility,
} from '@/lib/services/stc-installment-email.service'
import { getSTCInstallmentById } from '@/lib/services/stc-installment.service'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const schedule = await getSTCInstallmentById(id)

    if (!schedule) {
      return NextResponse.json({ success: false, error: 'STC Schedule not found' }, { status: 404 })
    }

    const logs = await getSTCEmailLogsByScheduleId(id)
    const eligibility = await checkSTCResendEligibility(id, logs)

    return NextResponse.json({
      success: true,
      schedule_id: id,
      last_email_sent_at: schedule.last_email_sent_at || null,
      last_email_status: schedule.last_email_status || null,
      recipient_email: schedule.recipient_email || null,
      from_email: schedule.from_email || null,
      eligibility,
      logs,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error fetching email status' },
      { status: 500 }
    )
  }
}
