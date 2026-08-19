import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { InvoiceWithDetails, TemplateSnapshot } from '@/lib/supabase/database.types'

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  companyName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  companyDetails: {
    fontSize: 8.5,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 1.3,
  },
  invoiceTitle: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#2563eb',
    textAlign: 'right',
  },
  metaText: {
    fontSize: 8.5,
    color: '#475569',
    textAlign: 'right',
    marginTop: 2,
  },
  billToBox: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    marginBottom: 20,
  },
  billToTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  refText: {
    fontSize: 8.5,
    color: '#64748b',
    marginTop: 2,
  },
  table: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    marginBottom: 20,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
  },
  colDescHeader: { width: '55%', fontFamily: 'Helvetica-Bold', fontSize: 8.5, color: '#334155' },
  colQtyHeader: { width: '15%', textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 8.5, color: '#334155' },
  colPriceHeader: { width: '15%', textAlign: 'right', fontFamily: 'Helvetica-Bold', fontSize: 8.5, color: '#334155' },
  colTotalHeader: { width: '15%', textAlign: 'right', fontFamily: 'Helvetica-Bold', fontSize: 8.5, color: '#334155' },

  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  colDesc: { width: '55%', fontSize: 9, color: '#0f172a' },
  colQty: { width: '15%', textAlign: 'center', fontSize: 9, color: '#475569' },
  colPrice: { width: '15%', textAlign: 'right', fontSize: 9, color: '#475569' },
  colTotal: { width: '15%', textAlign: 'right', fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#0f172a' },

  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  leftFooter: {
    width: '60%',
    fontSize: 8.5,
    color: '#475569',
  },
  totalBox: {
    width: '35%',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  totalValue: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginTop: 2,
  },
})

interface DefaultPDFTemplateProps {
  invoice: Partial<InvoiceWithDetails>
  snapshot?: TemplateSnapshot
}

export default function DefaultPDFTemplate({ invoice, snapshot }: DefaultPDFTemplateProps) {
  const companyName = snapshot?.company_name || invoice.companies?.name || 'Company Name'
  const address = snapshot?.address || invoice.templates?.address || ''
  const email = snapshot?.email || invoice.templates?.email || ''
  const phone = snapshot?.phone || invoice.templates?.phone || ''
  const currency = snapshot?.currency || invoice.companies?.currency || 'USD'
  const footerTerms = snapshot?.footer_terms || invoice.templates?.footer_terms || 'Thank you for your business.'
  const paymentDetails = snapshot?.payment_details || invoice.templates?.payment_details || ''

  const items = invoice.invoice_items || []
  const totalAmount = invoice.total_amount || invoice.subtotal || 0

  return (
    <Document title={`Invoice-${invoice.invoice_number || 'INV-000001'}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.companyName}>{companyName}</Text>
            {address ? <Text style={styles.companyDetails}>{address}</Text> : null}
            {email ? <Text style={styles.companyDetails}>Email: {email}</Text> : null}
            {phone ? <Text style={styles.companyDetails}>Phone: {phone}</Text> : null}
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.metaText}># {invoice.invoice_number || 'INV-000001'}</Text>
            <Text style={styles.metaText}>Date: {invoice.invoice_date || 'N/A'}</Text>
            <Text style={styles.metaText}>Due Date: {invoice.due_date || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.billToBox}>
          <Text style={styles.billToTitle}>Bill To</Text>
          <Text style={styles.customerName}>{invoice.customer_name || '[Customer Name]'}</Text>
          {invoice.reference_name ? <Text style={styles.refText}>Ref: {invoice.reference_name}</Text> : null}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.colDescHeader}>DESCRIPTION</Text>
            <Text style={styles.colQtyHeader}>QTY</Text>
            <Text style={styles.colPriceHeader}>PRICE</Text>
            <Text style={styles.colTotalHeader}>TOTAL</Text>
          </View>

          {items.map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={styles.colDesc}>{item.description}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>{Number(item.amount).toFixed(2)}</Text>
              <Text style={styles.colTotal}>
                {Number(item.line_total || item.amount * item.quantity).toFixed(2)} {currency}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.footerRow}>
          <View style={styles.leftFooter}>
            {paymentDetails ? (
              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 2 }}>Payment Details:</Text>
                <Text>{paymentDetails}</Text>
              </View>
            ) : null}
            <Text style={{ fontStyle: 'italic', color: '#64748b' }}>{footerTerms}</Text>
          </View>

          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>TOTAL AMOUNT</Text>
            <Text style={styles.totalValue}>
              {Number(totalAmount).toFixed(2)} {currency}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
