import { NextRequest, NextResponse } from 'next/server'
import { readAllHolidays, writeHoliday } from '@/lib/services/employee-storage'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const holidays = readAllHolidays()
    return NextResponse.json({ success: true, holidays })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, name, isHoliday } = body

    if (!date || typeof date !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Date is required (YYYY-MM-DD).' },
        { status: 400 }
      )
    }

    const updatedHolidays = writeHoliday(
      date.trim(),
      name,
      isHoliday !== undefined ? Boolean(isHoliday) : true
    )

    return NextResponse.json({ success: true, holidays: updatedHolidays })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
