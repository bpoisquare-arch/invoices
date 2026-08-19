import { NextRequest, NextResponse } from 'next/server'
import { renderToStream } from '@react-pdf/renderer'
import { getInvoiceById } from '@/lib/services/invoice.service'
import { renderInvoicePDFDocument } from '@/lib/services/template-registry'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

function resolveLogo(rawUrl?: string | null): string {
  const logoUrl = rawUrl || '/edlink-logo.png'
  if (logoUrl.startsWith('data:') || logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
    return logoUrl
  }
  try {
    const cleanPath = logoUrl.startsWith('/') ? logoUrl.slice(1) : logoUrl
    const filePath = path.join(process.cwd(), 'public', cleanPath)
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).replace('.', '') || 'png'
      const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext}`
      const base64 = fs.readFileSync(filePath).toString('base64')
      return `data:${mime};base64,${base64}`
    }
  } catch (err) {
    console.error('Error resolving logo path for PDF:', err)
  }
  return logoUrl
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const invoice = await getInvoiceById(id)

    if (!invoice) {
      return new NextResponse('Invoice not found', { status: 404 })
    }

    const rawLogo = invoice.template_snapshot?.logo_url || invoice.companies?.logo_url || '/edlink-logo.png'
    const resolvedLogoUrl = resolveLogo(rawLogo)

    const doc = renderInvoicePDFDocument(invoice, invoice.template_snapshot, resolvedLogoUrl)
    const stream = await renderToStream(doc)

    const filename = `${invoice.invoice_number || 'Invoice'}.pdf`

    return new NextResponse(stream as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error: any) {
    console.error('PDF Generation Error:', error)
    return new NextResponse(`Error generating PDF: ${error?.message || 'Unknown error'}`, {
      status: 500,
    })
  }
}
