import { NextRequest, NextResponse } from 'next/server'
import {
  getEmailLogsByScheduleId,
  checkResendEligibility,
} from '@/lib/services/installment-email.service'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ success: false, error: 'Schedule ID is required.' }, { status: 400 })
    }

    const logs = await getEmailLogsByScheduleId(id)
    const eligibility = await checkResendEligibility(id, logs)

    return NextResponse.json({
      success: true,
      schedule_id: id,
      logs,
      eligibility,
    })
  } catch (err: any) {
    console.error('Email status error:', err)
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Failed to fetch email status',
      },
      { status: 500 }
    )
  }
}
