import ExcelJS from 'exceljs'

const MARK_MAP: Record<string, string> = {
  'invoice raised': 'Invoice Raised',
  'need advise': 'Need Advise',
  'need advice': 'Need Advise',
  'course end': 'Course End',
  'payment received': 'Payment Received',
  'defaulter': 'Defaulter',
}

const STANDARD_MAP: Record<string, string> = {
  'current': 'Current',
  'future': 'Future',
  'cancelled': 'Cancelled',
  'completed': 'Completed',
  'deferred': 'Deferred',
}

export function resolveStatuses(rawStatus?: string | null): { studentIdStatus: string; markStatus: string } {
  const raw = (rawStatus || '').trim()
  const norm = raw.toLowerCase()

  if (MARK_MAP[norm]) {
    return {
      studentIdStatus: 'Current', // All monthly mark statuses belong to Current students
      markStatus: MARK_MAP[norm],
    }
  }

  if (STANDARD_MAP[norm]) {
    return {
      studentIdStatus: STANDARD_MAP[norm],
      markStatus: '-',
    }
  }

  if (raw && raw !== '-') {
    return {
      studentIdStatus: raw,
      markStatus: '-',
    }
  }

  return {
    studentIdStatus: '-',
    markStatus: '-',
  }
}

function parseNum(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val
  if (!val) return 0
  const parsed = parseFloat(String(val).replace(/[^0-9.-]+/g, ''))
  return isNaN(parsed) ? 0 : parsed
}

export interface GenerateReportExcelOptions {
  title: string
  entityName: string
  records: any[]
}

export async function generateStyledReportExcel({
  title,
  entityName,
  records,
}: GenerateReportExcelOptions): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'InvoiceGen MIS'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet('Student Report', {
    views: [{ showGridLines: true }],
  })

  // Columns definition (30 columns: A through AD)
  const columns = [
    { key: 'sr_no', header: 'Sr No', width: 9, align: 'center' },
    { key: 'student_name', header: 'Student Name', width: 25, align: 'left' },
    { key: 'student_id', header: 'Student ID', width: 15, align: 'center' },
    { key: 'student_status', header: 'Student ID Status', width: 19, align: 'center' },
    { key: 'mark_status', header: 'Mark Status', width: 19, align: 'center' },
    { key: 'document', header: 'Document Type', width: 16, align: 'center' },
    { key: 'course', header: 'Course Name', width: 36, align: 'left' },
    { key: 'agent', header: 'Agent / Agency', width: 28, align: 'left' },
    { key: 'intake', header: 'Intake Date', width: 14, align: 'center' },
    { key: 'end_date', header: 'Course End Date', width: 15, align: 'center' },
    { key: 'coe_issued_date', header: 'COE Issue Date', width: 15, align: 'center' },
    { key: 'dob', header: 'Date of Birth (DOB)', width: 17, align: 'center' },
    { key: 'admin_fee', header: 'Admin Fee ($)', width: 15, align: 'right', isCurrency: true },
    { key: 'resource_fee', header: 'Resource Fee ($)', width: 16, align: 'right', isCurrency: true },
    { key: 'tuition_fee', header: 'Tuition Fee ($)', width: 15, align: 'right', isCurrency: true },
    { key: 'scholarship', header: 'Scholarship ($)', width: 15, align: 'right' },
    { key: 'total_fee', header: 'Total Fee ($)', width: 15, align: 'right', isCurrency: true },
    { key: 'paid_amount', header: 'Initial Payment ($)', width: 17, align: 'right', isCurrency: true },
    { key: 'total_paid', header: 'Total Paid ($)', width: 15, align: 'right', isCurrency: true },
    { key: 'pending_invoice', header: 'Pending Invoice', width: 16, align: 'center' },
    { key: 'pending_amount', header: 'Pending Amount (AUD)', width: 19, align: 'right', isCurrency: true },
    { key: 'yet_to_raised', header: 'Yet to Raised', width: 15, align: 'right' },
    { key: 'payment_status', header: 'Payment Plan Status', width: 19, align: 'center' },
    { key: 'divided_month', header: 'Divided Month', width: 14, align: 'center' },
    { key: 'calculation_breakup', header: 'Calculation BreakUp', width: 32, align: 'left' },
    { key: 'email_id', header: 'Email ID', width: 28, align: 'left' },
    { key: 'phone_no', header: 'Phone No', width: 18, align: 'center' },
    { key: 'remarks', header: 'Installment BreakUp', width: 28, align: 'left' },
    { key: 'follow_up', header: 'Follow-up', width: 22, align: 'left' },
    { key: 'admin_comments', header: 'Admin Comments', width: 28, align: 'left' },
  ]

  worksheet.columns = columns.map((col) => ({
    key: col.key,
    width: col.width,
  }))

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFBFBFBF' } },
    left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
    bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } },
    right: { style: 'thin', color: { argb: 'FFBFBFBF' } },
  }

  // Row 1: Merged Title
  worksheet.mergeCells('A1:AD1')
  const titleCell = worksheet.getCell('A1')
  titleCell.value = title
  titleCell.font = { name: 'Calibri', size: 14, bold: true, italic: true, color: { argb: 'FF002D42' } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  worksheet.getRow(1).height = 26

  // Row 2: Subtitle (A2:AC2 merged) and Date (AD2)
  worksheet.mergeCells('A2:AC2')
  const entityCell = worksheet.getCell('A2')
  entityCell.value = entityName
  entityCell.font = { name: 'Calibri', size: 11, bold: true, italic: true, color: { argb: 'FF595959' } }
  entityCell.alignment = { horizontal: 'center', vertical: 'middle' }

  const monthCell = worksheet.getCell('AD2')
  const now = new Date()
  monthCell.value = now.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).replace(' ', '-')
  monthCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF002D42' } }
  monthCell.alignment = { horizontal: 'center', vertical: 'middle' }
  worksheet.getRow(2).height = 20

  // Apply borders to header banner
  for (let c = 1; c <= 30; c++) {
    worksheet.getRow(1).getCell(c).border = thinBorder
    worksheet.getRow(2).getCell(c).border = thinBorder
  }

  // Row 3: Header Row with Peach Background (#FCE4D6)
  const headerRow = worksheet.getRow(3)
  headerRow.values = columns.map((col) => col.header)
  headerRow.height = 24

  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFCE4D6' }, // Peach background exactly as requested
    }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = thinBorder
  })

  // Fills for Mark Status
  const invoiceRaisedFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFBDD7EE' }, // Soft Sky Blue
  }
  const needAdviseFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFF2CC' }, // Soft Amber / Yellow
  }
  const courseEndFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE1D5E7' }, // Soft Purple
  }
  const paymentReceivedFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFC6EFCE' }, // Soft Green
  }
  const defaulterFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFC7CE' }, // Soft Red
  }

  // Fills for Student ID Status
  const currentStatusFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE2EFDA' }, // Soft Green
  }
  const futureStatusFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFDDEBF7' }, // Soft Blue
  }
  const cancelledStatusFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF8CECC' }, // Soft Red
  }
  const completedStatusFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0F2F1' }, // Soft Cyan
  }
  const deferredStatusFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFEDEDED' }, // Soft Gray
  }

  // Row 4 onwards: Data Rows
  records.forEach((r: any, idx: number) => {
    const rowIndex = idx + 4
    const row = worksheet.getRow(rowIndex)
    row.height = 20

    const { studentIdStatus, markStatus } = resolveStatuses(r.status)

    const totalPaidVal =
      typeof r.total_paid === 'number'
        ? r.total_paid
        : parseFloat(r.total_paid) || (r.extra_data as any)?.total_paid || 0

    const rowData: Record<string, any> = {
      sr_no: r.sr_no || idx + 1,
      student_name: r.student_name || '',
      student_id: r.student_id || '-',
      student_status: studentIdStatus,
      mark_status: markStatus,
      document: r.document || '-',
      course: r.course || '-',
      agent: r.agent || '-',
      intake: r.intake || '-',
      end_date: r.end_date || '-',
      coe_issued_date: r.coe_issued_date || '-',
      dob: r.dob || '-',
      admin_fee: parseNum(r.admin_fee),
      resource_fee: parseNum(r.resource_fee),
      tuition_fee: parseNum(r.tuition_fee),
      scholarship: r.scholarship || '0',
      total_fee: parseNum(r.total_fee),
      paid_amount: parseNum(r.paid_amount),
      total_paid: parseNum(totalPaidVal),
      pending_invoice: r.pending_invoice || '-',
      pending_amount: parseNum(r.pending_amount),
      yet_to_raised: r.yet_to_raised || '-',
      payment_status: r.payment_status || 'Pending',
      divided_month: r.divided_month ?? (r.extra_data as any)?.divided_month ?? '-',
      calculation_breakup: r.calculation_breakup || (r.extra_data as any)?.calculation_breakup || '-',
      email_id: r.email_id || '-',
      phone_no: r.phone_no || '-',
      remarks: r.remarks || '-',
      follow_up: r.follow_up || (r.extra_data as any)?.follow_up || '-',
      admin_comments: r.admin_comments || (r.extra_data as any)?.admin_comments || '-',
    }

    columns.forEach((col, colIdx) => {
      const cell = row.getCell(colIdx + 1)
      const val = rowData[col.key]
      cell.value = val
      cell.border = thinBorder
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF000000' } }

      // Alignment
      cell.alignment = {
        horizontal: col.align as any,
        vertical: 'middle',
      }

      // Currency formatting
      if (col.isCurrency && typeof val === 'number') {
        cell.numFmt = '"$"#,##0.00;("$"#,##0.00);"-"'
      }

      // 1. Style Student ID Status Cell (Column 4)
      if (col.key === 'student_status') {
        if (studentIdStatus === 'Current') {
          cell.fill = currentStatusFill
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF274E13' } }
        } else if (studentIdStatus === 'Future') {
          cell.fill = futureStatusFill
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1F4E78' } }
        } else if (studentIdStatus === 'Cancelled') {
          cell.fill = cancelledStatusFill
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF9C0006' } }
        } else if (studentIdStatus === 'Completed') {
          cell.fill = completedStatusFill
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF004D40' } }
        } else if (studentIdStatus === 'Deferred') {
          cell.fill = deferredStatusFill
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF595959' } }
        } else if (studentIdStatus === '-') {
          cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF888888' } }
        }
      }

      // 2. Style Mark Status Cell (Column 5)
      if (col.key === 'mark_status') {
        if (markStatus === 'Invoice Raised') {
          cell.fill = invoiceRaisedFill
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1F4E78' } }
        } else if (markStatus === 'Need Advise') {
          cell.fill = needAdviseFill
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF7F6000' } }
        } else if (markStatus === 'Course End') {
          cell.fill = courseEndFill
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF5E2B97' } }
        } else if (markStatus === 'Payment Received') {
          cell.fill = paymentReceivedFill
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF006100' } }
        } else if (markStatus === 'Defaulter') {
          cell.fill = defaulterFill
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF9C0006' } }
        } else if (markStatus === '-') {
          cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF888888' } }
        }
      }

      // 3. Style Payment Plan Status (Column 23)
      if (col.key === 'payment_status') {
        if (String(val).toLowerCase() === 'pending') {
          cell.fill = needAdviseFill
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF7F6000' } }
        } else if (String(val).toLowerCase() === 'raised') {
          cell.fill = currentStatusFill
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF274E13' } }
        }
      }
    })
  })

  const arrayBuffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(arrayBuffer)
}
