import { NextRequest, NextResponse } from 'next/server'
import {
  getAllCommissionInvoices,
  getNextInvoiceReference,
  createCommissionInvoice,
} from '@/lib/services/commission-invoice.service'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')

    if (action === 'next-reference') {
      const nextReference = await getNextInvoiceReference()
      return NextResponse.json({
        success: true,
        nextReference,
      })
    }

    const invoices = await getAllCommissionInvoices()
    return NextResponse.json({
      success: true,
      invoices,
    })
  } catch (error: any) {
    console.error('Error fetching commission invoices:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch invoices' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      agencyName,
      totalAmount,
      invoiceDate,
      dueDate,
      referenceNumber,
      description,
      paymentMethod,
      bankTransactionId,
      slips,
      notes,
      payoutLogId,
      allocatedStudentsCount,
    } = body

    if (!agencyName || typeof agencyName !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Agency name is required' },
        { status: 400 }
      )
    }

    const amount = Number(totalAmount)
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invoice total amount must be a positive number' },
        { status: 400 }
      )
    }

    const invoice = await createCommissionInvoice({
      agencyName,
      totalAmount: amount,
      invoiceDate,
      dueDate,
      referenceNumber,
      description,
      paymentMethod,
      bankTransactionId,
      slips,
      notes,
      payoutLogId,
      allocatedStudentsCount,
    })

    const nextReference = await getNextInvoiceReference()

    return NextResponse.json({
      success: true,
      invoice,
      nextReference,
    })
  } catch (error: any) {
    console.error('Error creating commission invoice:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create invoice' },
      { status: 500 }
    )
  }
}
