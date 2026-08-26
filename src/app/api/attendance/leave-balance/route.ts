import { NextRequest, NextResponse } from 'next/server'
import { getEmployeeLeaveBalanceSummary } from '@/lib/services/attendance.service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const date = searchParams.get('date') || undefined
    const excludeRecordId = searchParams.get('excludeRecordId') || undefined

    if (!employeeId) {
      return NextResponse.json({ success: false, error: 'Employee ID is required.' }, { status: 400 })
    }

    const summary = await getEmployeeLeaveBalanceSummary(employeeId, date, excludeRecordId)

    return NextResponse.json({
      success: true,
      ...summary,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
