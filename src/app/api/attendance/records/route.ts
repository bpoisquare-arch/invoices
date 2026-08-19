import { NextRequest, NextResponse } from 'next/server'
import {
  getAttendanceRecords,
  updateAttendanceRecord,
  deleteAttendanceRecord,
  getAttendanceSummary,
  getTodayAttendanceMetrics,
} from '@/lib/services/attendance.service'

export const dynamic = 'force-dynamic'

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
    const { id, in_time, out_time, attendance_date } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'Record ID is required.' }, { status: 400 })
    }

    const updated = await updateAttendanceRecord(id, {
      in_time,
      out_time,
      attendance_date,
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

    if (!id) {
      return NextResponse.json({ success: false, error: 'Record ID is required.' }, { status: 400 })
    }

    await deleteAttendanceRecord(id)
    return NextResponse.json({ success: true, message: 'Record deleted.' })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
