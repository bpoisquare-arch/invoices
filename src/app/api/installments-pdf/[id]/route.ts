import React from 'react'
import { NextRequest, NextResponse } from 'next/server'
import { renderToStream } from '@react-pdf/renderer'
import { getInstallmentById, getAimtFixedInfo } from '@/lib/services/installment.service'
import AimtSchedulePDFTemplate from '@/components/pdf/aimt-schedule-pdf-template'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const schedule = await getInstallmentById(id)

    if (!schedule) {
      return new NextResponse('Schedule not found', { status: 404 })
    }

    const fixedInfo = getAimtFixedInfo()
    const doc = React.createElement(AimtSchedulePDFTemplate, { schedule, fixedInfo })
    const stream = await renderToStream(doc as any)

    const studentNameStr = schedule.student_name
      ? schedule.student_name.trim().replace(/[/\\?%*:|"<>]/g, '').replace(/\s+/g, '-')
      : (schedule.student_id || 'AIMT')
    const filename = `Installment-Schedule-${studentNameStr}.pdf`

    return new NextResponse(stream as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error: any) {
    console.error('Installment PDF Generation Error:', error)
    return new NextResponse(`Error generating PDF: ${error?.message || 'Unknown error'}`, {
      status: 500,
    })
  }
}
