import { NextRequest, NextResponse } from 'next/server'
import {
  createStcReportRecord,
  updateStcReportRecord,
  deleteStcReportRecord,
  deleteStcReportRecords,
} from '@/lib/services/stc-report.service'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

// POST /api/stc/reports/records - Create single STC student record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.student_name || !body.student_name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Student Name is required.' },
        { status: 400 }
      )
    }

    const record = await createStcReportRecord(body)
    return NextResponse.json({ success: true, record })
  } catch (error: any) {
    console.error('Error creating STC report record:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create STC student record.' },
      { status: 500 }
    )
  }
}

// PUT /api/stc/reports/records - Update existing STC student record
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Record ID is required for update.' },
        { status: 400 }
      )
    }

    const updatedRecord = await updateStcReportRecord(id, updates)
    if (!updatedRecord) {
      return NextResponse.json(
        { success: false, error: 'Record not found or failed to update.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, record: updatedRecord })
  } catch (error: any) {
    console.error('Error updating STC report record:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update STC student record.' },
      { status: 500 }
    )
  }
}

// DELETE /api/stc/reports/records?id={id}&ids={id1,id2} - Delete single or bulk STC records
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const singleId = searchParams.get('id')
    const idsParam = searchParams.get('ids')

    let idsToDelete: string[] = []
    if (singleId) {
      idsToDelete = [singleId]
    } else if (idsParam) {
      idsToDelete = idsParam.split(',').map((s) => s.trim()).filter(Boolean)
    } else {
      try {
        const body = await request.json()
        if (Array.isArray(body.ids)) {
          idsToDelete = body.ids
        } else if (body.id) {
          idsToDelete = [body.id]
        }
      } catch {
        // no body
      }
    }

    if (idsToDelete.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Record ID(s) required for deletion.' },
        { status: 400 }
      )
    }

    if (idsToDelete.length === 1) {
      const success = await deleteStcReportRecord(idsToDelete[0])
      return NextResponse.json({ success, count: 1 })
    }

    const count = await deleteStcReportRecords(idsToDelete)
    return NextResponse.json({ success: true, count })
  } catch (error: any) {
    console.error('Error deleting STC report records:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete records.' },
      { status: 500 }
    )
  }
}
