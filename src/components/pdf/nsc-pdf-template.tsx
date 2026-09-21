import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image, Svg, Polygon } from '@react-pdf/renderer'
import { InvoiceWithDetails, TemplateSnapshot } from '@/lib/supabase/database.types'
import { numberToWords } from '@/lib/utils/number-to-words'

const styles = StyleSheet.create({
  page: {
    paddingTop: 18,
    paddingBottom: 18,
    paddingHorizontal: 26,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#000000',
    backgroundColor: '#ffffff',
  },
  outerContainer: {
    borderWidth: 1.5,
    borderColor: '#000000',
    padding: 16,
  },
  topSection: {
    flexDirection: 'column',
  },
  bottomSection: {
    flexDirection: 'column',
  },
  headerBox: {
    borderWidth: 1.5,
    borderColor: '#000000',
    padding: 8,
    paddingRight: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    maxWidth: 290,
  },
  companyTitle: {
    fontSize: 17,
    fontFamily: 'Helvetica-Bold',
    color: '#000000',
    marginBottom: 3,
  },
  headerText: {
    fontSize: 8.5,
    color: '#000000',
    marginBottom: 2,
    lineHeight: 1.25,
  },
  headerBold: {
    fontFamily: 'Helvetica-Bold',
  },
  logoImage: {
    maxHeight: 75,
    maxWidth: 150,
    objectFit: 'contain',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  billToBox: {
    width: '52%',
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderBottomColor: '#000000',
  },
  tableRowLast: {
    flexDirection: 'row',
  },
  billToLabelCell: {
    width: '32%',
    borderRightWidth: 1.5,
    borderRightColor: '#000000',
    padding: 5,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
  },
  billToValueCell: {
    width: '68%',
    padding: 5,
    fontSize: 8.5,
  },
  metaRightBox: {
    width: '42%',
  },
  invoiceMetaTable: {
    borderWidth: 1.5,
    borderColor: '#000000',
    marginBottom: 8,
  },
  metaLabelCell: {
    width: '50%',
    borderRightWidth: 1.5,
    borderRightColor: '#000000',
    padding: 4.5,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
  },
  metaValueCell: {
    width: '50%',
    textAlign: 'center',
    padding: 4.5,
    fontSize: 8.5,
  },
  totalPaidBox: {
    borderWidth: 1.5,
    borderColor: '#000000',
    flexDirection: 'row',
  },
  totalPaidLabel: {
    width: '50%',
    borderRightWidth: 1.5,
    borderRightColor: '#000000',
    padding: 4.5,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
  },
  totalPaidValue: {
    width: '50%',
    textAlign: 'center',
    padding: 4.5,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
  },
  itemsTable: {
    borderWidth: 1.5,
    borderColor: '#000000',
    marginBottom: 14,
  },
  itemsHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderBottomColor: '#000000',
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
    textAlign: 'center',
  },
  colDescHeader: {
    width: '60%',
    borderRightWidth: 1.5,
    borderRightColor: '#000000',
    padding: 5,
    textAlign: 'center',
  },
  colQtyHeader: {
    width: '12%',
    borderRightWidth: 1.5,
    borderRightColor: '#000000',
    padding: 5,
    textAlign: 'center',
  },
  colRateHeader: {
    width: '14%',
    borderRightWidth: 1.5,
    borderRightColor: '#000000',
    padding: 5,
    textAlign: 'center',
  },
  colAmountHeader: {
    width: '14%',
    padding: 5,
    textAlign: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    minHeight: 28,
  },
  colDesc: {
    width: '60%',
    borderRightWidth: 1.5,
    borderRightColor: '#000000',
    padding: 5,
    fontSize: 8.5,
    lineHeight: 1.3,
  },
  colQty: {
    width: '12%',
    borderRightWidth: 1.5,
    borderRightColor: '#000000',
    padding: 5,
    textAlign: 'center',
    fontSize: 8.5,
  },
  colRate: {
    width: '14%',
    borderRightWidth: 1.5,
    borderRightColor: '#000000',
    padding: 5,
    textAlign: 'center',
    fontSize: 8.5,
  },
  colAmount: {
    width: '14%',
    padding: 5,
    textAlign: 'center',
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
  },
  summaryRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#000000',
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
  },
  summaryRowLast: {
    flexDirection: 'row',
    borderTopWidth: 1.5,
    borderTopColor: '#000000',
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
  },
  amountInWordsLabel: {
    width: '72%',
    borderRightWidth: 1.5,
    borderRightColor: '#000000',
    padding: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  summaryRightLabel: {
    width: '72%',
    borderRightWidth: 1.5,
    borderRightColor: '#000000',
    padding: 4,
    textAlign: 'right',
    paddingRight: 8,
    fontFamily: 'Helvetica-Bold',
  },
  summaryValue: {
    width: '28%',
    padding: 4,
    textAlign: 'center',
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
  },
  totalDueRow: {
    flexDirection: 'row',
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
  },
  totalDueLabel: {
    width: '72%',
    borderRightWidth: 1.5,
    borderRightColor: '#000000',
    padding: 5.5,
    textAlign: 'center',
  },
  totalDueValue: {
    width: '28%',
    padding: 5.5,
    textAlign: 'center',
  },
  paymentSection: {
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    textDecoration: 'underline',
    marginBottom: 4,
    marginTop: 4,
  },
  bankRow: {
    flexDirection: 'row',
    fontSize: 8.5,
    lineHeight: 1.4,
    marginBottom: 1.5,
  },
  bankLabel: {
    width: 100,
    fontFamily: 'Helvetica-Bold',
  },
  bankValue: {
    flex: 1,
  },
  termsBox: {
    borderWidth: 1.5,
    borderColor: '#000000',
    padding: 8,
    paddingRight: 28,
    marginTop: 4,
    position: 'relative',
  },
  termsAccentContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  termsHeading: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  termsText: {
    fontSize: 7.6,
    lineHeight: 1.4,
    color: '#000000',
  },
})

interface NSCPDFTemplateProps {
  invoice: Partial<InvoiceWithDetails>
  snapshot?: TemplateSnapshot
  resolvedLogoUrl?: string
}

export default function NSCPDFTemplate({ invoice, snapshot, resolvedLogoUrl }: NSCPDFTemplateProps) {
  const companyName = snapshot?.company_name || 'Neighbourhood Shine Co.'
  const logoSrc = resolvedLogoUrl || snapshot?.logo_url || '/Neighbourhood-Shine.png'
  const items = invoice.invoice_items || []
  
  // Subtotal calculation
  const subtotal = invoice.subtotal !== undefined && invoice.subtotal !== null
    ? Number(invoice.subtotal)
    : items.reduce((sum, item) => sum + (Number(item.line_total) || (Number(item.quantity || 1) * Number(item.amount || 0))), 0)

  // GST calculation
  const gstRate = Number(invoice.template_snapshot?.gst_rate ?? snapshot?.gst_rate ?? 10)
  const gstAmount = Number(invoice.template_snapshot?.gst_amount ?? ((subtotal * gstRate) / 100))
  const totalIncludingGst = Number(invoice.total_amount ?? (subtotal + gstAmount))
  const amountInWords = invoice.template_snapshot?.amount_in_words
    ? String(invoice.template_snapshot.amount_in_words)
    : numberToWords(totalIncludingGst, invoice.template_snapshot?.currency || snapshot?.currency || 'AUD')

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A'
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const monthIdx = parseInt(parts[1], 10) - 1
      const monthName = months[monthIdx] || parts[1]
      return `${parts[2]}-${monthName}-${parts[0].slice(2)}`
    }
    return dateStr
  }

  return (
    <Document title={`Invoice-${invoice.invoice_number || '1001'}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.outerContainer}>
          {/* Top Section: Header, Meta Information and Items Table */}
          <View style={styles.topSection}>
            {/* 1. Header Box */}
            <View style={styles.headerBox}>
              <View style={styles.headerLeft}>
                {/* Green triangle polygon accent matching web preview */}
                <Svg width={24} height={78} viewBox="0 0 24 78">
                  <Polygon points="0,0 24,0 0,78" fill="#8CB34E" />
                </Svg>
                <View>
                  <Text style={styles.companyTitle}>{companyName}</Text>
                  <Text style={styles.headerText}>
                    <Text style={styles.headerBold}>ABN </Text>65 696 388 324
                  </Text>
                  <Text style={styles.headerText}>Account number 313369861</Text>
                  <Text style={styles.headerText}>BSB 083004</Text>
                  <Text style={styles.headerText}>Account Tittle: Neighbourhood Shine Co</Text>
                  <Text style={[styles.headerText, styles.headerBold]}>PAY ID 0421 953 400</Text>
                </View>
              </View>

              <View>
                {logoSrc ? (
                  <Image src={logoSrc} style={styles.logoImage} />
                ) : null}
              </View>
            </View>

            {/* 2. Metadata Tables Row */}
            <View style={styles.metaRow}>
              {/* Bill To & Address */}
              <View style={styles.billToBox}>
                <View style={styles.tableRow}>
                  <Text style={styles.billToLabelCell}>Bill To</Text>
                  <Text style={[styles.billToValueCell, styles.headerBold]}>
                    {invoice.customer_name || '[Customer Name]'}
                  </Text>
                </View>
                <View style={styles.tableRowLast}>
                  <Text style={styles.billToLabelCell}>Address</Text>
                  <Text style={styles.billToValueCell}>
                    {invoice.reference_name || snapshot?.address || '22 Cheviot Avenue Berwick'}
                  </Text>
                </View>
              </View>

              {/* Invoice #, Date, ABN & Total Paid */}
              <View style={styles.metaRightBox}>
                <View style={styles.invoiceMetaTable}>
                  <View style={styles.tableRow}>
                    <Text style={styles.metaLabelCell}>Invoice #</Text>
                    <Text style={[styles.metaValueCell, styles.headerBold]}>
                      {invoice.invoice_number || '1001'}
                    </Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.metaLabelCell}>Date</Text>
                    <Text style={[styles.metaValueCell, styles.headerBold]}>
                      {formatDate(invoice.invoice_date)}
                    </Text>
                  </View>
                  <View style={styles.tableRowLast}>
                    <Text style={styles.metaLabelCell}>ABN #</Text>
                    <Text style={[styles.metaValueCell, styles.headerBold]}>65 696 388 324</Text>
                  </View>
                </View>

                <View style={styles.totalPaidBox}>
                  <Text style={styles.totalPaidLabel}>Total Paid(AUD)</Text>
                  <Text style={styles.totalPaidValue}>AUD {totalIncludingGst.toFixed(2)}</Text>
                </View>
              </View>
            </View>

            {/* 3. Items Table - Only actual items, NO dummy rows */}
            <View style={styles.itemsTable}>
              <View style={styles.itemsHeaderRow}>
                <Text style={styles.colDescHeader}>Details of Job</Text>
                <Text style={styles.colQtyHeader}>Quantity</Text>
                <Text style={styles.colRateHeader}>Rate</Text>
                <Text style={styles.colAmountHeader}>Amount</Text>
              </View>

              {items.length > 0 ? (
                items.map((item, idx) => {
                  const qty = Number(item.quantity) || 1
                  const amt = Number(item.amount) || 0
                  const rate = qty > 0 ? (amt / qty).toFixed(2) : amt.toFixed(2)
                  return (
                    <View key={idx} style={styles.itemRow}>
                      <View style={styles.colDesc}>
                        {item.description ? (
                          item.description.split('\n').map((line, lIdx) => (
                            <Text key={lIdx} style={{ marginBottom: line.trim() === '' ? 2 : 1 }}>
                              {line}
                            </Text>
                          ))
                        ) : (
                          <Text>General Cleaning Services</Text>
                        )}
                      </View>
                      <Text style={styles.colQty}>{qty}</Text>
                      <Text style={styles.colRate}>{rate}</Text>
                      <Text style={styles.colAmount}>{amt.toFixed(2)}</Text>
                    </View>
                  )
                })
              ) : (
                <View style={styles.itemRow}>
                  <View style={styles.colDesc}>
                    <Text>3 bedrooms 2 bathrooms</Text>
                  </View>
                  <Text style={styles.colQty}>1</Text>
                  <Text style={styles.colRate}>{Number(subtotal).toFixed(2)}</Text>
                  <Text style={styles.colAmount}>{Number(subtotal).toFixed(2)}</Text>
                </View>
              )}

              {/* Row 1: Amount In Word & Subtotal */}
              <View style={styles.summaryRow}>
                <View style={styles.amountInWordsLabel}>
                  <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7.5 }}>Amount In Word: </Text>
                  <Text style={{ fontFamily: 'Helvetica-Oblique', fontSize: 7.5 }}>
                    {amountInWords}
                  </Text>
                </View>
                <Text style={styles.summaryValue}>AUD {subtotal.toFixed(2)}</Text>
              </View>

              {/* Row 2: GST % and GST Amount */}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryRightLabel}>
                  GST {gstRate > 0 ? `(${gstRate}%)` : '%'}
                </Text>
                <Text style={styles.summaryValue}>AUD {gstAmount.toFixed(2)}</Text>
              </View>

              {/* Row 3: Total Including GST */}
              <View style={styles.summaryRowLast}>
                <Text style={styles.summaryRightLabel}>
                  TOTAL INCLUDING GST
                </Text>
                <Text style={[styles.summaryValue, { fontSize: 8.5 }]}>AUD {totalIncludingGst.toFixed(2)}</Text>
              </View>
            </View>
          </View>

          {/* Bottom Section: Payment Details & Terms & Conditions */}
          <View style={styles.bottomSection}>
            {/* 4. Bank Account & Pay ID Details */}
            <View style={styles.paymentSection}>
              <Text style={styles.sectionHeading}>BANK ACCOUNT DETAILS</Text>
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Bank Name</Text>
                <Text style={styles.bankValue}>Common Wealth Bank</Text>
              </View>
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Account Name</Text>
                <Text style={styles.bankValue}>Neighbourhood Shine Co</Text>
              </View>
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Account Number</Text>
                <Text style={styles.bankValue}>313369861</Text>
              </View>
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>BSB / IFSC</Text>
                <Text style={styles.bankValue}>083-004</Text>
              </View>

              <Text style={styles.sectionHeading}>PAY ID DETAILS</Text>
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Account Name</Text>
                <Text style={styles.bankValue}>Neighbourhood Shine Co</Text>
              </View>
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>PAY ID</Text>
                <Text style={[styles.bankValue, styles.headerBold]}>0421 953 400</Text>
              </View>
            </View>

            {/* 5. Terms & Conditions Box with Bottom-Right Green Polygon Accent */}
            <View>
              <Text style={styles.termsHeading}>Terms & Conditions</Text>
              <View style={styles.termsBox}>
                <View style={styles.termsAccentContainer}>
                  <Svg width={46} height={46} viewBox="0 0 46 46">
                    <Polygon points="46,0 46,46 0,46" fill="#8CB34E" />
                  </Svg>
                </View>
                <View style={{ paddingRight: 26 }}>
                  <Text style={styles.termsText}>• Payment is required on arrival on the day of service.</Text>
                  <Text style={styles.termsText}>• The customer is responsible for arranging suitable parking for our service vehicle.</Text>
                  <Text style={styles.termsText}>• Access to electricity and running hot water must be available at the property.</Text>
                  <Text style={styles.termsText}>• While we make every effort, complete removal of pet hair cannot be guaranteed.</Text>
                  <Text style={styles.termsText}>• The property must be vacant at the time of cleaning.</Text>
                  <Text style={styles.termsText}>• Quoted pricing is based on properties in standard/normal condition. Heavily soiled properties may incur additional charges.</Text>
                  <Text style={styles.termsText}>• Ceilings and garage walls are excluded from the service.</Text>
                  <Text style={styles.termsText}>• Payment can be made via cash, bank transfer, or Pay ID.</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}
