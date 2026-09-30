import * as XLSX from 'xlsx'
import { prisma } from '@/lib/prisma'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/client'
import type { StcReportImport, StcReportRecord } from '@/lib/supabase/database.types'

async function getSupabase() {
  if (typeof window === 'undefined') {
    try {
      return await createSupabaseClient()
    } catch {
      return createBrowserSupabaseClient()
    }
  }
  return createBrowserSupabaseClient()
}

// Clean and normalize strings
function cleanString(val: any): string {
  if (val === null || val === undefined) return ''
  const str = String(val).trim()
  if (str === 'null' || str === 'undefined') return ''
  return str
}

// Clean and parse monetary / numeric values
function cleanNumber(val: any): number {
  if (val === null || val === undefined || val === '' || val === '-') return 0
  if (typeof val === 'number') return isNaN(val) ? 0 : val
  const str = String(val).replace(/[^0-9.-]/g, '')
  const num = parseFloat(str)
  return isNaN(num) ? 0 : num
}

// Format dates from Excel serial or string
function formatExcelDate(val: any): string {
  if (!val && val !== 0) return ''
  if (typeof val === 'number') {
    try {
      const dateObj = XLSX.SSF.parse_date_code(val)
      if (dateObj) {
        const d = String(dateObj.d).padStart(2, '0')
        const m = String(dateObj.m).padStart(2, '0')
        const y = dateObj.y
        return `${d}/${m}/${y}`
      }
    } catch {
      return String(val)
    }
  }
  if (val instanceof Date) {
    const d = String(val.getDate()).padStart(2, '0')
    const m = String(val.getMonth() + 1).padStart(2, '0')
    const y = val.getFullYear()
    return `${d}/${m}/${y}`
  }
  return String(val).trim()
}

// Normalize column header key for fuzzy matching
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[\r\n\t_.-]+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
}

export function normalizeDocumentType(val: any): string {
  if (!val && val !== 0) return ''
  const str = String(val).trim()
  const lower = str.toLowerCase()
  if (lower.includes('coe')) return 'CoE'
  if (lower.includes('voe')) return 'VoE'
  if (lower.includes('offer')) return 'Offer Letter'
  return str
}

export interface ParsedStcStudentRow {
  sr_no: number | null
  student_name: string
  student_id: string | null
  agent: string | null
  scholarship: string | null
  pending_invoice: string | null
  pending_amount: number
  yet_to_raised: string | null
  remarks: string | null
  dob: string | null
  document: string | null
  status: string | null
  intake: string | null
  end_date: string | null
  course: string | null
  admin_fee: number
  resource_fee: number
  tuition_fee: number
  total_fee: number
  paid_amount: number
  total_paid?: number
  follow_up?: string | null
  coe_issued_date: string | null
  email_id: string | null
  phone_no: string | null
  payment_status: string | null
  extra_data: Record<string, any>
}

export interface ParsedStcReportFileResult {
  fileName: string
  fileSize: number
  rawHeaders: string[]
  records: ParsedStcStudentRow[]
  totalRecords: number
  totalPendingAmount: number
  totalYetToRaised: number
}

function getCleanSheetRows(ws: XLSX.WorkSheet): any[][] {
  if (!ws || !ws['!ref']) return []
  let maxR = 0
  let maxC = 0
  for (const k in ws) {
    if (k.startsWith('!')) continue
    const c = XLSX.utils.decode_cell(k)
    if (c.r > maxR) maxR = c.r
    if (c.c > maxC) maxC = c.c
  }
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxR, c: maxC } })
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// 1. Parse Excel file buffer into structured STC student rows
export function parseStcReportExcel(buffer: ArrayBuffer | Buffer, fileName: string): ParsedStcReportFileResult {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })

  let bestSheetName = workbook.SheetNames[0]
  let bestRows: any[][] = []
  let bestHeaderIndex = 0
  let maxScore = -1

  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName]
    const rawRows = getCleanSheetRows(ws)
    if (!rawRows || rawRows.length === 0) continue

    for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
      const row = rawRows[i]
      if (!Array.isArray(row)) continue
      const rowText = row.map((c) => String(c).toLowerCase().replace(/[^a-z0-9]/g, ' ')).join(' ')

      let score = 0
      if (rowText.includes('student name') || rowText.includes('student') || rowText.includes('name')) score += 10
      if (rowText.includes('pending amount') || rowText.includes('amount')) score += 15
      if (rowText.includes('pending invoice') || rowText.includes('pending inv')) score += 15
      if (rowText.includes('yet to raised') || rowText.includes('raised')) score += 15
      if (rowText.includes('intake') || rowText.includes('intake date')) score += 15
      if (rowText.includes('agent') || rowText.includes('agency')) score += 5
      if (rowText.includes('course') || rowText.includes('qualification')) score += 5

      if (score > maxScore) {
        maxScore = score
        bestSheetName = sheetName
        bestRows = rawRows
        bestHeaderIndex = i
      }
    }
  }

  if (bestRows.length === 0) {
    const ws = workbook.Sheets[workbook.SheetNames[0]]
    bestRows = getCleanSheetRows(ws)
    bestHeaderIndex = 0
  }

  if (!bestRows || bestRows.length === 0) {
    throw new Error('The uploaded Excel file is empty.')
  }

  const headerRowIndex = bestHeaderIndex
  const rawRows = bestRows

  const rawHeaders: string[] = (rawRows[headerRowIndex] || []).map((h) => cleanString(h))
  const normalizedHeaders = rawHeaders.map((h) => normalizeHeader(h))

  function findColIndex(possibleNames: string[], excludeWords: string[] = []): number {
    for (const name of possibleNames) {
      const idx = normalizedHeaders.findIndex((h) => {
        if (excludeWords.some((ew) => h.includes(ew))) return false
        return h === name
      })
      if (idx !== -1) return idx
    }

    for (const name of possibleNames) {
      const idx = normalizedHeaders.findIndex((h) => {
        if (excludeWords.some((ew) => h.includes(ew))) return false
        const regex = new RegExp(`(^|\\s)${name}(\\s|$)`, 'i')
        return regex.test(h)
      })
      if (idx !== -1) return idx
    }

    for (const name of possibleNames) {
      const idx = normalizedHeaders.findIndex((h) => {
        if (excludeWords.some((ew) => h.includes(ew))) return false
        return h.includes(name)
      })
      if (idx !== -1) return idx
    }

    return -1
  }

  const colMap = {
    sr_no: findColIndex(['sr no', 'sr_no', 'srno', 's no', 's_no', 'sno', 'serial no', 'serial number', 'sl no', 'sr #', 'sr. no'], ['phone', 'mobile', 'contact', 'invoice', 'student', 'inv', 'account', 'card']),
    student_name: findColIndex(['student name', 'name of student', 'candidate name', 'student full name', 'student', 'candidate', 'name'], ['agent', 'agency', 'course', 'company', 'consultant']),
    student_id: findColIndex(['student id', 'student no', 'student number', 'student_id', 'studentid', 'student code', 'candidate id'], ['email', 'mail', 'phone', 'contact']),
    agent: findColIndex(['agent name', 'agent', 'agency', 'agency name', 'consultant', 'recruiter', 'education agent'], ['student', 'candidate']),
    scholarship: findColIndex(['scholarship', 'scholarship amount', 'scholarship fee', 'scholarship ($)']),
    pending_invoice: findColIndex(['pending invoice', 'pending invoices', 'pending inv', 'inv pending', 'invoice pending', 'pending inv count']),
    pending_amount: findColIndex(['pending amount', 'amount pending', 'pending balance', 'pending amt', 'due amount', 'balance due', 'pending ($)']),
    yet_to_raised: findColIndex(['yet to raised', 'yet to be raised', 'yet to raise', 'unraised', 'yet raised', 'yet to issue', 'unraised amount']),
    remarks: findColIndex(['installment breakup', 'installment break up', 'installment breakdown', 'breakup', 'remarks', 'remark', 'comments', 'comment', 'notes', 'note']),
    follow_up: findColIndex(['follow-up', 'follow up', 'followup', 'follow up notes', 'follow up status', 'follow up note']),
    dob: findColIndex(['dob', 'date of birth', 'birth date', 'birthdate', 'd.o.b']),
    document: findColIndex(['document type', 'document', 'documents', 'doc status', 'coe status', 'doc type', 'doc']),
    status: findColIndex(['student id status', 'student status', 'enrollment status', 'status']),
    intake: findColIndex(['intake date', 'intake', 'start date', 'commencement date', 'course start date']),
    end_date: findColIndex(['course end date', 'end date', 'completion date', 'course completion date', 'finish date']),
    course: findColIndex(['course name', 'qualification', 'course', 'program', 'course title']),
    admin_fee: findColIndex(['admin fee', 'administration fee', 'admin fees', 'admin ($)'], ['tuition', 'resource', 'total']),
    resource_fee: findColIndex(['resource fee', 'resources fee', 'materials fee', 'material fee', 'resource ($)'], ['admin', 'tuition', 'total']),
    tuition_fee: findColIndex(['tuition fee', 'tuition fees', 'tuition', 'tuition ($)'], ['admin', 'resource', 'total']),
    total_fee: findColIndex(['total fee', 'total fees', 'course fee', 'total course fee', 'total ($)'], ['paid', 'initial', 'admin', 'resource', 'tuition']),
    paid_amount: findColIndex(['initial payment', 'initial paid', 'initial fee', 'first payment', 'paid amount', 'amount paid', 'fee paid'], ['total paid']),
    total_paid: findColIndex(['total paid', 'total fee paid', 'total amount paid', 'total paid amount', 'total paid ($)'], ['initial']),
    coe_issued_date: findColIndex(['coe issued date', 'coe date', 'coe issued', 'date coe issued']),
    email_id: findColIndex(['email id', 'student email', 'email address', 'email', 'e-mail'], ['student id', 'candidate id']),
    phone_no: findColIndex(['phone no', 'mobile no', 'contact no', 'phone number', 'mobile number', 'contact number', 'phone', 'mobile', 'contact'], ['sr', 'serial', 'invoice', 'inv']),
    payment_status: findColIndex(['payment status', 'pay status', 'invoice status', 'payment plan status', 'plan status']),
  }

  const parsedRecords: ParsedStcStudentRow[] = []
  let totalPendingAmount = 0
  let totalYetToRaised = 0

  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r]
    if (!row || !Array.isArray(row)) continue

    const studentName = colMap.student_name !== -1 ? cleanString(row[colMap.student_name]) : ''
    const nonBlankCount = row.filter((c) => c !== '' && c !== null && c !== undefined).length
    if (!studentName && nonBlankCount < 2) continue

    const finalStudentName = studentName || (colMap.student_id !== -1 && row[colMap.student_id] ? `Student (${row[colMap.student_id]})` : `Record #${r}`)

    let srNoVal = colMap.sr_no !== -1 ? cleanNumber(row[colMap.sr_no]) : (r - headerRowIndex)
    if (srNoVal <= 0 || srNoVal > 100000) {
      srNoVal = r - headerRowIndex
    }
    const pendingAmount = colMap.pending_amount !== -1 ? cleanNumber(row[colMap.pending_amount]) : 0
    const yetToRaisedRaw = colMap.yet_to_raised !== -1 ? cleanString(row[colMap.yet_to_raised]) : ''
    const yetToRaisedNum = cleanNumber(yetToRaisedRaw)

    totalPendingAmount += pendingAmount
    totalYetToRaised += yetToRaisedNum

    const extraData: Record<string, any> = {}
    row.forEach((cellVal, cIdx) => {
      const headerTitle = rawHeaders[cIdx] || `col_${cIdx + 1}`
      extraData[headerTitle] = cellVal
    })

    const totalPaidNum = colMap.total_paid !== -1 ? cleanNumber(row[colMap.total_paid]) : (cleanNumber(extraData['Total Paid']) || cleanNumber(extraData['Total Paid ($)']) || 0)
    extraData['total_paid'] = totalPaidNum

    const followUpVal = colMap.follow_up !== -1 ? cleanString(row[colMap.follow_up]) : (cleanString(extraData['Follow-up']) || cleanString(extraData['Follow up']) || cleanString(extraData['follow_up']) || '')
    if (followUpVal) {
      extraData['follow_up'] = followUpVal
    }

    parsedRecords.push({
      sr_no: srNoVal > 0 ? srNoVal : r - headerRowIndex,
      student_name: finalStudentName,
      student_id: colMap.student_id !== -1 ? cleanString(row[colMap.student_id]) || null : null,
      agent: colMap.agent !== -1 ? cleanString(row[colMap.agent]) || null : null,
      scholarship: colMap.scholarship !== -1 ? cleanString(row[colMap.scholarship]) || null : null,
      pending_invoice: colMap.pending_invoice !== -1 ? cleanString(row[colMap.pending_invoice]) || null : null,
      pending_amount: pendingAmount,
      yet_to_raised: yetToRaisedRaw || null,
      remarks: colMap.remarks !== -1 ? cleanString(row[colMap.remarks]) || null : null,
      follow_up: followUpVal || null,
      dob: colMap.dob !== -1 ? formatExcelDate(row[colMap.dob]) || null : null,
      document: colMap.document !== -1 ? normalizeDocumentType(row[colMap.document]) || null : null,
      status: colMap.status !== -1 ? cleanString(row[colMap.status]) || null : null,
      intake: colMap.intake !== -1 ? formatExcelDate(row[colMap.intake]) || null : null,
      end_date: colMap.end_date !== -1 ? formatExcelDate(row[colMap.end_date]) || null : null,
      course: colMap.course !== -1 ? cleanString(row[colMap.course]) || null : null,
      admin_fee: colMap.admin_fee !== -1 ? cleanNumber(row[colMap.admin_fee]) : 0,
      resource_fee: colMap.resource_fee !== -1 ? cleanNumber(row[colMap.resource_fee]) : 0,
      tuition_fee: colMap.tuition_fee !== -1 ? cleanNumber(row[colMap.tuition_fee]) : 0,
      total_fee: colMap.total_fee !== -1 ? cleanNumber(row[colMap.total_fee]) : 0,
      paid_amount: colMap.paid_amount !== -1 ? cleanNumber(row[colMap.paid_amount]) : 0,
      total_paid: totalPaidNum,
      coe_issued_date: colMap.coe_issued_date !== -1 ? formatExcelDate(row[colMap.coe_issued_date]) || null : null,
      email_id: colMap.email_id !== -1 ? cleanString(row[colMap.email_id]) || null : null,
      phone_no: colMap.phone_no !== -1 ? cleanString(row[colMap.phone_no]) || null : null,
      payment_status: colMap.payment_status !== -1 ? cleanString(row[colMap.payment_status]) || null : null,
      extra_data: extraData,
    })
  }

  return {
    fileName,
    fileSize: typeof buffer.byteLength === 'number' ? buffer.byteLength : (buffer as Buffer).length || 0,
    rawHeaders,
    records: parsedRecords,
    totalRecords: parsedRecords.length,
    totalPendingAmount: Number(totalPendingAmount.toFixed(2)),
    totalYetToRaised: Number(totalYetToRaised.toFixed(2)),
  }
}

// 2. Preview import matching strictly against STC live database records
export async function previewStcReportImport(
  buffer: ArrayBuffer | Buffer,
  fileName: string
): Promise<{
  totalRecords: number
  matchingCount: number
  newCount: number
  sampleMatches: any[]
  sampleNew: any[]
  totalPendingAmount: number
  totalYetToRaised: number
}> {
  const parseResult = parseStcReportExcel(buffer, fileName)
  const supabase = await getSupabase()

  let existingRecords: { id: string; student_name: string; student_id?: string | null; course?: string | null }[] = []
  try {
    const dbRecs = await prisma.stcReportRecord.findMany({
      select: { id: true, studentName: true, studentId: true, course: true },
    })
    if (dbRecs && dbRecs.length > 0) {
      existingRecords = dbRecs.map((r) => ({
        id: r.id,
        student_name: r.studentName,
        student_id: r.studentId,
        course: r.course,
      }))
    }
  } catch {
    // fallback
  }

  if (existingRecords.length === 0) {
    try {
      const { data } = await supabase.from('stc_report_records').select('id, student_name, student_id, course')
      if (data) existingRecords = data as any[]
    } catch {
      // fallback
    }
  }

  type ExistingPreviewRecord = { id: string; student_name: string; student_id?: string | null; course?: string | null }
  const existingById = new Map<string, ExistingPreviewRecord>()
  const existingByName = new Map<string, ExistingPreviewRecord>()

  existingRecords.forEach((r) => {
    if (r.student_id && r.student_id.trim()) {
      existingById.set(r.student_id.trim().toLowerCase(), r)
    }
    if (r.student_name && r.student_name.trim()) {
      existingByName.set(r.student_name.trim().toLowerCase(), r)
    }
  })

  const sampleMatches: any[] = []
  const sampleNew: any[] = []
  let matchingCount = 0
  let newCount = 0

  parseResult.records.forEach((incoming) => {
    const idKey = incoming.student_id ? incoming.student_id.trim().toLowerCase() : ''
    const nameKey = incoming.student_name ? incoming.student_name.trim().toLowerCase() : ''

    const matched = (idKey && existingById.get(idKey)) || (nameKey && existingByName.get(nameKey))

    if (matched) {
      matchingCount++
      if (sampleMatches.length < 5) {
        sampleMatches.push({
          student_name: incoming.student_name,
          student_id: incoming.student_id,
          course: incoming.course,
        })
      }
    } else {
      newCount++
      if (sampleNew.length < 5) {
        sampleNew.push({
          student_name: incoming.student_name,
          student_id: incoming.student_id,
          course: incoming.course,
        })
      }
    }
  })

  return {
    totalRecords: parseResult.records.length,
    matchingCount,
    newCount,
    sampleMatches,
    sampleNew,
    totalPendingAmount: parseResult.totalPendingAmount,
    totalYetToRaised: parseResult.totalYetToRaised,
  }
}

// ─── Helper: map Prisma StcReportRecord row → StcReportRecord (snake_case) ────
function prismaStcRecordToSnake(r: any): StcReportRecord {
  const extraData = r.extraData
    ? (typeof r.extraData === 'string' ? JSON.parse(r.extraData) : r.extraData)
    : {}

  const rawFollowUp = r.followUp !== null && r.followUp !== undefined
    ? r.followUp
    : extraData?.follow_up
  const safeFollowUp =
    rawFollowUp && String(rawFollowUp).trim() !== 'null' && String(rawFollowUp).trim() !== 'undefined'
      ? String(rawFollowUp).trim()
      : null

  const totalPaidVal = r.totalPaid !== null && r.totalPaid !== undefined
    ? Number(r.totalPaid)
    : (extraData?.total_paid !== undefined ? Number(extraData.total_paid) : 0)

  const paidAmountVal = Number(r.paidAmount ?? 0)
  const totalFeeVal = Number(r.totalFee ?? 0)

  let pendingAmountVal = Number(r.pendingAmount ?? 0)
  if (pendingAmountVal === 0 && totalFeeVal > paidAmountVal) {
    pendingAmountVal = Math.max(0, totalFeeVal - paidAmountVal)
  }

  let pendingInvoiceVal = r.pendingInvoice ?? null
  if (!pendingInvoiceVal && pendingAmountVal > 0) {
    pendingInvoiceVal = '1'
  }

  return {
    id: r.id,
    import_id: r.importId,
    sr_no: r.srNo ?? null,
    student_name: r.studentName,
    student_id: r.studentId ?? null,
    agent: r.agent ?? null,
    scholarship: r.scholarship ?? null,
    pending_invoice: pendingInvoiceVal,
    pending_amount: pendingAmountVal,
    yet_to_raised: r.yetToRaised ?? null,
    remarks: r.remarks ?? null,
    follow_up: safeFollowUp,
    dob: r.dob ?? null,
    document: r.document ?? null,
    status: r.status ?? null,
    intake: r.intake ?? null,
    end_date: r.endDate ?? null,
    course: r.course ?? null,
    admin_fee: Number(r.adminFee ?? 0),
    resource_fee: Number(r.resourceFee ?? 0),
    tuition_fee: Number(r.tuitionFee ?? 0),
    total_fee: totalFeeVal,
    paid_amount: paidAmountVal,
    total_paid: totalPaidVal,
    initial_payment: paidAmountVal,
    coe_issued_date: r.coeIssuedDate ?? null,
    email_id: r.emailId ?? null,
    phone_no: r.phoneNo ?? null,
    payment_status: r.paymentStatus ?? null,
    extra_data: extraData,
    created_at: r.createdAt ? (r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt) : new Date().toISOString(),
  } as StcReportRecord
}

// 3. Save STC imported Excel data to MySQL (Prisma) and Supabase
export async function saveStcReportImportToDatabase(params: {
  fileName: string
  fileSize: number
  uploadedBy?: string
  originalBase64?: string
  rawHeaders?: string[]
  records: ParsedStcStudentRow[]
  duplicateStrategy?: 'override' | 'skip' | 'replace'
}): Promise<{
  importBatch: StcReportImport
  recordCount: number
  overriddenCount: number
  skippedCount: number
  newCount: number
}> {
  const duplicateStrategy = params.duplicateStrategy || 'override'
  const nowStr = new Date().toISOString()
  const importBatchId = generateId()

  let existingRecords: StcReportRecord[] = []
  try {
    const dbRecords = await prisma.stcReportRecord.findMany()
    if (dbRecords && dbRecords.length > 0) {
      existingRecords = dbRecords.map(prismaStcRecordToSnake)
    }
  } catch (err) {
    console.warn('Could not fetch existing STC records from MySQL:', err)
  }

  if (existingRecords.length === 0) {
    try {
      const supabase = await getSupabase()
      const { data: dbRecords } = await supabase.from('stc_report_records').select('*')
      if (dbRecords) {
        existingRecords = dbRecords as StcReportRecord[]
      }
    } catch (err) {
      console.warn('Could not fetch existing STC records from Supabase:', err)
    }
  }

  const existingById = new Map<string, StcReportRecord>()
  const existingByName = new Map<string, StcReportRecord>()

  existingRecords.forEach((r) => {
    if (r.student_id && r.student_id.trim()) {
      existingById.set(r.student_id.trim().toLowerCase(), r)
    }
    if (r.student_name && r.student_name.trim()) {
      existingByName.set(r.student_name.trim().toLowerCase(), r)
    }
  })

  // Handle replace strategy
  if (duplicateStrategy === 'replace') {
    try {
      await prisma.stcReportRecord.deleteMany({})
    } catch (err) {
      console.warn('Error clearing MySQL STC records for replace strategy:', err)
    }
    try {
      const supabase = await getSupabase()
      await supabase.from('stc_report_records').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    } catch (err) {
      console.error('Error clearing Supabase STC records for replace strategy:', err)
    }
    existingRecords = []
    existingById.clear()
    existingByName.clear()
  }

  let overriddenCount = 0
  let skippedCount = 0
  let newCount = 0

  const recordsToInsertPrisma: any[] = []
  const recordsToInsertSupabase: any[] = []

  const importPayload = {
    id: importBatchId,
    file_name: params.fileName,
    file_size: params.fileSize,
    uploaded_at: nowStr,
    uploaded_by: params.uploadedBy || 'admin@isquarebpo.com',
    total_records: 0,
    total_pending_amount: 0,
    total_yet_to_raised: 0,
    entity: 'stc',
    original_file_data: params.originalBase64 || null,
    raw_headers: (params.rawHeaders || []) as any,
    created_at: nowStr,
    updated_at: nowStr,
  }

  // 1. Create import batch in MySQL (Prisma)
  try {
    await prisma.stcReportImport.create({
      data: {
        id: importBatchId,
        fileName: params.fileName,
        fileSize: BigInt(params.fileSize || 0),
        uploadedAt: new Date(),
        uploadedBy: params.uploadedBy || 'admin@isquarebpo.com',
        totalRecords: 0,
        totalPendingAmount: 0,
        totalYetToRaised: 0,
        entity: 'stc',
        originalFileData: params.originalBase64 || null,
        rawHeaders: (params.rawHeaders || []) as any,
      },
    })
  } catch (mysqlErr) {
    console.warn('Error creating STC import batch in MySQL:', mysqlErr)
  }

  // Mirror to Supabase non-fatally
  try {
    const supabase = await getSupabase()
    await supabase.from('stc_report_imports').insert(importPayload)
  } catch (err) {
    console.warn('Error creating STC import batch in Supabase:', err)
  }

  let nextSrNo = existingRecords.reduce((max, r) => Math.max(max, r.sr_no || 0), 0) + 1
  if (duplicateStrategy === 'replace') {
    nextSrNo = 1
  }

  for (let idx = 0; idx < params.records.length; idx++) {
    const incoming = params.records[idx]
    const studentIdKey = incoming.student_id ? incoming.student_id.trim().toLowerCase() : ''
    const nameKey = incoming.student_name ? incoming.student_name.trim().toLowerCase() : ''

    const existing = (studentIdKey && existingById.get(studentIdKey)) || (nameKey && existingByName.get(nameKey))

    if (existing && duplicateStrategy !== 'replace') {
      if (duplicateStrategy === 'skip') {
        skippedCount++
        continue
      } else if (duplicateStrategy === 'override') {
        const updatedPayloadPrisma: any = {
          studentName: incoming.student_name,
          studentId: incoming.student_id || existing.student_id,
          agent: incoming.agent || existing.agent,
          scholarship: incoming.scholarship || existing.scholarship,
          pendingInvoice: incoming.pending_invoice,
          pendingAmount: incoming.pending_amount,
          yetToRaised: incoming.yet_to_raised,
          remarks: incoming.remarks || existing.remarks,
          dob: incoming.dob || existing.dob,
          document: normalizeDocumentType(incoming.document || existing.document) || null,
          status: incoming.status || existing.status,
          intake: incoming.intake || existing.intake,
          endDate: incoming.end_date || existing.end_date,
          course: incoming.course || existing.course,
          adminFee: incoming.admin_fee,
          resourceFee: incoming.resource_fee,
          tuitionFee: incoming.tuition_fee,
          totalFee: incoming.total_fee,
          paidAmount: incoming.paid_amount,
          coeIssuedDate: incoming.coe_issued_date || existing.coe_issued_date,
          emailId: incoming.email_id || existing.email_id,
          phoneNo: incoming.phone_no || existing.phone_no,
          paymentStatus: incoming.payment_status || existing.payment_status,
          extraData: {
            ...((existing.extra_data as Record<string, any>) || {}),
            ...(incoming.extra_data || {}),
            total_paid: incoming.total_paid || incoming.paid_amount,
            initial_payment: incoming.paid_amount,
          },
        }

        try {
          await prisma.stcReportRecord.update({
            where: { id: existing.id },
            data: updatedPayloadPrisma,
          })
          overriddenCount++
        } catch (err) {
          console.error(`Error overriding student ${incoming.student_name} in MySQL:`, err)
        }

        try {
          const supabase = await getSupabase()
          const updatedPayloadSupabase: any = {
            student_name: incoming.student_name,
            student_id: incoming.student_id || existing.student_id,
            agent: incoming.agent || existing.agent,
            scholarship: incoming.scholarship || existing.scholarship,
            pending_invoice: incoming.pending_invoice,
            pending_amount: incoming.pending_amount,
            yet_to_raised: incoming.yet_to_raised,
            remarks: incoming.remarks || existing.remarks,
            dob: incoming.dob || existing.dob,
            document: normalizeDocumentType(incoming.document || existing.document) || null,
            status: incoming.status || existing.status,
            intake: incoming.intake || existing.intake,
            end_date: incoming.end_date || existing.end_date,
            course: incoming.course || existing.course,
            admin_fee: incoming.admin_fee,
            resource_fee: incoming.resource_fee,
            tuition_fee: incoming.tuition_fee,
            total_fee: incoming.total_fee,
            paid_amount: incoming.paid_amount,
            coe_issued_date: incoming.coe_issued_date || existing.coe_issued_date,
            email_id: incoming.email_id || existing.email_id,
            phone_no: incoming.phone_no || existing.phone_no,
            payment_status: incoming.payment_status || existing.payment_status,
            extra_data: updatedPayloadPrisma.extraData,
          }
          await supabase.from('stc_report_records').update(updatedPayloadSupabase).eq('id', existing.id)
        } catch {
          // ignore
        }
        continue
      }
    }

    newCount++
    let newSrNo = incoming.sr_no || nextSrNo++
    if (newSrNo <= 0 || newSrNo > 100000) {
      newSrNo = nextSrNo++
    }
    const newRecordId = generateId()
    const extraDataObj = {
      ...(incoming.extra_data || {}),
      total_paid: incoming.total_paid || incoming.paid_amount,
      initial_payment: incoming.paid_amount,
    }

    recordsToInsertPrisma.push({
      id: newRecordId,
      importId: importBatchId,
      srNo: newSrNo,
      studentName: incoming.student_name,
      studentId: incoming.student_id,
      agent: incoming.agent,
      scholarship: incoming.scholarship,
      pendingInvoice: incoming.pending_invoice,
      pendingAmount: incoming.pending_amount,
      yetToRaised: incoming.yet_to_raised,
      remarks: incoming.remarks,
      dob: incoming.dob,
      document: incoming.document,
      status: incoming.status || 'Current',
      intake: incoming.intake,
      endDate: incoming.end_date,
      course: incoming.course,
      adminFee: incoming.admin_fee,
      resourceFee: incoming.resource_fee,
      tuitionFee: incoming.tuition_fee,
      totalFee: incoming.total_fee,
      paidAmount: incoming.paid_amount,
      coeIssuedDate: incoming.coe_issued_date,
      emailId: incoming.email_id,
      phoneNo: incoming.phone_no,
      paymentStatus: incoming.payment_status,
      extraData: extraDataObj,
      createdAt: new Date(),
    })

    recordsToInsertSupabase.push({
      id: newRecordId,
      import_id: importBatchId,
      sr_no: newSrNo,
      student_name: incoming.student_name,
      student_id: incoming.student_id,
      agent: incoming.agent,
      scholarship: incoming.scholarship,
      pending_invoice: incoming.pending_invoice,
      pending_amount: incoming.pending_amount,
      yet_to_raised: incoming.yet_to_raised,
      remarks: incoming.remarks,
      dob: incoming.dob,
      document: incoming.document,
      status: incoming.status || 'Current',
      intake: incoming.intake,
      end_date: incoming.end_date,
      course: incoming.course,
      admin_fee: incoming.admin_fee,
      resource_fee: incoming.resource_fee,
      tuition_fee: incoming.tuition_fee,
      total_fee: incoming.total_fee,
      paid_amount: incoming.paid_amount,
      coe_issued_date: incoming.coe_issued_date,
      email_id: incoming.email_id,
      phone_no: incoming.phone_no,
      payment_status: incoming.payment_status,
      extra_data: extraDataObj,
      created_at: nowStr,
    })
  }

  // Insert into MySQL (Prisma)
  if (recordsToInsertPrisma.length > 0) {
    const CHUNK_SIZE = 100
    for (let i = 0; i < recordsToInsertPrisma.length; i += CHUNK_SIZE) {
      const chunk = recordsToInsertPrisma.slice(i, i + CHUNK_SIZE)
      try {
        await prisma.stcReportRecord.createMany({ data: chunk })
      } catch (err) {
        console.error('Error inserting STC records chunk into MySQL:', err)
      }
    }
  }

  // Insert into Supabase
  if (recordsToInsertSupabase.length > 0) {
    const CHUNK_SIZE = 100
    for (let i = 0; i < recordsToInsertSupabase.length; i += CHUNK_SIZE) {
      const chunk = recordsToInsertSupabase.slice(i, i + CHUNK_SIZE)
      try {
        const supabase = await getSupabase()
        await supabase.from('stc_report_records').insert(chunk)
      } catch (err) {
        console.error('Error inserting STC record chunk into Supabase:', err)
      }
    }
  }

  // Update MySQL batch totals
  try {
    const allFinalRows = await prisma.stcReportRecord.findMany({
      where: { importId: importBatchId },
      select: { pendingAmount: true, totalFee: true, paidAmount: true, yetToRaised: true },
    })
    if (allFinalRows) {
      let finalTotalPending = 0
      let finalTotalYet = 0
      for (const r of allFinalRows) {
        let pAmt = Number(r.pendingAmount || 0)
        const fee = Number(r.totalFee || 0)
        const paid = Number(r.paidAmount || 0)
        if (pAmt === 0 && fee > paid) {
          pAmt = Math.max(0, fee - paid)
        }
        finalTotalPending += pAmt
        finalTotalYet += cleanNumber(r.yetToRaised)
      }

      await prisma.stcReportImport.update({
        where: { id: importBatchId },
        data: {
          totalRecords: allFinalRows.length,
          totalPendingAmount: Number(finalTotalPending.toFixed(2)),
          totalYetToRaised: Number(finalTotalYet.toFixed(2)),
          updatedAt: new Date(),
        },
      })
    }
  } catch (err) {
    console.warn('Could not update STC import batch totals in MySQL:', err)
  }

  return {
    importBatch: {
      ...importPayload,
      id: importBatchId,
    } as StcReportImport,
    recordCount: recordsToInsertPrisma.length + overriddenCount,
    overriddenCount,
    skippedCount,
    newCount,
  }
}

// 4. Fetch all STC import history batches
export async function getStcReportImports(): Promise<StcReportImport[]> {
  // 1. Primary: Hostinger MySQL via Prisma
  try {
    const dbImports = await prisma.stcReportImport.findMany({
      orderBy: { uploadedAt: 'desc' },
      select: {
        id: true,
        fileName: true,
        fileSize: true,
        uploadedAt: true,
        uploadedBy: true,
        totalRecords: true,
        totalPendingAmount: true,
        totalYetToRaised: true,
        entity: true,
        rawHeaders: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (dbImports && dbImports.length > 0) {
      return dbImports.map((imp) => ({
        id: imp.id,
        file_name: imp.fileName,
        file_size: Number(imp.fileSize ?? 0),
        uploaded_at: imp.uploadedAt.toISOString(),
        uploaded_by: imp.uploadedBy,
        total_records: imp.totalRecords,
        total_pending_amount: Number(imp.totalPendingAmount ?? 0),
        total_yet_to_raised: Number(imp.totalYetToRaised ?? 0),
        entity: imp.entity ?? 'stc',
        original_file_data: null,
        raw_headers: (imp.rawHeaders as any) ?? [],
        created_at: imp.createdAt?.toISOString() ?? imp.uploadedAt.toISOString(),
        updated_at: imp.updatedAt?.toISOString() ?? imp.uploadedAt.toISOString(),
      })) as unknown as StcReportImport[]
    }
  } catch (err) {
    console.warn('MySQL getStcReportImports failed, falling back to Supabase:', err)
  }

  // 2. Fallback: Supabase
  const supabase = await getSupabase()
  try {
    const { data, error } = await supabase
      .from('stc_report_imports')
      .select('id, file_name, file_size, uploaded_at, uploaded_by, total_records, total_pending_amount, total_yet_to_raised, entity, raw_headers, created_at, updated_at')
      .order('uploaded_at', { ascending: false })

    if (!error && data) {
      return data as unknown as StcReportImport[]
    }
  } catch {
    // ignore
  }
  return []
}

// 5. Fetch a single import batch by ID
export async function getStcReportImportById(id: string, includeFileData: boolean = false): Promise<StcReportImport | null> {
  // 1. Primary: MySQL via Prisma
  try {
    const imp = await prisma.stcReportImport.findUnique({ where: { id } })
    if (imp) {
      return {
        id: imp.id,
        file_name: imp.fileName,
        file_size: Number(imp.fileSize ?? 0),
        uploaded_at: imp.uploadedAt.toISOString(),
        uploaded_by: imp.uploadedBy,
        total_records: imp.totalRecords,
        total_pending_amount: Number(imp.totalPendingAmount ?? 0),
        total_yet_to_raised: Number(imp.totalYetToRaised ?? 0),
        entity: imp.entity ?? 'stc',
        original_file_data: includeFileData ? (imp.originalFileData ?? null) : null,
        raw_headers: (imp.rawHeaders as any) ?? [],
        created_at: imp.createdAt?.toISOString() ?? imp.uploadedAt.toISOString(),
        updated_at: imp.updatedAt?.toISOString() ?? imp.uploadedAt.toISOString(),
      } as unknown as StcReportImport
    }
  } catch (err) {
    console.warn('MySQL getStcReportImportById failed, falling back to Supabase:', err)
  }

  // 2. Fallback: Supabase
  const supabase = await getSupabase()
  try {
    const query = includeFileData
      ? supabase.from('stc_report_imports').select('*')
      : supabase.from('stc_report_imports').select('id, file_name, file_size, uploaded_at, uploaded_by, total_records, total_pending_amount, total_yet_to_raised, entity, raw_headers, created_at, updated_at')
    
    const { data, error } = await query.eq('id', id).maybeSingle()
    if (!error && data) {
      return data as unknown as StcReportImport
    }
  } catch {
    // ignore
  }
  return null
}

// 6. Fetch records from stc_report_records with filters and stats
export async function getStcReportRecords(params: {
  importId?: string
  search?: string
  agent?: string
  intake?: string
  course?: string
  page?: number
  pageSize?: number
  sortBy?: 'sr_no' | 'student_name' | 'agent' | 'pending_amount' | 'intake' | 'course' | 'created_at'
  sortOrder?: 'asc' | 'desc'
}): Promise<{
  records: StcReportRecord[]
  totalCount: number
  totalPendingAmount: number
  totalYetToRaised: number
  availableAgents: string[]
  availableIntakes: string[]
  availableCourses: string[]
}> {
  // 1. Primary: Hostinger MySQL via Prisma
  try {
    const page = params.page || 1
    const pageSize = params.pageSize || 50
    const sortBy = params.sortBy || 'sr_no'
    const sortOrder = params.sortOrder || 'asc'

    const where: any = {}
    if (params.importId) where.importId = params.importId
    if (params.agent && params.agent !== 'all') where.agent = params.agent
    if (params.intake && params.intake !== 'all') where.intake = params.intake
    if (params.course && params.course !== 'all') where.course = params.course
    if (params.search && params.search.trim()) {
      const q = params.search.trim()
      where.OR = [
        { studentName: { contains: q } },
        { agent: { contains: q } },
        { course: { contains: q } },
        { studentId: { contains: q } },
        { intake: { contains: q } },
      ]
    }

    const sortFieldMap: Record<string, string> = {
      sr_no: 'srNo',
      student_name: 'studentName',
      agent: 'agent',
      pending_amount: 'pendingAmount',
      intake: 'intake',
      course: 'course',
      created_at: 'createdAt',
    }
    const prismaSort = sortFieldMap[sortBy] || 'srNo'

    const totalCount = await prisma.stcReportRecord.count({ where })
    const rows = await prisma.stcReportRecord.findMany({
      where,
      orderBy: { [prismaSort]: sortOrder },
      ...(pageSize === -1 ? {} : { skip: (page - 1) * pageSize, take: pageSize }),
    })

    const allForTotals = await prisma.stcReportRecord.findMany({
      where: params.importId ? { importId: params.importId } : {},
      select: {
        pendingAmount: true,
        totalFee: true,
        paidAmount: true,
        yetToRaised: true,
        agent: true,
        intake: true,
        course: true,
      },
    })

    let totalPending = 0
    let totalYetRaised = 0
    const agentSet = new Set<string>()
    const intakeSet = new Set<string>()
    const courseSet = new Set<string>()

    for (const r of allForTotals) {
      let pAmt = Number(r.pendingAmount ?? 0)
      const fee = Number(r.totalFee ?? 0)
      const paid = Number(r.paidAmount ?? 0)
      if (pAmt === 0 && fee > paid) {
        pAmt = Math.max(0, fee - paid)
      }
      totalPending += pAmt
      totalYetRaised += cleanNumber(r.yetToRaised)
      if (r.agent) agentSet.add(r.agent)
      if (r.intake) intakeSet.add(r.intake)
      if (r.course) courseSet.add(r.course)
    }

    return {
      records: rows.map(prismaStcRecordToSnake),
      totalCount,
      totalPendingAmount: Number(totalPending.toFixed(2)),
      totalYetToRaised: Number(totalYetRaised.toFixed(2)),
      availableAgents: Array.from(agentSet).sort(),
      availableIntakes: Array.from(intakeSet).sort(),
      availableCourses: Array.from(courseSet).sort(),
    }
  } catch (err) {
    console.warn('MySQL getStcReportRecords failed, falling back to Supabase:', err)
  }

  // 2. Fallback: Supabase
  const supabase = await getSupabase()
  const page = params.page || 1
  const pageSize = params.pageSize || 50
  const sortBy = params.sortBy || 'sr_no'
  const sortOrder = params.sortOrder || 'asc'

  let query = supabase.from('stc_report_records').select('*', { count: 'exact' })

  if (params.importId) {
    query = query.eq('import_id', params.importId)
  }

  if (params.search && params.search.trim()) {
    const q = params.search.trim()
    query = query.or(`student_name.ilike.%${q}%,agent.ilike.%${q}%,course.ilike.%${q}%,student_id.ilike.%${q}%,intake.ilike.%${q}%`)
  }

  if (params.agent && params.agent !== 'all') {
    query = query.eq('agent', params.agent)
  }

  if (params.intake && params.intake !== 'all') {
    query = query.eq('intake', params.intake)
  }

  if (params.course && params.course !== 'all') {
    query = query.eq('course', params.course)
  }

  query = query.order(sortBy, { ascending: sortOrder === 'asc' })

  if (pageSize !== -1) {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)
  }

  try {
    const res = await query
    const data = res.data || []
    const count = res.count ?? data.length

    let totalsQuery = supabase.from('stc_report_records').select('pending_amount, yet_to_raised, agent, intake, course')
    if (params.importId) {
      totalsQuery = totalsQuery.eq('import_id', params.importId)
    }

    const { data: allRows } = await totalsQuery

    let totalPending = 0
    let totalYetRaised = 0
    const agentSet = new Set<string>()
    const intakeSet = new Set<string>()
    const courseSet = new Set<string>()

    if (allRows) {
      allRows.forEach((r) => {
        totalPending += Number(r.pending_amount || 0)
        totalYetRaised += cleanNumber(r.yet_to_raised)
        if (r.agent) agentSet.add(r.agent)
        if (r.intake) intakeSet.add(r.intake)
        if (r.course) courseSet.add(r.course)
      })
    }

    const formattedRecords: StcReportRecord[] = data.map((r: any) => {
      const rawFollowUp = r.follow_up !== undefined && r.follow_up !== null ? r.follow_up : r.extra_data?.follow_up
      const safeFollowUp =
        rawFollowUp && String(rawFollowUp).trim() !== 'null' && String(rawFollowUp).trim() !== 'undefined'
          ? String(rawFollowUp).trim()
          : null

      return {
        ...r,
        total_paid: r.total_paid !== undefined && r.total_paid !== null ? Number(r.total_paid) : (r.extra_data?.total_paid !== undefined ? Number(r.extra_data.total_paid) : 0),
        paid_amount: r.paid_amount !== undefined && r.paid_amount !== null ? Number(r.paid_amount) : 0,
        follow_up: safeFollowUp,
      }
    })

    return {
      records: formattedRecords,
      totalCount: count,
      totalPendingAmount: Number(totalPending.toFixed(2)),
      totalYetToRaised: Number(totalYetRaised.toFixed(2)),
      availableAgents: Array.from(agentSet).sort(),
      availableIntakes: Array.from(intakeSet).sort(),
      availableCourses: Array.from(courseSet).sort(),
    }
  } catch (err) {
    console.error('Error in getStcReportRecords fallback:', err)
    return {
      records: [],
      totalCount: 0,
      totalPendingAmount: 0,
      totalYetToRaised: 0,
      availableAgents: [],
      availableIntakes: [],
      availableCourses: [],
    }
  }
}

// 7. Delete an STC import batch and cascade delete its records
export async function deleteStcReportImport(id: string): Promise<void> {
  // 1. PRIMARY: MySQL delete (Prisma cascade delete)
  try {
    await prisma.stcReportImport.delete({ where: { id } })
  } catch (mysqlErr: any) {
    if (mysqlErr?.code !== 'P2025') {
      console.error('MySQL deleteStcReportImport FAILED:', mysqlErr)
      throw mysqlErr
    }
  }

  // 2. NON-FATAL: Supabase delete
  try {
    const supabase = await getSupabase()
    await supabase.from('stc_report_imports').delete().eq('id', id)
  } catch (err) {
    console.error('Supabase error deleting STC import batch:', err)
  }
}

// 8. Get or create a manual entries import batch for STC
export async function getOrCreateStcManualImportBatch(): Promise<StcReportImport> {
  const nowStr = new Date().toISOString()

  // 1. Primary: MySQL via Prisma
  try {
    const mysqlBatch = await prisma.stcReportImport.findFirst({
      where: { entity: 'stc' },
      orderBy: { uploadedAt: 'desc' },
    })
    if (mysqlBatch) {
      return {
        id: mysqlBatch.id,
        file_name: mysqlBatch.fileName,
        file_size: Number(mysqlBatch.fileSize ?? 0),
        uploaded_at: mysqlBatch.uploadedAt.toISOString(),
        uploaded_by: mysqlBatch.uploadedBy,
        total_records: mysqlBatch.totalRecords,
        total_pending_amount: Number(mysqlBatch.totalPendingAmount ?? 0),
        total_yet_to_raised: Number(mysqlBatch.totalYetToRaised ?? 0),
        entity: mysqlBatch.entity ?? 'stc',
        original_file_data: null,
        raw_headers: (mysqlBatch.rawHeaders as any) ?? [],
        created_at: mysqlBatch.createdAt?.toISOString() ?? nowStr,
        updated_at: mysqlBatch.updatedAt?.toISOString() ?? nowStr,
      } as unknown as StcReportImport
    }
  } catch (err) {
    console.warn('MySQL getOrCreateStcManualImportBatch query failed:', err)
  }

  // 2. Fallback: Supabase
  try {
    const supabase = await getSupabase()
    const { data } = await supabase
      .from('stc_report_imports')
      .select('*')
      .order('uploaded_at', { ascending: false })
      .limit(1)

    if (data && data.length > 0) {
      return data[0] as StcReportImport
    }
  } catch (err) {
    console.warn('STC getOrCreateManualImportBatch Supabase query error:', err)
  }

  const manualBatchId = generateId()
  const newBatchPayload: any = {
    id: manualBatchId,
    file_name: 'Manual STC Student Records',
    file_size: 0,
    uploaded_at: nowStr,
    uploaded_by: 'admin@isquarebpo.com',
    total_records: 0,
    total_pending_amount: 0,
    total_yet_to_raised: 0,
    entity: 'stc',
    raw_headers: [
      'Sr No',
      'Student Name',
      'Agent',
      'Pending Invoice',
      'Pending Amount',
      'Yet to Raised',
      'Intake',
      'Course',
    ],
  }

  try {
    await prisma.stcReportImport.create({
      data: {
        id: manualBatchId,
        fileName: 'Manual STC Student Records',
        fileSize: 0,
        uploadedAt: new Date(),
        uploadedBy: 'admin@isquarebpo.com',
        totalRecords: 0,
        totalPendingAmount: 0,
        totalYetToRaised: 0,
        entity: 'stc',
        rawHeaders: newBatchPayload.raw_headers,
      },
    })
  } catch (mysqlErr) {
    console.warn('MySQL createManualImportBatch failed (non-fatal):', mysqlErr)
  }

  try {
    const supabase = await getSupabase()
    await supabase.from('stc_report_imports').insert(newBatchPayload)
  } catch (err) {
    console.warn('Failed to insert default STC batch to Supabase (non-fatal):', err)
  }

  return {
    ...newBatchPayload,
    created_at: nowStr,
    updated_at: nowStr,
  } as StcReportImport
}

// 9. Create a single new STC student record
export async function createStcReportRecord(params: {
  importId?: string | null
  student_name: string
  student_id?: string | null
  agent?: string | null
  scholarship?: string | null
  pending_invoice?: string | null
  pending_amount?: number | string | null
  yet_to_raised?: string | null
  remarks?: string | null
  dob?: string | null
  document?: string | null
  status?: string | null
  intake?: string | null
  end_date?: string | null
  course?: string | null
  admin_fee?: number | string | null
  resource_fee?: number | string | null
  tuition_fee?: number | string | null
  total_fee?: number | string | null
  paid_amount?: number | string | null
  total_paid?: number | string | null
  initial_payment?: number | string | null
  follow_up?: string | null
  coe_issued_date?: string | null
  email_id?: string | null
  phone_no?: string | null
  payment_status?: string | null
  extra_data?: Record<string, any>
}): Promise<StcReportRecord> {
  let targetImportId = params.importId

  if (!targetImportId) {
    const defaultBatch = await getOrCreateStcManualImportBatch()
    targetImportId = defaultBatch.id
  }

  const newId = generateId()
  const nowStr = new Date().toISOString()

  const pendingAmountNum = cleanNumber(params.pending_amount)
  const yetToRaisedVal = cleanString(params.yet_to_raised)
  const adminFeeNum = cleanNumber(params.admin_fee)
  const resourceFeeNum = cleanNumber(params.resource_fee)
  const tuitionFeeNum = cleanNumber(params.tuition_fee)
  
  const totalFeeNum = params.total_fee !== undefined && params.total_fee !== null && params.total_fee !== ''
    ? cleanNumber(params.total_fee)
    : Math.max(0, adminFeeNum + resourceFeeNum + tuitionFeeNum - (cleanNumber(params.scholarship)))

  const paidAmountNum = cleanNumber(params.paid_amount || params.initial_payment)
  const totalPaidNum = cleanNumber(params.total_paid)
  const followUpVal = cleanString(params.follow_up) || null

  let nextSrNo = 1
  try {
    const maxRecord = await prisma.stcReportRecord.findFirst({
      orderBy: { srNo: 'desc' },
      select: { srNo: true },
    })
    if (maxRecord && typeof maxRecord.srNo === 'number') {
      nextSrNo = maxRecord.srNo + 1
    }
  } catch {
    // fallback
  }

  const extraData = {
    ...(params.extra_data || {}),
    total_paid: totalPaidNum,
    initial_payment: paidAmountNum,
    follow_up: followUpVal,
  }

  let savedRecord: StcReportRecord

  // 1. PRIMARY: Insert into MySQL (Prisma)
  try {
    const importExists = await prisma.stcReportImport.findUnique({ where: { id: targetImportId! } })
    if (!importExists) {
      await prisma.stcReportImport.create({
        data: {
          id: targetImportId!,
          fileName: 'Manual STC Student Records',
          fileSize: 0,
          uploadedAt: new Date(),
          uploadedBy: 'admin@isquarebpo.com',
          totalRecords: 0,
          totalPendingAmount: 0,
          totalYetToRaised: 0,
          entity: 'stc',
        },
      })
    }

    const mysqlRow = await prisma.stcReportRecord.create({
      data: {
        id: newId,
        importId: targetImportId!,
        srNo: nextSrNo,
        studentName: cleanString(params.student_name) || 'Unnamed Student',
        studentId: cleanString(params.student_id) || null,
        agent: cleanString(params.agent) || null,
        scholarship: cleanString(params.scholarship) || null,
        pendingInvoice: cleanString(params.pending_invoice) || null,
        pendingAmount: pendingAmountNum,
        yetToRaised: yetToRaisedVal || null,
        remarks: cleanString(params.remarks) || null,
        followUp: followUpVal,
        dob: cleanString(params.dob) || null,
        document: normalizeDocumentType(params.document) || null,
        status: cleanString(params.status) || 'Current',
        intake: cleanString(params.intake) || null,
        endDate: cleanString(params.end_date) || null,
        course: cleanString(params.course) || null,
        adminFee: adminFeeNum,
        resourceFee: resourceFeeNum,
        tuitionFee: tuitionFeeNum,
        totalFee: totalFeeNum,
        paidAmount: paidAmountNum,
        totalPaid: totalPaidNum,
        coeIssuedDate: cleanString(params.coe_issued_date) || null,
        emailId: cleanString(params.email_id) || null,
        phoneNo: cleanString(params.phone_no) || null,
        paymentStatus: cleanString(params.payment_status) || 'Pending',
        extraData: extraData as any,
      },
    })
    savedRecord = prismaStcRecordToSnake(mysqlRow)
  } catch (mysqlErr: any) {
    console.error('MySQL createStcReportRecord FAILED:', mysqlErr)
    throw mysqlErr
  }

  // 2. NON-FATAL: Mirror to Supabase
  try {
    const supabase = await getSupabase()
    const { initial_payment, total_paid, follow_up, ...dbPayload } = savedRecord as any
    await supabase.from('stc_report_records').insert({ ...dbPayload, id: newId })
  } catch (err) {
    console.warn('Supabase mirror createStcReportRecord failed (non-fatal):', err)
  }

  return savedRecord
}

// 10. Update a single STC student record
export async function updateStcReportRecord(
  id: string,
  updates: Partial<StcReportRecord>
): Promise<StcReportRecord | null> {
  const cleanedUpdates: any = { ...updates }
  if (updates.pending_amount !== undefined) cleanedUpdates.pending_amount = cleanNumber(updates.pending_amount)
  if (updates.admin_fee !== undefined) cleanedUpdates.admin_fee = cleanNumber(updates.admin_fee)
  if (updates.resource_fee !== undefined) cleanedUpdates.resource_fee = cleanNumber(updates.resource_fee)
  if (updates.tuition_fee !== undefined) cleanedUpdates.tuition_fee = cleanNumber(updates.tuition_fee)
  if (updates.total_fee !== undefined) cleanedUpdates.total_fee = cleanNumber(updates.total_fee)
  if (updates.paid_amount !== undefined || (updates as any).initial_payment !== undefined) {
    cleanedUpdates.paid_amount = cleanNumber(updates.paid_amount ?? (updates as any).initial_payment)
  }
  if (updates.yet_to_raised !== undefined) cleanedUpdates.yet_to_raised = cleanString(updates.yet_to_raised) || null
  if (updates.document !== undefined) cleanedUpdates.document = normalizeDocumentType(updates.document) || null

  let updatedRecord: StcReportRecord | null = null

  // 1. PRIMARY: MySQL (Prisma) update — Hostinger live database
  try {
    const mysqlUpdate: any = {}
    if (updates.student_name !== undefined) mysqlUpdate.studentName = cleanString(updates.student_name) || undefined
    if (updates.student_id !== undefined) mysqlUpdate.studentId = cleanString(updates.student_id) || null
    if (updates.agent !== undefined) mysqlUpdate.agent = cleanString(updates.agent) || null
    if (updates.scholarship !== undefined) mysqlUpdate.scholarship = cleanString(updates.scholarship) || null
    if (updates.pending_invoice !== undefined) mysqlUpdate.pendingInvoice = cleanString(updates.pending_invoice) || null
    if (updates.pending_amount !== undefined) mysqlUpdate.pendingAmount = cleanNumber(updates.pending_amount)
    if (updates.yet_to_raised !== undefined) mysqlUpdate.yetToRaised = cleanString(updates.yet_to_raised) || null
    if (updates.remarks !== undefined) mysqlUpdate.remarks = cleanString(updates.remarks) || null
    if (updates.follow_up !== undefined) mysqlUpdate.followUp = cleanString(updates.follow_up) || null
    if (updates.dob !== undefined) mysqlUpdate.dob = cleanString(updates.dob) || null
    if (updates.document !== undefined) mysqlUpdate.document = normalizeDocumentType(updates.document) || null
    if (updates.status !== undefined) mysqlUpdate.status = cleanString(updates.status) || null
    if (updates.intake !== undefined) mysqlUpdate.intake = cleanString(updates.intake) || null
    if (updates.end_date !== undefined) mysqlUpdate.endDate = cleanString(updates.end_date) || null
    if (updates.course !== undefined) mysqlUpdate.course = cleanString(updates.course) || null
    if (updates.admin_fee !== undefined) mysqlUpdate.adminFee = cleanNumber(updates.admin_fee)
    if (updates.resource_fee !== undefined) mysqlUpdate.resourceFee = cleanNumber(updates.resource_fee)
    if (updates.tuition_fee !== undefined) mysqlUpdate.tuitionFee = cleanNumber(updates.tuition_fee)
    if (updates.total_fee !== undefined) mysqlUpdate.totalFee = cleanNumber(updates.total_fee)
    if (updates.paid_amount !== undefined || (updates as any).initial_payment !== undefined) {
      mysqlUpdate.paidAmount = cleanNumber(updates.paid_amount ?? (updates as any).initial_payment)
    }
    if (updates.total_paid !== undefined) mysqlUpdate.totalPaid = cleanNumber(updates.total_paid)
    if (updates.coe_issued_date !== undefined) mysqlUpdate.coeIssuedDate = cleanString(updates.coe_issued_date) || null
    if (updates.email_id !== undefined) mysqlUpdate.emailId = cleanString(updates.email_id) || null
    if (updates.phone_no !== undefined) mysqlUpdate.phoneNo = cleanString(updates.phone_no) || null
    if (updates.payment_status !== undefined) mysqlUpdate.paymentStatus = cleanString(updates.payment_status) || null
    if (updates.extra_data !== undefined) mysqlUpdate.extraData = updates.extra_data as any

    if (Object.keys(mysqlUpdate).length > 0) {
      const mysqlRow = await prisma.stcReportRecord.update({ where: { id }, data: mysqlUpdate })
      updatedRecord = prismaStcRecordToSnake(mysqlRow)
    } else {
      const mysqlRow = await prisma.stcReportRecord.findUnique({ where: { id } })
      if (mysqlRow) updatedRecord = prismaStcRecordToSnake(mysqlRow)
    }
  } catch (mysqlErr: any) {
    console.error('MySQL updateStcReportRecord FAILED:', mysqlErr)
    throw mysqlErr
  }

  // 2. NON-FATAL: Supabase mirror update
  try {
    const supabase = await getSupabase()
    const { data: existingRec } = await supabase
      .from('stc_report_records')
      .select('extra_data, import_id')
      .eq('id', id)
      .maybeSingle()

    const mergedExtraData = {
      ...((existingRec?.extra_data as Record<string, any>) || {}),
      ...((cleanedUpdates.extra_data as Record<string, any>) || {}),
      ...(updates.total_paid !== undefined ? { total_paid: cleanNumber(updates.total_paid) } : {}),
      ...(updates.paid_amount !== undefined ? { initial_payment: cleanNumber(updates.paid_amount) } : {}),
      ...(updates.follow_up !== undefined ? { follow_up: cleanString(updates.follow_up) || null } : {}),
    }

    const supabaseUpdates = { ...cleanedUpdates, extra_data: mergedExtraData }
    delete supabaseUpdates.initial_payment
    delete supabaseUpdates.total_paid
    delete supabaseUpdates.follow_up

    await supabase.from('stc_report_records').update(supabaseUpdates).eq('id', id)
  } catch (err: any) {
    console.warn('Supabase mirror STC update failed (non-fatal):', err)
  }

  return updatedRecord
}

// 11. Delete a single STC student record
export async function deleteStcReportRecord(id: string): Promise<boolean> {
  // 1. PRIMARY: Delete from MySQL (Prisma)
  try {
    await prisma.stcReportRecord.delete({ where: { id } })
  } catch (mysqlErr: any) {
    if (mysqlErr?.code !== 'P2025') {
      console.error('MySQL deleteStcReportRecord FAILED:', mysqlErr)
      throw mysqlErr
    }
  }

  // 2. NON-FATAL: Delete from Supabase
  try {
    const supabase = await getSupabase()
    await supabase.from('stc_report_records').delete().eq('id', id)
  } catch (err) {
    console.warn('Supabase mirror deleteStcReportRecord failed (non-fatal):', err)
  }

  return true
}

// 12. Bulk delete STC student records
export async function deleteStcReportRecords(ids: string[]): Promise<number> {
  if (!ids || ids.length === 0) return 0

  // 1. PRIMARY: Bulk delete from MySQL (Prisma)
  try {
    await prisma.stcReportRecord.deleteMany({ where: { id: { in: ids } } })
  } catch (mysqlErr: any) {
    console.error('MySQL deleteStcReportRecords FAILED:', mysqlErr)
    throw mysqlErr
  }

  // 2. NON-FATAL: Mirror bulk delete to Supabase
  try {
    const supabase = await getSupabase()
    await supabase.from('stc_report_records').delete().in('id', ids)
  } catch (err) {
    console.warn('Supabase mirror deleteStcReportRecords failed (non-fatal):', err)
  }

  return ids.length
}
