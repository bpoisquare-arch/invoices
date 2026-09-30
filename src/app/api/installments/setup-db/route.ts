import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const schedulesCount = await prisma.installmentSchedule.count()
    const logsCount = await prisma.installmentEmailLog.count()

    return NextResponse.json({
      success: true,
      message: 'MySQL installment_schedules and installment_email_logs tables are ready and accessible.',
      schedules_count: schedulesCount,
      logs_count: logsCount,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Installment setup-db error' },
      { status: 500 }
    )
  }
}

export async function POST() {
  return GET()
}
