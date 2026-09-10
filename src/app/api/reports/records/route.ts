import { NextRequest, NextResponse } from 'next/server'
import {
  createReportRecord,
  updateReportRecord,
  deleteReportRecord,
} from '@/lib/services/report.service'

// POST /api/reports/records - Create a new student report record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.student_name || !body.student_name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Student Name is required.' },
        { status: 400 }
      )
    }

    const record = await createReportRecord(body)
    return NextResponse.json({ success: true, record })
  } catch (error: any) {
    console.error('Error creating report record:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create student record.' },
      { status: 500 }
    )
  }
}

// PUT /api/reports/records - Update an existing student report record
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

    const updatedRecord = await updateReportRecord(id, updates)
    if (!updatedRecord) {
      return NextResponse.json(
        { success: false, error: 'Record not found or failed to update.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, record: updatedRecord })
  } catch (error: any) {
    console.error('Error updating report record:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update student record.' },
      { status: 500 }
    )
  }
}

// DELETE /api/reports/records?id={id} - Delete a student report record
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Record ID is required for deletion.' },
        { status: 400 }
      )
    }

    const success = await deleteReportRecord(id)
    return NextResponse.json({ success })
  } catch (error: any) {
    console.error('Error deleting report record:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete student record.' },
      { status: 500 }
    )
  }
}
