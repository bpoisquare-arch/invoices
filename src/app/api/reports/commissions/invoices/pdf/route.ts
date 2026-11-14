import { NextRequest, NextResponse } from 'next/server'
import { getAllCommissionInvoices } from '@/lib/services/commission-invoice.service'
import { buildCommissionInvoicePdfDoc } from '@/lib/utils/generate-commission-invoice-pdf'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const reference = searchParams.get('reference')
    const id = searchParams.get('id')

    const invoices = await getAllCommissionInvoices()
    const invoice = invoices.find(
      (inv) =>
        (reference && inv.referenceNumber?.toLowerCase() === reference.toLowerCase()) ||
        (id && inv.id === id)
    )

    if (!invoice) {
      return new NextResponse('Invoice not found', { status: 404 })
    }

    const doc = buildCommissionInvoicePdfDoc({
      referenceNumber: invoice.referenceNumber,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      agencyName: invoice.agencyName,
      amount: invoice.totalAmount,
      description: invoice.description,
      notes: invoice.notes,
    })

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
    const cleanAgency = (invoice.agencyName || 'Agency')
      .replace(/[/\\?%*:|"<>]/g, '')
      .trim()
      .replace(/\s+/g, '_')
    const filename = `Invoice_${invoice.referenceNumber}_${cleanAgency}.pdf`

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error: any) {
    console.error('Commission Invoice PDF Generation Error:', error)
    return new NextResponse(`Error generating invoice PDF: ${error?.message || 'Unknown error'}`, {
      status: 500,
    })
  }
}

