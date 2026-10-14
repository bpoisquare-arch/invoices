import { NextRequest, NextResponse } from 'next/server'
import { generateStyledReportExcel } from '@/lib/services/report-excel-export'

export async function POST(request: NextRequest) {
  try {
    const devSessionVal = request.cookies.get('dev-auth-session')?.value
    const userRoleVal = request.cookies.get('user-role')?.value
    const isViewer = devSessionVal === 'viewer' || userRoleVal === 'viewer'

    if (isViewer) {
      return NextResponse.json(
        { success: false, error: 'Viewer role is not authorized to export reports.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { records } = body

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ success: false, error: 'No records provided for export.' }, { status: 400 })
    }

    const fileBuffer = await generateStyledReportExcel({
      title: 'AIMT Student Fee & Enrollment Report',
      entityName: 'AIMT College - Academic & Vocational',
      records,
    })

    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `AIMT_Student_Report_${dateStr}.xlsx`

    return new NextResponse(fileBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(fileBuffer.length),
      },
    })
  } catch (error: any) {
    console.error('Error exporting AIMT report to Excel:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
