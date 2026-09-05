import { NextRequest, NextResponse } from 'next/server'
import {
  getAllCommissions,
  getEmployeeCommission,
  getEmployeeAllCommissions,
  setEmployeeCommission,
  deleteEmployeeCommission,
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

    if (employeeId) {
      const commissions = await getEmployeeAllCommissions(employeeId)
      return NextResponse.json({ success: true, commissions })
    }

    if (month) {
      const commissions = await getCommissionsForMonth(month)
      return NextResponse.json({ success: true, commissions })
    }

    const commissions = await getAllCommissions()
    return NextResponse.json({ success: true, commissions })
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

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    let employeeId = searchParams.get('employeeId')
    let month = searchParams.get('month')

    if (!employeeId || !month) {
      try {
        const body = await request.json()
        employeeId = employeeId || body.employeeId
        month = month || body.month
      } catch {
        // no body
      }
    }

    if (!employeeId || !month) {
      return NextResponse.json(
        { success: false, error: 'employeeId and month are required to delete a commission record.' },
        { status: 400 }
      )
    }

    const deleted = await deleteEmployeeCommission(employeeId, month)
    return NextResponse.json({ success: true, deleted })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

