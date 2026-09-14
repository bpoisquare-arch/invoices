import { NextRequest, NextResponse } from 'next/server'
import {
  getAllAdjustments,
  getEmployeeAdjustment,
  getEmployeeAllAdjustments,
  setEmployeeAdjustment,
  deleteEmployeeAdjustment,
  getAdjustmentsForMonth,
} from '@/lib/services/adjustment-storage'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const month = searchParams.get('month') // e.g. "2026-09"

    if (employeeId && month) {
      const adjustment = await getEmployeeAdjustment(employeeId, month)
      return NextResponse.json({ success: true, adjustment })
    }

    if (employeeId) {
      const adjustments = await getEmployeeAllAdjustments(employeeId)
      return NextResponse.json({ success: true, adjustments })
    }

    if (month) {
      const adjustments = await getAdjustmentsForMonth(month)
      return NextResponse.json({ success: true, adjustments })
    }

    const adjustments = await getAllAdjustments()
    return NextResponse.json({ success: true, adjustments })
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
        { success: false, error: 'employeeId and month (e.g. 2026-09) are required.' },
        { status: 400 }
      )
    }

    const adjustment = await setEmployeeAdjustment({
      employeeId,
      monthYear: month,
      amount: Number(amount) || 0,
      notes: notes || '',
    })

    return NextResponse.json({ success: true, adjustment })
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
        { success: false, error: 'employeeId and month are required to delete an adjustment record.' },
        { status: 400 }
      )
    }

    const deleted = await deleteEmployeeAdjustment(employeeId, month)
    return NextResponse.json({ success: true, deleted })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
