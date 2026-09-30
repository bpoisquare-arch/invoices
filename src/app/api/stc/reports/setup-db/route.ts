import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const importsCount = await prisma.stcReportImport.count()
    const recordsCount = await prisma.stcReportRecord.count()

    return NextResponse.json({
      success: true,
      message: 'MySQL stc_report_imports and stc_report_records tables are ready and accessible.',
      imports_sample: importsCount,
      records_sample: recordsCount,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'STC reports setup-db error' },
      { status: 500 }
    )
  }
}
