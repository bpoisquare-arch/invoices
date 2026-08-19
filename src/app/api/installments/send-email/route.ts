import React from 'react'
import { NextRequest, NextResponse } from 'next/server'
import { renderToStream } from '@react-pdf/renderer'
import {
  StudentInstallmentSchedule,
  getInstallmentById,
  getAimtFixedInfo,
  AIMTFixedInfo,
} from '@/lib/services/installment.service'
import {
  isValidEmail,
  isVerifiedSender,
  checkResendEligibility,
  logEmailAttempt,
  getEmailLogsByScheduleId,
  DEFAULT_FROM_EMAIL,
} from '@/lib/services/installment-email.service'
import AimtSchedulePDFTemplate from '@/components/pdf/aimt-schedule-pdf-template'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      schedule_id,
      to_email,
      from_email = DEFAULT_FROM_EMAIL,
      subject,
      message,
      email_type = 'resend',
      schedule_data,
      fixed_info,
    } = body

    // 1. Basic validation
    if (!schedule_id) {
      return NextResponse.json({ success: false, error: 'Schedule ID is required.' }, { status: 400 })
    }

    const trimmedTo = (to_email || '').trim()
    if (!trimmedTo) {
      return NextResponse.json(
        { success: false, error: 'Please enter a recipient email address.' },
        { status: 400 }
      )
    }

    if (!isValidEmail(trimmedTo)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid recipient email address format.' },
        { status: 400 }
      )
    }

    const trimmedFrom = (from_email || '').trim()
    if (!trimmedFrom) {
      return NextResponse.json(
        { success: false, error: 'Please select a sender email address.' },
        { status: 400 }
      )
    }

    if (!isValidEmail(trimmedFrom)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid sender email address.' },
        { status: 400 }
      )
    }

    // 2. Strict Backend Rate Limit Check (2 resends per 24 hours)
    const logs = await getEmailLogsByScheduleId(schedule_id)
    if (email_type === 'resend') {
      const eligibility = await checkResendEligibility(schedule_id, logs)
      if (!eligibility.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: eligibility.message || 'Resend limit reached for this schedule.',
            next_resend_at: eligibility.nextResendAt,
            countdownText: eligibility.countdownText,
            eligibility,
          },
          { status: 429 }
        )
      }
    }

    // 3. Resolve schedule details
    const schedule: StudentInstallmentSchedule =
      schedule_data || (await getInstallmentById(schedule_id)) || {
        id: schedule_id,
        date: new Date().toISOString().split('T')[0],
        student_name: 'Student',
        student_id: schedule_id,
        course_name: 'Course',
        duration: '52 weeks',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        admin_fee: 0,
        resources_fee: 0,
        tuition_fee: 0,
        scholarship: 0,
        total_amount: 0,
        first_installment_amount: 0,
        schedule_items: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

    const resolvedFixedInfo: AIMTFixedInfo = fixed_info || getAimtFixedInfo()

    // 4. Generate PDF Document buffer for attachment
    let pdfBuffer: Buffer | null = null
    const studentNameStr = schedule.student_name
      ? schedule.student_name.trim().replace(/[/\\?%*:|"<>]/g, '').replace(/\s+/g, '-')
      : (schedule.student_id || 'AIMT')
    const pdfFilename = `Installment-Schedule-${studentNameStr}.pdf`

    try {
      const doc = React.createElement(AimtSchedulePDFTemplate, {
        schedule,
        fixedInfo: resolvedFixedInfo,
      })
      const stream = await renderToStream(doc as any)
      const chunks: Buffer[] = []
      for await (const chunk of stream as any) {
        chunks.push(Buffer.from(chunk))
      }
      pdfBuffer = Buffer.concat(chunks)
    } catch (pdfErr) {
      console.warn('PDF render warning:', pdfErr)
    }

    // 5. Calculate resend number
    const previousSuccessfulResends = logs.filter(
      (l) => l.email_type === 'resend' && l.status === 'sent'
    ).length

    const resend_number = email_type === 'initial' ? 0 : previousSuccessfulResends + 1
    const finalSubject =
      subject ||
      `Installment Schedule - ${schedule.student_name} (${schedule.student_id}) - Australian Institute of Management and Technology`

    // 6. Dispatch Email (via Resend API if RESEND_API_KEY is configured, else local simulation)
    let providerMessageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const nowIso = new Date().toISOString()
    const resendApiKey = process.env.RESEND_API_KEY

    if (resendApiKey) {
      try {
        const payload: any = {
          from: process.env.EMAIL_FROM || 'AIMT College <onboarding@resend.dev>',
          to: [trimmedTo],
          subject: finalSubject,
          text: message || `Dear ${schedule.student_name},\n\nPlease find attached your official Student Installment Schedule for ${schedule.course_name}.\n\nKind regards,\nAustralian Institute of Management and Technology`,
        }

        if (pdfBuffer) {
          payload.attachments = [
            {
              filename: pdfFilename,
              content: pdfBuffer.toString('base64'),
            },
          ]
        }

        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        const resendData = await resendRes.json()
        if (resendRes.ok && resendData?.id) {
          providerMessageId = resendData.id
        } else if (!resendRes.ok) {
          throw new Error(resendData?.message || 'Resend API rejected email dispatch')
        }
      } catch (sendErr: any) {
        console.error('Real email dispatch failed:', sendErr)
        // Log failed attempt
        await logEmailAttempt({
          schedule_id,
          from_email: trimmedFrom,
          to_email: trimmedTo,
          subject: finalSubject,
          message: message || undefined,
          email_type,
          resend_number,
          status: 'failed',
          provider_message_id: null,
          sent_at: nowIso,
          error_message: sendErr?.message || 'Failed to send email via provider',
          next_resend_at: null,
        })

        return NextResponse.json(
          {
            success: false,
            error: sendErr?.message || 'Email delivery failed. The schedule is saved.',
          },
          { status: 502 }
        )
      }
    }

    // Log the successful send
    const logRecord = await logEmailAttempt({
      schedule_id,
      from_email: trimmedFrom,
      to_email: trimmedTo,
      subject: finalSubject,
      message: message || undefined,
      email_type,
      resend_number,
      status: 'sent',
      provider_message_id: providerMessageId,
      sent_at: nowIso,
      error_message: null,
      next_resend_at: null,
    })

    // Compute updated eligibility
    const updatedEligibility = await checkResendEligibility(schedule_id)

    return NextResponse.json({
      success: true,
      message: email_type === 'initial' ? 'Initial email sent successfully.' : 'Resend email sent successfully.',
      log: logRecord,
      eligibility: updatedEligibility,
    })
  } catch (err: any) {
    console.error('Email API Error:', err)
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Internal error while sending installment schedule email.',
      },
      { status: 500 }
    )
  }
}
