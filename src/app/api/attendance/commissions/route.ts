import { NextRequest, NextResponse } from 'next/server'
import {
  getEmployeeCommission,
  setEmployeeCommission,
  getCommissionsForMonth,
} from '@/lib/services/commission-storage'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const month = searchParams.get('month') // e.g. "2026-08"

    if (employeeId && month) {
      const commission = await getEmployeeCommission(employeeId, month)
      return NextResponse.json({ success: true, commission })
    }

    if (month) {
      const commissions = await getCommissionsForMonth(month)
      return NextResponse.json({ success: true, commissions })
    }

    return NextResponse.json(
      { success: false, error: 'employeeId and month (or month alone) are required' },
      { status: 400 }
    )
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { employeeId, month, amount, notes } = body

    if (!employeeId || !month) {
      return NextResponse.json(
        { success: false, error: 'employeeId and month (e.g. 2026-08) are required.' },
        { status: 400 }
      )
    }

    const commission = await setEmployeeCommission({
      employeeId,
      monthYear: month,
      amount: Number(amount) || 0,
      notes: notes || '',
    })

    return NextResponse.json({ success: true, commission })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
