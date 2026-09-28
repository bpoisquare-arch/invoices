import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient as createServerClient } from '@/lib/supabase/server'

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
    } else {
      const schedules = await prisma.installmentSchedule.findMany({
        orderBy: { createdAt: 'desc' },
      })
      if (schedules && schedules.length > 0) {
        return NextResponse.json(schedules)
      }
    }
  } catch (err) {
    console.warn('MySQL get installments failed, falling back to Supabase:', err)
  }

  // Fallback to Supabase
  try {
    const supabase = await createServerClient()
    const { data } = await supabase
      .from('installment_schedules')
      .select('*')
      .order('created_at', { ascending: false })
    return NextResponse.json(data || [])
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const dbRow = await request.json()
    const scheduleId = dbRow.id || `aimt-sch-${Date.now()}`

    // 1. MySQL via Prisma
    try {
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
    } catch (mysqlErr) {
      console.warn('MySQL installmentSchedule upsert warning:', mysqlErr)
    }

    // 2. Supabase sync / fallback
    try {
      const supabase = await createServerClient()
      await supabase.from('installment_schedules').upsert(dbRow, { onConflict: 'id' })
    } catch {}

    return NextResponse.json({ success: true, id: scheduleId })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 })

    try {
      await prisma.installmentEmailLog.deleteMany({ where: { scheduleId: id } })
      await prisma.installmentSchedule.deleteMany({ where: { id } })
    } catch (err) {
      console.warn('MySQL delete installment warning:', err)
    }

    try {
      const supabase = await createServerClient()
      await supabase.from('installment_schedules').delete().eq('id', id)
    } catch {}

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }
}
