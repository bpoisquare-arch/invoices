import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
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
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#1e293b',
    backgroundColor: '#ffffff',
    position: 'relative',
  },
  contentWrapper: {
    paddingTop: 32,
    paddingHorizontal: 36,
    paddingBottom: 24,
    position: 'relative',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  leftHeaderBox: {
    width: 280,
    alignItems: 'flex-start',
  },
  logoImage: {
    height: 48,
    width: 170,
    objectFit: 'contain',
    marginBottom: 6,
  },
  collegeName: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 1.5,
  },
  collegeMeta: {
    fontSize: 7.5,
    color: '#475569',
    marginTop: 0.5,
    textAlign: 'left',
  },
  rightHeaderBox: {
    alignItems: 'flex-end',
    paddingTop: 8,
    paddingRight: 76,
  },
  headingLine1: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    letterSpacing: 0.5,
    textAlign: 'right',
  },
  headingLine2: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    marginTop: 2,
    letterSpacing: 0.5,
    textAlign: 'right',
  },
  dateContainer: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  dateLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  dateVal: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginTop: 1,
  },
  metadataSection: {
    marginTop: 4,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  boldLabel: {
    fontFamily: 'Helvetica-Bold',
    color: '#334155',
    fontSize: 8,
    letterSpacing: 0.3,
  },
  underlineValue: {
    flex: 1,
    borderBottomWidth: 0.8,
    borderBottomColor: '#0f172a',
    fontSize: 8.5,
    paddingLeft: 4,
    paddingBottom: 1,
    color: '#0f172a',
  },
  scholarshipText: {
    fontFamily: 'Helvetica-Bold',
    color: '#047857',
    fontSize: 8,
    letterSpacing: 0.3,
  },
  tableContainer: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#0F3A7E',
  },
  tableHeaderBar: {
    backgroundColor: '#0F3A7E',
    paddingVertical: 5,
    textAlign: 'center',
  },
  tableHeaderText: {
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  tableRowEven: {
    flexDirection: 'row',
    backgroundColor: '#DCE6F1',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingVertical: 4.5,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  tableRowOdd: {
    flexDirection: 'row',
    backgroundColor: '#EEF4FB',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingVertical: 4.5,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  colMonth: {
    width: '25%',
    fontFamily: 'Helvetica-Bold',
    color: '#0F3A7E',
    textAlign: 'center',
    fontSize: 8.5,
  },
  colDesc: {
    width: '50%',
    color: '#0f172a',
    fontSize: 8.5,
    paddingLeft: 6,
    borderLeftWidth: 1,
    borderLeftColor: '#cbd5e1',
  },
  colAmount: {
    width: '25%',
    textAlign: 'right',
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    fontSize: 8.5,
    paddingLeft: 6,
    paddingRight: 4,
    borderLeftWidth: 1,
    borderLeftColor: '#cbd5e1',
  },
  tableFooterRow: {
    flexDirection: 'row',
    backgroundColor: '#0F3A7E',
    paddingVertical: 5.5,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  footerLabel: {
    width: '75%',
    textAlign: 'center',
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  footerVal: {
    width: '25%',
    textAlign: 'right',
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 9.5,
    paddingRight: 4,
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

  const materialFeeVal =
    Number(schedule.material_fee || 0) > 0
      ? Number(schedule.material_fee)
      : Math.max(
          0,
          (Number(totalAmt) || 0) -
            ((Number(schedule.admin_fee) || 0) +
              (Number(schedule.resources_fee) || 0) +
              (Number(schedule.tuition_fee) || 0) -
              (Number(schedule.scholarship) || 0))
        )

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
            width: 125,
            height: 153.5,
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
            width: 125,
            height: 153.5,
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
              <Text style={[styles.boldLabel, { marginLeft: 10 }]}>STUDENT ID: </Text>
              <Text style={[styles.underlineValue, { flex: 0.4 }]}>{schedule.student_id || ''}</Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.boldLabel}>COURSE NAME: </Text>
              <Text style={styles.underlineValue}>{schedule.course_name || ''}</Text>
              <Text style={[styles.boldLabel, { marginLeft: 10 }]}>DURATION: </Text>
              <Text style={[styles.underlineValue, { flex: 0.3 }]}>{schedule.duration || ''}</Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.boldLabel}>START DATE: </Text>
              <Text style={styles.underlineValue}>{formatDate(schedule.start_date)}</Text>
              <Text style={[styles.boldLabel, { marginLeft: 10 }]}>END DATE: </Text>
              <Text style={styles.underlineValue}>{formatDate(schedule.end_date)}</Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.boldLabel}>ADMIN FEE: </Text>
              <Text style={styles.underlineValue}>AUD {schedule.admin_fee ?? 0}</Text>
              <Text style={[styles.boldLabel, { marginLeft: 6 }]}>RESOURCES FEE: </Text>
              <Text style={styles.underlineValue}>AUD {schedule.resources_fee ?? 0}</Text>
              {materialFeeVal > 0 ? (
                <>
                  <Text style={[styles.boldLabel, { marginLeft: 6 }]}>MATERIAL FEE: </Text>
                  <Text style={styles.underlineValue}>AUD {Number(materialFeeVal).toLocaleString()}</Text>
                </>
              ) : null}
              <Text style={[styles.boldLabel, { marginLeft: 6 }]}>TUITION FEE: </Text>
              <Text style={styles.underlineValue}>AUD {Number(schedule.tuition_fee || 0).toLocaleString()}</Text>
            </View>

            {Number(schedule.scholarship || 0) > 0 ? (
              <View style={styles.metaRow}>
                <Text style={styles.scholarshipText}>SCHOLARSHIP: </Text>
                <Text style={styles.underlineValue}>AUD -{Number(schedule.scholarship).toLocaleString()}</Text>
              </View>
            ) : null}

            <View style={[styles.metaRow, { marginTop: 2 }]}>
              <Text style={[styles.boldLabel, { fontSize: 8.5, color: '#0f172a' }]}>TOTAL AMOUNT: </Text>
              <Text
                style={[
                  styles.underlineValue,
                  { fontFamily: 'Helvetica-Bold', borderBottomWidth: 1.5, fontSize: 8.5 },
                ]}
              >
                AUD {Number(totalAmt).toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Main Installment Table */}
          <View style={styles.tableContainer}>
            <View style={styles.tableHeaderBar}>
              <Text style={styles.tableHeaderText}>INSTALLMENT SCHEDULE</Text>
            </View>

            {items.map((item, idx) => (
              <View key={idx} style={idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd}>
                <Text style={styles.colMonth}>{item.monthLabel}</Text>
                <Text style={styles.colDesc}>{item.description}</Text>
                <Text style={styles.colAmount}>AUD {Number(item.amount).toLocaleString()}</Text>
              </View>
            ))}

            <View style={styles.tableFooterRow}>
              <Text style={styles.footerLabel}>TOTAL AMOUNT</Text>
              <Text style={styles.footerVal}>AUD {Number(totalAmt).toLocaleString()}</Text>
            </View>
          </View>

          {/* Footer Payment Details Table (Right Aligned) */}
          <View
            style={{
              marginTop: 10,
              paddingTop: 2,
              alignItems: 'flex-end',
            }}
          >
            <Text
              style={{
                fontSize: 8.5,
                fontFamily: 'Helvetica-Bold',
                color: '#0F3A7E',
                marginBottom: 3,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              PAYMENT DETAILS
            </Text>

            <View style={{ flexDirection: 'row', marginBottom: 1.5 }}>
              <Text style={{ width: 80, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#0f172a', textAlign: 'right', paddingRight: 5 }}>
                Bank:
              </Text>
              <Text style={{ width: 160, fontSize: 7, color: '#0f172a', borderLeftWidth: 0.8, borderLeftColor: '#94a3b8', paddingLeft: 5 }}>
                {fixedInfo.bank || 'Commonwealth Bank of Australia'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', marginBottom: 1.5 }}>
              <Text style={{ width: 80, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#0f172a', textAlign: 'right', paddingRight: 5 }}>
                Account Name:
              </Text>
              <Text style={{ width: 160, fontSize: 7, color: '#0f172a', borderLeftWidth: 0.8, borderLeftColor: '#94a3b8', paddingLeft: 5 }}>
                {fixedInfo.college_name || 'States College Australia Pty Ltd'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', marginBottom: 1.5 }}>
              <Text style={{ width: 80, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#0f172a', textAlign: 'right', paddingRight: 5 }}>
                BSB/Branch No:
              </Text>
              <Text style={{ width: 160, fontSize: 7, color: '#0f172a', borderLeftWidth: 0.8, borderLeftColor: '#94a3b8', paddingLeft: 5 }}>
                {fixedInfo.bsb || '063-010'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', marginBottom: 1.5 }}>
              <Text style={{ width: 80, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#0f172a', textAlign: 'right', paddingRight: 5 }}>
                Account No:
              </Text>
              <Text style={{ width: 160, fontSize: 7, color: '#0f172a', borderLeftWidth: 0.8, borderLeftColor: '#94a3b8', paddingLeft: 5 }}>
                {fixedInfo.account_no || '1508 2685'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', marginBottom: 1.5 }}>
              <Text style={{ width: 80, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#0f172a', textAlign: 'right', paddingRight: 5 }}>
                BIC/SWIFT Code:
              </Text>
              <Text style={{ width: 160, fontSize: 7, color: '#0f172a', borderLeftWidth: 0.8, borderLeftColor: '#94a3b8', paddingLeft: 5 }}>
                {fixedInfo.swift_code || 'CTBAAU2S'}
              </Text>
            </View>
          </View>

          {/* Bottom Full-Width Contact & Address Bar */}
          <View
            style={{
              marginTop: 10,
              paddingTop: 5,
              borderTopWidth: 0.5,
              borderTopColor: '#cbd5e1',
              alignItems: 'center',
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 2 }}>
              <Text style={{ fontSize: 6.5, color: '#0f172a', marginHorizontal: 5 }}>
                Ph: {fixedInfo.phone || '+61 3 9000 5743'}
              </Text>
              <Text style={{ fontSize: 6.5, color: '#0f172a', marginHorizontal: 5 }}>
                Mob: {fixedInfo.mobile || '+61 466 041 112'}
              </Text>
              <Text style={{ fontSize: 6.5, color: '#0f172a', marginHorizontal: 5 }}>
                Email: {fixedInfo.email || 'admissions@states.edu.au'}
              </Text>
              <Text style={{ fontSize: 6.5, color: '#0f172a', marginHorizontal: 5 }}>
                Web: {fixedInfo.website || 'www.states.edu.au'}
              </Text>
            </View>
            <Text style={{ fontSize: 6, color: '#64748b' }}>
              {fixedInfo.address || 'Level 3, 301/620 Bourke Street, Melbourne, VIC 3000'} | RTO: {fixedInfo.rto || '45976'} | CRICOS: {fixedInfo.cricos || '04106B'}
            </Text>
          </View>
        </View>

        {/* Center Page Background Watermark Logo (Rendered LAST in JSX so it floats over table rows with clean transparency) */}
        <View
          style={{
            position: 'absolute',
            top: 250,
            left: 118,
            width: 360,
            height: 250,
            opacity: 0.12,
          }}
        >
          <Image src={logoSrc} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </View>
      </Page>
    </Document>
  )
}
