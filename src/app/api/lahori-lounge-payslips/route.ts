import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DEFAULT_LAHORI_LOUNGE_PAID_BY } from '@/lib/services/lahori-lounge-payslip.service'

function fromDbRow(row: any) {
  const hasSuper = Boolean(
    (row.includeSuperannuation ?? false) ||
    Number(row.superannuationAmount ?? row.superannuation_amount ?? 0) > 0 ||
    (row.superannuationDescription && row.superannuationDescription.trim() !== '') ||
    (row.superannuation_description && row.superannuation_description.trim() !== '')
  )

  const wagesTotal = Number(row.wagesTotal ?? row.wages_total ?? 0)
  const taxTotal = Number(row.taxTotal ?? row.tax_total ?? 0)
  const superTotal = Number(row.superannuationTotal ?? row.superannuation_total ?? row.superannuationAmount ?? 0)

  return {
    id: row.id,
    created_at: row.createdAt instanceof Date ? row.createdAt.toISOString() : (row.created_at || new Date().toISOString()),
    updated_at: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : (row.updated_at || new Date().toISOString()),
    paid_by_name: row.paidByName || row.paid_by_name || DEFAULT_LAHORI_LOUNGE_PAID_BY.paid_by_name,
    paid_by_address_1: row.paidByAddress1 || row.paid_by_address_1 || DEFAULT_LAHORI_LOUNGE_PAID_BY.paid_by_address_1,
    paid_by_address_2: row.paidByAddress2 || row.paid_by_address_2 || DEFAULT_LAHORI_LOUNGE_PAID_BY.paid_by_address_2,
    paid_by_abn: row.paidByAbn || row.paid_by_abn || DEFAULT_LAHORI_LOUNGE_PAID_BY.paid_by_abn,
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
    wages_total: wagesTotal,
    wages_ytd: Number(row.wagesYtd ?? row.wages_ytd ?? wagesTotal),
    tax_description: row.taxDescription || row.tax_description || 'PAYG',
    tax_amount: Number(row.taxAmount ?? row.tax_amount ?? 0),
    tax_total: taxTotal,
    tax_ytd: Number(row.taxYtd ?? row.tax_ytd ?? taxTotal),
    include_superannuation: hasSuper,
    superannuation_description: row.superannuationDescription || row.superannuation_description || 'SGC - HOSTPLUS Superannuation Fund - Industry - 102860122',
    superannuation_amount: Number(row.superannuationAmount ?? row.superannuation_amount ?? 0),
    superannuation_total: superTotal,
    superannuation_ytd: Number(row.superannuationYtd ?? row.superannuation_ytd ?? superTotal),
    bank_account_masked: row.bankAccountMasked || row.bank_account_masked || '',
    account_name: row.accountName || row.account_name || '',
    payment_reference: row.paymentReference || row.payment_reference || 'Lahori Lounge Pay',
    payment_amount: Number(row.paymentAmount ?? row.payment_amount ?? 0),
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (id) {
      const rows: any = await prisma.$queryRawUnsafe(
        'SELECT * FROM lahori_lounge_payslips WHERE id = ? LIMIT 1',
        id
      )
      if (!rows || rows.length === 0) {
        return NextResponse.json({ error: 'Payslip not found' }, { status: 404 })
      }
      return NextResponse.json(fromDbRow(rows[0]))
    }

    const rows: any = await prisma.$queryRawUnsafe(
      'SELECT * FROM lahori_lounge_payslips ORDER BY created_at DESC'
    )
    return NextResponse.json((rows || []).map(fromDbRow))
  } catch (error: any) {
    console.error('Error fetching Lahori Lounge payslips:', error)
    return NextResponse.json({ error: error?.message || 'Failed to fetch payslips' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const id = body.id || `lahori_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    const wagesTotal = Number(body.wages_total || body.total_earnings || 0)
    const taxTotal = Number(body.tax_total || body.tax_amount || 0)
    const superTotal = Number(body.superannuation_total || body.superannuation_amount || 0)
    const wagesYtd = Number(body.wages_ytd !== undefined ? body.wages_ytd : wagesTotal)
    const taxYtd = Number(body.tax_ytd !== undefined ? body.tax_ytd : taxTotal)
    const superYtd = Number(body.superannuation_ytd !== undefined ? body.superannuation_ytd : superTotal)

    const paidByName = body.paid_by_name || DEFAULT_LAHORI_LOUNGE_PAID_BY.paid_by_name
    const paidByAddress1 = body.paid_by_address_1 || DEFAULT_LAHORI_LOUNGE_PAID_BY.paid_by_address_1
    const paidByAddress2 = body.paid_by_address_2 || DEFAULT_LAHORI_LOUNGE_PAID_BY.paid_by_address_2
    const paidByAbn = body.paid_by_abn || DEFAULT_LAHORI_LOUNGE_PAID_BY.paid_by_abn
    const employeeName = body.employee_name || ''
    const addressLine1 = body.address_line_1 || ''
    const addressLine2 = body.address_line_2 || ''
    const payFrequency = body.pay_frequency || 'Fortnightly'
    const annualSalary = body.show_annual_salary === false ? 0 : Number(body.annual_salary || 0)
    const employmentBasis = body.employment_basis || 'Full-time employment'
    const payPeriodStart = body.pay_period_start || ''
    const payPeriodEnd = body.pay_period_end || ''
    const paymentDate = body.payment_date || ''
    const totalEarnings = Number(body.total_earnings || 0)
    const netPay = Number(body.net_pay || 0)
    const wagesDescription = body.wages_description || 'Ordinary Hours'
    const ordinaryHours = Number(body.ordinary_hours || 0)
    const hourlyRate = Number(body.hourly_rate || 0)
    const wagesAmount = Number(body.wages_amount || 0)
    const taxDescription = body.tax_description || 'PAYG'
    const taxAmount = Number(body.tax_amount || 0)
    const includeSuperannuation = body.include_superannuation ? 1 : 0
    const superannuationDescription = body.superannuation_description || ''
    const superannuationAmount = Number(body.superannuation_amount || 0)
    const bankAccountMasked = body.bank_account_masked || ''
    const accountName = body.account_name || ''
    const paymentReference = body.payment_reference || 'Lahori Lounge Pay'
    const paymentAmount = Number(body.payment_amount || 0)

    await prisma.$executeRawUnsafe(
      `INSERT INTO lahori_lounge_payslips (
        id, paid_by_name, paid_by_address_1, paid_by_address_2, paid_by_abn,
        employee_name, address_line_1, address_line_2, pay_frequency, annual_salary,
        employment_basis, pay_period_start, pay_period_end, payment_date,
        total_earnings, net_pay, wages_description, ordinary_hours, hourly_rate,
        wages_amount, wages_total, wages_ytd, tax_description, tax_amount,
        tax_total, tax_ytd, include_superannuation, superannuation_description,
        superannuation_amount, superannuation_total, superannuation_ytd,
        bank_account_masked, account_name, payment_reference, payment_amount,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        NOW(), NOW()
      )
      ON DUPLICATE KEY UPDATE
        paid_by_name = VALUES(paid_by_name),
        paid_by_address_1 = VALUES(paid_by_address_1),
        paid_by_address_2 = VALUES(paid_by_address_2),
        paid_by_abn = VALUES(paid_by_abn),
        employee_name = VALUES(employee_name),
        address_line_1 = VALUES(address_line_1),
        address_line_2 = VALUES(address_line_2),
        pay_frequency = VALUES(pay_frequency),
        annual_salary = VALUES(annual_salary),
        employment_basis = VALUES(employment_basis),
        pay_period_start = VALUES(pay_period_start),
        pay_period_end = VALUES(pay_period_end),
        payment_date = VALUES(payment_date),
        total_earnings = VALUES(total_earnings),
        net_pay = VALUES(net_pay),
        wages_description = VALUES(wages_description),
        ordinary_hours = VALUES(ordinary_hours),
        hourly_rate = VALUES(hourly_rate),
        wages_amount = VALUES(wages_amount),
        wages_total = VALUES(wages_total),
        wages_ytd = VALUES(wages_ytd),
        tax_description = VALUES(tax_description),
        tax_amount = VALUES(tax_amount),
        tax_total = VALUES(tax_total),
        tax_ytd = VALUES(tax_ytd),
        include_superannuation = VALUES(include_superannuation),
        superannuation_description = VALUES(superannuation_description),
        superannuation_amount = VALUES(superannuation_amount),
        superannuation_total = VALUES(superannuation_total),
        superannuation_ytd = VALUES(superannuation_ytd),
        bank_account_masked = VALUES(bank_account_masked),
        account_name = VALUES(account_name),
        payment_reference = VALUES(payment_reference),
        payment_amount = VALUES(payment_amount),
        updated_at = NOW()`,
      id, paidByName, paidByAddress1, paidByAddress2, paidByAbn,
      employeeName, addressLine1, addressLine2, payFrequency, annualSalary,
      employmentBasis, payPeriodStart, payPeriodEnd, paymentDate,
      totalEarnings, netPay, wagesDescription, ordinaryHours, hourlyRate,
      wagesAmount, wagesTotal, wagesYtd, taxDescription, taxAmount,
      taxTotal, taxYtd, includeSuperannuation, superannuationDescription,
      superannuationAmount, superTotal, superYtd,
      bankAccountMasked, accountName, paymentReference, paymentAmount
    )

    const savedRows: any = await prisma.$queryRawUnsafe(
      'SELECT * FROM lahori_lounge_payslips WHERE id = ? LIMIT 1',
      id
    )
    return NextResponse.json(fromDbRow(savedRows[0]))
  } catch (error: any) {
    console.error('Error saving Lahori Lounge payslip:', error)
    return NextResponse.json({ error: error?.message || 'Failed to save payslip' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing payslip id' }, { status: 400 })
    }

    await prisma.$executeRawUnsafe('DELETE FROM lahori_lounge_payslips WHERE id = ?', id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting Lahori Lounge payslip:', error)
    return NextResponse.json({ error: error?.message || 'Failed to delete payslip' }, { status: 500 })
  }
}
