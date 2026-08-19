import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_ATTENDANCE_SETTINGS } from '@/lib/services/attendance-calculator'
import { INITIAL_EMPLOYEES } from '@/lib/services/attendance.service'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()

    // 1. Ensure attendance_settings default row
    const { data: settingsData } = await supabase
      .from('attendance_settings')
      .select('id')
      .eq('id', 'default')
      .single()

    if (!settingsData) {
      await supabase.from('attendance_settings').insert(DEFAULT_ATTENDANCE_SETTINGS)
    }

    // 2. Ensure initial seed employees if empty
    const { data: existingEmployees } = await supabase
      .from('employees')
      .select('id')
      .limit(1)

    if (!existingEmployees || existingEmployees.length === 0) {
      for (const emp of INITIAL_EMPLOYEES) {
        await supabase.from('employees').insert({
          employee_id: emp.employee_id,
          name: emp.name,
          normalized_name: emp.normalized_name,
          designation: emp.designation,
          is_active: true,
        })
      }
    }

    return NextResponse.json({ success: true, message: 'Attendance schema verified.' })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Setup error' }, { status: 500 })
  }
}

export async function POST() {
  return GET()
}
