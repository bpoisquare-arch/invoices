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

    // Defensive server-side sanitation: strip heavy non-tabular slip attachments
    const sanitizedRecords = records.map((r: any) => {
      const { slips, ...rest } = r
      let cleanExtra: Record<string, any> = {}
      if (rest.extra_data && typeof rest.extra_data === 'object') {
        cleanExtra = { ...rest.extra_data }
        delete cleanExtra.slips
        for (const [k, v] of Object.entries(cleanExtra)) {
          if (typeof v === 'string' && (v.length > 2000 || v.startsWith('data:'))) {
            delete cleanExtra[k]
          }
        }
      }
      return {
        ...rest,
        extra_data: cleanExtra,
      }
    })

    const fileBuffer = await generateStyledReportExcel({
      title: 'STC Student Fee & Enrollment Report',
      entityName: 'Skill Training College - STC Entity',
      records: sanitizedRecords,
    })

    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `STC_Student_Report_${dateStr}.xlsx`

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(fileBuffer.length),
      },
    })
  } catch (error: any) {
    console.error('Error exporting STC report to Excel:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
