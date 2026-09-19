import * as XLSX from 'xlsx'
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

  let existingRecords: StcReportRecord[] = []
  try {
    const { data } = await supabase.from('stc_report_records').select('id, student_name, student_id, course')
    if (data) existingRecords = data as StcReportRecord[]
  } catch {
    // fallback
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

// 3. Save STC imported Excel data to Supabase Live Database
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
  const supabase = await getSupabase()
  const duplicateStrategy = params.duplicateStrategy || 'override'
  const nowStr = new Date().toISOString()
  const importBatchId = generateId()

  let existingRecords: StcReportRecord[] = []
  try {
    const { data: dbRecords } = await supabase.from('stc_report_records').select('*')
    if (dbRecords) {
      existingRecords = dbRecords as StcReportRecord[]
    }
  } catch (err) {
    console.warn('Could not fetch existing STC records from Supabase:', err)
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
      await supabase.from('stc_report_records').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      existingRecords = []
      existingById.clear()
      existingByName.clear()
    } catch (err) {
      console.error('Error clearing existing STC records for replace strategy:', err)
    }
  }

  let overriddenCount = 0
  let skippedCount = 0
  let newCount = 0

  const recordsToInsert: any[] = []

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

  let finalImportBatchId = importBatchId
  try {
    const { data, error } = await supabase.from('stc_report_imports').insert(importPayload).select().single()
    if (!error && data) {
      finalImportBatchId = data.id
    }
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
        const updatedPayload: any = {
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
          extra_data: {
            ...((existing.extra_data as Record<string, any>) || {}),
            ...(incoming.extra_data || {}),
            total_paid: incoming.total_paid || incoming.paid_amount,
            initial_payment: incoming.paid_amount,
          },
        }

        try {
          const { error: updErr } = await supabase.from('stc_report_records').update(updatedPayload).eq('id', existing.id)
          if (!updErr) {
            overriddenCount++
          }
        } catch (err) {
          console.error(`Error overriding student ${incoming.student_name}:`, err)
        }
        continue
      }
    }

    newCount++
    let newSrNo = incoming.sr_no || nextSrNo++
    if (newSrNo <= 0 || newSrNo > 100000) {
      newSrNo = nextSrNo++
    }

    recordsToInsert.push({
      id: generateId(),
      import_id: finalImportBatchId,
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
      extra_data: {
        ...(incoming.extra_data || {}),
        total_paid: incoming.total_paid || incoming.paid_amount,
        initial_payment: incoming.paid_amount,
      },
      created_at: nowStr,
    })
  }

  // Batch insert new records in chunks of 100
  if (recordsToInsert.length > 0) {
    const CHUNK_SIZE = 100
    for (let i = 0; i < recordsToInsert.length; i += CHUNK_SIZE) {
      const chunk = recordsToInsert.slice(i, i + CHUNK_SIZE)
      try {
        await supabase.from('stc_report_records').insert(chunk)
      } catch (err) {
        console.error('Error inserting STC record chunk into Supabase:', err)
      }
    }
  }

  // Update batch totals
  try {
    const { data: allFinalRows } = await supabase.from('stc_report_records').select('pending_amount, yet_to_raised')
    if (allFinalRows) {
      const finalTotalPending = allFinalRows.reduce((sum, r) => sum + (Number(r.pending_amount) || 0), 0)
      const finalTotalYet = allFinalRows.reduce((sum, r) => sum + cleanNumber(r.yet_to_raised), 0)

      await supabase.from('stc_report_imports').update({
        total_records: allFinalRows.length,
        total_pending_amount: Number(finalTotalPending.toFixed(2)),
        total_yet_to_raised: Number(finalTotalYet.toFixed(2)),
        updated_at: nowStr,
      }).eq('id', finalImportBatchId)
    }
  } catch (err) {
    console.warn('Could not update STC import batch totals:', err)
  }

  return {
    importBatch: {
      ...importPayload,
      id: finalImportBatchId,
    } as StcReportImport,
    recordCount: recordsToInsert.length + overriddenCount,
    overriddenCount,
    skippedCount,
    newCount,
  }
}

// 4. Fetch all STC import history batches
export async function getStcReportImports(): Promise<StcReportImport[]> {
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

// 5. Fetch a single import batch by ID (including original base64 file data)
export async function getStcReportImportById(id: string, includeFileData: boolean = false): Promise<StcReportImport | null> {
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

    // Calculate totals across whole dataset
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
    console.error('Error in getStcReportRecords:', err)
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
  const supabase = await getSupabase()
  try {
    await supabase.from('stc_report_imports').delete().eq('id', id)
  } catch (err) {
    console.error('Error deleting STC import batch:', err)
    throw err
  }
}

// 8. Get or create a manual entries import batch for STC
export async function getOrCreateStcManualImportBatch(): Promise<StcReportImport> {
  const supabase = await getSupabase()
  const nowStr = new Date().toISOString()

  try {
    const { data } = await supabase
      .from('stc_report_imports')
      .select('*')
      .order('uploaded_at', { ascending: false })
      .limit(1)

    if (data && data.length > 0) {
      return data[0] as StcReportImport
    }
  } catch (err) {
    console.warn('STC getOrCreateManualImportBatch query error:', err)
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
    const { data, error } = await supabase.from('stc_report_imports').insert(newBatchPayload).select().single()
    if (!error && data) {
      return data as StcReportImport
    }
  } catch (err) {
    console.warn('Failed to insert default STC batch:', err)
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
  const supabase = await getSupabase()
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
    const { data: maxRecord } = await supabase
      .from('stc_report_records')
      .select('sr_no')
      .order('sr_no', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (maxRecord && typeof maxRecord.sr_no === 'number') {
      nextSrNo = maxRecord.sr_no + 1
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

  const recordPayload = {
    id: newId,
    import_id: targetImportId!,
    sr_no: nextSrNo,
    student_name: cleanString(params.student_name) || 'Unnamed Student',
    student_id: cleanString(params.student_id) || null,
    agent: cleanString(params.agent) || null,
    scholarship: cleanString(params.scholarship) || null,
    pending_invoice: cleanString(params.pending_invoice) || null,
    pending_amount: pendingAmountNum,
    yet_to_raised: yetToRaisedVal || null,
    remarks: cleanString(params.remarks) || null,
    follow_up: followUpVal,
    dob: cleanString(params.dob) || null,
    document: normalizeDocumentType(params.document) || null,
    status: cleanString(params.status) || 'Current',
    intake: cleanString(params.intake) || null,
    end_date: cleanString(params.end_date) || null,
    course: cleanString(params.course) || null,
    admin_fee: adminFeeNum,
    resource_fee: resourceFeeNum,
    tuition_fee: tuitionFeeNum,
    total_fee: totalFeeNum,
    paid_amount: paidAmountNum,
    total_paid: totalPaidNum,
    coe_issued_date: cleanString(params.coe_issued_date) || null,
    email_id: cleanString(params.email_id) || null,
    phone_no: cleanString(params.phone_no) || null,
    payment_status: cleanString(params.payment_status) || 'Pending',
    extra_data: extraData,
    created_at: nowStr,
  }

  const { data, error } = await supabase.from('stc_report_records').insert(recordPayload).select().single()
  if (error) {
    console.error('Supabase STC record insert error:', error)
    throw new Error(`Database insert error: ${error.message}`)
  }

  return data as StcReportRecord
}

// 10. Update a single STC student record
export async function updateStcReportRecord(
  id: string,
  updates: Partial<StcReportRecord>
): Promise<StcReportRecord | null> {
  const supabase = await getSupabase()

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

  cleanedUpdates.extra_data = mergedExtraData

  const { data, error } = await supabase
    .from('stc_report_records')
    .update(cleanedUpdates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Supabase STC update error:', error)
    throw new Error(`Database update error: ${error.message}`)
  }

  return data as StcReportRecord
}

// 11. Delete a single STC student record
export async function deleteStcReportRecord(id: string): Promise<boolean> {
  const supabase = await getSupabase()
  const { error } = await supabase.from('stc_report_records').delete().eq('id', id)
  if (error) {
    console.error('Supabase delete error:', error)
    throw new Error(`Database delete error: ${error.message}`)
  }
  return true
}

// 12. Bulk delete STC student records
export async function deleteStcReportRecords(ids: string[]): Promise<number> {
  if (!ids || ids.length === 0) return 0
  const supabase = await getSupabase()
  const { error } = await supabase.from('stc_report_records').delete().in('id', ids)
  if (error) {
    console.error('Supabase bulk delete error:', error)
    throw new Error(`Database bulk delete error: ${error.message}`)
  }
  return ids.length
}
