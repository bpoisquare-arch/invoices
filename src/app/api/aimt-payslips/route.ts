import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function fromDbRow(row: any) {
  const hasSuper = Boolean(
    Number(row.superannuationAmount ?? row.superannuation_amount ?? 0) > 0 ||
    (row.superannuationDescription && row.superannuationDescription.trim() !== '') ||
    (row.superannuation_description && row.superannuation_description.trim() !== '')
  )

  return {
    id: row.id,
    created_at: row.createdAt instanceof Date ? row.createdAt.toISOString() : (row.created_at || new Date().toISOString()),
    updated_at: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : (row.updated_at || new Date().toISOString()),
    paid_by_name: row.paidByName || row.paid_by_name || 'Australian Institute of Management and Technology',
    paid_by_address_1: row.paidByAddress1 || row.paid_by_address_1 || '84 Buckley Street',
    paid_by_address_2: row.paidByAddress2 || row.paid_by_address_2 || 'Footscray VIC 3011',
    paid_by_abn: row.paidByAbn || row.paid_by_abn || '85 136 626 956',
    employee_name: row.employeeName || row.employee_name || '',
    address_line_1: row.addressLine1 || row.address_line_1 || '',
    address_line_2: row.addressLine2 || row.address_line_2 || '',
    pay_frequency: row.payFrequency || row.pay_frequency || 'Fortnightly',
    show_annual_salary: Number(row.annualSalary ?? row.annual_salary ?? 0) > 0,
    annual_salary: Number(row.annualSalary ?? row.annual_salary ?? 0),
    employment_basis: row.employmentBasis || row.employment_basis || 'Full-time employment',
    pay_period_start: row.payPeriodStart || row.pay_period_start || '',
    pay_period_end: row.payPeriodEnd || row.pay_period_end || '',
    payment_date: row.paymentDate || row.payment_date || '',
    total_earnings: Number(row.totalEarnings ?? row.total_earnings ?? 0),
    net_pay: Number(row.netPay ?? row.net_pay ?? 0),
    wages_description: row.wagesDescription || row.wages_description || 'Ordinary Hours',
    ordinary_hours: Number(row.ordinaryHours ?? row.ordinary_hours ?? 0),
    hourly_rate: Number(row.hourlyRate ?? row.hourly_rate ?? 0),
    wages_amount: Number(row.wagesAmount ?? row.wages_amount ?? 0),
    wages_total: Number(row.wagesTotal ?? row.wages_total ?? 0),
    tax_description: row.taxDescription || row.tax_description || 'PAYG',
    tax_amount: Number(row.taxAmount ?? row.tax_amount ?? 0),
    tax_total: Number(row.taxTotal ?? row.tax_total ?? 0),
    include_superannuation: hasSuper,
    superannuation_description: row.superannuationDescription || row.superannuation_description || 'SGC - HOSTPLUS Superannuation Fund - Industry - 102860122',
    superannuation_amount: Number(row.superannuationAmount ?? row.superannuation_amount ?? 0),
    superannuation_total: Number(row.superannuationTotal ?? row.superannuation_total ?? row.superannuationAmount ?? 0),
    bank_account_masked: row.bankAccountMasked || row.bank_account_masked || '',
    account_name: row.accountName || row.account_name || '',
    payment_reference: row.paymentReference || row.payment_reference || 'AIMT Pay',
    payment_amount: Number(row.paymentAmount ?? row.payment_amount ?? 0),
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (id) {
      const row = await prisma.aimtPayslip.findUnique({ where: { id } })
      if (!row) {
        return NextResponse.json({ error: 'Payslip not found' }, { status: 404 })
      }
      return NextResponse.json(fromDbRow(row))
    }

    const rows = await prisma.aimtPayslip.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(rows.map(fromDbRow))
  } catch (error: any) {
    console.error('Error fetching AIMT payslips:', error)
    return NextResponse.json({ error: error?.message || 'Failed to fetch payslips' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const id = body.id || `aimt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    const row = await prisma.aimtPayslip.upsert({
      where: { id },
      update: {
        paidByName: body.paid_by_name || 'Australian Institute of Management and Technology',
        paidByAddress1: body.paid_by_address_1 || '84 Buckley Street',
        paidByAddress2: body.paid_by_address_2 || 'Footscray VIC 3011',
        paidByAbn: body.paid_by_abn || '85 136 626 956',
        employeeName: body.employee_name || '',
        addressLine1: body.address_line_1 || '',
        addressLine2: body.address_line_2 || '',
        payFrequency: body.pay_frequency || 'Fortnightly',
        annualSalary: body.show_annual_salary === false ? 0 : Number(body.annual_salary || 0),
        employmentBasis: body.employment_basis || 'Full-time employment',
        payPeriodStart: body.pay_period_start || '',
        payPeriodEnd: body.pay_period_end || '',
        paymentDate: body.payment_date || '',
        totalEarnings: Number(body.total_earnings || 0),
        netPay: Number(body.net_pay || 0),
        wagesDescription: body.wages_description || 'Ordinary Hours',
        ordinaryHours: Number(body.ordinary_hours || 0),
        hourlyRate: Number(body.hourly_rate || 0),
        wagesAmount: Number(body.wages_amount || 0),
        wagesTotal: Number(body.wages_total || 0),
        taxDescription: body.tax_description || 'PAYG',
        taxAmount: Number(body.tax_amount || 0),
        taxTotal: Number(body.tax_total || 0),
        superannuationDescription: body.superannuation_description || '',
        superannuationAmount: Number(body.superannuation_amount || 0),
        superannuationTotal: Number(body.superannuation_total || body.superannuation_amount || 0),
        bankAccountMasked: body.bank_account_masked || '',
        accountName: body.account_name || '',
        paymentReference: body.payment_reference || 'AIMT Pay',
        paymentAmount: Number(body.payment_amount || 0),
      },
      create: {
        id,
        paidByName: body.paid_by_name || 'Australian Institute of Management and Technology',
        paidByAddress1: body.paid_by_address_1 || '84 Buckley Street',
        paidByAddress2: body.paid_by_address_2 || 'Footscray VIC 3011',
        paidByAbn: body.paid_by_abn || '85 136 626 956',
        employeeName: body.employee_name || '',
        addressLine1: body.address_line_1 || '',
        addressLine2: body.address_line_2 || '',
        payFrequency: body.pay_frequency || 'Fortnightly',
        annualSalary: body.show_annual_salary === false ? 0 : Number(body.annual_salary || 0),
        employmentBasis: body.employment_basis || 'Full-time employment',
        payPeriodStart: body.pay_period_start || '',
        payPeriodEnd: body.pay_period_end || '',
        paymentDate: body.payment_date || '',
        totalEarnings: Number(body.total_earnings || 0),
        netPay: Number(body.net_pay || 0),
        wagesDescription: body.wages_description || 'Ordinary Hours',
        ordinaryHours: Number(body.ordinary_hours || 0),
        hourlyRate: Number(body.hourly_rate || 0),
        wagesAmount: Number(body.wages_amount || 0),
        wagesTotal: Number(body.wages_total || 0),
        taxDescription: body.tax_description || 'PAYG',
        taxAmount: Number(body.tax_amount || 0),
        taxTotal: Number(body.tax_total || 0),
        superannuationDescription: body.superannuation_description || '',
        superannuationAmount: Number(body.superannuation_amount || 0),
        superannuationTotal: Number(body.superannuation_total || body.superannuation_amount || 0),
        bankAccountMasked: body.bank_account_masked || '',
        accountName: body.account_name || '',
        paymentReference: body.payment_reference || 'AIMT Pay',
        paymentAmount: Number(body.payment_amount || 0),
      },
    })

    return NextResponse.json(fromDbRow(row))
  } catch (error: any) {
    console.error('Error saving AIMT payslip:', error)
    return NextResponse.json({ error: error?.message || 'Failed to save payslip' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Missing ID' }, { status: 400 })
    }

    await prisma.aimtPayslip.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting AIMT payslip:', error)
    return NextResponse.json({ error: error?.message || 'Failed to delete payslip' }, { status: 500 })
  }
}
