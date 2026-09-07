import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()

    // 1. Check stc_installment_schedules table
    const { data: schedules, error: scheduleError } = await (supabase as any)
      .from('stc_installment_schedules')
      .select('id')
      .limit(1)

    // 2. Check stc_installment_email_logs table
    const { data: logs, error: logsError } = await (supabase as any)
      .from('stc_installment_email_logs')
      .select('id')
      .limit(1)

    if (scheduleError) {
      return NextResponse.json(
        {
          success: false,
          table: 'stc_installment_schedules',
          error: scheduleError.message,
          hint: 'Please run the schema.sql script in your Supabase SQL Editor to create public.stc_installment_schedules table.',
        },
        { status: 400 }
      )
    }

    if (logsError) {
      return NextResponse.json(
        {
          success: false,
          table: 'stc_installment_email_logs',
          error: logsError.message,
          hint: 'Please run the schema.sql script in your Supabase SQL Editor to create public.stc_installment_email_logs table.',
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase stc_installment_schedules and stc_installment_email_logs tables are ready and accessible.',
      schedules_count: schedules ? schedules.length : 0,
      logs_count: logs ? logs.length : 0,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'STC installment setup-db error' },
      { status: 500 }
    )
  }
}

export async function POST() {
  return GET()
}
