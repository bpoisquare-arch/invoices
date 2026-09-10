import { NextRequest, NextResponse } from 'next/server'
import { getReportImportById } from '@/lib/services/report.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ success: false, error: 'Import ID is required.' }, { status: 400 })
    }

    // Fetch with full original file binary data
    const importBatch = await getReportImportById(id, true)
    if (!importBatch || !importBatch.original_file_data) {
      return NextResponse.json({ success: false, error: 'Original file data not found for this import batch.' }, { status: 404 })
    }

    const fileBuffer = Buffer.from(importBatch.original_file_data, 'base64')
    const fileName = importBatch.file_name || 'AIMT_Student_Report.xlsx'

    // Determine appropriate mime type
    let contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    if (fileName.endsWith('.xls')) {
      contentType = 'application/vnd.ms-excel'
    } else if (fileName.endsWith('.csv')) {
      contentType = 'text/csv'
    }

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Content-Length': String(fileBuffer.length),
      },
    })
  } catch (error: any) {
    console.error('Error downloading original report file:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
