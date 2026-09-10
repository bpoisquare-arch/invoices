import { NextRequest, NextResponse } from 'next/server'
import { getReportImportById, deleteReportImport } from '@/lib/services/report.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ success: false, error: 'Import ID is required.' }, { status: 400 })
    }

    const importBatch = await getReportImportById(id, false)
    if (!importBatch) {
      return NextResponse.json({ success: false, error: 'Import batch not found.' }, { status: 404 })
    }

    return NextResponse.json({ success: true, importBatch })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ success: false, error: 'Import ID is required.' }, { status: 400 })
    }

    await deleteReportImport(id)
    return NextResponse.json({ success: true, message: 'Import batch and all associated records deleted.' })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
