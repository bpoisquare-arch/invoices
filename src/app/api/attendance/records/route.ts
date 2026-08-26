import { NextRequest, NextResponse } from 'next/server'
import {
  getAttendanceRecords,
  updateAttendanceRecord,
  createManualAttendanceRecord,
  deleteAttendanceRecord,
  bulkDeleteAttendanceRecords,
  getAttendanceSummary,
  getTodayAttendanceMetrics,
} from '@/lib/services/attendance.service'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { employee_id, attendance_date, in_time, out_time, arrival_status, departure_status, notes } = body

    if (!employee_id || !attendance_date) {
      return NextResponse.json(
        { success: false, error: 'Employee ID and attendance date are required.' },
        { status: 400 }
      )
    }

    const created = await createManualAttendanceRecord({
      employee_id,
      attendance_date,
      in_time,
      out_time,
      arrival_status,
      departure_status,
      notes,
    })

    return NextResponse.json({ success: true, record: created })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('mode')

    if (mode === 'today_metrics') {
      const metrics = await getTodayAttendanceMetrics()
      return NextResponse.json({ success: true, metrics })
    }

    if (mode === 'summary') {
      const employeeId = searchParams.get('employeeId') || undefined
      const month = searchParams.get('month') || undefined
      const startDate = searchParams.get('startDate') || undefined
      const endDate = searchParams.get('endDate') || undefined
      const summary = await getAttendanceSummary({ employeeId, month, startDate, endDate })
      return NextResponse.json({ success: true, summary })
    }

    const employeeId = searchParams.get('employeeId') || undefined
    const search = searchParams.get('search') || undefined
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const month = searchParams.get('month') || undefined
    const dayOfWeek = searchParams.get('dayOfWeek') || undefined
    const arrivalStatus = searchParams.get('arrivalStatus') || undefined
    const departureStatus = searchParams.get('departureStatus') || undefined
    const sortBy = (searchParams.get('sortBy') as any) || undefined
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '25', 10)

    const result = await getAttendanceRecords({
      employeeId,
      search,
      startDate,
      endDate,
      month,
      dayOfWeek,
      arrivalStatus,
      departureStatus,
      sortBy,
      page,
      pageSize,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, employee_id, in_time, out_time, attendance_date, arrival_status, departure_status, notes } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'Record ID is required.' }, { status: 400 })
    }

    const updated = await updateAttendanceRecord(id, {
      employee_id: employee_id || body.employee?.id,
      in_time,
      out_time,
      attendance_date,
      arrival_status,
      departure_status,
      notes,
    })

    return NextResponse.json({ success: true, record: updated })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const employeeId = searchParams.get('employeeId') || undefined

    let body: any = null
    try {
      body = await request.json()
    } catch {
      // not a json body
    }

    const effectiveId = id || body?.id
    const effectiveStartDate = startDate || body?.startDate
    const effectiveEndDate = endDate || body?.endDate
    const effectiveEmpId = employeeId || body?.employeeId

    if (effectiveStartDate && effectiveEndDate) {
      const result = await bulkDeleteAttendanceRecords({
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
        employeeId: effectiveEmpId,
      })
      return NextResponse.json({
        success: true,
        deletedCount: result.deletedCount,
        message: `Successfully deleted ${result.deletedCount} attendance record(s).`,
      })
    }

    if (!effectiveId) {
      return NextResponse.json(
        { success: false, error: 'Record ID or Date Range (startDate, endDate) is required.' },
        { status: 400 }
      )
    }

    await deleteAttendanceRecord(effectiveId)
    return NextResponse.json({ success: true, message: 'Record deleted.' })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
