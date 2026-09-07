import React from 'react'
import { NextRequest, NextResponse } from 'next/server'
import { renderToStream } from '@react-pdf/renderer'
import {
  getSTCInstallmentById,
  getSTCFixedInfo,
  DEFAULT_STC_FIXED_INFO,
  STCStudentInstallmentSchedule,
  STCFixedInfo,
} from '@/lib/services/stc-installment.service'
import { createClient } from '@/lib/supabase/server'
import STCSchedulePDFTemplate from '@/components/pdf/stc-schedule-pdf-template'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    let schedule: STCStudentInstallmentSchedule | null = null

    try {
      const supabase = await createClient()
      const { data } = await (supabase as any)
        .from('stc_installment_schedules')
        .select('*')
        .eq('id', id)
        .single()
      if (data) {
        schedule = data
      }
    } catch {
      // Fallback
    }

    if (!schedule) {
      schedule = await getSTCInstallmentById(id)
    }

    if (!schedule) {
      return new NextResponse('STC Schedule not found', { status: 404 })
    }

    const fixedInfo = getSTCFixedInfo() || DEFAULT_STC_FIXED_INFO
    const doc = React.createElement(STCSchedulePDFTemplate, { schedule, fixedInfo })
    const stream = await renderToStream(doc as any)

    const studentNameStr = schedule.student_name
      ? schedule.student_name.trim().replace(/[/\\?%*:|"<>]/g, '').replace(/\s+/g, '-')
      : schedule.student_id || 'STC'
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
    console.error('STC Installment PDF Generation Error:', error)
    return new NextResponse(`Error generating PDF: ${error?.message || 'Unknown error'}`, {
      status: 500,
    })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    console.error('STC Installment POST PDF Generation Error:', error)
    return new NextResponse(`Error generating PDF: ${error?.message || 'Unknown error'}`, {
      status: 500,
    })
  }
}
