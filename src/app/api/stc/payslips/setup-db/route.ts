import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // 1. Ensure table exists in MySQL
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
        \`include_superannuation\` TINYINT(1) NOT NULL DEFAULT 0,
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

    const countRows: any = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM \`stc_payslips\``)
    const count = Number(countRows[0]?.count ?? countRows[0]?.COUNT ?? 0)

    return NextResponse.json({
      success: true,
      message: 'MySQL stc_payslips table is ready and accessible.',
      total_records: count,
    })
  } catch (error: any) {
    console.error('STC payslips setup-db error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'STC payslips setup-db error' },
      { status: 500 }
    )
  }
}

export async function POST() {
  return GET()
}
