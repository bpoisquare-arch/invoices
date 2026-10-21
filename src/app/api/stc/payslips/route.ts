import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DEFAULT_STC_PAID_BY } from '@/lib/services/stc-payslip.service'

export const dynamic = 'force-dynamic'

function fromDbRow(row: any) {
  if (!row) return null

  const hasSuper = Boolean(
    Number(row.superannuationAmount ?? row.superannuation_amount ?? 0) > 0 ||
    (row.superannuationDescription && row.superannuationDescription.trim() !== '') ||
    (row.superannuation_description && row.superannuation_description.trim() !== '')
  )

  return {
    id: row.id,
    created_at: row.createdAt instanceof Date ? row.createdAt.toISOString() : (row.created_at instanceof Date ? row.created_at.toISOString() : (row.created_at || new Date().toISOString())),
    updated_at: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : (row.updated_at instanceof Date ? row.updated_at.toISOString() : (row.updated_at || new Date().toISOString())),
    paid_by_name: row.paidByName || row.paid_by_name || DEFAULT_STC_PAID_BY.paid_by_name,
    paid_by_address_1: row.paidByAddress1 || row.paid_by_address_1 || DEFAULT_STC_PAID_BY.paid_by_address_1,
    paid_by_address_2: row.paidByAddress2 || row.paid_by_address_2 || DEFAULT_STC_PAID_BY.paid_by_address_2,
    paid_by_abn: row.paidByAbn || row.paid_by_abn || DEFAULT_STC_PAID_BY.paid_by_abn,
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
    payment_reference: row.paymentReference || row.payment_reference || 'STC Pay',
    payment_amount: Number(row.paymentAmount ?? row.payment_amount ?? 0),
  }
}

// Ensure table exists helper
async function ensureTableExists() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`stc_payslips\` (
        \`id\` VARCHAR(255) NOT NULL,
        \`user_id\` VARCHAR(36) NULL,
        \`paid_by_name\` VARCHAR(255) NOT NULL,
        \`paid_by_address_1\` VARCHAR(255) NOT NULL,
        \`paid_by_address_2\` VARCHAR(255) NOT NULL,
        \`paid_by_abn\` VARCHAR(100) NOT NULL,
        \`employee_name\` VARCHAR(255) NOT NULL,
        \`address_line_1\` VARCHAR(255) NOT NULL,
        \`address_line_2\` VARCHAR(255) NOT NULL,
        \`pay_frequency\` VARCHAR(100) NOT NULL,
        \`annual_salary\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        \`employment_basis\` VARCHAR(100) NOT NULL,
        \`pay_period_start\` VARCHAR(50) NOT NULL,
        \`pay_period_end\` VARCHAR(50) NOT NULL,
        \`payment_date\` VARCHAR(50) NOT NULL,
        \`total_earnings\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        \`net_pay\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        \`wages_description\` VARCHAR(255) NOT NULL,
        \`ordinary_hours\` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        \`hourly_rate\` DECIMAL(10, 4) NOT NULL DEFAULT 0.0000,
        \`wages_amount\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        \`wages_total\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        \`tax_description\` VARCHAR(100) NOT NULL,
        \`tax_amount\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        \`tax_total\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        \`superannuation_description\` VARCHAR(255) NULL DEFAULT '',
        \`superannuation_amount\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        \`superannuation_total\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        \`bank_account_masked\` VARCHAR(100) NOT NULL,
        \`account_name\` VARCHAR(255) NOT NULL,
        \`payment_reference\` VARCHAR(255) NOT NULL,
        \`payment_amount\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        INDEX \`idx_stc_payslips_employee_name\` (\`employee_name\`),
        INDEX \`idx_stc_payslips_created_at\` (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `)
  } catch (e) {
    // Ignore if already exists
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureTableExists()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (id) {
      if ((prisma as any).stcPayslip?.findUnique) {
        try {
          const row = await (prisma as any).stcPayslip.findUnique({ where: { id } })
          if (!row) return NextResponse.json({ error: 'Payslip not found' }, { status: 404 })
          return NextResponse.json(fromDbRow(row))
        } catch (e) {
          // Fall through to raw SQL
        }
      }

      const rows: any = await prisma.$queryRawUnsafe(`SELECT * FROM \`stc_payslips\` WHERE \`id\` = ? LIMIT 1`, id)
      if (!rows || rows.length === 0) {
        return NextResponse.json({ error: 'Payslip not found' }, { status: 404 })
      }
      return NextResponse.json(fromDbRow(rows[0]))
    }

    if ((prisma as any).stcPayslip?.findMany) {
      try {
        const rows = await (prisma as any).stcPayslip.findMany({
          orderBy: { createdAt: 'desc' },
        })
        return NextResponse.json(rows.map(fromDbRow))
      } catch (e) {
        // Fall through to raw SQL
      }
    }

    const rows: any = await prisma.$queryRawUnsafe(`SELECT * FROM \`stc_payslips\` ORDER BY \`created_at\` DESC`)
    return NextResponse.json((rows || []).map(fromDbRow))
  } catch (error: any) {
    console.error('Error fetching STC payslips:', error)
    return NextResponse.json({ error: error?.message || 'Failed to fetch STC payslips' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureTableExists()

    const body = await request.json()
    const id = body.id || `stc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    const payload = {
      id,
      paidByName: body.paid_by_name || DEFAULT_STC_PAID_BY.paid_by_name,
      paidByAddress1: body.paid_by_address_1 || DEFAULT_STC_PAID_BY.paid_by_address_1,
      paidByAddress2: body.paid_by_address_2 || DEFAULT_STC_PAID_BY.paid_by_address_2,
      paidByAbn: body.paid_by_abn || DEFAULT_STC_PAID_BY.paid_by_abn,
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
      paymentReference: body.payment_reference || 'STC Pay',
      paymentAmount: Number(body.payment_amount || 0),
    }

    if ((prisma as any).stcPayslip?.upsert) {
      try {
        const row = await (prisma as any).stcPayslip.upsert({
          where: { id },
          update: payload,
          create: payload,
        })
        return NextResponse.json(fromDbRow(row))
      } catch (e) {
        // Fall through to raw SQL upsert
      }
    }

    // Raw MySQL ON DUPLICATE KEY UPDATE upsert
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO \`stc_payslips\` (
        \`id\`, \`paid_by_name\`, \`paid_by_address_1\`, \`paid_by_address_2\`, \`paid_by_abn\`,
        \`employee_name\`, \`address_line_1\`, \`address_line_2\`, \`pay_frequency\`,
        \`annual_salary\`, \`employment_basis\`, \`pay_period_start\`, \`pay_period_end\`,
        \`payment_date\`, \`total_earnings\`, \`net_pay\`, \`wages_description\`,
        \`ordinary_hours\`, \`hourly_rate\`, \`wages_amount\`, \`wages_total\`,
        \`tax_description\`, \`tax_amount\`, \`tax_total\`,
        \`superannuation_description\`, \`superannuation_amount\`, \`superannuation_total\`,
        \`bank_account_masked\`, \`account_name\`, \`payment_reference\`, \`payment_amount\`,
        \`created_at\`, \`updated_at\`
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        NOW(3), NOW(3)
      ) ON DUPLICATE KEY UPDATE
        \`paid_by_name\` = VALUES(\`paid_by_name\`),
        \`paid_by_address_1\` = VALUES(\`paid_by_address_1\`),
        \`paid_by_address_2\` = VALUES(\`paid_by_address_2\`),
        \`paid_by_abn\` = VALUES(\`paid_by_abn\`),
        \`employee_name\` = VALUES(\`employee_name\`),
        \`address_line_1\` = VALUES(\`address_line_1\`),
        \`address_line_2\` = VALUES(\`address_line_2\`),
        \`pay_frequency\` = VALUES(\`pay_frequency\`),
        \`annual_salary\` = VALUES(\`annual_salary\`),
        \`employment_basis\` = VALUES(\`employment_basis\`),
        \`pay_period_start\` = VALUES(\`pay_period_start\`),
        \`pay_period_end\` = VALUES(\`pay_period_end\`),
        \`payment_date\` = VALUES(\`payment_date\`),
        \`total_earnings\` = VALUES(\`total_earnings\`),
        \`net_pay\` = VALUES(\`net_pay\`),
        \`wages_description\` = VALUES(\`wages_description\`),
        \`ordinary_hours\` = VALUES(\`ordinary_hours\`),
        \`hourly_rate\` = VALUES(\`hourly_rate\`),
        \`wages_amount\` = VALUES(\`wages_amount\`),
        \`wages_total\` = VALUES(\`wages_total\`),
        \`tax_description\` = VALUES(\`tax_description\`),
        \`tax_amount\` = VALUES(\`tax_amount\`),
        \`tax_total\` = VALUES(\`tax_total\`),
        \`superannuation_description\` = VALUES(\`superannuation_description\`),
        \`superannuation_amount\` = VALUES(\`superannuation_amount\`),
        \`superannuation_total\` = VALUES(\`superannuation_total\`),
        \`bank_account_masked\` = VALUES(\`bank_account_masked\`),
        \`account_name\` = VALUES(\`account_name\`),
        \`payment_reference\` = VALUES(\`payment_reference\`),
        \`payment_amount\` = VALUES(\`payment_amount\`),
        \`updated_at\` = NOW(3)
    `,
      payload.id,
      payload.paidByName,
      payload.paidByAddress1,
      payload.paidByAddress2,
      payload.paidByAbn,
      payload.employeeName,
      payload.addressLine1,
      payload.addressLine2,
      payload.payFrequency,
      payload.annualSalary,
      payload.employmentBasis,
      payload.payPeriodStart,
      payload.payPeriodEnd,
      payload.paymentDate,
      payload.totalEarnings,
      payload.netPay,
      payload.wagesDescription,
      payload.ordinaryHours,
      payload.hourlyRate,
      payload.wagesAmount,
      payload.wagesTotal,
      payload.taxDescription,
      payload.taxAmount,
      payload.taxTotal,
      payload.superannuationDescription,
      payload.superannuationAmount,
      payload.superannuationTotal,
      payload.bankAccountMasked,
      payload.accountName,
      payload.paymentReference,
      payload.paymentAmount
    )

    const savedRow: any = await prisma.$queryRawUnsafe(`SELECT * FROM \`stc_payslips\` WHERE \`id\` = ? LIMIT 1`, id)
    return NextResponse.json(fromDbRow(savedRow[0]))
  } catch (error: any) {
    console.error('Error saving STC payslip:', error)
    return NextResponse.json({ error: error?.message || 'Failed to save STC payslip' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await ensureTableExists()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Missing ID' }, { status: 400 })
    }

    if ((prisma as any).stcPayslip?.delete) {
      try {
        await (prisma as any).stcPayslip.delete({ where: { id } })
        return NextResponse.json({ success: true })
      } catch (e) {
        // Fall through to raw SQL
      }
    }

    await prisma.$executeRawUnsafe(`DELETE FROM \`stc_payslips\` WHERE \`id\` = ?`, id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting STC payslip:', error)
    return NextResponse.json({ error: error?.message || 'Failed to delete STC payslip' }, { status: 500 })
  }
}
