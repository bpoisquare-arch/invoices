import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { StudentInstallmentSchedule, AIMTFixedInfo, DEFAULT_AIMT_FIXED_INFO } from '@/lib/services/installment.service'

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
  },
  leftHeadingBox: {
    paddingTop: 15,
  },
  headingLine1: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    letterSpacing: 0.5,
  },
  headingLine2: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  rightHeaderBox: {
    alignItems: 'flex-end',
    width: 250,
  },
  logoImage: {
    height: 48,
    width: 140,
    objectFit: 'contain',
    marginBottom: 12,
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
    marginBottom: 6,
  },
  collegeName: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  collegeMeta: {
    fontSize: 8,
    color: '#475569',
    marginTop: 1,
    textAlign: 'right',
  },
  metadataSection: {
    marginTop: 8,
    marginBottom: 14,
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 3,
  },
  underlineValue: {
    flex: 1,
    borderBottomWidth: 0.8,
    borderBottomColor: '#0f172a',
    fontSize: 9,
    paddingLeft: 4,
    paddingBottom: 1,
  },
  metaLine: {
    fontSize: 9,
    color: '#0f172a',
    marginBottom: 1.5,
  },
  boldLabel: {
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    fontSize: 8.5,
  },
  scholarshipText: {
    fontFamily: 'Helvetica-Bold',
    color: '#047857',
  },
  tableContainer: {
    marginTop: 10,
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
  },
  tableRowEven: {
    flexDirection: 'row',
    backgroundColor: '#DCE6F1',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingVertical: 5,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  tableRowOdd: {
    flexDirection: 'row',
    backgroundColor: '#EEF4FB',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingVertical: 5,
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
    borderLeftWidth: 1,
    borderLeftColor: '#cbd5e1',
  },
  tableFooterRow: {
    flexDirection: 'row',
    backgroundColor: '#0F3A7E',
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  footerLabel: {
    width: '75%',
    textAlign: 'center',
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
  },
  footerVal: {
    width: '25%',
    textAlign: 'right',
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 9.5,
  },
})

interface AimtSchedulePDFTemplateProps {
  schedule: Partial<StudentInstallmentSchedule>
  fixedInfo?: AIMTFixedInfo
}

export default function AimtSchedulePDFTemplate({ schedule, fixedInfo = DEFAULT_AIMT_FIXED_INFO }: AimtSchedulePDFTemplateProps) {
  const getFullUrl = (url?: string) => {
    if (!url) return undefined
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url
    }
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`
    }
    return url
  }

  const elementsSrc = getFullUrl('/elements.png') || '/elements.png'
  const logoSrc = getFullUrl(fixedInfo.logo_url || '/aimt-logo.png') || '/aimt-logo.png'

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
    : (schedule.student_id || 'AIMT')
  const docTitle = `Installment-Schedule-${studentNameStr}`

  return (
    <Document title={docTitle}>
      <Page size="A4" style={[styles.page, { position: 'relative' }]}>
        {/* Top-Right Corner Accent Image (Matching Web Preview 1:1 scale and bleed) */}
        <Image
          src={elementsSrc}
          style={{ position: 'absolute', top: -10, right: -36, width: 175, height: 165, objectFit: 'contain' }}
        />

        {/* Bottom-Left Corner Accent Image (Matching Web Preview 1:1 scale and bleed) */}
        <Image
          src={elementsSrc}
          style={{ position: 'absolute', bottom: -10, left: -36, width: 175, height: 165, objectFit: 'contain', transform: 'rotate(180deg)' }}
        />

        {/* Header Row */}
        <View style={styles.headerRow}>
          {/* Left Side: Logo + Fixed Info */}
          <View style={{ width: 250, alignItems: 'flex-start' }}>
            <Image src={logoSrc} style={styles.logoImage} />
            <Text style={styles.collegeName}>{fixedInfo.college_name}</Text>
            <Text style={[styles.collegeMeta, { textAlign: 'left' }]}>Address: {fixedInfo.address}</Text>
            <Text style={[styles.collegeMeta, { textAlign: 'left' }]}>RTO: {fixedInfo.rto}, CRICOS: {fixedInfo.cricos}</Text>
          </View>

          {/* Right Side: INSTALLMENT SCHEDULE Heading + Date */}
          <View style={{ alignItems: 'flex-end', paddingTop: 10, paddingRight: 40 }}>
            <Text style={styles.headingLine1}>INSTALLMENT</Text>
            <Text style={styles.headingLine2}>SCHEDULE</Text>
            <View style={{ marginTop: 8, alignItems: 'flex-end' }}>
              <Text style={styles.dateLabel}>Date</Text>
              <Text style={styles.dateVal}>{formatDate(schedule.date)}</Text>
            </View>
          </View>
        </View>

        {/* Metadata Section Fill-Line Style */}
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
            {(() => {
              const mat = Number(schedule.material_fee || 0) > 0
                ? Number(schedule.material_fee)
                : Math.max(0, (Number(totalAmt) || 0) - ((Number(schedule.admin_fee) || 0) + (Number(schedule.resources_fee) || 0) + (Number(schedule.tuition_fee) || 0) - (Number(schedule.scholarship) || 0)))
              return mat > 0 ? (
                <>
                  <Text style={[styles.boldLabel, { marginLeft: 6 }]}>MATERIAL FEE: </Text>
                  <Text style={styles.underlineValue}>AUD {Number(mat).toLocaleString()}</Text>
                </>
              ) : null
            })()}
            <Text style={[styles.boldLabel, { marginLeft: 6 }]}>TUITION FEE: </Text>
            <Text style={styles.underlineValue}>AUD {Number(schedule.tuition_fee || 0).toLocaleString()}</Text>
          </View>

          {Number(schedule.scholarship || 0) > 0 ? (
            <View style={styles.metaRow}>
              <Text style={styles.scholarshipText}>SCHOLARSHIP: </Text>
              <Text style={styles.underlineValue}>AUD -{Number(schedule.scholarship).toLocaleString()}</Text>
            </View>
          ) : null}

          <View style={styles.metaRow}>
            <Text style={styles.boldLabel}>TOTAL AMOUNT: </Text>
            <Text style={[styles.underlineValue, { fontFamily: 'Helvetica-Bold' }]}>AUD {Number(totalAmt).toLocaleString()}</Text>
          </View>
        </View>

        {/* Table Section */}
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

        {/* Footer Fixed Payment & Contact Details (Right Aligned) */}
        <View style={{ marginTop: 16, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: '#cbd5e1', alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#0F3A7E', marginBottom: 4, textTransform: 'uppercase' }}>
            Payment Details
          </Text>
          <Text style={{ fontSize: 8, color: '#0f172a', marginBottom: 2 }}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Account Name: </Text>Australian Institute of Management and Technology
          </Text>
          <Text style={{ fontSize: 8, color: '#0f172a', marginBottom: 2 }}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>BSB: </Text>016 358
          </Text>
          <Text style={{ fontSize: 8, color: '#0f172a', marginBottom: 4 }}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Account Number: </Text>812181361
          </Text>
          <Text style={{ fontSize: 8, color: '#0f172a' }}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>email: </Text>accounts@aimtedu.com.au
          </Text>
        </View>

        {/* Center Page Background Watermark Logo (Placed LAST in JSX to render ON TOP of table rows with opacity) */}
        <View style={{ position: 'absolute', top: 220, left: 100, width: 390, height: 280, opacity: 0.12 }}>
          <Image
            src={logoSrc}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </View>
      </Page>
    </Document>
  )
}
