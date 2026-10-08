import { NextRequest, NextResponse } from 'next/server'
import { generateNextInvoiceNumberServer } from '@/lib/services/invoice-server.service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId') || ''
    const isAnonymous = searchParams.get('isAnonymous') === 'true'

    const entity = searchParams.get('entity') || undefined

    const nextNumber = await generateNextInvoiceNumberServer(companyId, isAnonymous, entity)
    return NextResponse.json({ nextNumber })
  } catch (error: any) {
    console.error('GET /api/invoices/next-number error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to generate next invoice number' },
      { status: 500 }
    )
  }
}
