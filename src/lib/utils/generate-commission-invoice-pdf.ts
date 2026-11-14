import { jsPDF } from 'jspdf'
import { AIMT_LOGO_BASE64 } from './aimt-logo-base64'

export interface CommissionInvoicePdfData {
  referenceNumber: string
  invoiceDate: string
  agencyName: string
  amount: number
  description?: string
  notes?: string
  dueDate?: string
}

function formatDateDisplay(dateStr?: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    }
  } catch {}
  return dateStr
}

function formatAmountDisplay(amt: number): string {
  const num = Number(amt) || 0
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Builds a vector-sharp jsPDF document replicating the exact layout of AIMT Commission Invoice
 */
export function buildCommissionInvoicePdfDoc(data: CommissionInvoicePdfData): jsPDF {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth() // 210mm
  const pageHeight = doc.internal.pageSize.getHeight() // 297mm

  const marginX = 20
  const rightX = pageWidth - marginX // 190mm

  // 1. AIMT College Logo (Top Left)
  if (AIMT_LOGO_BASE64) {
    try {
      doc.addImage(AIMT_LOGO_BASE64, 'PNG', marginX, 18, 54, 14, undefined, 'FAST')
    } catch (imgErr) {
      console.warn('Could not render logo into jsPDF:', imgErr)
    }
  }

  // 2. College Details (Left Column)
  let curY = 40
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(130, 130, 130)
  doc.text('To:', marginX, curY)

  curY += 4.5
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(20, 20, 20)
  doc.text('Australian Institute of Management and Technology', marginX, curY)

  curY += 4.2
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(60, 60, 60)
  doc.text('84 Buckley Street', marginX, curY)

  curY += 4.2
  doc.text('FOOTSCRAY VIC 3011', marginX, curY)

  curY += 4.2
  doc.setFont('helvetica', 'bold')
  doc.text('AUSTRALIA', marginX, curY)

  // 3. Right Header Column (Agency Name, Invoice Date, Reference Number)
  let rightY = 22

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(20, 20, 20)
  const upperAgency = (data.agencyName || 'AGENCY').toUpperCase()
  doc.text(upperAgency, rightX, rightY, { align: 'right' })

  rightY += 8
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(130, 130, 130)
  doc.text('Invoice Date', rightX, rightY, { align: 'right' })

  rightY += 4.5
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(30, 30, 30)
  const formattedDate = formatDateDisplay(data.invoiceDate)
  doc.text(formattedDate, rightX, rightY, { align: 'right' })

  rightY += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(130, 130, 130)
  doc.text('Reference Number', rightX, rightY, { align: 'right' })

  rightY += 5
  doc.setFont('courier', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(20, 20, 20)
  const refText = data.referenceNumber || 'CAP-001'
  doc.text(refText, rightX, rightY, { align: 'right' })

  // 4. Subtle Section Divider Line
  const dividerY = Math.max(curY + 10, rightY + 10)
  doc.setDrawColor(220, 225, 230)
  doc.setLineWidth(0.4)
  doc.line(marginX, dividerY, rightX, dividerY)

  // 5. Line Items Table Header
  let tableY = dividerY + 12
  doc.setFillColor(248, 250, 252)
  doc.rect(marginX, tableY - 5, rightX - marginX, 8, 'F')
  doc.setDrawColor(30, 41, 59)
  doc.setLineWidth(0.5)
  doc.line(marginX, tableY - 5, rightX, tableY - 5)
  doc.line(marginX, tableY + 3, rightX, tableY + 3)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(30, 41, 59)
  doc.text('Description', marginX + 2, tableY)
  doc.text('Quantity', 115, tableY, { align: 'center' })
  doc.text('Unit Price', 145, tableY, { align: 'right' })
  doc.text('Amount AUD', rightX - 2, tableY, { align: 'right' })

  // 6. Line Item Row
  tableY += 10
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(20, 20, 20)

  const lineDesc = data.description || `${data.agencyName} - Paid by AIMT`
  doc.text(lineDesc, marginX + 2, tableY)

  if (data.notes && data.notes.trim()) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7.5)
    doc.setTextColor(110, 110, 110)
    doc.text(`Note: ${data.notes.trim()}`, marginX + 2, tableY + 4.5)
  }

  doc.setFont('courier', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(30, 30, 30)
  doc.text('1.00', 115, tableY, { align: 'center' })

  const formattedAmt = formatAmountDisplay(data.amount)
  doc.text(`$${formattedAmt}`, 145, tableY, { align: 'right' })

  doc.setFont('courier', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text(`$${formattedAmt}`, rightX - 2, tableY, { align: 'right' })

  // Table row bottom border
  tableY += data.notes && data.notes.trim() ? 8 : 6
  doc.setDrawColor(230, 235, 240)
  doc.setLineWidth(0.3)
  doc.line(marginX, tableY, rightX, tableY)

  // 7. Right-Aligned Financial Breakdown Table
  let sumY = tableY + 12
  const sumBoxWidth = 82
  const sumLeft = rightX - sumBoxWidth

  // Subtotal
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(80, 80, 80)
  doc.text('Subtotal', sumLeft, sumY)
  doc.setFont('courier', 'normal')
  doc.setTextColor(20, 20, 20)
  doc.text(`$${formattedAmt}`, rightX - 2, sumY, { align: 'right' })

  // TOTAL AUD
  sumY += 6.5
  doc.setDrawColor(20, 20, 20)
  doc.setLineWidth(0.4)
  doc.line(sumLeft, sumY - 1.5, rightX, sumY - 1.5)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(10, 10, 10)
  doc.text('TOTAL AUD', sumLeft, sumY + 2.5)
  doc.setFont('courier', 'bold')
  doc.text(`$${formattedAmt}`, rightX - 2, sumY + 2.5, { align: 'right' })

  // Less Amount Paid
  sumY += 9
  doc.setDrawColor(220, 225, 230)
  doc.setLineWidth(0.3)
  doc.line(sumLeft, sumY - 1.5, rightX, sumY - 1.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(80, 80, 80)
  doc.text('Less Amount Paid', sumLeft, sumY + 2.5)
  doc.setFont('courier', 'bold')
  doc.setTextColor(16, 120, 80)
  doc.text(`$${formattedAmt}`, rightX - 2, sumY + 2.5, { align: 'right' })

  // AMOUNT DUE
  sumY += 9.5
  doc.setDrawColor(20, 20, 20)
  doc.setLineWidth(0.6)
  doc.line(sumLeft, sumY - 1.5, rightX, sumY - 1.5)
  doc.line(sumLeft, sumY + 6.5, rightX, sumY + 6.5)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(10, 10, 10)
  doc.text('AMOUNT DUE', sumLeft, sumY + 3)
  doc.setFont('courier', 'bold')
  doc.setTextColor(16, 120, 80)
  doc.text('$0.00', rightX - 2, sumY + 3, { align: 'right' })

  // Due Date
  sumY += 12
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(130, 130, 130)
  doc.text('Due Date', sumLeft, sumY)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(30, 30, 30)
  const dueDateDisplay = formatDateDisplay(data.dueDate || data.invoiceDate)
  doc.text(dueDateDisplay, rightX - 2, sumY, { align: 'right' })

  // 8. Footer (Centered at bottom)
  const footerY = pageHeight - 20
  doc.setDrawColor(230, 235, 240)
  doc.setLineWidth(0.3)
  doc.line(marginX, footerY - 5, rightX, footerY - 5)

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8.5)
  doc.setTextColor(150, 150, 150)
  doc.text('This is not a tax invoice', pageWidth / 2, footerY, { align: 'center' })

  return doc
}

/**
 * Triggers a direct browser download of the commission invoice PDF.
 */
export function downloadCommissionInvoicePdf(data: CommissionInvoicePdfData): void {
  const doc = buildCommissionInvoicePdfDoc(data)
  const cleanAgency = (data.agencyName || 'Agency')
    .replace(/[/\\?%*:|"<>]/g, '')
    .trim()
    .replace(/\s+/g, '-')
  const filename = `Invoice-${data.referenceNumber || 'CAP'}-${cleanAgency}.pdf`
  doc.save(filename)
}

