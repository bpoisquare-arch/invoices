import { NextRequest, NextResponse } from 'next/server'
import {
  getAttendanceRequests,
  createAttendanceRequest,
  reviewAttendanceRequest,
} from '@/lib/services/attendance-requests.service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const branch = searchParams.get('branch') || undefined
    const status = searchParams.get('status') || undefined
    const employeeId = searchParams.get('employeeId') || undefined
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined

    const requests = await getAttendanceRequests({
      branch,
      status,
      employeeId,
      startDate,
      endDate,
    })

    const pendingCount = requests.filter((r) => r.status === 'PENDING').length

    return NextResponse.json({
      success: true,
      requests,
      pendingCount,
      total: requests.length,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 1. Review action (Approve / Reject)
    if (body.action === 'APPROVE' || body.action === 'REJECT') {
      const { requestId, action, reviewedBy, reviewNotes } = body
      if (!requestId) {
        return NextResponse.json({ success: false, error: 'Request ID is required.' }, { status: 400 })
      }
      const result = await reviewAttendanceRequest({
        requestId,
        action,
        reviewedBy,
        reviewNotes,
      })
      return NextResponse.json(result)
    }

    // 2. Submit new request
    const {
      employee_id,
      employee_name,
      batch_id,
      branch,
      attendance_date,
      request_type,
      leave_type,
      leave_duration,
      requested_in_time,
      requested_out_time,
      reason,
      submitted_by,
    } = body

    if (!employee_id || !attendance_date || !branch || !request_type) {
      return NextResponse.json(
        { success: false, error: 'Employee, date, branch, and request type are required.' },
        { status: 400 }
      )
    }

    const newReq = await createAttendanceRequest({
      employee_id,
      employee_name,
      batch_id,
      branch,
      attendance_date,
      request_type,
      leave_type,
      leave_duration: typeof leave_duration === 'number' ? leave_duration : parseFloat(leave_duration) || 1,
      requested_in_time,
      requested_out_time,
      reason,
      submitted_by,
    })

    return NextResponse.json({ success: true, request: newReq })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
