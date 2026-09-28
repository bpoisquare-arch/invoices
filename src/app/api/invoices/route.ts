import { NextRequest, NextResponse } from 'next/server'
import {
  getInvoicesServer,
  createInvoiceServer,
} from '@/lib/services/invoice-server.service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId') || undefined
    const entityType = (searchParams.get('entityType') as any) || undefined
    const dateFilter = (searchParams.get('dateFilter') as any) || undefined
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const sortBy = (searchParams.get('sortBy') as any) || undefined
    const search = searchParams.get('search') || undefined
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1
    const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : 20

    const result = await getInvoicesServer({
      companyId,
      entityType,
      dateFilter,
      startDate,
      endDate,
      sortBy,
      search,
      page,
      pageSize,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('GET /api/invoices error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch invoices' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const invoice = await createInvoiceServer(body)
    return NextResponse.json(invoice, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/invoices error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to create invoice' },
      { status: 500 }
    )
  }
}
