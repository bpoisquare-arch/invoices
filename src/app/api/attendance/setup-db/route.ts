import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

async function checkAuthorized(request: NextRequest): Promise<boolean> {
  const secret = process.env.SETUP_SECRET
  const headerSecret = request.headers.get('x-setup-secret')
  if (secret && headerSecret === secret) return true

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  const session = await verifySessionToken(token)
  return !!session && session.role === 'admin'
}

export async function GET(request: NextRequest) {
  try {
    if (!(await checkAuthorized(request))) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required.' }, { status: 401 })
    }

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

export async function POST(request: NextRequest) {
  return GET(request)
}
