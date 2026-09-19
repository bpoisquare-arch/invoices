import { NextRequest, NextResponse } from 'next/server'
import {
  parseStcReportExcel,
  previewStcReportImport,
  saveStcReportImportToDatabase,
} from '@/lib/services/stc-report.service'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const isPreview = formData.get('preview') === 'true' || request.nextUrl.searchParams.get('preview') === 'true'
    const duplicateStrategy = (formData.get('duplicateStrategy') as 'override' | 'skip' | 'replace') || 'override'

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided in the request.' }, { status: 400 })
    }

    const fileName = file.name
    const fileSize = file.size

    const isExcelOrCsv =
      fileName.endsWith('.xlsx') ||
      fileName.endsWith('.xls') ||
      fileName.endsWith('.csv') ||
      file.type.includes('spreadsheet') ||
      file.type.includes('excel') ||
      file.type.includes('csv')

    if (!isExcelOrCsv) {
      return NextResponse.json(
        { success: false, error: 'Invalid file format. Please upload an Excel (.xlsx, .xls) or CSV file.' },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 1. Preview mode
    if (isPreview) {
      const preview = await previewStcReportImport(buffer, fileName)
      return NextResponse.json({
        success: true,
        preview: true,
        fileName,
        fileSize,
        ...preview,
      })
    }

    // 2. Commit mode to live database
    const originalBase64 = buffer.toString('base64')
    const parseResult = parseStcReportExcel(buffer, fileName)

    if (!parseResult.records || parseResult.records.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No student records could be parsed from the uploaded Excel file.' },
        { status: 400 }
      )
    }

    let userEmail = 'admin@isquarebpo.com'
    try {
      const supabase = await createClient()
      const { data } = await supabase.auth.getUser()
      if (data?.user?.email) {
        userEmail = data.user.email
      }
    } catch {
      // ignore
    }

    const saved = await saveStcReportImportToDatabase({
      fileName,
      fileSize,
      uploadedBy: userEmail,
      originalBase64,
      rawHeaders: parseResult.rawHeaders,
      records: parseResult.records,
      duplicateStrategy,
    })

    return NextResponse.json({
      success: true,
      importId: saved.importBatch.id,
      fileName: saved.importBatch.file_name,
      uploadedAt: saved.importBatch.uploaded_at,
      totalRecords: saved.recordCount,
      overriddenCount: saved.overriddenCount,
      skippedCount: saved.skippedCount,
      newCount: saved.newCount,
      duplicateStrategy,
      totalPendingAmount: saved.importBatch.total_pending_amount,
      totalYetToRaised: saved.importBatch.total_yet_to_raised,
      message: `Successfully processed ${parseResult.records.length} STC student records (${saved.newCount} new, ${saved.overriddenCount} updated, ${saved.skippedCount} skipped).`,
    })
  } catch (error: any) {
    console.error('Error importing STC report Excel file:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred while parsing the file.' },
      { status: 500 }
    )
  }
}
