import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const schedulesCount = await prisma.stcInstallmentSchedule.count()
    const logsCount = await prisma.stcInstallmentEmailLog.count()

    return NextResponse.json({
      success: true,
      message: 'MySQL stc_installment_schedules and stc_installment_email_logs tables are ready and accessible.',
      schedules_count: schedulesCount,
      logs_count: logsCount,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'STC installment setup-db error' },
      { status: 500 }
    )
  }
}

export async function POST() {
  return GET()
}
