import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()

    // 1. Check stc_report_imports table
    const { data: imports, error: importError } = await (supabase as any)
      .from('stc_report_imports')
      .select('id')
      .limit(1)

    // 2. Check stc_report_records table
    const { data: records, error: recordError } = await (supabase as any)
      .from('stc_report_records')
      .select('id')
      .limit(1)

    if (importError) {
      return NextResponse.json(
        {
          success: false,
          table: 'stc_report_imports',
          error: importError.message,
          hint: 'Please run the src/lib/supabase/stc-report-schema.sql script in your Supabase SQL Editor to create public.stc_report_imports table.',
        },
        { status: 400 }
      )
    }

    if (recordError) {
      return NextResponse.json(
        {
          success: false,
          table: 'stc_report_records',
          error: recordError.message,
          hint: 'Please run the src/lib/supabase/stc-report-schema.sql script in your Supabase SQL Editor to create public.stc_report_records table.',
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase stc_report_imports and stc_report_records tables are ready and accessible.',
      imports_sample: imports ? imports.length : 0,
      records_sample: records ? records.length : 0,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'STC reports setup-db error' },
      { status: 500 }
    )
  }
}
