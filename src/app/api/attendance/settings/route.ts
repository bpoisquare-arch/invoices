import { NextRequest, NextResponse } from 'next/server'
import {
  getAttendanceSettings,
  updateAttendanceSettings,
} from '@/lib/services/attendance.service'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const settings = await getAttendanceSettings()
    return NextResponse.json({ success: true, settings })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const updated = await updateAttendanceSettings(body)
    return NextResponse.json({ success: true, settings: updated })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
