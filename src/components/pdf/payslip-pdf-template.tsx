import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer'
import { Employee } from '@/lib/supabase/database.types'

// Register Geist Font Family
Font.register({
  family: 'Geist',
  fonts: [
    {
      src:
        typeof window !== 'undefined'
          ? `${window.location.origin}/fonts/Geist-Regular.ttf`
          : 'https://cdn.jsdelivr.net/npm/geist@1.3.1/dist/fonts/geist-sans/Geist-Regular.ttf',
      fontWeight: 'normal',
    },
    {
      src:
        typeof window !== 'undefined'
          ? `${window.location.origin}/fonts/Geist-Bold.ttf`
          : 'https://cdn.jsdelivr.net/npm/geist@1.3.1/dist/fonts/geist-sans/Geist-Bold.ttf',
      fontWeight: 'bold',
    },
  ],
})

const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 36,
    fontSize: 9.5,
    fontFamily: 'Geist',
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  headerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logo: {
    width: 170,
    height: 48,
    objectFit: 'contain',
    alignSelf: 'center',
    marginBottom: 3,
  },
  companyInfoContainer: {
    alignItems: 'center',
    marginBottom: 6,
  },
  companyInfoRow: {
    fontSize: 8.5,
    fontFamily: 'Geist',
    color: '#334155',
    textAlign: 'center',
    lineHeight: 1.35,
  },
  companyInfoBold: {
    fontFamily: 'Geist',
    fontWeight: 'bold',
    color: '#0f172a',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Geist',
    fontWeight: 'bold',
    color: '#007A78',
    textAlign: 'center',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  metaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
  },
  metaCol: {
    width: '48%',
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  metaLabel: {
    width: 95,
    fontFamily: 'Geist',
    fontWeight: 'bold',
    color: '#003D5C',
    fontSize: 9.5,
  },
  metaColon: {
    width: 10,
    fontFamily: 'Geist',
    fontWeight: 'bold',
    color: '#003D5C',
    fontSize: 9.5,
  },
  metaValue: {
    flex: 1,
    color: '#0f172a',
    fontSize: 9.5,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Geist',
    fontWeight: 'bold',
    color: '#007A78',
    textTransform: 'uppercase',
    marginBottom: 3,
    marginTop: 8,
    letterSpacing: 0.5,
  },
  table: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 3,
    overflow: 'hidden',
  },
  tableRowEven: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#efefef',
    paddingVertical: 4.8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableRowOdd: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingVertical: 4.8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableRowHighlight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#e5e5e5',
    paddingVertical: 5.5,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  rowLabel: {
    fontSize: 9.5,
    color: '#1e293b',
  },
  rowLabelBold: {
    fontSize: 9.5,
    fontFamily: 'Geist',
    fontWeight: 'bold',
    color: '#0f172a',
  },
  rowValue: {
    fontSize: 9.5,
    color: '#1e293b',
  },
  rowValueBold: {
    fontSize: 9.5,
    fontFamily: 'Geist',
    fontWeight: 'bold',
    color: '#0f172a',
  },
  amountInWordsRow: {
    flexDirection: 'row',
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 3,
  },
  amountInWordsLabel: {
    width: 110,
    fontFamily: 'Geist',
    fontWeight: 'bold',
    fontSize: 9.5,
    color: '#0f172a',
  },
  amountInWordsValue: {
    flex: 1,
    fontSize: 9.5,
    color: '#334155',
  },
  disclaimer: {
    fontSize: 8,
    fontFamily: 'Geist',
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 1.3,
    marginTop: 8,
  },
})

export interface PayslipData {
  totalWorkingDays: number // Monthly Total Days
  presentDays?: number
  alDays: number
  clDays: number
  slDays: number
  wfhDays: number
  probationDays?: number
  unpaidDays: number
  totalPaidDays: number
  basicPay: number
  perDaySalary: number
  commission: number
  adjustments: number
  totalEarnings: number
  unpaidDeduction: number
  othersDeduction?: number
  othersDeductionNote?: string
  totalDeduction: number
  netPay: number
  amountInWords: string
  isInProbation?: boolean
}

interface PayslipPDFTemplateProps {
  employee: Employee
  payslipData: PayslipData
  payPeriod: string
  logoUrl?: string
}

export default function PayslipPDFTemplate({
  employee,
  payslipData,
  payPeriod,
  logoUrl,
}: PayslipPDFTemplateProps) {
  const safeEmpName = (employee.name || employee.employee_id || 'Staff')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')

  const resolvedLogo =
    logoUrl ||
    (typeof window !== 'undefined'
      ? `${window.location.origin}/edlink-logo.png`
      : '/edlink-logo.png')

  return (
    <Document title={`Payslip_${safeEmpName}`}>
      <Page size="A4" style={styles.page}>
        {/* 1. Header with Logo, Address & Title (Centered) */}
        <View style={styles.headerContainer}>
          <Image src={resolvedLogo} style={styles.logo} />
          <View style={styles.companyInfoContainer}>
            <Text style={styles.companyInfoRow}>
              <Text style={styles.companyInfoBold}>Add: </Text>
              38A 1st Floor DHA Phase 3 XX Block , Lahore, Pakistan, 54000
            </Text>
            <Text style={styles.companyInfoRow}>
              <Text style={styles.companyInfoBold}>Ph: </Text>
              0311 1100696
              <Text style={{ color: '#94a3b8' }}>   |   </Text>
              <Text style={styles.companyInfoBold}>Email: </Text>
              connect@edlinkservices.info
            </Text>
          </View>
          <Text style={styles.headerTitle}>EMPLOYEE PAYSLIP</Text>
        </View>

        {/* 2. Top Info Grid */}
        <View style={styles.metaGrid}>
          <View style={styles.metaCol}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Pay Period</Text>
              <Text style={styles.metaColon}>:</Text>
              <Text style={styles.metaValue}>{payPeriod}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Employee Name</Text>
              <Text style={styles.metaColon}>:</Text>
              <Text style={styles.metaValue}>{employee.name || 'Staff'}</Text>
            </View>
          </View>

          <View style={styles.metaCol}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Employee ID</Text>
              <Text style={styles.metaColon}>:</Text>
              <Text style={styles.metaValue}>{employee.employee_id || 'N/A'}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Designation</Text>
              <Text style={styles.metaColon}>:</Text>
              <Text style={styles.metaValue}>{employee.designation || 'Employee'}</Text>
            </View>
          </View>
        </View>

        {/* 3. ATTENDANCE Section */}
        <Text style={styles.sectionTitle}>ATTENDANCE</Text>
        <View style={styles.table}>
          <View style={styles.tableRowEven}>
            <Text style={styles.rowLabel}>Total Working Days</Text>
            <Text style={styles.rowValue}>{payslipData.totalWorkingDays.toFixed(2)}</Text>
          </View>
          {payslipData.isInProbation ? (
            <>
              <View style={styles.tableRowOdd}>
                <Text style={styles.rowLabel}>Probation Leaves</Text>
                <Text style={styles.rowValue}>{payslipData.probationDays ?? 0}</Text>
              </View>
              <View style={styles.tableRowEven}>
                <Text style={styles.rowLabel}>WFH/L Days</Text>
                <Text style={styles.rowValue}>{payslipData.wfhDays}</Text>
              </View>
              <View style={styles.tableRowOdd}>
                <Text style={styles.rowLabel}>Unpaid Days</Text>
                <Text style={styles.rowValue}>{payslipData.unpaidDays}</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.tableRowOdd}>
                <Text style={styles.rowLabel}>A/L Days</Text>
                <Text style={styles.rowValue}>{payslipData.alDays}</Text>
              </View>
              <View style={styles.tableRowEven}>
                <Text style={styles.rowLabel}>C/L Days</Text>
                <Text style={styles.rowValue}>{payslipData.clDays}</Text>
              </View>
              <View style={styles.tableRowOdd}>
                <Text style={styles.rowLabel}>S/L Days</Text>
                <Text style={styles.rowValue}>{payslipData.slDays}</Text>
              </View>
              <View style={styles.tableRowEven}>
                <Text style={styles.rowLabel}>WFH/L Days</Text>
                <Text style={styles.rowValue}>{payslipData.wfhDays}</Text>
              </View>
              <View style={styles.tableRowOdd}>
                <Text style={styles.rowLabel}>Unpaid Days</Text>
                <Text style={styles.rowValue}>{payslipData.unpaidDays}</Text>
              </View>
            </>
          )}
          <View style={styles.tableRowHighlight}>
            <Text style={styles.rowLabelBold}>Total Paid Days</Text>
            <Text style={styles.rowValueBold}>{payslipData.totalPaidDays.toFixed(2)}</Text>
          </View>
        </View>

        {/* 4. EARNINGS Section */}
        <Text style={styles.sectionTitle}>EARNINGS</Text>
        <View style={styles.table}>
          <View style={styles.tableRowEven}>
            <Text style={styles.rowLabel}>Basic Pay</Text>
            <Text style={styles.rowValue}>
              PKR {Math.round(payslipData.basicPay).toLocaleString('en-US')}
            </Text>
          </View>
          <View style={styles.tableRowOdd}>
            <Text style={styles.rowLabel}>Commission</Text>
            <Text style={styles.rowValue}>
              PKR {Math.round(payslipData.commission).toLocaleString('en-US')}
            </Text>
          </View>
          <View style={styles.tableRowEven}>
            <Text style={styles.rowLabel}>Adjustments</Text>
            <Text style={styles.rowValue}>
              PKR {Math.round(payslipData.adjustments).toLocaleString('en-US')}
            </Text>
          </View>
          <View style={styles.tableRowHighlight}>
            <Text style={styles.rowLabelBold}>Total Earnings</Text>
            <Text style={styles.rowValueBold}>
              PKR {Math.round(payslipData.totalEarnings).toLocaleString('en-US')}
            </Text>
          </View>
        </View>

        {/* 5. DEDUCTIONS Section */}
        <Text style={styles.sectionTitle}>DEDUCTIONS</Text>
        <View style={styles.table}>
          <View style={styles.tableRowEven}>
            <Text style={styles.rowLabel}>Unpaid Days</Text>
            <Text style={styles.rowValue}>
              PKR {Math.round(payslipData.unpaidDeduction).toLocaleString('en-US')}
            </Text>
          </View>
          <View style={styles.tableRowOdd}>
            <Text style={styles.rowLabel}>
              {payslipData.othersDeductionNote?.trim() || 'Others Deduction'}
            </Text>
            <Text style={styles.rowValue}>
              PKR {Math.round(payslipData.othersDeduction || 0).toLocaleString('en-US')}
            </Text>
          </View>
          <View style={styles.tableRowHighlight}>
            <Text style={styles.rowLabelBold}>Total Deduction</Text>
            <Text style={styles.rowValueBold}>
              PKR {Math.round(payslipData.totalDeduction).toLocaleString('en-US')}
            </Text>
          </View>
          <View style={styles.tableRowEven}>
            <Text style={styles.rowLabelBold}>Net Pay</Text>
            <Text style={styles.rowValueBold}>
              PKR {Math.round(payslipData.netPay).toLocaleString('en-US')}
            </Text>
          </View>
        </View>

        {/* 6. Footer (Amount in Words & Disclaimer Note) */}
        <View style={styles.amountInWordsRow}>
          <Text style={styles.amountInWordsLabel}>Amount in Words</Text>
          <Text style={styles.amountInWordsValue}>{payslipData.amountInWords}</Text>
        </View>

        <Text style={styles.disclaimer}>
          This document is system generated and does not require any signature or the Company's
          stamp in order to be considered valid
        </Text>
      </Page>
    </Document>
  )
}
