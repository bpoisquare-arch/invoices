import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import {
  LahoriLoungePayslip,
  formatCurrency,
  DEFAULT_LAHORI_LOUNGE_PAID_BY,
} from '@/lib/services/lahori-lounge-payslip.service'
import { LAHORI_LOUNGE_LOGO_BASE64 } from '@/lib/constants/lahori-lounge-assets'

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 38,
    fontSize: 9.5,
    fontFamily: 'Helvetica',
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  // Header
  headerGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  logoContainer: {
    width: 140,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  logoImage: {
    width: 130,
    height: 100,
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
    marginBottom: 22,
    marginTop: 4,
  },
  employeeBox: {
    width: 260,
    paddingTop: 4,
  },
  employeeName: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  employeeAddress: {
    fontSize: 9.5,
    lineHeight: 1.45,
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

  // Summary Ribbon
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f1f5f9',
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: '#cbd5e1',
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 8.6,
    color: '#0f172a',
  },
  summaryBold: {
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },

  // Section Table
  sectionContainer: {
    marginBottom: 16,
  },
  payHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  payHeaderText: {
    width: 75,
    textAlign: 'right',
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderTopWidth: 1.2,
    borderBottomWidth: 1.2,
    borderColor: '#cbd5e1',
    paddingVertical: 5,
    paddingHorizontal: 6,
    fontSize: 8.8,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  tableDataRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 6,
    fontSize: 9,
    color: '#1e293b',
  },
  tableTotalRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderTopWidth: 1.2,
    borderBottomWidth: 1.2,
    borderColor: '#cbd5e1',
    paddingVertical: 5,
    paddingHorizontal: 6,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },

  // Columns for Salary & Wages
  colWagesDesc: { flex: 2.2 },
  colWagesHours: { width: 55, textAlign: 'right' },
  colWagesRate: { width: 65, textAlign: 'right' },
  colAmount: { width: 75, textAlign: 'right' },
  colYtd: { width: 75, textAlign: 'right' },

  // Columns for Tax / Super
  colWideDesc: { flex: 3 },

  // Columns for Payment Details
  colPayAccount: { flex: 2 },
  colPayRef: { flex: 1.5, textAlign: 'left' },
  colPayAmount: { width: 95, textAlign: 'right' },
})

interface LahoriLoungePayslipPDFTemplateProps {
  payslip: LahoriLoungePayslip
}

export default function LahoriLoungePayslipPDFTemplate({ payslip }: LahoriLoungePayslipPDFTemplateProps) {
  const formatHours = (val: any) => {
    if (val === undefined || val === null || val === '') return '0'
    return String(val)
  }
  const formatRate = (val: number) => `$${(Number(val) || 0).toFixed(4)}`

  const wagesYtd = payslip.wages_ytd ?? payslip.wages_total
  const taxYtd = payslip.tax_ytd ?? payslip.tax_total
  const superYtd = payslip.superannuation_ytd ?? payslip.superannuation_total ?? payslip.superannuation_amount ?? 0

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* 1. Header: Logo & Paid By */}
        <View style={styles.headerGrid}>
          <View style={styles.logoContainer}>
            <Image src={LAHORI_LOUNGE_LOGO_BASE64} style={styles.logoImage} />
          </View>
          <View style={styles.paidByBox}>
            <Text style={styles.paidByTitle}>PAID BY</Text>
            <Text style={styles.paidByText}>{payslip.paid_by_name || DEFAULT_LAHORI_LOUNGE_PAID_BY.paid_by_name}</Text>
            <Text style={styles.paidByText}>{payslip.paid_by_address_1 || DEFAULT_LAHORI_LOUNGE_PAID_BY.paid_by_address_1}</Text>
            <Text style={styles.paidByText}>{payslip.paid_by_address_2 || DEFAULT_LAHORI_LOUNGE_PAID_BY.paid_by_address_2}</Text>
            <Text style={styles.paidByText}>ABN {payslip.paid_by_abn || DEFAULT_LAHORI_LOUNGE_PAID_BY.paid_by_abn}</Text>
          </View>
        </View>

        {/* 2. Middle Section: Employee Address & Employment Details */}
        <View style={styles.middleGrid}>
          <View style={styles.employeeBox}>
            <Text style={styles.employeeName}>{payslip.employee_name || 'Ubaid Raza'}</Text>
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

        {/* 3. Summary Ribbon */}
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

        {/* 4. SALARY & WAGES Section (With THIS PAY & YTD Columns) */}
        <View style={styles.sectionContainer}>
          <View style={styles.payHeaderRow}>
            <Text style={styles.payHeaderText}>THIS PAY</Text>
            <Text style={styles.payHeaderText}>YTD</Text>
          </View>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.colWagesDesc}>SALARY & WAGES</Text>
            <Text style={styles.colWagesHours} />
            <Text style={styles.colWagesRate}>RATE</Text>
            <Text style={styles.colAmount} />
            <Text style={styles.colYtd} />
          </View>

          <View style={styles.tableDataRow}>
            <Text style={styles.colWagesDesc}>{payslip.wages_description || 'Ordinary Hours'}</Text>
            <Text style={styles.colWagesHours}>{formatHours(payslip.ordinary_hours)}</Text>
            <Text style={styles.colWagesRate}>{formatRate(payslip.hourly_rate)}</Text>
            <Text style={styles.colAmount}>{formatCurrency(payslip.wages_amount)}</Text>
            <Text style={styles.colYtd}>{formatCurrency(wagesYtd)}</Text>
          </View>

          <View style={styles.tableTotalRow}>
            <Text style={{ flex: 1 }}>TOTAL</Text>
            <Text style={styles.colAmount}>{formatCurrency(payslip.wages_total)}</Text>
            <Text style={styles.colYtd}>{formatCurrency(wagesYtd)}</Text>
          </View>
        </View>

        {/* 5. TAX Section (With THIS PAY & YTD Columns) */}
        <View style={styles.sectionContainer}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.colWideDesc}>TAX</Text>
            <Text style={styles.colAmount} />
            <Text style={styles.colYtd} />
          </View>

          <View style={styles.tableDataRow}>
            <Text style={styles.colWideDesc}>{payslip.tax_description || 'PAYG'}</Text>
            <Text style={styles.colAmount}>{formatCurrency(payslip.tax_amount)}</Text>
            <Text style={styles.colYtd}>{formatCurrency(taxYtd)}</Text>
          </View>

          <View style={styles.tableTotalRow}>
            <Text style={{ flex: 1 }}>TOTAL</Text>
            <Text style={styles.colAmount}>{formatCurrency(payslip.tax_total)}</Text>
            <Text style={styles.colYtd}>{formatCurrency(taxYtd)}</Text>
          </View>
        </View>

        {/* 5b. SUPERANNUATION Section (With THIS PAY & YTD Columns) */}
        {(payslip.include_superannuation || Number(payslip.superannuation_amount || 0) > 0) && (
          <View style={styles.sectionContainer}>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.colWideDesc}>SUPERANNUATION</Text>
              <Text style={styles.colAmount} />
              <Text style={styles.colYtd} />
            </View>

            <View style={styles.tableDataRow}>
              <Text style={styles.colWideDesc}>
                {payslip.superannuation_description || 'SGC - HOSTPLUS Superannuation Fund - Industry - 102860122'}
              </Text>
              <Text style={styles.colAmount}>
                {formatCurrency(payslip.superannuation_amount || 0)}
              </Text>
              <Text style={styles.colYtd}>
                {formatCurrency(superYtd)}
              </Text>
            </View>

            <View style={styles.tableTotalRow}>
              <Text style={{ flex: 1 }}>TOTAL</Text>
              <Text style={styles.colAmount}>
                {formatCurrency(payslip.superannuation_total ?? payslip.superannuation_amount ?? 0)}
              </Text>
              <Text style={styles.colYtd}>{formatCurrency(superYtd)}</Text>
            </View>
          </View>
        )}

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
            <Text style={styles.colPayRef}>{payslip.payment_reference || 'Lahori Lounge Pay'}</Text>
            <Text style={styles.colPayAmount}>{formatCurrency(payslip.payment_amount)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
