import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { EdlinkPayslip, formatCurrency } from '@/lib/services/edlink-payslip.service'
import { EDLINK_LOGO_BASE64 } from '@/lib/constants/edlink-assets'

const styles = StyleSheet.create({
  page: {
    paddingTop: 42,
    paddingBottom: 38,
    paddingHorizontal: 38,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  // Header
  headerGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  logoContainer: {
    width: 175,
    alignItems: 'flex-start',
  },
  logoImage: {
    width: 170,
    height: 58,
    objectFit: 'contain',
  },
  paidByBox: {
    width: 235,
    backgroundColor: '#f1f5f9',
    padding: 10,
    textAlign: 'left',
  },
  paidByTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  paidByText: {
    fontSize: 8.5,
    lineHeight: 1.4,
    color: '#1e293b',
  },

  // Middle info: Employee vs Employment Details
  middleGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    marginTop: 6,
  },
  employeeBox: {
    width: 260,
    paddingTop: 6,
  },
  employeeName: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  employeeAddress: {
    fontSize: 10,
    lineHeight: 1.5,
    color: '#1e293b',
  },

  employmentBox: {
    width: 235,
    backgroundColor: '#f1f5f9',
    padding: 10,
  },
  employmentTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  employmentRow: {
    fontSize: 8.5,
    lineHeight: 1.45,
    color: '#1e293b',
  },

  // Summary Ribbon with inline text preventing any overlap
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f1f5f9',
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: '#cbd5e1',
    paddingVertical: 9,
    paddingHorizontal: 10,
    marginBottom: 24,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 8.8,
    color: '#0f172a',
  },
  summaryBold: {
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },

  // Section Table
  sectionContainer: {
    marginBottom: 20,
  },
  thisPayHeader: {
    textAlign: 'right',
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    paddingBottom: 4,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderTopWidth: 1.2,
    borderBottomWidth: 1.2,
    borderColor: '#cbd5e1',
    paddingVertical: 6,
    paddingHorizontal: 6,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  tableDataRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 6,
    fontSize: 9.5,
    color: '#1e293b',
  },
  tableTotalRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderTopWidth: 1.2,
    borderBottomWidth: 1.2,
    borderColor: '#cbd5e1',
    paddingVertical: 6,
    paddingHorizontal: 6,
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },

  // Columns for Salary & Wages
  colWagesDesc: { flex: 2.2 },
  colWagesHours: { width: 75, textAlign: 'right' },
  colWagesRate: { width: 85, textAlign: 'right' },
  colWagesAmount: { width: 95, textAlign: 'right' },

  // Columns for Tax
  colTaxDesc: { flex: 3 },
  colTaxAmount: { width: 95, textAlign: 'right' },

  // Columns for Payment Details
  colPayAccount: { flex: 2 },
  colPayRef: { flex: 1.5, textAlign: 'left' },
  colPayAmount: { width: 95, textAlign: 'right' },
})

interface EdLinkPayslipPDFTemplateProps {
  payslip: EdlinkPayslip
}

export default function EdLinkPayslipPDFTemplate({ payslip }: EdLinkPayslipPDFTemplateProps) {
  const formatHours = (val: any) => {
    if (val === undefined || val === null || val === '') return '0'
    return String(val)
  }
  const formatRate = (val: number) => `$${(Number(val) || 0).toFixed(4)}`

  return (
    <Document title={`Payslip-${payslip.employee_name || 'EdLink-Employee'}`}>
      <Page size="A4" style={styles.page}>
        {/* 1. Header: EdLink Logo & Paid By */}
        <View style={styles.headerGrid}>
          <View style={styles.logoContainer}>
            <Image src={EDLINK_LOGO_BASE64} style={styles.logoImage} />
          </View>
          <View style={styles.paidByBox}>
            <Text style={styles.paidByTitle}>PAID BY</Text>
            <Text style={styles.paidByText}>{payslip.paid_by_name || 'EdLink Australia PTY Ltd'}</Text>
            <Text style={styles.paidByText}>{payslip.paid_by_address_1 || 'Suite 3, Level 4'}</Text>
            <Text style={styles.paidByText}>{payslip.paid_by_address_2 || '20 Collins Street, Melbourne VIC 3000'}</Text>
            <Text style={styles.paidByText}>ABN {payslip.paid_by_abn || '62 658 488 469'}</Text>
          </View>
        </View>

        {/* 2. Middle Section: Employee Address & Employment Details */}
        <View style={styles.middleGrid}>
          <View style={styles.employeeBox}>
            <Text style={styles.employeeName}>{payslip.employee_name || 'Muhammad Usman'}</Text>
            {payslip.address_line_1 ? (
              <Text style={styles.employeeAddress}>{payslip.address_line_1}</Text>
            ) : null}
            {payslip.address_line_2 ? (
              <Text style={styles.employeeAddress}>{payslip.address_line_2}</Text>
            ) : null}
          </View>

          <View style={styles.employmentBox}>
            <Text style={styles.employmentTitle}>EMPLOYMENT DETAILS</Text>
            <Text style={styles.employmentRow}>
              Pay Frequency: {payslip.pay_frequency || 'Fortnightly'}
            </Text>
            {payslip.show_annual_salary !== false && Number(payslip.annual_salary || 0) > 0 ? (
              <Text style={styles.employmentRow}>
                Annual Salary: {formatCurrency(payslip.annual_salary || 0)}
              </Text>
            ) : null}
            <Text style={styles.employmentRow}>
              Employment Basis: {payslip.employment_basis || 'Full-time employment'}
            </Text>
          </View>
        </View>

        {/* 3. Summary Ribbon: Natural spacing without overlap */}
        <View style={styles.summaryBar}>
          <Text style={styles.summaryText}>
            <Text style={styles.summaryBold}>Pay Period: </Text>
            {payslip.pay_period_start} - {payslip.pay_period_end}
          </Text>

          <Text style={styles.summaryText}>
            <Text style={styles.summaryBold}>Payment Date: </Text>
            {payslip.payment_date}
          </Text>

          <Text style={styles.summaryText}>
            <Text style={styles.summaryBold}>Total Earnings: </Text>
            {formatCurrency(payslip.total_earnings || 0)}
          </Text>

          <Text style={styles.summaryText}>
            <Text style={styles.summaryBold}>Net Pay: </Text>
            {formatCurrency(payslip.net_pay || 0)}
          </Text>
        </View>

        {/* 4. SALARY & WAGES Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.thisPayHeader}>THIS PAY</Text>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.colWagesDesc}>SALARY & WAGES</Text>
            <Text style={styles.colWagesHours} />
            <Text style={styles.colWagesRate}>RATE</Text>
            <Text style={styles.colWagesAmount} />
          </View>

          <View style={styles.tableDataRow}>
            <Text style={styles.colWagesDesc}>{payslip.wages_description || 'Ordinary Hours'}</Text>
            <Text style={styles.colWagesHours}>{formatHours(payslip.ordinary_hours)}</Text>
            <Text style={styles.colWagesRate}>{formatRate(payslip.hourly_rate)}</Text>
            <Text style={styles.colWagesAmount}>{formatCurrency(payslip.wages_amount)}</Text>
          </View>

          <View style={styles.tableTotalRow}>
            <Text style={{ flex: 1 }}>TOTAL</Text>
            <Text style={styles.colWagesAmount}>{formatCurrency(payslip.wages_total)}</Text>
          </View>
        </View>

        {/* 5. TAX Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.colTaxDesc}>TAX</Text>
            <Text style={styles.colTaxAmount} />
          </View>

          <View style={styles.tableDataRow}>
            <Text style={styles.colTaxDesc}>{payslip.tax_description || 'PAYG'}</Text>
            <Text style={styles.colTaxAmount}>{formatCurrency(payslip.tax_amount)}</Text>
          </View>

          <View style={styles.tableTotalRow}>
            <Text style={{ flex: 1 }}>TOTAL</Text>
            <Text style={styles.colTaxAmount}>{formatCurrency(payslip.tax_total)}</Text>
          </View>
        </View>

        {/* 6. PAYMENT DETAILS Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.colPayAccount}>PAYMENT DETAILS</Text>
            <Text style={styles.colPayRef}>REFERENCE</Text>
            <Text style={styles.colPayAmount}>AMOUNT</Text>
          </View>

          <View style={styles.tableDataRow}>
            <Text style={styles.colPayAccount}>
              {payslip.bank_account_masked} {payslip.account_name ? `  ${payslip.account_name}` : ''}
            </Text>
            <Text style={styles.colPayRef}>{payslip.payment_reference || 'EdLink Pay'}</Text>
            <Text style={styles.colPayAmount}>{formatCurrency(payslip.payment_amount)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
