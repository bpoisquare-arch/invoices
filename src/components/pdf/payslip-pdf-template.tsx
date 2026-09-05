import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { Employee } from '@/lib/supabase/database.types'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#007A78',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  metaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  metaCol: {
    width: '48%',
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  metaLabel: {
    width: 95,
    fontFamily: 'Helvetica-Bold',
    color: '#003D5C',
    fontSize: 9,
  },
  metaColon: {
    width: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#003D5C',
    fontSize: 9,
  },
  metaValue: {
    flex: 1,
    color: '#0f172a',
    fontSize: 9,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#007A78',
    textTransform: 'uppercase',
    marginBottom: 4,
    marginTop: 10,
    letterSpacing: 0.5,
  },
  table: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 2,
    marginBottom: 10,
  },
  tableRowEven: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#efefef',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableRowOdd: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableRowHighlight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#e5e5e5',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  rowLabel: {
    fontSize: 8.5,
    color: '#1e293b',
  },
  rowLabelBold: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  rowValue: {
    fontSize: 8.5,
    color: '#1e293b',
  },
  rowValueBold: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  amountInWordsRow: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 16,
  },
  amountInWordsLabel: {
    width: 110,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
    color: '#0f172a',
  },
  amountInWordsValue: {
    flex: 1,
    fontSize: 8.5,
    color: '#334155',
  },
  disclaimer: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
    textAlign: 'center',
    lineHeight: 1.4,
    marginTop: 8,
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
  return (
    <Document title={`Payslip_${employee.employee_id || 'Staff'}_${employee.name || ''}`}>
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
            <Text style={styles.rowValue}>{payslipData.totalWorkingDays.toFixed(2)}</Text>
          </View>
          <View style={styles.tableRowOdd}>
            <Text style={styles.rowLabel}>Present Days</Text>
            <Text style={styles.rowValue}>{payslipData.presentDays ?? '--'}</Text>
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
            <Text style={styles.rowValueBold}>{payslipData.totalPaidDays.toFixed(2)}</Text>
          </View>
        </View>

        {/* 2. EARNINGS */}
        <Text style={styles.sectionTitle}>EARNINGS</Text>
        <View style={styles.table}>
          <View style={styles.tableRowEven}>
            <Text style={styles.rowLabel}>Basic Pay</Text>
            <Text style={styles.rowValue}>
              PKR {payslipData.basicPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={styles.tableRowOdd}>
            <Text style={styles.rowLabel}>Commission</Text>
            <Text style={styles.rowValue}>
              PKR {payslipData.commission.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={styles.tableRowEven}>
            <Text style={styles.rowLabel}>Adjustments</Text>
            <Text style={styles.rowValue}>
              PKR {payslipData.adjustments.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={styles.tableRowOdd}>
            <Text style={styles.rowLabelBold}>Total Earnings</Text>
            <Text style={styles.rowValueBold}>
              PKR {payslipData.totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        {/* 3. DEDUCTIONS */}
        <Text style={styles.sectionTitle}>DEDUCTIONS</Text>
        <View style={styles.table}>
          <View style={styles.tableRowEven}>
            <Text style={styles.rowLabel}>Unpaid Days</Text>
            <Text style={styles.rowValue}>
              PKR {payslipData.unpaidDeduction.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={styles.tableRowOdd}>
            <Text style={styles.rowLabelBold}>Total Deduction</Text>
            <Text style={styles.rowValueBold}>
              PKR {payslipData.totalDeduction.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={styles.tableRowHighlight}>
            <Text style={styles.rowLabelBold}>Net Pay</Text>
            <Text style={styles.rowValueBold}>
              PKR {payslipData.netPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
