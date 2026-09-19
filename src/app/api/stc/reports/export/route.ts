import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { records } = body

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ success: false, error: 'No records provided for export.' }, { status: 400 })
    }

    const excelRows: Record<string, any>[] = records.map((r: any, idx: number) => {
      return {
        'Sr No': r.sr_no || idx + 1,
        'Student Name': r.student_name || '',
        'Student ID': r.student_id || '-',
        'Student ID Status': r.status || '-',
        'Document Type': r.document || '-',
        'Course Name': r.course || '-',
        'Agent / Agency': r.agent || '-',
        'Intake Date': r.intake || '-',
        'Course End Date': r.end_date || '-',
        'COE Issue Date': r.coe_issued_date || '-',
        'Date of Birth (DOB)': r.dob || '-',
        'Admin Fee ($)': typeof r.admin_fee === 'number' ? r.admin_fee : (parseFloat(r.admin_fee) || 0),
        'Resource Fee ($)': typeof r.resource_fee === 'number' ? r.resource_fee : (parseFloat(r.resource_fee) || 0),
        'Tuition Fee ($)': typeof r.tuition_fee === 'number' ? r.tuition_fee : (parseFloat(r.tuition_fee) || 0),
        'Scholarship ($)': r.scholarship || '0',
        'Total Fee ($)': typeof r.total_fee === 'number' ? r.total_fee : (parseFloat(r.total_fee) || 0),
        'Initial Payment ($)': typeof r.paid_amount === 'number' ? r.paid_amount : (parseFloat(r.paid_amount) || 0),
        'Total Paid ($)': typeof (r as any).total_paid === 'number' ? (r as any).total_paid : (parseFloat((r as any).total_paid) || (r.extra_data as any)?.total_paid || 0),
        'Pending Invoice': r.pending_invoice || '-',
        'Pending Amount (AUD)': typeof r.pending_amount === 'number' ? r.pending_amount : (parseFloat(r.pending_amount) || 0),
        'Yet to Raised': r.yet_to_raised || '-',
        'Payment Plan Status': r.payment_status || 'Pending',
        'Email ID': r.email_id || '-',
        'Phone No': r.phone_no || '-',
        'Installment BreakUp': r.remarks || '-',
        'Follow-up': (r as any).follow_up || (r.extra_data as any)?.follow_up || '-',
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(excelRows)

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
    XLSX.utils.book_append_sheet(workbook, worksheet, 'STC Student Report')

    const fileBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `STC_Student_Report_${dateStr}.xlsx`

    return new NextResponse(fileBuffer, {
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
