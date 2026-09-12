import React from 'react'
import { NextRequest, NextResponse } from 'next/server'
import { renderToStream } from '@react-pdf/renderer'
import PayslipPDFTemplate, { PayslipData } from '@/components/pdf/payslip-pdf-template'
import { Employee } from '@/lib/supabase/database.types'
import { sendPayslipEmail, getEmailConfig } from '@/lib/services/payslip-email.service'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      employee,
      payslipData,
      payPeriod,
      monthLabel,
      recipientEmail,
      customMessage,
    }: {
      employee: Employee
      payslipData: PayslipData
      payPeriod: string
      monthLabel: string
      recipientEmail: string
      customMessage?: string
    } = body

    if (!employee || !payslipData || !payPeriod) {
      return NextResponse.json(
        { success: false, error: 'Missing required payslip parameters.' },
        { status: 400 }
      )
    }

    const targetEmail = (recipientEmail || employee.email || '').trim()
    if (!targetEmail || !targetEmail.includes('@')) {
      return NextResponse.json(
        {
          success: false,
          error: `Please provide a valid recipient email address for ${employee.name || 'employee'}.`,
        },
        { status: 400 }
      )
    }

    // Check if Gmail SMTP credentials are set
    const emailConfig = getEmailConfig()
    if (!emailConfig.isConfigured) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Gmail credentials not configured in .env.local. Please set GMAIL_USER and GMAIL_APP_PASSWORD.',
        },
        { status: 503 }
      )
    }

    // 1. Generate PDF Buffer using @react-pdf/renderer stream
    const doc = React.createElement(PayslipPDFTemplate, {
      employee,
      payslipData,
      payPeriod,
    })

    const stream = (await renderToStream(doc as any)) as any
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    const pdfBuffer = Buffer.concat(chunks)

    // 2. Send Email via Gmail SMTP
    const sendResult = await sendPayslipEmail({
      to: targetEmail,
      employeeName: employee.name || 'Employee',
      employeeId: employee.employee_id,
      designation: employee.designation,
      monthLabel: monthLabel || 'Monthly',
      payPeriod,
      netPay: payslipData.netPay,
      pdfBuffer,
      customMessage,
    })

    return NextResponse.json({
      success: true,
      messageId: sendResult.messageId,
      sentTo: targetEmail,
      message: `Payslip email sent successfully to ${targetEmail}`,
    })
  } catch (error: any) {
    console.error('Payslip Email Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to send payslip email.',
      },
      { status: 500 }
    )
  }
}
