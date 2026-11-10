import { NextRequest, NextResponse } from 'next/server'
import {
  getAllCommissionPayouts,
  saveCommissionPayout,
} from '@/lib/services/agent-payout.service'

export async function GET() {
  try {
    const payouts = await getAllCommissionPayouts()
    return NextResponse.json({
      success: true,
      payouts,
    })
  } catch (error: any) {
    console.error('Error fetching commission payouts:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch payouts' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { recordId, studentId, studentName, agentName, commissionPaid, notes } = body

    if (!recordId) {
      return NextResponse.json(
        { success: false, error: 'Record ID is required' },
        { status: 400 }
      )
    }

    const numericAmount = Number(commissionPaid)
    if (isNaN(numericAmount) || numericAmount < 0) {
      return NextResponse.json(
        { success: false, error: 'Commission paid must be a valid non-negative number' },
        { status: 400 }
      )
    }

    const saved = await saveCommissionPayout({
      recordId,
      studentId,
      studentName,
      agentName,
      commissionPaid: numericAmount,
      notes,
    })

    return NextResponse.json({
      success: true,
      payout: saved,
    })
  } catch (error: any) {
    console.error('Error saving commission payout:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save payout' },
      { status: 500 }
    )
  }
}

