import { NextRequest, NextResponse } from 'next/server'
import {
  createReportRecord,
  updateReportRecord,
  deleteReportRecord,
  deleteReportRecords,
} from '@/lib/services/report.service'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

// POST /api/reports/records - Create a new student report record
export async function POST(request: NextRequest) {
  try {
    const devSessionVal = request.cookies.get('dev-auth-session')?.value
    const userRoleVal = request.cookies.get('user-role')?.value
    const isViewer = devSessionVal === 'viewer' || userRoleVal === 'viewer'

    if (isViewer) {
      return NextResponse.json(
        { success: false, error: 'Viewer role is not authorized to create records.' },
        { status: 403 }
      )
    }

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
    const devSessionVal = request.cookies.get('dev-auth-session')?.value
    const userRoleVal = request.cookies.get('user-role')?.value
    const isViewer = devSessionVal === 'viewer' || userRoleVal === 'viewer'

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Record ID is required for update.' },
        { status: 400 }
      )
    }

    // Viewers can only edit/update admin_comments
    const payload = isViewer
      ? { admin_comments: updates.admin_comments }
      : updates

    const updatedRecord = await updateReportRecord(id, payload)
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

// DELETE /api/reports/records?id={id}&ids={id1,id2} - Delete single or multiple student report records
export async function DELETE(request: NextRequest) {
  try {
    const devSessionVal = request.cookies.get('dev-auth-session')?.value
    const userRoleVal = request.cookies.get('user-role')?.value
    const isViewer = devSessionVal === 'viewer' || userRoleVal === 'viewer'

    if (isViewer) {
      return NextResponse.json(
        { success: false, error: 'Viewer role is not authorized to delete records.' },
        { status: 403 }
      )
    }

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
      const success = await deleteReportRecord(idsToDelete[0])
      return NextResponse.json({ success, count: 1 })
    } else {
      const count = await deleteReportRecords(idsToDelete)
      return NextResponse.json({ success: true, count })
    }
  } catch (error: any) {
    console.error('Error deleting report record(s):', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete student record(s).' },
      { status: 500 }
    )
  }
}
