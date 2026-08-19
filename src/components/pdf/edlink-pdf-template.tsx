import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { InvoiceWithDetails, TemplateSnapshot } from '@/lib/supabase/database.types'

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  leftCompanyBox: {
    width: 250,
  },
  logoImage: {
    width: 175,
    height: 58,
    objectFit: 'contain',
    marginBottom: 10,
  },
  companyInfoText: {
    fontSize: 9.5,
    color: '#1e293b',
    marginBottom: 2.5,
    lineHeight: 1.35,
  },
  boldLabel: {
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  rightInvoiceBox: {
    alignItems: 'flex-end',
    width: 250,
  },
  invoiceTitle: {
    fontSize: 32,
    fontFamily: 'Helvetica-Bold',
    color: '#5C7C99',
    letterSpacing: 2,
    marginBottom: 14,
    textTransform: 'uppercase',
  },
  metaTable: {
    width: 250,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  metaHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#DCE6F1',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingVertical: 5.5,
  },
  metaHeaderCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    textTransform: 'uppercase',
  },
  metaDataRow: {
    flexDirection: 'row',
    paddingVertical: 6.5,
    backgroundColor: '#ffffff',
  },
  metaDataCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  billToSection: {
    marginTop: 14,
    marginBottom: 18,
    width: 260,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  billToHeader: {
    backgroundColor: '#DCE6F1',
    paddingVertical: 4.5,
    paddingHorizontal: 10,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    letterSpacing: 0.5,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    textTransform: 'uppercase',
  },
  billToBody: {
    padding: 10,
    backgroundColor: '#ffffff',
    minHeight: 44,
  },
  customerName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  refText: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2,
  },
  itemsTableContainer: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#DCE6F1',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
  },
  colDescHeader: {
    width: '76%',
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    textTransform: 'uppercase',
    paddingVertical: 6.5,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: '#cbd5e1',
  },
  colAmountHeader: {
    width: '24%',
    textAlign: 'right',
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    textTransform: 'uppercase',
    paddingVertical: 6.5,
    paddingHorizontal: 12,
  },
  tableBodyContainer: {
    flexDirection: 'row',
    minHeight: 270,
  },
  tableDescColumn: {
    width: '76%',
    borderRightWidth: 1,
    borderRightColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
  },
  tableAmountColumn: {
    width: '24%',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    alignItems: 'flex-end',
  },
  itemDescRow: {
    marginBottom: 8,
  },
  itemAmountRow: {
    marginBottom: 8,
  },
  itemDescText: {
    fontSize: 10.5,
    fontFamily: 'Helvetica',
    color: '#0f172a',
  },
  itemAmountText: {
    fontSize: 10.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textAlign: 'right',
  },
  itemQtySubtext: {
    fontSize: 8.5,
    color: '#64748b',
    marginTop: 2,
  },
  tableFooterRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  footerTermsCol: {
    width: '54%',
    fontSize: 10,
    color: '#0f172a',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  totalLabelCol: {
    width: '22%',
    textAlign: 'right',
    fontSize: 11.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textTransform: 'uppercase',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: '#cbd5e1',
  },
  totalValueCol: {
    width: '24%',
    textAlign: 'right',
    fontSize: 11.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  paymentSection: {
    marginTop: 26,
    paddingTop: 12,
  },
  paymentTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textDecoration: 'underline',
    color: '#0f172a',
    marginBottom: 5,
  },
  paymentText: {
    fontSize: 9.5,
    color: '#0f172a',
    lineHeight: 1.45,
  },
})

interface EdLinkPDFTemplateProps {
  invoice: Partial<InvoiceWithDetails>
  snapshot?: TemplateSnapshot
  resolvedLogoUrl?: string
}

export default function EdLinkPDFTemplate({ invoice, snapshot, resolvedLogoUrl }: EdLinkPDFTemplateProps) {
  const address = snapshot?.address || invoice.templates?.address || 'Suit 3, Level 4/20 Collins Street, Melbourne 3000'
  const email = snapshot?.email || invoice.templates?.email || 'finance@edlink.com.au'
  const phone = snapshot?.phone || invoice.templates?.phone || '+61 432 536 123'
  const currency = snapshot?.currency || invoice.companies?.currency || 'AUD'
  const footerTerms = snapshot?.footer_terms || invoice.templates?.footer_terms || 'Thank you for getting services from us'
  const paymentDetails = snapshot?.payment_details || invoice.templates?.payment_details || `Account Name: Riaz & Sons PTY Ltd\nBSB: 083-543\nAccount No: 72-996-1834\nABN: 62 658 488 469`

  const logoSrc = resolvedLogoUrl || snapshot?.logo_url || invoice.companies?.logo_url || '/edlink-logo.png'

  const items = invoice.invoice_items || []
  const totalAmount = invoice.total_amount || invoice.subtotal || 0

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A'
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return dateStr
  }

  return (
    <Document title={`Invoice-${invoice.invoice_number || 'EDL-000001'}`}>
      <Page size="A4" style={styles.page}>
        {/* Header Row */}
        <View style={styles.headerRow}>
          {/* Company Info Left */}
          <View style={styles.leftCompanyBox}>
            {logoSrc ? (
              <Image src={logoSrc} style={styles.logoImage} />
            ) : null}
            <Text style={styles.companyInfoText}>
              <Text style={styles.boldLabel}>Add: </Text>{address}
            </Text>
            <Text style={styles.companyInfoText}>
              <Text style={styles.boldLabel}>Email: </Text>{email}
            </Text>
            <Text style={styles.companyInfoText}>
              <Text style={styles.boldLabel}>Phone: </Text>{phone}
            </Text>
          </View>

          {/* Right Header Invoice Metadata */}
          <View style={styles.rightInvoiceBox}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <View style={styles.metaTable}>
              <View style={styles.metaHeaderRow}>
                <Text style={styles.metaHeaderCell}>INVOICE #</Text>
                <Text style={styles.metaHeaderCell}>DATE</Text>
                <Text style={styles.metaHeaderCell}>DUE DATE</Text>
              </View>
              <View style={styles.metaDataRow}>
                <Text style={styles.metaDataCell}>{invoice.invoice_number || '00327'}</Text>
                <Text style={styles.metaDataCell}>{formatDate(invoice.invoice_date)}</Text>
                <Text style={styles.metaDataCell}>{formatDate(invoice.due_date)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Bill To Section */}
        <View style={styles.billToSection}>
          <View style={styles.billToHeader}>
            <Text>BILL TO</Text>
          </View>
          <View style={styles.billToBody}>
            <Text style={styles.customerName}>{invoice.customer_name || '[Customer Name]'}</Text>
            {invoice.reference_name ? (
              <Text style={styles.refText}>Ref: {invoice.reference_name}</Text>
            ) : null}
          </View>
        </View>

        {/* Items Table Container */}
        <View style={styles.itemsTableContainer}>
          {/* Table Header */}
          <View style={styles.tableHeaderRow}>
            <Text style={styles.colDescHeader}>DESCRIPTION</Text>
            <Text style={styles.colAmountHeader}>AMOUNT</Text>
          </View>

          {/* Tall Table Body with Vertical Divider */}
          <View style={styles.tableBodyContainer}>
            <View style={styles.tableDescColumn}>
              {items.length > 0 ? (
                items.map((item, idx) => (
                  <View key={idx} style={styles.itemDescRow}>
                    <Text style={styles.itemDescText}>{item.description || 'Service Description'}</Text>
                    {item.quantity > 1 ? (
                      <Text style={styles.itemQtySubtext}>
                        Qty: {item.quantity} × {item.amount} {currency}
                      </Text>
                    ) : null}
                  </View>
                ))
              ) : (
                <Text style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: 10 }}>No items added</Text>
              )}
            </View>

            <View style={styles.tableAmountColumn}>
              {items.length > 0 ? (
                items.map((item, idx) => (
                  <View key={idx} style={styles.itemAmountRow}>
                    <Text style={styles.itemAmountText}>
                      {Number(item.line_total || item.amount * item.quantity).toFixed(2)} {currency}
                    </Text>
                    {item.quantity > 1 ? (
                      <Text style={[styles.itemQtySubtext, { opacity: 0 }]}>Qty</Text>
                    ) : null}
                  </View>
                ))
              ) : (
                <Text style={{ color: '#94a3b8', fontSize: 10 }}>0.00 {currency}</Text>
              )}
            </View>
          </View>

          {/* Table Footer Total */}
          <View style={styles.tableFooterRow}>
            <Text style={styles.footerTermsCol}>{footerTerms}</Text>
            <Text style={styles.totalLabelCol}>TOTAL DUE</Text>
            <Text style={styles.totalValueCol}>
              {Number(totalAmount).toFixed(2)} {currency}
            </Text>
          </View>
        </View>

        {/* Payment Details */}
        <View style={styles.paymentSection}>
          <Text style={styles.paymentTitle}>Payment Details</Text>
          <Text style={styles.paymentText}>{paymentDetails}</Text>
        </View>
      </Page>
    </Document>
  )
}
