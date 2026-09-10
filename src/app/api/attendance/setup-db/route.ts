import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_ATTENDANCE_SETTINGS } from '@/lib/services/attendance-calculator'
import { INITIAL_EMPLOYEES } from '@/lib/services/attendance.service'
import { readAllEmployeeMetadata, readAllHolidays } from '@/lib/services/employee-storage'
import { getAllCommissions } from '@/lib/services/commission-storage'
import { getAllDeductions } from '@/lib/services/deduction-storage'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const syncReport: Record<string, any> = {}

    // 1. Ensure attendance_settings default row
    const { data: settingsData } = await supabase
      .from('attendance_settings')
      .select('id')
      .eq('id', 'default')
      .maybeSingle()

    if (!settingsData) {
      await supabase.from('attendance_settings').insert(DEFAULT_ATTENDANCE_SETTINGS)
      syncReport.settings = 'Initialized default attendance settings'
    } else {
      syncReport.settings = 'Settings row verified'
    }

    // 2. Ensure initial seed employees if empty
    const { data: existingEmployees } = await supabase
      .from('employees')
      .select('id, employee_id')

    if (!existingEmployees || existingEmployees.length === 0) {
      for (const emp of INITIAL_EMPLOYEES) {
        await supabase.from('employees').insert({
          employee_id: emp.employee_id,
          name: emp.name,
          normalized_name: emp.normalized_name,
          designation: emp.designation,
          branch: 'Multan',
          is_active: true,
        })
      }
      syncReport.employees_seeded = INITIAL_EMPLOYEES.length
    }

    // 3. Migrate/Sync Employee Metadata to employees table columns
    const fileMeta = readAllEmployeeMetadata()
    let metaSyncedCount = 0

    if (existingEmployees && existingEmployees.length > 0 && Object.keys(fileMeta).length > 0) {
      for (const emp of existingEmployees) {
        const meta = fileMeta[emp.id] || fileMeta[emp.employee_id]
        if (meta) {
          const isOld = Boolean(meta.is_old_staff)
          const joining = isOld ? null : (meta.joining_date ? meta.joining_date.split('T')[0] : null)
          const updatePayload: any = {
            updated_at: new Date().toISOString(),
          }
          if (meta.branch) updatePayload.branch = meta.branch
          if (meta.salary !== undefined) updatePayload.salary = meta.salary
          if (joining !== undefined) updatePayload.joining_date = joining
          if (meta.is_old_staff !== undefined) updatePayload.is_old_staff = isOld
          if (meta.leave_quotas) updatePayload.leave_quotas = meta.leave_quotas

          const { error: updateErr } = await supabase
            .from('employees')
            .update(updatePayload)
            .eq('id', emp.id)

          if (!updateErr) {
            metaSyncedCount++
          }
        }
      }
      syncReport.employees_metadata_synced = metaSyncedCount
    }

    // 4. Migrate Gazetted Holidays to gazetted_holidays table
    const holidays = readAllHolidays()
    let holidaysSynced = 0
    if (Object.keys(holidays).length > 0) {
      for (const [date, name] of Object.entries(holidays)) {
        const { error } = await supabase.from('gazetted_holidays').upsert({
          date,
          name: name || 'Gazetted Holiday',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'date' })
        if (!error) holidaysSynced++
      }
      syncReport.gazetted_holidays_synced = holidaysSynced
    }

    // 5. Migrate Commissions to employee_commissions table
    const comms = await getAllCommissions()
    let commsSynced = 0
    if (comms.length > 0) {
      for (const c of comms) {
        const { error } = await supabase.from('employee_commissions').upsert({
          id: c.id,
          employee_id: c.employee_id,
          month_year: c.month_year,
          amount: c.amount,
          notes: c.notes || '',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'employee_id,month_year' })
        if (!error) commsSynced++
      }
      syncReport.commissions_synced = commsSynced
    }

    // 6. Migrate Deductions to employee_deductions table
    const deds = await getAllDeductions()
    let dedsSynced = 0
    if (deds.length > 0) {
      for (const d of deds) {
        const { error } = await supabase.from('employee_deductions').upsert({
          id: d.id,
          employee_id: d.employee_id,
          month_year: d.month_year,
          amount: d.amount,
          note_type: d.note_type || d.notes || 'Other Deduction',
          notes: d.notes || d.note_type || 'Other Deduction',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'employee_id,month_year' })
        if (!error) dedsSynced++
      }
      syncReport.deductions_synced = dedsSynced
    }

    return NextResponse.json({
      success: true,
      message: 'Attendance schema verified and synchronized successfully.',
      report: syncReport,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Setup error' }, { status: 500 })
  }
}

export async function POST() {
  return GET()
}

