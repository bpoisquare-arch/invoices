import { NextRequest, NextResponse } from 'next/server'
import {
  getAllDeductions,
  getEmployeeDeduction,
  getEmployeeAllDeductions,
  setEmployeeDeduction,
  deleteEmployeeDeduction,
  getDeductionsForMonth,
} from '@/lib/services/deduction-storage'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const month = searchParams.get('month') // e.g. "2026-08"

    if (employeeId && month) {
      const deduction = await getEmployeeDeduction(employeeId, month)
      return NextResponse.json({ success: true, deduction })
    }

    if (employeeId) {
      const deductions = await getEmployeeAllDeductions(employeeId)
      return NextResponse.json({ success: true, deductions })
    }

    if (month) {
      const deductions = await getDeductionsForMonth(month)
      return NextResponse.json({ success: true, deductions })
    }

    const deductions = await getAllDeductions()
    return NextResponse.json({ success: true, deductions })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { employeeId, month, amount, noteType, notes } = body

    if (!employeeId || !month) {
      return NextResponse.json(
        { success: false, error: 'employeeId and month (e.g. 2026-08) are required.' },
        { status: 400 }
      )
    }

    const deduction = await setEmployeeDeduction({
      employeeId,
      monthYear: month,
      amount: Number(amount) || 0,
      noteType: noteType || notes || 'Other Deduction',
    })

    return NextResponse.json({ success: true, deduction })
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
        { success: false, error: 'employeeId and month are required to delete a deduction record.' },
        { status: 400 }
      )
    }

    const deleted = await deleteEmployeeDeduction(employeeId, month)
    return NextResponse.json({ success: true, deleted })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
