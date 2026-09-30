import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const settings = await prisma.attendanceSetting.upsert({
      where: { id: 'default' },
      update: {},
      create: {
        id: 'default',
        weekdayInTime: '10:30',
        weekdayGraceMinutes: 15,
        weekdayOutTime: '18:30',
        saturdayInTime: '11:00',
        saturdayGraceMinutes: 15,
        saturdayOutTime: '15:00',
        timezone: 'Asia/Karachi',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Attendance schema verified and synchronized successfully.',
      settings,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Setup error' }, { status: 500 })
  }
}

export async function POST() {
  return GET()
}
