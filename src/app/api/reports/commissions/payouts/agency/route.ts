import { NextRequest, NextResponse } from 'next/server'
import {
  getAllAgencyPayoutLogs,
  saveAgencyBulkPayout,
} from '@/lib/services/agent-payout.service'

export async function GET() {
  try {
    const logs = await getAllAgencyPayoutLogs()
    return NextResponse.json({
      success: true,
      logs,
    })
  } catch (error: any) {
    console.error('Error fetching agency payout logs:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch logs' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { agentName, amount, paymentDate, reference, notes, students } = body

    if (!agentName || typeof agentName !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Agent name is required' },
        { status: 400 }
      )
    }

    const numericAmount = Number(amount)
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Disbursement amount must be a positive number' },
        { status: 400 }
      )
    }

    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No enrolled students provided for this agency' },
        { status: 400 }
      )
    }

    const result = await saveAgencyBulkPayout({
      agentName,
      amount: numericAmount,
      paymentDate,
      reference,
      notes,
      students,
    })

    return NextResponse.json({
      success: true,
      updatedPayouts: result.updatedPayouts,
      payoutLog: result.payoutLog,
    })
  } catch (error: any) {
    console.error('Error in agency bulk payout API:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process agency payout' },
      { status: 500 }
    )
  }
}

