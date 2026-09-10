import { NextRequest, NextResponse } from 'next/server'
import { parseStudentReportExcel, saveReportImportToDatabase } from '@/lib/services/report.service'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided in the request.' }, { status: 400 })
    }

    const fileName = file.name
    const fileSize = file.size

    // Validate file extension
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

    // Convert file to ArrayBuffer and Base64 (for storing the exact original file)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const originalBase64 = buffer.toString('base64')

    // Parse Excel content into structured student rows
    const parseResult = parseStudentReportExcel(buffer, fileName)

    if (!parseResult.records || parseResult.records.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No student records could be parsed from the uploaded file.' },
        { status: 400 }
      )
    }

    // Get current user email if available
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

    // Save directly to Supabase Database
    const saved = await saveReportImportToDatabase({
      fileName,
      fileSize,
      uploadedBy: userEmail,
      originalBase64,
      rawHeaders: parseResult.rawHeaders,
      records: parseResult.records,
      entity: 'aimt',
    })

    return NextResponse.json({
      success: true,
      importId: saved.importBatch.id,
      fileName: saved.importBatch.file_name,
      uploadedAt: saved.importBatch.uploaded_at,
      totalRecords: saved.recordCount,
      totalPendingAmount: saved.importBatch.total_pending_amount,
      totalYetToRaised: saved.importBatch.total_yet_to_raised,
      message: `Successfully imported ${saved.recordCount} student records from ${fileName}.`,
    })
  } catch (error: any) {
    console.error('Error importing report Excel file:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred while parsing the file.' },
      { status: 500 }
    )
  }
}
