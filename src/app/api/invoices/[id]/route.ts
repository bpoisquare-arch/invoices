import { NextRequest, NextResponse } from 'next/server'
import {
  getInvoiceByIdServer,
  updateInvoiceServer,
  deleteInvoiceServer,
  renameInvoiceReferenceServer,
} from '@/lib/services/invoice-server.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const invoice = await getInvoiceByIdServer(id)
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }
    return NextResponse.json(invoice)
  } catch (error: any) {
    console.error(`GET /api/invoices/[id] error:`, error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch invoice' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const invoice = await updateInvoiceServer(id, body)
    return NextResponse.json(invoice)
  } catch (error: any) {
    console.error(`PUT /api/invoices/[id] error:`, error)
    return NextResponse.json(
      { error: error?.message || 'Failed to update invoice' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    if (body.referenceName !== undefined) {
      await renameInvoiceReferenceServer(id, body.referenceName)
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ error: 'Invalid patch payload' }, { status: 400 })
  } catch (error: any) {
    console.error(`PATCH /api/invoices/[id] error:`, error)
    return NextResponse.json(
      { error: error?.message || 'Failed to patch invoice' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await deleteInvoiceServer(id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error(`DELETE /api/invoices/[id] error:`, error)
    return NextResponse.json(
      { error: error?.message || 'Failed to delete invoice' },
      { status: 500 }
    )
  }
}
