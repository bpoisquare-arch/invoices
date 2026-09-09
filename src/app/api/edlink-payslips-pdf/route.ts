import React from 'react'
import { NextRequest, NextResponse } from 'next/server'
import { renderToStream } from '@react-pdf/renderer'
import { EdlinkPayslip } from '@/lib/services/edlink-payslip.service'
import EdLinkPayslipPDFTemplate from '@/components/pdf/edlink-payslip-pdf-template'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const payslip: EdlinkPayslip = await request.json()

    if (!payslip) {
      return new NextResponse('Invalid payload', { status: 400 })
    }

    const doc = React.createElement(EdLinkPayslipPDFTemplate, { payslip })
    const stream = await renderToStream(doc as any)

    const safeName = (payslip.employee_name || 'EdLink-Employee')
      .trim()
      .replace(/[/\\?%*:|"<>]/g, '')
      .replace(/\s+/g, '_')
    const filename = `EdLink_Payslip_${safeName}.pdf`

    return new NextResponse(stream as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error: any) {
    console.error('EdLink Payslip PDF Stream Error:', error)
    return new NextResponse(`Error generating PDF: ${error?.message || 'Unknown error'}`, {
      status: 500,
    })
  }
}
