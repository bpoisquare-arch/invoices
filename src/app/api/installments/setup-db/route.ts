import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()

    // 1. Check installment_schedules table
    const { data: schedules, error: scheduleError } = await supabase
      .from('installment_schedules')
      .select('id')
      .limit(1)

    // 2. Check installment_email_logs table
    const { data: logs, error: logsError } = await supabase
      .from('installment_email_logs')
      .select('id')
      .limit(1)

    if (scheduleError) {
      return NextResponse.json({
        success: false,
        table: 'installment_schedules',
        error: scheduleError.message,
        hint: 'Please run the schema.sql script in your Supabase SQL Editor to create public.installment_schedules table.',
      }, { status: 400 })
    }

    if (logsError) {
      return NextResponse.json({
        success: false,
        table: 'installment_email_logs',
        error: logsError.message,
        hint: 'Please run the schema.sql script in your Supabase SQL Editor to create public.installment_email_logs table.',
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase installment_schedules and installment_email_logs tables are ready and accessible.',
      schedules_count: schedules ? schedules.length : 0,
      logs_count: logs ? logs.length : 0,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Installment setup-db error' },
      { status: 500 }
    )
  }
}

export async function POST() {
  return GET()
}
