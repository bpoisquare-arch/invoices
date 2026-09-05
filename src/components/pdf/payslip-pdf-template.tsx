import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
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
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 38,
    fontSize: 9.5,
    fontFamily: 'Geist',
    color: '#1e293b',
    backgroundColor: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Geist',
    fontWeight: 'bold',
    color: '#007A78',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  metaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  metaCol: {
    width: '48%',
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 6,
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
    fontSize: 12,
    fontFamily: 'Geist',
    fontWeight: 'bold',
    color: '#007A78',
    textTransform: 'uppercase',
    marginBottom: 5,
    marginTop: 10,
    letterSpacing: 0.5,
  },
  table: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableRowEven: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#efefef',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableRowOdd: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableRowHighlight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#e5e5e5',
    paddingVertical: 8,
    paddingHorizontal: 14,
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
    marginTop: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
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
    fontSize: 8.5,
    fontFamily: 'Geist',
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 1.5,
    marginTop: 14,
  },
})

interface PayslipData {
  totalWorkingDays: number // Monthly Total Days
  presentDays?: number
  alDays: number
  clDays: number
  slDays: number
  wfhDays: number
  unpaidDays: number
  totalPaidDays: number
  basicPay: number
  perDaySalary: number
  commission: number
  adjustments: number
  totalEarnings: number
  unpaidDeduction: number
  totalDeduction: number
  netPay: number
  amountInWords: string
}

interface PayslipPDFTemplateProps {
  employee: Employee
  payslipData: PayslipData
  payPeriod: string
}

export default function PayslipPDFTemplate({
  employee,
  payslipData,
  payPeriod,
}: PayslipPDFTemplateProps) {
  const safeEmpName = (employee.name || employee.employee_id || 'Staff')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')

  return (
    <Document title={`Payslip_${safeEmpName}`}>
      <Page size="A4" style={styles.page}>
        {/* Title */}
        <Text style={styles.headerTitle}>EMPLOYEE PAYSLIP</Text>

        {/* Top Info Grid */}
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

        {/* 1. ATTENDANCE */}
        <Text style={styles.sectionTitle}>ATTENDANCE</Text>
        <View style={styles.table}>
          <View style={styles.tableRowEven}>
            <Text style={styles.rowLabel}>Monthly Total Days</Text>
            <Text style={styles.rowValue}>{payslipData.totalWorkingDays}</Text>
          </View>
          <View style={styles.tableRowOdd}>
            <Text style={styles.rowLabel}>Present Days</Text>
            <Text style={styles.rowValue}>{payslipData.presentDays ?? 0}</Text>
          </View>
          <View style={styles.tableRowEven}>
            <Text style={styles.rowLabel}>A/L Days</Text>
            <Text style={styles.rowValue}>{payslipData.alDays}</Text>
          </View>
          <View style={styles.tableRowOdd}>
            <Text style={styles.rowLabel}>C/L Days</Text>
            <Text style={styles.rowValue}>{payslipData.clDays}</Text>
          </View>
          <View style={styles.tableRowEven}>
            <Text style={styles.rowLabel}>S/L Days</Text>
            <Text style={styles.rowValue}>{payslipData.slDays}</Text>
          </View>
          <View style={styles.tableRowOdd}>
            <Text style={styles.rowLabel}>WFH/L Days</Text>
            <Text style={styles.rowValue}>{payslipData.wfhDays}</Text>
          </View>
          <View style={styles.tableRowEven}>
            <Text style={styles.rowLabel}>Unpaid Days</Text>
            <Text style={styles.rowValue}>{payslipData.unpaidDays}</Text>
          </View>
          <View style={styles.tableRowHighlight}>
            <Text style={styles.rowLabelBold}>Total Paid Days</Text>
            <Text style={styles.rowValueBold}>{payslipData.totalPaidDays}</Text>
          </View>
        </View>

        {/* 2. EARNINGS */}
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
          <View style={styles.tableRowOdd}>
            <Text style={styles.rowLabelBold}>Total Earnings</Text>
            <Text style={styles.rowValueBold}>
              PKR {Math.round(payslipData.totalEarnings).toLocaleString('en-US')}
            </Text>
          </View>
        </View>

        {/* 3. DEDUCTIONS */}
        <Text style={styles.sectionTitle}>DEDUCTIONS</Text>
        <View style={styles.table}>
          <View style={styles.tableRowEven}>
            <Text style={styles.rowLabel}>Unpaid Days</Text>
            <Text style={styles.rowValue}>
              {payslipData.unpaidDays > 0
                ? `${payslipData.unpaidDays} * PKR ${Math.round(payslipData.perDaySalary).toLocaleString('en-US')}`
                : 'PKR 0'}
            </Text>
          </View>
          <View style={styles.tableRowOdd}>
            <Text style={styles.rowLabelBold}>Total Deduction</Text>
            <Text style={styles.rowValueBold}>
              PKR {Math.round(payslipData.totalDeduction).toLocaleString('en-US')}
            </Text>
          </View>
          <View style={styles.tableRowHighlight}>
            <Text style={styles.rowLabelBold}>Net Pay</Text>
            <Text style={styles.rowValueBold}>
              PKR {Math.round(payslipData.netPay).toLocaleString('en-US')}
            </Text>
          </View>
        </View>

        {/* 4. Footer */}
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
