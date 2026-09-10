import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { records, visibleColumns } = body

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ success: false, error: 'No records provided for export.' }, { status: 400 })
    }

    // Default core columns required by user
    const defaultCols = [
      { key: 'sr_no', label: 'Sr No' },
      { key: 'student_name', label: 'Student Name' },
      { key: 'agent', label: 'Agent' },
      { key: 'pending_invoice', label: 'Pending Invoice' },
      { key: 'pending_amount', label: 'Pending Amount (AUD)' },
      { key: 'yet_to_raised', label: 'Yet to Raised' },
      { key: 'intake', label: 'Intake' },
      { key: 'course', label: 'Course' },
    ]

    // Map records to rows
    const excelRows = records.map((r: any, idx: number) => {
      const rowObj: Record<string, any> = {}

      rowObj['Sr No'] = r.sr_no || idx + 1
      rowObj['Student Name'] = r.student_name || ''
      rowObj['Agent'] = r.agent || '-'
      rowObj['Pending Invoice'] = r.pending_invoice || '-'
      rowObj['Pending Amount (AUD)'] = typeof r.pending_amount === 'number' ? r.pending_amount : (parseFloat(r.pending_amount) || 0)
      rowObj['Yet to Raised'] = r.yet_to_raised || '-'
      rowObj['Intake'] = r.intake || '-'
      rowObj['Course'] = r.course || '-'

      // Optional extra columns if present in record
      if (r.student_id) rowObj['Student ID'] = r.student_id
      if (r.status) rowObj['Status'] = r.status
      if (r.dob) rowObj['DOB'] = r.dob
      if (r.document) rowObj['Document'] = r.document
      if (r.end_date) rowObj['End Date'] = r.end_date
      if (r.email_id) rowObj['Email'] = r.email_id
      if (r.phone_no) rowObj['Phone'] = r.phone_no
      if (r.payment_status) rowObj['Payment Status'] = r.payment_status

      return rowObj
    })

    const worksheet = XLSX.utils.json_to_sheet(excelRows)

    // Set auto column widths
    const colKeys = Object.keys(excelRows[0] || {})
    worksheet['!cols'] = colKeys.map((k) => {
      let maxLen = k.length
      excelRows.forEach((row) => {
        const valStr = String(row[k] ?? '')
        if (valStr.length > maxLen) maxLen = valStr.length
      })
      return { wch: Math.min(Math.max(maxLen + 3, 10), 45) }
    })

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'AIMT Student Report')

    const fileBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `AIMT_Student_Report_${dateStr}.xlsx`

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(fileBuffer.length),
      },
    })
  } catch (error: any) {
    console.error('Error exporting report to Excel:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
