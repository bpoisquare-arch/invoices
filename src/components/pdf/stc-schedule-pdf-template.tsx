import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image, Svg, Path } from '@react-pdf/renderer'
import {
  STCStudentInstallmentSchedule,
  STCFixedInfo,
  DEFAULT_STC_FIXED_INFO,
} from '@/lib/services/stc-installment.service'
import {
  STC_LOGO_BASE64,
  AIMT_ELEMENTS_TOP_RIGHT_BASE64,
  AIMT_ELEMENTS_BOTTOM_LEFT_BASE64,
} from '@/lib/constants/stc-assets'

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontSize: 9.5,
    fontFamily: 'Helvetica',
    color: '#1e293b',
    backgroundColor: '#ffffff',
    position: 'relative',
  },
  contentWrapper: {
    paddingTop: 36,
    paddingHorizontal: 38,
    paddingBottom: 24,
    position: 'relative',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  leftHeaderBox: {
    width: 290,
    alignItems: 'flex-start',
  },
  logoImage: {
    height: 52,
    width: 185,
    objectFit: 'contain',
    marginBottom: 6,
  },
  collegeName: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 2,
  },
  collegeMeta: {
    fontSize: 8,
    color: '#334155',
    marginTop: 1,
    textAlign: 'left',
  },
  rightHeaderBox: {
    alignItems: 'flex-end',
    paddingTop: 6,
    paddingRight: 76,
  },
  headingLine1: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    letterSpacing: 0.5,
    textAlign: 'right',
  },
  headingLine2: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    marginTop: 2,
    letterSpacing: 0.5,
    textAlign: 'right',
  },
  dateContainer: {
    marginTop: 10,
    alignItems: 'flex-end',
  },
  dateLabel: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  dateVal: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginTop: 1,
  },
  metadataSection: {
    marginTop: 8,
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 5.5,
  },
  boldLabel: {
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    fontSize: 8.5,
    letterSpacing: 0.3,
  },
  underlineValue: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#0f172a',
    fontSize: 9,
    paddingLeft: 4,
    paddingBottom: 1.5,
    color: '#0f172a',
  },
  scholarshipText: {
    fontFamily: 'Helvetica-Bold',
    color: '#047857',
    fontSize: 8.5,
    letterSpacing: 0.3,
  },
  tableContainer: {
    marginTop: 10,
    borderWidth: 1.2,
    borderColor: '#0F3A7E',
  },
  tableHeaderBar: {
    backgroundColor: '#0F3A7E',
    paddingVertical: 6.5,
    textAlign: 'center',
  },
  tableHeaderText: {
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  tableRowEven: {
    flexDirection: 'row',
    backgroundColor: '#DCE6F1',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  tableRowOdd: {
    flexDirection: 'row',
    backgroundColor: '#EEF4FB',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  colMonth: {
    width: '25%',
    fontFamily: 'Helvetica-Bold',
    color: '#0F3A7E',
    textAlign: 'center',
    fontSize: 9,
  },
  colDesc: {
    width: '50%',
    color: '#0f172a',
    fontSize: 9,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: '#cbd5e1',
  },
  colAmount: {
    width: '25%',
    textAlign: 'right',
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    fontSize: 9,
    paddingLeft: 8,
    paddingRight: 6,
    borderLeftWidth: 1,
    borderLeftColor: '#cbd5e1',
  },
  tableFooterRow: {
    flexDirection: 'row',
    backgroundColor: '#0F3A7E',
    paddingVertical: 7,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  footerLabel: {
    width: '75%',
    textAlign: 'center',
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  footerVal: {
    width: '25%',
    textAlign: 'right',
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 10.5,
    paddingRight: 6,
    borderLeftWidth: 1,
    borderLeftColor: '#4B6B94',
  },
})

interface STCSchedulePDFTemplateProps {
  schedule: Partial<STCStudentInstallmentSchedule>
  fixedInfo?: STCFixedInfo
}

export default function STCSchedulePDFTemplate({
  schedule,
  fixedInfo = DEFAULT_STC_FIXED_INFO,
}: STCSchedulePDFTemplateProps) {
  const logoSrc =
    fixedInfo?.logo_url && (fixedInfo.logo_url.startsWith('data:') || fixedInfo.logo_url.startsWith('http'))
      ? fixedInfo.logo_url
      : STC_LOGO_BASE64

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A'
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return dateStr
  }

  const items = schedule.schedule_items || []
  const totalAmt = schedule.total_amount || 0
  const studentNameStr = schedule.student_name
    ? schedule.student_name.trim().replace(/[/\\?%*:|"<>]/g, '').replace(/\s+/g, '-')
    : schedule.student_id || 'STC'
  const docTitle = `Installment-Schedule-${studentNameStr}`

  return (
    <Document title={docTitle}>
      <Page size="A4" style={styles.page}>
        {/* Top-Right Corner Accent Geometric Graphic - Exact 0-bleed with no transparent padding */}
        <Image
          src={AIMT_ELEMENTS_TOP_RIGHT_BASE64}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 135,
            height: 165,
            objectFit: 'fill',
          }}
        />

        {/* Bottom-Left Corner Accent Geometric Graphic (Pre-Rotated 180 deg) - Exact 0-bleed */}
        <Image
          src={AIMT_ELEMENTS_BOTTOM_LEFT_BASE64}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: 135,
            height: 165,
            objectFit: 'fill',
          }}
        />

        {/* Page Content Wrapper with standard padding */}
        <View style={styles.contentWrapper}>
          {/* Top Header Row */}
          <View style={styles.headerRow}>
            {/* Left Side: STC Logo + Fixed College Info */}
            <View style={styles.leftHeaderBox}>
              <Image src={logoSrc} style={styles.logoImage} />
              <Text style={styles.collegeName}>{fixedInfo.college_name || 'States College Australia Pty Ltd'}</Text>
              <Text style={styles.collegeMeta}>{fixedInfo.address || 'Level 3, 301/620 Bourke Street, Melbourne, VIC 3000'}</Text>
              <Text style={styles.collegeMeta}>
                RTO: {fixedInfo.rto || '45976'} | CRICOS: {fixedInfo.cricos || '04106B'}
              </Text>
            </View>

            {/* Right Side: INSTALLMENT SCHEDULE Heading + Date */}
            <View style={styles.rightHeaderBox}>
              <Text style={styles.headingLine1}>INSTALLMENT</Text>
              <Text style={styles.headingLine2}>SCHEDULE</Text>
              <View style={styles.dateContainer}>
                <Text style={styles.dateLabel}>Date</Text>
                <Text style={styles.dateVal}>{formatDate(schedule.date)}</Text>
              </View>
            </View>
          </View>

          {/* Student Metadata & Fee Breakdown */}
          <View style={styles.metadataSection}>
            <View style={styles.metaRow}>
              <Text style={styles.boldLabel}>STUDENT NAME: </Text>
              <Text style={styles.underlineValue}>{schedule.student_name || ''}</Text>
              <Text style={[styles.boldLabel, { marginLeft: 12 }]}>STUDENT ID: </Text>
              <Text style={[styles.underlineValue, { flex: 0.4 }]}>{schedule.student_id || ''}</Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.boldLabel}>COURSE NAME: </Text>
              <Text style={styles.underlineValue}>{schedule.course_name || ''}</Text>
              <Text style={[styles.boldLabel, { marginLeft: 12 }]}>DURATION: </Text>
              <Text style={[styles.underlineValue, { flex: 0.3 }]}>{schedule.duration || ''}</Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.boldLabel}>START DATE: </Text>
              <Text style={styles.underlineValue}>{formatDate(schedule.start_date)}</Text>
              <Text style={[styles.boldLabel, { marginLeft: 12 }]}>END DATE: </Text>
              <Text style={styles.underlineValue}>{formatDate(schedule.end_date)}</Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.boldLabel}>APPLICATION FEE: </Text>
              <Text style={styles.underlineValue}>AUD {schedule.admin_fee ?? 0}</Text>
              <Text style={[styles.boldLabel, { marginLeft: 8 }]}>MATERIAL FEE: </Text>
              <Text style={styles.underlineValue}>AUD {schedule.resources_fee ?? 0}</Text>
              <Text style={[styles.boldLabel, { marginLeft: 8 }]}>TUITION FEE: </Text>
              <Text style={styles.underlineValue}>AUD {Number(schedule.tuition_fee || 0).toLocaleString()}</Text>
            </View>

            {Number(schedule.scholarship || 0) > 0 ? (
              <View style={styles.metaRow}>
                <Text style={styles.scholarshipText}>SCHOLARSHIP: </Text>
                <Text style={styles.underlineValue}>AUD -{Number(schedule.scholarship).toLocaleString()}</Text>
              </View>
            ) : null}

            <View style={[styles.metaRow, { marginTop: 3 }]}>
              <Text style={[styles.boldLabel, { fontSize: 9, color: '#0f172a' }]}>TOTAL AMOUNT: </Text>
              <Text
                style={[
                  styles.underlineValue,
                  { fontFamily: 'Helvetica-Bold', borderBottomWidth: 1.8, fontSize: 9.5 },
                ]}
              >
                AUD {Number(totalAmt).toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Main Installment Table */}
          <View style={styles.tableContainer}>
            {/* 1. Main Title Bar */}
            <View style={styles.tableHeaderBar}>
              <Text style={styles.tableHeaderText}>INSTALLMENT SCHEDULE</Text>
            </View>

            {/* 2. Column Subheadings Bar */}
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: '#DCE6F1',
                borderBottomWidth: 1,
                borderBottomColor: '#cbd5e1',
                paddingVertical: 5,
                paddingHorizontal: 10,
                alignItems: 'center',
              }}
            >
              <Text style={[styles.colMonth, { color: '#0f172a', fontFamily: 'Helvetica-Bold', fontSize: 8.5 }]}>
                Date
              </Text>
              <Text style={[styles.colDesc, { color: '#0f172a', fontFamily: 'Helvetica-Bold', fontSize: 8.5, textAlign: 'center' }]}>
                Installment Details
              </Text>
              <Text style={[styles.colAmount, { color: '#0f172a', fontFamily: 'Helvetica-Bold', fontSize: 8.5 }]}>
                Amount (AUD)
              </Text>
            </View>

            {/* 3. Installment Rows */}
            {items.map((item, idx) => (
              <View key={idx} style={idx % 2 === 0 ? styles.tableRowOdd : styles.tableRowEven}>
                <Text style={styles.colMonth}>{item.monthLabel}</Text>
                <Text style={styles.colDesc}>{item.description}</Text>
                <Text style={styles.colAmount}>AUD {Number(item.amount).toLocaleString()}</Text>
              </View>
            ))}

            {/* 4. Table Footer Row */}
            <View style={styles.tableFooterRow}>
              <Text style={styles.footerLabel}>TOTAL AMOUNT</Text>
              <Text style={styles.footerVal}>AUD {Number(totalAmt).toLocaleString()}</Text>
            </View>
          </View>

          {/* Horizontal Divider Line below Table */}
          <View
            style={{
              marginTop: 12,
              marginBottom: 10,
              borderBottomWidth: 0.8,
              borderBottomColor: '#cbd5e1',
            }}
          />

          {/* Footer Payment Details Section matching Reference */}
          <View
            style={{
              alignItems: 'flex-end',
            }}
          >
            <View style={{ width: 260 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: 'Helvetica-Bold',
                  color: '#0F3A7E',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  textAlign: 'right',
                }}
              >
                PAYMENT DETAILS
              </Text>

              <View style={{ flexDirection: 'row' }}>
                {/* Left Labels Column */}
                <View style={{ width: 88 }}>
                  <Text style={{ fontSize: 8.8, fontFamily: 'Helvetica-Bold', color: '#0f172a', marginBottom: 3.5, textAlign: 'left' }}>
                    Bank:
                  </Text>
                  <Text style={{ fontSize: 8.8, fontFamily: 'Helvetica-Bold', color: '#0f172a', marginBottom: 3.5, textAlign: 'left' }}>
                    Account Name:
                  </Text>
                  <Text style={{ fontSize: 8.8, fontFamily: 'Helvetica-Bold', color: '#0f172a', marginBottom: 3.5, textAlign: 'left' }}>
                    BSB/Branch No:
                  </Text>
                  <Text style={{ fontSize: 8.8, fontFamily: 'Helvetica-Bold', color: '#0f172a', marginBottom: 3.5, textAlign: 'left' }}>
                    Account No:
                  </Text>
                  <Text style={{ fontSize: 8.8, fontFamily: 'Helvetica-Bold', color: '#0f172a', marginBottom: 0, textAlign: 'left' }}>
                    BIC/SWIFT Code:
                  </Text>
                </View>

                {/* Continuous Vertical Divider Line */}
                <View
                  style={{
                    width: 1.0,
                    backgroundColor: '#94a3b8',
                    marginHorizontal: 8,
                  }}
                />

                {/* Right Values Column */}
                <View style={{ width: 155 }}>
                  <Text style={{ fontSize: 8.8, color: '#0f172a', marginBottom: 3.5 }}>
                    {fixedInfo.bank || 'Commonwealth Bank of Australia'}
                  </Text>
                  <Text style={{ fontSize: 8.8, color: '#0f172a', marginBottom: 3.5 }}>
                    {fixedInfo.college_name || 'States College Australia Pty Ltd'}
                  </Text>
                  <Text style={{ fontSize: 8.8, color: '#0f172a', marginBottom: 3.5 }}>
                    {fixedInfo.bsb || '063-010'}
                  </Text>
                  <Text style={{ fontSize: 8.8, color: '#0f172a', marginBottom: 3.5 }}>
                    {fixedInfo.account_no || '1508 2685'}
                  </Text>
                  <Text style={{ fontSize: 8.8, color: '#0f172a', marginBottom: 0 }}>
                    {fixedInfo.swift_code || 'CTBAAU2S'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Bottom Contact & Address Bar (Positioned at Bottom Edge of Page, shifted right of corner ribbon) */}
        <View
          style={{
            position: 'absolute',
            bottom: 20,
            left: 145,
            right: 38,
            paddingTop: 6,
            borderTopWidth: 0.8,
            borderTopColor: '#cbd5e1',
            alignItems: 'center',
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 3 }}>
            {/* Phone Icon & Text */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 5 }}>
              <Svg width={7.5} height={7.5} viewBox="0 0 24 24" style={{ marginRight: 2.5 }}>
                <Path fill="#0F3A7E" d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z"/>
              </Svg>
              <Text style={{ fontSize: 7, color: '#0f172a' }}>
                {fixedInfo.phone || '+61 3 9000 5743'}
              </Text>
            </View>

            {/* Mobile Icon & Text */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 5 }}>
              <Svg width={7.5} height={7.5} viewBox="0 0 24 24" style={{ marginRight: 2.5 }}>
                <Path fill="#0F3A7E" d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/>
              </Svg>
              <Text style={{ fontSize: 7, color: '#0f172a' }}>
                {fixedInfo.mobile || '+61 466 041 112'}
              </Text>
            </View>

            {/* Email Icon & Text */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 5 }}>
              <Svg width={7.5} height={7.5} viewBox="0 0 24 24" style={{ marginRight: 2.5 }}>
                <Path fill="#0F3A7E" d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </Svg>
              <Text style={{ fontSize: 7, color: '#0f172a' }}>
                {fixedInfo.email || 'admissions@states.edu.au'}
              </Text>
            </View>

            {/* Website Icon & Text */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 5 }}>
              <Svg width={7.5} height={7.5} viewBox="0 0 24 24" style={{ marginRight: 2.5 }}>
                <Path fill="#0F3A7E" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </Svg>
              <Text style={{ fontSize: 7, color: '#0f172a' }}>
                {fixedInfo.website || 'www.states.edu.au'}
              </Text>
            </View>
          </View>

          <Text style={{ fontSize: 6.8, color: '#475569' }}>
            {fixedInfo.address || 'Level 3, 301/620 Bourke Street, Melbourne, VIC 3000'}   |   RTO: {fixedInfo.rto || '45976'}   |   CRICOS: {fixedInfo.cricos || '04106B'}
          </Text>
        </View>

        {/* Center Page Background Watermark Logo */}
        <View
          style={{
            position: 'absolute',
            top: 250,
            left: 100,
            width: 400,
            height: 270,
            opacity: 0.12,
          }}
        >
          <Image src={logoSrc} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </View>
      </Page>
    </Document>
  )
}
