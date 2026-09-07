import React from 'react'
import { NextRequest, NextResponse } from 'next/server'
import { renderToStream } from '@react-pdf/renderer'
import {
  STCStudentInstallmentSchedule,
  STCFixedInfo,
  getSTCFixedInfo,
  DEFAULT_STC_FIXED_INFO,
} from '@/lib/services/stc-installment.service'
import STCSchedulePDFTemplate from '@/components/pdf/stc-schedule-pdf-template'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const schedule: STCStudentInstallmentSchedule = body.schedule || body
    const fixedInfo: STCFixedInfo = body.fixedInfo || getSTCFixedInfo() || DEFAULT_STC_FIXED_INFO

    if (!schedule || (!schedule.student_name && !schedule.student_id)) {
      return new NextResponse('Invalid schedule payload', { status: 400 })
    }

    const doc = React.createElement(STCSchedulePDFTemplate, { schedule, fixedInfo })
    const stream = await renderToStream(doc as any)

    const studentNameStr = (schedule.student_name || schedule.student_id || 'STC')
      .trim()
      .replace(/[/\\?%*:|"<>]/g, '')
      .replace(/\s+/g, '-')
    const filename = `Installment-Schedule-${studentNameStr}.pdf`

    return new NextResponse(stream as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error: any) {
    console.error('STC Installment PDF POST Stream Error:', error)
    return new NextResponse(`Error generating PDF: ${error?.message || 'Unknown error'}`, {
      status: 500,
    })
  }
}
