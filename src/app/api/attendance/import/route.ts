import { NextRequest, NextResponse } from 'next/server'
import {
  getEmployees,
  getAttendanceSettings,
  getAttendanceRecords,
  saveImportedAttendanceBatch,
  AttendanceImportSaveItem,
} from '@/lib/services/attendance.service'
import {
  parseExcelAttendanceWorkbook,
  ParsedAttendancePreviewItem,
} from '@/lib/services/attendance-calculator'
import { createClient } from '@/lib/supabase/server'
import { logAuditEventServer } from '@/lib/services/audit-server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Session Verification
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const devSession = request.cookies.get('dev-auth-session')?.value === 'true'

    if (!user && !devSession) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Valid session required.' }, { status: 401 })
    }

    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      const mappingRaw = formData.get('columnMapping') as string | null

      if (!file) {
        return NextResponse.json({ success: false, error: 'No Excel file provided.' }, { status: 400 })
      }

      // Validate file extension
      const fileName = file.name || 'attendance.xlsx'
      const lowerName = fileName.toLowerCase()
      if (!lowerName.endsWith('.xlsx') && !lowerName.endsWith('.xls')) {
        return NextResponse.json(
          { success: false, error: 'Invalid file format. Please upload an Excel (.xlsx or .xls) file.' },
          { status: 400 }
        )
      }

      // Limit file size (15MB)
      if (file.size > 15 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, error: 'File size exceeds 15MB limit.' },
          { status: 400 }
        )
      }

      let columnMapping: { nameCol?: string; timeCol?: string; stateCol?: string } | undefined
      if (mappingRaw) {
        try {
          columnMapping = JSON.parse(mappingRaw)
        } catch {
          // ignore
        }
      }

      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Fetch existing employees & settings
      const employees = await getEmployees({ isActiveOnly: false })
      const settings = await getAttendanceSettings()

      // Fetch existing attendance to detect duplicates
      const existingRes = await getAttendanceRecords({ pageSize: 10000 })
      const existingDatesByEmpId = new Map<string, Set<string>>()
      for (const rec of existingRes.records) {
        if (!existingDatesByEmpId.has(rec.employee_id)) {
          existingDatesByEmpId.set(rec.employee_id, new Set())
        }
        existingDatesByEmpId.get(rec.employee_id)!.add(rec.attendance_date)
      }

      const parseResult = parseExcelAttendanceWorkbook(
        buffer,
        fileName,
        employees,
        existingDatesByEmpId,
        settings,
        columnMapping
      )

      return NextResponse.json(parseResult)
    }

    // JSON Commit Action
    const body = await request.json()
    const { action, items, duplicateStrategy } = body

    if (action === 'commit') {
      if (!items || !Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ success: false, error: 'No items to import.' }, { status: 400 })
      }

      // Filter only items that have a valid resolved employee_id
      const saveItems: AttendanceImportSaveItem[] = []
      let skippedInvalidCount = 0

      for (const item of items as ParsedAttendancePreviewItem[]) {
        const empId = item.resolvedEmployeeId || item.employee?.id
        if (!empId || item.isSundaySkipped) {
          skippedInvalidCount++
          continue
        }

        saveItems.push({
          employee_id: empId,
          attendance_date: item.date,
          day_of_week: item.dayName,
          in_time: item.inTime,
          out_time: item.outTime,
          arrival_status: item.arrivalStatus,
          departure_status: item.departureStatus,
          total_working_minutes: item.totalWorkingMinutes,
          total_working_hours_formatted: item.totalWorkingHoursFormatted,
          raw_punches: item.rawPunches || [],
        })
      }

      const batchResult = await saveImportedAttendanceBatch(
        saveItems,
        duplicateStrategy === 'skip' ? 'skip' : 'overwrite'
      )

      await logAuditEventServer({
        action: 'Import Attendance Excel',
        module: 'attendance',
        metadata: {
          totalSubmitted: items.length,
          savedCount: batchResult.savedCount,
          skippedDuplicates: batchResult.skippedDuplicates,
          duplicateStrategy
        }
      })

      return NextResponse.json({
        success: true,
        summary: {
          totalSubmitted: items.length,
          savedCount: batchResult.savedCount,
          skippedDuplicates: batchResult.skippedDuplicates,
          skippedInvalidOrSunday: skippedInvalidCount,
          errors: batchResult.errors,
        },
      })
    }

    return NextResponse.json({ success: false, error: 'Invalid request action.' }, { status: 400 })
  } catch (error: any) {
    console.error('Import API error:', error)
    return NextResponse.json({ success: false, error: error.message || 'An error occurred processing the file.' }, { status: 500 })
  }
}
