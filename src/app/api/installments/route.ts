import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (id) {
      const schedule = await prisma.installmentSchedule.findUnique({
        where: { id },
      })
      if (schedule) {
        return NextResponse.json(schedule)
      }
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    const schedules = await prisma.installmentSchedule.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(schedules || [])
  } catch (err: any) {
    console.error('MySQL get installments error:', err)
    return NextResponse.json({ error: err?.message || 'Failed to fetch installments' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const dbRow = await request.json()
    const scheduleId = dbRow.id || `aimt-sch-${Date.now()}`

    await prisma.installmentSchedule.upsert({
      where: { id: scheduleId },
      update: {
        date: new Date(dbRow.date),
        studentName: dbRow.student_name,
        studentId: dbRow.student_id,
        courseName: dbRow.course_name,
        duration: dbRow.duration,
        startDate: new Date(dbRow.start_date),
        endDate: new Date(dbRow.end_date),
        startMonthYear: dbRow.start_month_year || null,
        endMonthOffset: dbRow.end_month_offset ?? 3,
        adminFee: dbRow.admin_fee ?? 0,
        resourcesFee: dbRow.resources_fee ?? 0,
        materialFee: dbRow.material_fee ?? 0,
        tuitionFee: dbRow.tuition_fee ?? 0,
        scholarship: dbRow.scholarship ?? 0,
        totalAmount: dbRow.total_amount ?? 0,
        firstInstallmentAmount: dbRow.first_installment_amount ?? 0,
        scheduleItems: dbRow.schedule_items || [],
        recipientEmail: dbRow.recipient_email || null,
        fromEmail: dbRow.from_email || null,
        emailSubject: dbRow.email_subject || null,
        emailMessage: dbRow.email_message || null,
      },
      create: {
        id: scheduleId,
        date: new Date(dbRow.date),
        studentName: dbRow.student_name,
        studentId: dbRow.student_id,
        courseName: dbRow.course_name,
        duration: dbRow.duration,
        startDate: new Date(dbRow.start_date),
        endDate: new Date(dbRow.end_date),
        startMonthYear: dbRow.start_month_year || null,
        endMonthOffset: dbRow.end_month_offset ?? 3,
        adminFee: dbRow.admin_fee ?? 0,
        resourcesFee: dbRow.resources_fee ?? 0,
        materialFee: dbRow.material_fee ?? 0,
        tuitionFee: dbRow.tuition_fee ?? 0,
        scholarship: dbRow.scholarship ?? 0,
        totalAmount: dbRow.total_amount ?? 0,
        firstInstallmentAmount: dbRow.first_installment_amount ?? 0,
        scheduleItems: dbRow.schedule_items || [],
        recipientEmail: dbRow.recipient_email || null,
        fromEmail: dbRow.from_email || null,
        emailSubject: dbRow.email_subject || null,
        emailMessage: dbRow.email_message || null,
      },
    })

    return NextResponse.json({ success: true, id: scheduleId })
  } catch (error: any) {
    console.error('MySQL installment upsert error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to save installment' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 })

    await prisma.installmentEmailLog.deleteMany({ where: { scheduleId: id } })
    await prisma.installmentSchedule.deleteMany({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('MySQL delete installment error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to delete installment' }, { status: 500 })
  }
}
