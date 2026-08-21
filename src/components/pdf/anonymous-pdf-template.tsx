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
    alignItems: 'flex-start',
  },
  logoImage: {
    maxHeight: 58,
    maxWidth: 200,
    objectFit: 'contain',
    objectPosition: 'left',
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  companyHeadingText: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 8,
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
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  colDescHeader: {
    width: '75%',
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    textTransform: 'uppercase',
  },
  colAmountHeader: {
    width: '25%',
    textAlign: 'right',
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    textTransform: 'uppercase',
  },
  tableBodyContainer: {
    flexDirection: 'row',
    minHeight: 220,
    backgroundColor: '#ffffff',
  },
  tableDescColumn: {
    width: '75%',
    borderRightWidth: 1,
    borderRightColor: '#cbd5e1',
    padding: 12,
  },
  tableAmountColumn: {
    width: '25%',
    padding: 12,
    alignItems: 'flex-end',
  },
  itemDescRow: {
    marginBottom: 8,
  },
  itemDescText: {
    fontSize: 10.5,
    fontFamily: 'Helvetica',
    color: '#0f172a',
    lineHeight: 1.3,
  },
  itemQtySubtext: {
    fontSize: 8.5,
    color: '#64748b',
    marginTop: 1.5,
  },
  itemAmountRow: {
    marginBottom: 8,
    alignItems: 'flex-end',
  },
  itemAmountText: {
    fontSize: 10.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textAlign: 'right',
    lineHeight: 1.3,
  },
  tableFooterRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  footerTermsCol: {
    width: '60%',
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#334155',
  },
  totalLabelCol: {
    width: '18%',
    textAlign: 'right',
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    borderRightWidth: 1,
    borderRightColor: '#cbd5e1',
    paddingRight: 8,
    textTransform: 'uppercase',
  },
  totalValueCol: {
    width: '22%',
    textAlign: 'right',
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    paddingLeft: 6,
  },
  paymentSection: {
    marginTop: 18,
    paddingTop: 8,
  },
  paymentHeader: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textDecoration: 'underline',
    marginBottom: 4,
  },
  paymentBody: {
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#334155',
    lineHeight: 1.45,
  },
})

interface AnonymousPDFTemplateProps {
  invoice: Partial<InvoiceWithDetails>
  snapshot?: TemplateSnapshot
  resolvedLogoUrl?: string
}

export default function AnonymousPDFTemplate({
  invoice,
  snapshot,
  resolvedLogoUrl,
}: AnonymousPDFTemplateProps) {
  const companyName = snapshot?.company_name || 'Company Name'
  const address = snapshot?.address || ''
  const email = snapshot?.email || ''
  const phone = snapshot?.phone || ''
  const currency = snapshot?.currency || 'AUD'
  const footerTerms = snapshot?.footer_terms || 'Thank you for getting services from us'
  const paymentDetails = snapshot?.payment_details || ''
  const headerMode = snapshot?.header_mode || (snapshot?.logo_url ? 'logo' : 'text')
  const logoSrc = resolvedLogoUrl || snapshot?.logo_url || null
  const billToLabel = snapshot?.bill_to_label || 'ISSUED TO'

  const items = invoice.invoice_items || []
  const totalAmount = invoice.total_amount || invoice.subtotal || 0

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return ''
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return dateStr
  }

  const hasDueDate = Boolean(invoice.due_date && invoice.due_date.trim())
  const hasContactInfo = Boolean(address || email || phone)
  const logoSize = Math.min(85, Math.max(40, Number(snapshot?.logo_size) || 58))

  return (
    <Document title={`Invoice-${invoice.invoice_number || '00001'}`}>
      <Page size="A4" style={styles.page}>
        {/* Header Row */}
        <View style={styles.headerRow}>
          {/* Company Info Left */}
          <View style={styles.leftCompanyBox}>
            {headerMode === 'logo' && logoSrc ? (
              <Image src={logoSrc} style={[styles.logoImage, { height: logoSize, maxHeight: logoSize }]} />
            ) : headerMode === 'text' && companyName ? (
              <Text style={styles.companyHeadingText}>{companyName}</Text>
            ) : null}
            {hasContactInfo && (
              <View>
                {address ? (
                  <Text style={styles.companyInfoText}>
                    <Text style={styles.boldLabel}>Add: </Text>
                    {address}
                  </Text>
                ) : null}
                {email ? (
                  <Text style={styles.companyInfoText}>
                    <Text style={styles.boldLabel}>Email: </Text>
                    {email}
                  </Text>
                ) : null}
                {phone ? (
                  <Text style={styles.companyInfoText}>
                    <Text style={styles.boldLabel}>Phone: </Text>
                    {phone}
                  </Text>
                ) : null}
              </View>
            )}
          </View>

          {/* Right Header Invoice Metadata */}
          <View style={styles.rightInvoiceBox}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <View style={styles.metaTable}>
              {hasDueDate ? (
                <>
                  <View style={styles.metaHeaderRow}>
                    <Text style={styles.metaHeaderCell}>INVOICE #</Text>
                    <Text style={styles.metaHeaderCell}>DATE</Text>
                    <Text style={styles.metaHeaderCell}>DUE DATE</Text>
                  </View>
                  <View style={styles.metaDataRow}>
                    <Text style={styles.metaDataCell}>{invoice.invoice_number || '00001'}</Text>
                    <Text style={styles.metaDataCell}>{formatDate(invoice.invoice_date)}</Text>
                    <Text style={styles.metaDataCell}>{formatDate(invoice.due_date)}</Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.metaHeaderRow}>
                    <Text style={styles.metaHeaderCell}>INVOICE #</Text>
                    <Text style={styles.metaHeaderCell}>DATE</Text>
                  </View>
                  <View style={styles.metaDataRow}>
                    <Text style={styles.metaDataCell}>{invoice.invoice_number || '00001'}</Text>
                    <Text style={styles.metaDataCell}>{formatDate(invoice.invoice_date)}</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Issued To Section */}
        <View style={styles.billToSection}>
          <View style={styles.billToHeader}>
            <Text>{billToLabel}</Text>
          </View>
          <View style={styles.billToBody}>
            <Text style={styles.customerName}>{invoice.customer_name || '[Client Name]'}</Text>
          </View>
        </View>

        {/* Items Table Container */}
        <View style={styles.itemsTableContainer}>
          {/* Table Header */}
          <View style={styles.tableHeaderRow}>
            <Text style={styles.colDescHeader}>DESCRIPTION</Text>
            <Text style={styles.colAmountHeader}>AMOUNT</Text>
          </View>

          {/* Table Body with Vertical Divider */}
          <View style={styles.tableBodyContainer}>
            <View style={styles.tableDescColumn}>
              {items.length > 0 ? (
                items.map((item, idx) => (
                  <View key={idx} style={styles.itemDescRow}>
                    <Text style={styles.itemDescText}>
                      {item.description || 'Service Description'}
                    </Text>
                    {item.quantity > 1 ? (
                      <Text style={styles.itemQtySubtext}>
                        Qty: {item.quantity} × {item.amount} {currency}
                      </Text>
                    ) : null}
                  </View>
                ))
              ) : (
                <Text style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: 10 }}>
                  No items added
                </Text>
              )}
            </View>

            <View style={styles.tableAmountColumn}>
              {items.length > 0 ? (
                items.map((item, idx) => (
                  <View key={idx} style={styles.itemAmountRow}>
                    <Text style={styles.itemAmountText}>
                      {Number(item.line_total || item.amount * item.quantity).toFixed(2)}{' '}
                      {currency}
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

        {/* Payment Details (Omitted if empty) */}
        {paymentDetails.trim() ? (
          <View style={styles.paymentSection}>
            <Text style={styles.paymentHeader}>Payment Details</Text>
            <Text style={styles.paymentBody}>{paymentDetails}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  )
}
