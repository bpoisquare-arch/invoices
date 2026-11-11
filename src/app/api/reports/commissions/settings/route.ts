import { NextRequest, NextResponse } from 'next/server'
import {
  getAllAgentCommissionRules,
  saveAgentCommissionRule,
  deleteAgentCommissionRule,
  type CommissionType,
} from '@/lib/services/agent-commission.service'
import { PREDEFINED_AGENTS } from '@/lib/constants/aimt-agents'

export async function GET() {
  try {
    const rules = await getAllAgentCommissionRules()
    return NextResponse.json({
      success: true,
      agents: PREDEFINED_AGENTS,
      rules,
    })
  } catch (error: any) {
    console.error('Error fetching agent commission rules:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch commission rules' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { agentName, type, rate, notes } = body

    if (!agentName || typeof agentName !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Agent name is required' },
        { status: 400 }
      )
    }

    if (type !== 'percentage' && type !== 'fixed' && type !== 'net_remainder') {
      return NextResponse.json(
        { success: false, error: 'Commission type must be "percentage", "fixed", or "net_remainder"' },
        { status: 400 }
      )
    }

    const numericRate = Number(rate)
    if (isNaN(numericRate) || numericRate < 0) {
      return NextResponse.json(
        { success: false, error: 'Commission rate must be a non-negative number' },
        { status: 400 }
      )
    }

    const updatedRule = await saveAgentCommissionRule({
      agentName,
      type: type as CommissionType,
      rate: numericRate,
      notes,
    })

    return NextResponse.json({
      success: true,
      rule: updatedRule,
    })
  } catch (error: any) {
    console.error('Error saving agent commission rule:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save commission rule' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const agentName = searchParams.get('agentName')

    if (!agentName) {
      return NextResponse.json(
        { success: false, error: 'Agent name is required' },
        { status: 400 }
      )
    }

    await deleteAgentCommissionRule(agentName)

    return NextResponse.json({
      success: true,
      message: `Commission rule for ${agentName} cleared successfully`,
    })
  } catch (error: any) {
    console.error('Error resetting agent commission rule:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete commission rule' },
      { status: 500 }
    )
  }
}

