import * as XLSX from 'xlsx'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/client'
import type { AimtReportImport, AimtReportRecord } from '@/lib/supabase/database.types'

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
  return String(val).trim()
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
    // Excel date serial number
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

// Normalize document type: e.g. "CoE + Offer Letter" / "COE+OFFER LETTER" / "CoE Received" -> "CoE", "VoE Received" -> "VoE", "Offer Letter" -> "Offer Letter"
export function normalizeDocumentType(val: any): string {
  if (!val && val !== 0) return ''
  const str = String(val).trim()
  const lower = str.toLowerCase()
  if (lower.includes('coe')) {
    return 'CoE'
  }
  if (lower.includes('voe')) {
    return 'VoE'
  }
  if (lower.includes('offer')) {
    return 'Offer Letter'
  }
  return str
}

export interface ParsedStudentRow {
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
  coe_issued_date: string | null
  email_id: string | null
  phone_no: string | null
  payment_status: string | null
  extra_data: Record<string, any>
}

export interface ParsedReportFileResult {
  fileName: string
  fileSize: number
  rawHeaders: string[]
  records: ParsedStudentRow[]
  totalRecords: number
  totalPendingAmount: number
  totalYetToRaised: number
}

// Clean worksheet bounding box to prevent SheetJS from allocating 1M rows
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

// Parse Excel file buffer into structured student rows
export function parseStudentReportExcel(buffer: ArrayBuffer | Buffer, fileName: string): ParsedReportFileResult {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })

  let bestSheetName = workbook.SheetNames[0]
  let bestRows: any[][] = []
  let bestHeaderIndex = 0
  let maxScore = -1

  // Scan all sheets in the workbook to automatically pick the most comprehensive report sheet
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

  // Find column index helper with exact-first priority and exclusion filters
  function findColIndex(possibleNames: string[], excludeWords: string[] = []): number {
    // Phase 1: Exact match
    for (const name of possibleNames) {
      const idx = normalizedHeaders.findIndex((h) => {
        if (excludeWords.some((ew) => h.includes(ew))) return false
        return h === name
      })
      if (idx !== -1) return idx
    }

    // Phase 2: Whole word match
    for (const name of possibleNames) {
      const idx = normalizedHeaders.findIndex((h) => {
        if (excludeWords.some((ew) => h.includes(ew))) return false
        const regex = new RegExp(`(^|\\s)${name}(\\s|$)`, 'i')
        return regex.test(h)
      })
      if (idx !== -1) return idx
    }

    // Phase 3: Substring match (with exclusions)
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
    remarks: findColIndex(['remarks', 'remark', 'comments', 'comment', 'notes', 'note']),
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

  const parsedRecords: ParsedStudentRow[] = []
  let totalPendingAmount = 0
  let totalYetToRaised = 0

  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r]
    if (!row || !Array.isArray(row)) continue

    // Extract student name
    const studentName = colMap.student_name !== -1 ? cleanString(row[colMap.student_name]) : ''
    
    // Skip empty row if student name and most cells are empty
    const nonBlankCount = row.filter((c) => c !== '' && c !== null && c !== undefined).length
    if (!studentName && nonBlankCount < 2) continue

    // Fallback if student name is empty but other columns exist
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

    // Extra columns collector
    const extraData: Record<string, any> = {}
    row.forEach((cellVal, cIdx) => {
      const headerTitle = rawHeaders[cIdx] || `col_${cIdx + 1}`
      extraData[headerTitle] = cellVal
    })

    const totalPaidNum = colMap.total_paid !== -1 ? cleanNumber(row[colMap.total_paid]) : (cleanNumber(extraData['Total Paid']) || cleanNumber(extraData['Total Paid ($)']) || 0)
    extraData['total_paid'] = totalPaidNum

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

// Server-side fallback file storage helper
function getFsAndPath() {
  if (typeof window !== 'undefined') return null
  try {
    const fs = require('fs')
    const path = require('path')
    return { fs, path }
  } catch {
    return null
  }
}

function getReportStoragePath(): string | null {
  const tools = getFsAndPath()
  if (!tools) return null
  return tools.path.join(process.cwd(), 'data', 'aimt_reports_storage.json')
}

interface LocalReportStorageData {
  imports: Record<string, AimtReportImport>
  records: Record<string, AimtReportRecord[]>
}

let inMemoryReportStorage: LocalReportStorageData | null = null

function readLocalReportStorage(): LocalReportStorageData {
  if (inMemoryReportStorage) return inMemoryReportStorage
  const tools = getFsAndPath()
  const filePath = getReportStoragePath()
  if (!tools || !filePath) return { imports: {}, records: {} }

  try {
    if (!tools.fs.existsSync(filePath)) {
      const dir = tools.path.dirname(filePath)
      if (!tools.fs.existsSync(dir)) {
        tools.fs.mkdirSync(dir, { recursive: true })
      }
      tools.fs.writeFileSync(filePath, JSON.stringify({ imports: {}, records: {} }, null, 2), 'utf-8')
      inMemoryReportStorage = { imports: {}, records: {} }
      return inMemoryReportStorage
    }
    const raw = tools.fs.readFileSync(filePath, 'utf-8')
    inMemoryReportStorage = JSON.parse(raw || '{"imports":{},"records":{}}')
    return inMemoryReportStorage || { imports: {}, records: {} }
  } catch (err) {
    console.error('Error reading local report storage:', err)
    return { imports: {}, records: {} }
  }
}

function saveLocalReportStorage(data: LocalReportStorageData) {
  inMemoryReportStorage = data
  const tools = getFsAndPath()
  const filePath = getReportStoragePath()
  if (!tools || !filePath) return

  try {
    const dir = tools.path.dirname(filePath)
    if (!tools.fs.existsSync(dir)) {
      tools.fs.mkdirSync(dir, { recursive: true })
    }
    tools.fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error('Error writing local report storage:', err)
  }
}

// Generate standard RFC 4122 UUID
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

// Preview an Excel file before committing to database (detects matches vs new records)
export async function previewReportImport(buffer: ArrayBuffer | Buffer, fileName: string): Promise<{
  totalRecords: number
  matchingCount: number
  newCount: number
  sampleMatches: { student_name: string; student_id?: string | null; course?: string | null }[]
  sampleNew: { student_name: string; student_id?: string | null; course?: string | null }[]
  totalPendingAmount: number
  totalYetToRaised: number
}> {
  const parseResult = parseStudentReportExcel(buffer, fileName)
  const supabase = await getSupabase()

  let existingRecords: AimtReportRecord[] = []
  try {
    const { data } = await supabase.from('aimt_report_records').select('id, student_name, student_id, course')
    if (data) existingRecords = data as AimtReportRecord[]
  } catch {
    // fallback
  }

  const existingById = new Map<string, AimtReportRecord>()
  const existingByName = new Map<string, AimtReportRecord>()

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

// Save or Update imported Excel data to Supabase Live Database
export async function saveReportImportToDatabase(params: {
  fileName: string
  fileSize: number
  uploadedBy?: string
  originalBase64?: string
  rawHeaders?: string[]
  records: ParsedStudentRow[]
  entity?: string
  duplicateStrategy?: 'override' | 'skip' | 'replace'
}): Promise<{
  importBatch: AimtReportImport
  recordCount: number
  overriddenCount: number
  skippedCount: number
  newCount: number
}> {
  const supabase = await getSupabase()
  const entity = params.entity || 'aimt'
  const duplicateStrategy = params.duplicateStrategy || 'override'
  const nowStr = new Date().toISOString()
  const fallbackId = generateId()

  let importBatchId = fallbackId

  // 1. Fetch all existing records in Supabase to compare
  let existingRecords: AimtReportRecord[] = []
  try {
    const { data: dbRecords } = await supabase.from('aimt_report_records').select('*')
    if (dbRecords) {
      existingRecords = dbRecords as AimtReportRecord[]
    }
  } catch (err) {
    console.warn('Could not fetch existing records from Supabase:', err)
  }

  // Create lookup maps by student_id and student_name
  const existingById = new Map<string, AimtReportRecord>()
  const existingByName = new Map<string, AimtReportRecord>()

  existingRecords.forEach((r) => {
    if (r.student_id && r.student_id.trim()) {
      existingById.set(r.student_id.trim().toLowerCase(), r)
    }
    if (r.student_name && r.student_name.trim()) {
      existingByName.set(r.student_name.trim().toLowerCase(), r)
    }
  })

  // 2. Handle 'replace' strategy (clears prior data)
  if (duplicateStrategy === 'replace') {
    try {
      await supabase.from('aimt_report_records').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      existingRecords = []
      existingById.clear()
      existingByName.clear()
    } catch (err) {
      console.error('Error clearing existing records for replace strategy:', err)
    }
  }

  // 3. Process records according to strategy
  let overriddenCount = 0
  let skippedCount = 0
  let newCount = 0

  const recordsToInsert: any[] = []

  // Create or get import batch
  const importPayload = {
    id: importBatchId,
    file_name: params.fileName,
    file_size: params.fileSize,
    uploaded_at: nowStr,
    uploaded_by: params.uploadedBy || 'admin@isquarebpo.com',
    total_records: 0,
    total_pending_amount: 0,
    total_yet_to_raised: 0,
    entity: entity,
    raw_headers: (params.rawHeaders || []) as any,
    created_at: nowStr,
    updated_at: nowStr,
  }

  try {
    const { data, error } = await supabase.from('aimt_report_imports').insert(importPayload).select().single()
    if (!error && data) {
      importBatchId = data.id
    } else if (error) {
      console.warn('Import batch insert with ID failed, attempting fallback query:', error)
      const { data: defaultBatch } = await supabase.from('aimt_report_imports').select('id').limit(1).maybeSingle()
      if (defaultBatch) {
        importBatchId = defaultBatch.id
      }
    }
  } catch (err) {
    console.warn('Error creating import batch in Supabase:', err)
  }

  // Find max sr_no
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
        // Update the existing record in Supabase
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
          const { error: updErr } = await supabase.from('aimt_report_records').update(updatedPayload).eq('id', existing.id)
          if (updErr) {
            console.error(`Error overriding student ${incoming.student_name}:`, updErr)
          } else {
            overriddenCount++
          }
        } catch (err) {
          console.error(`Error overriding student ${incoming.student_name}:`, err)
        }
        continue
      }
    }

    // New non-matching record: prepare insert
    newCount++
    let newSrNo = incoming.sr_no || nextSrNo++
    if (newSrNo <= 0 || newSrNo > 100000) {
      newSrNo = nextSrNo++
    }
    recordsToInsert.push({
      id: generateId(),
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
      document: normalizeDocumentType(incoming.document) || null,
      status: incoming.status,
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

  // Insert new records in chunks to Supabase
  if (recordsToInsert.length > 0) {
    const chunkSize = 100
    for (let i = 0; i < recordsToInsert.length; i += chunkSize) {
      const chunk = recordsToInsert.slice(i, i + chunkSize)
      try {
        const { error: insErr } = await supabase.from('aimt_report_records').insert(chunk)
        if (insErr) {
          console.error('CRITICAL: Error inserting records chunk to Supabase:', insErr)
          throw new Error(insErr.message)
        }
      } catch (err) {
        console.error('Error inserting records chunk to Supabase:', err)
        throw err
      }
    }
  }

  // Recalculate totals in Supabase
  let finalTotalRecords = 0
  let finalPendingAmount = 0
  let finalYetToRaised = 0

  try {
    const { data: allFinalRows } = await supabase.from('aimt_report_records').select('pending_amount, yet_to_raised')
    if (allFinalRows) {
      finalTotalRecords = allFinalRows.length
      finalPendingAmount = allFinalRows.reduce((sum, r) => sum + (Number(r.pending_amount) || 0), 0)
      finalYetToRaised = allFinalRows.reduce((sum, r) => sum + cleanNumber(r.yet_to_raised), 0)

      await supabase.from('aimt_report_imports').update({
        total_records: finalTotalRecords,
        total_pending_amount: finalPendingAmount,
        total_yet_to_raised: finalYetToRaised,
        updated_at: nowStr,
      }).eq('id', importBatchId)
    }
  } catch {
    // ignore
  }

  // Update server storage backup
  const store = readLocalReportStorage()
  if (duplicateStrategy === 'replace') {
    store.records = {}
    store.records[importBatchId] = recordsToInsert
  } else {
    if (!store.records[importBatchId]) store.records[importBatchId] = []
    store.records[importBatchId].push(...recordsToInsert)
  }
  store.imports[importBatchId] = {
    ...importPayload,
    id: importBatchId,
    total_records: finalTotalRecords,
    total_pending_amount: finalPendingAmount,
    total_yet_to_raised: finalYetToRaised,
  } as AimtReportImport
  saveLocalReportStorage(store)

  return {
    importBatch: store.imports[importBatchId],
    recordCount: finalTotalRecords,
    overriddenCount,
    skippedCount,
    newCount,
  }
}

// Fetch all import history batches
export async function getReportImports(entity: string = 'aimt'): Promise<AimtReportImport[]> {
  const supabase = await getSupabase()
  try {
    const { data, error } = await supabase
      .from('aimt_report_imports')
      .select('id, file_name, file_size, uploaded_at, uploaded_by, total_records, total_pending_amount, total_yet_to_raised, entity, raw_headers, created_at, updated_at')
      .eq('entity', entity)
      .order('uploaded_at', { ascending: false })

    if (!error && data && data.length > 0) {
      return data as unknown as AimtReportImport[]
    }
  } catch {
    // ignore
  }

  // Fallback to local storage
  const store = readLocalReportStorage()
  const list = Object.values(store.imports || {})
    .filter((item) => (item.entity || 'aimt') === entity)
    .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())

  return list
}

// Fetch a single import batch by ID (including original file data if needed)
export async function getReportImportById(id: string, includeFileData: boolean = false): Promise<AimtReportImport | null> {
  const supabase = await getSupabase()
  try {
    const query = includeFileData
      ? supabase.from('aimt_report_imports').select('*')
      : supabase.from('aimt_report_imports').select('id, file_name, file_size, uploaded_at, uploaded_by, total_records, total_pending_amount, total_yet_to_raised, entity, raw_headers, created_at, updated_at')
    
    const { data, error } = await query.eq('id', id).maybeSingle()
    if (!error && data) {
      return data as unknown as AimtReportImport
    }
  } catch {
    // ignore
  }

  // Fallback to local storage
  const store = readLocalReportStorage()
  return store.imports[id] || null
}

// Fetch records for an import batch or all recent records with filters
export async function getReportRecords(params: {
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
  records: AimtReportRecord[]
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

  let targetImportId = params.importId

  let query = supabase
    .from('aimt_report_records')
    .select('*', { count: 'exact' })

  if (targetImportId) {
    query = query.eq('import_id', targetImportId)
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

  // Sorting
  query = query.order(sortBy, { ascending: sortOrder === 'asc' })

  // Pagination
  if (pageSize !== -1) {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)
  }

  let data: any[] | null = null
  let count: number | null = null
  let error: any = null

  try {
    const res = await query
    data = res.data
    count = res.count
    error = res.error
  } catch (err) {
    error = err
  }

  // If Supabase succeeded and returned records
  if (!error && data !== null) {
    // Calculate totals and fetch unique filter options
    let totalsQuery = supabase
      .from('aimt_report_records')
      .select('pending_amount, yet_to_raised, agent, intake, course')

    if (targetImportId) {
      totalsQuery = totalsQuery.eq('import_id', targetImportId)
    }

    const { data: allBatchRecords } = await totalsQuery

    let totalPending = 0
    let totalYetRaised = 0
    const agentSet = new Set<string>()
    const intakeSet = new Set<string>()
    const courseSet = new Set<string>()

    if (allBatchRecords) {
      allBatchRecords.forEach((r) => {
        totalPending += Number(r.pending_amount || 0)
        totalYetRaised += cleanNumber(r.yet_to_raised)
        if (r.agent) agentSet.add(r.agent)
        if (r.intake) intakeSet.add(r.intake)
        if (r.course) courseSet.add(r.course)
      })
    }

    const formattedRecords: AimtReportRecord[] = (data || []).map((r: any) => ({
      ...r,
      total_paid: r.total_paid !== undefined && r.total_paid !== null ? Number(r.total_paid) : (r.extra_data?.total_paid !== undefined ? Number(r.extra_data.total_paid) : 0),
      paid_amount: r.paid_amount !== undefined && r.paid_amount !== null ? Number(r.paid_amount) : 0,
    }))

    return {
      records: formattedRecords,
      totalCount: count !== null ? count : data.length,
      totalPendingAmount: Number(totalPending.toFixed(2)),
      totalYetToRaised: Number(totalYetRaised.toFixed(2)),
      availableAgents: Array.from(agentSet).sort(),
      availableIntakes: Array.from(intakeSet).sort(),
      availableCourses: Array.from(courseSet).sort(),
    }
  }

  // Fallback to local server storage
  const store = readLocalReportStorage()
  let rawBatch = targetImportId
    ? store.records[targetImportId] || []
    : Object.values(store.records || {}).flat()

  // Auto-heal / re-parse previously parsed batches if they missed columns due to multi-sheet workbook
  if (
    targetImportId &&
    rawBatch.length > 0 &&
    (!rawBatch[0].pending_amount && !rawBatch[0].pending_invoice && !rawBatch[0].intake) &&
    store.imports[targetImportId]?.original_file_data
  ) {
    try {
      const rawBuf = Buffer.from(store.imports[targetImportId].original_file_data!, 'base64')
      const reparseResult = parseStudentReportExcel(rawBuf, store.imports[targetImportId].file_name)
      if (reparseResult.records.length > 0) {
        const updatedList: AimtReportRecord[] = reparseResult.records.map((r, idx) => ({
          id: generateId(),
          import_id: targetImportId!,
          sr_no: r.sr_no || idx + 1,
          student_name: r.student_name,
          student_id: r.student_id,
          agent: r.agent,
          scholarship: r.scholarship,
          pending_invoice: r.pending_invoice,
          pending_amount: r.pending_amount,
          yet_to_raised: r.yet_to_raised,
          remarks: r.remarks,
          dob: r.dob,
          document: r.document,
          status: r.status,
          intake: r.intake,
          end_date: r.end_date,
          course: r.course,
          admin_fee: r.admin_fee,
          resource_fee: r.resource_fee,
          tuition_fee: r.tuition_fee,
          total_fee: r.total_fee,
          paid_amount: r.paid_amount,
          coe_issued_date: r.coe_issued_date,
          email_id: r.email_id,
          phone_no: r.phone_no,
          payment_status: r.payment_status,
          extra_data: r.extra_data as any,
          created_at: new Date().toISOString(),
        }))
        store.records[targetImportId!] = updatedList
        if (store.imports[targetImportId!]) {
          store.imports[targetImportId!].total_pending_amount = reparseResult.totalPendingAmount
          store.imports[targetImportId!].total_yet_to_raised = reparseResult.totalYetToRaised
          store.imports[targetImportId!].total_records = updatedList.length
        }
        saveLocalReportStorage(store)
        rawBatch = updatedList
      }
    } catch (err) {
      console.error('Error auto-reparsing batch:', err)
    }
  }

  let filtered = [...rawBatch]

  if (params.search && params.search.trim()) {
    const q = params.search.trim().toLowerCase()
    filtered = filtered.filter(
      (r) =>
        r.student_name?.toLowerCase().includes(q) ||
        r.agent?.toLowerCase().includes(q) ||
        r.course?.toLowerCase().includes(q) ||
        r.student_id?.toLowerCase().includes(q) ||
        r.intake?.toLowerCase().includes(q)
    )
  }

  if (params.agent && params.agent !== 'all') {
    filtered = filtered.filter((r) => r.agent === params.agent)
  }

  if (params.intake && params.intake !== 'all') {
    filtered = filtered.filter((r) => r.intake === params.intake)
  }

  if (params.course && params.course !== 'all') {
    filtered = filtered.filter((r) => r.course === params.course)
  }

  // Sorting
  filtered.sort((a, b) => {
    let aVal: any = a[sortBy as keyof AimtReportRecord] ?? ''
    let bVal: any = b[sortBy as keyof AimtReportRecord] ?? ''
    if (sortBy === 'pending_amount' || sortBy === 'sr_no') {
      aVal = Number(aVal) || 0
      bVal = Number(bVal) || 0
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
    }
    if (typeof aVal === 'string') aVal = aVal.toLowerCase()
    if (typeof bVal === 'string') bVal = bVal.toLowerCase()
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  let totalPending = 0
  let totalYetRaised = 0
  const agentSet = new Set<string>()
  const intakeSet = new Set<string>()
  const courseSet = new Set<string>()

  rawBatch.forEach((r) => {
    totalPending += Number(r.pending_amount || 0)
    totalYetRaised += cleanNumber(r.yet_to_raised)
    if (r.agent) agentSet.add(r.agent)
    if (r.intake) intakeSet.add(r.intake)
    if (r.course) courseSet.add(r.course)
  })

  const localFrom = (page - 1) * pageSize
  const pagedRecords = pageSize === -1 ? filtered : filtered.slice(localFrom, localFrom + pageSize)

  return {
    records: pagedRecords,
    totalCount: filtered.length,
    totalPendingAmount: Number(totalPending.toFixed(2)),
    totalYetToRaised: Number(totalYetRaised.toFixed(2)),
    availableAgents: Array.from(agentSet).sort(),
    availableIntakes: Array.from(intakeSet).sort(),
    availableCourses: Array.from(courseSet).sort(),
  }
}

// Delete an import batch and all its records
export async function deleteReportImport(id: string): Promise<void> {
  const supabase = await getSupabase()
  try {
    await supabase.from('aimt_report_imports').delete().eq('id', id)
  } catch {
    // ignore
  }

  const store = readLocalReportStorage()
  delete store.imports[id]
  delete store.records[id]
  saveLocalReportStorage(store)
}

// Get or create a manual entries import batch to link manually added records
export async function getOrCreateManualImportBatch(entity: string = 'aimt'): Promise<AimtReportImport> {
  const supabase = await getSupabase()
  const nowStr = new Date().toISOString()
  
  // 1. Try to find latest active batch for this entity in Supabase
  try {
    const { data, error } = await supabase
      .from('aimt_report_imports')
      .select('*')
      .eq('entity', entity)
      .order('uploaded_at', { ascending: false })
      .limit(1)

    if (!error && data && data.length > 0) {
      return data[0] as AimtReportImport
    }
  } catch (err) {
    console.warn('Supabase getOrCreateManualImportBatch query failed:', err)
  }

  // 2. Create a default "Manual Student Records" batch in Supabase
  const manualBatchId = generateId()
  const newBatchPayload: any = {
    id: manualBatchId,
    file_name: 'Manual Student Records',
    file_size: 0,
    uploaded_at: nowStr,
    uploaded_by: 'admin@isquarebpo.com',
    total_records: 0,
    total_pending_amount: 0,
    total_yet_to_raised: 0,
    entity: entity,
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
    const { data, error } = await supabase
      .from('aimt_report_imports')
      .insert(newBatchPayload)
      .select()
      .single()

    if (!error && data) {
      return data as AimtReportImport
    }
  } catch (err) {
    console.warn('Failed to insert default batch into Supabase:', err)
  }

  const createdBatch = {
    ...newBatchPayload,
    created_at: nowStr,
    updated_at: nowStr,
  } as AimtReportImport

  const store = readLocalReportStorage()
  store.imports[manualBatchId] = createdBatch
  if (!store.records[manualBatchId]) {
    store.records[manualBatchId] = []
  }
  saveLocalReportStorage(store)

  return createdBatch
}

// 1. Create a single new student report record directly in the database
export async function createReportRecord(params: {
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
  coe_issued_date?: string | null
  email_id?: string | null
  phone_no?: string | null
  payment_status?: string | null
  extra_data?: Record<string, any>
}): Promise<AimtReportRecord> {
  const supabase = await getSupabase()
  let targetImportId = params.importId

  // Ensure an import batch exists in Supabase
  if (!targetImportId) {
    const defaultBatch = await getOrCreateManualImportBatch('aimt')
    targetImportId = defaultBatch.id
  } else {
    // Verify targetImportId exists in Supabase
    try {
      const { data: existingBatch } = await supabase
        .from('aimt_report_imports')
        .select('id')
        .eq('id', targetImportId)
        .maybeSingle()

      if (!existingBatch) {
        const defaultBatch = await getOrCreateManualImportBatch('aimt')
        targetImportId = defaultBatch.id
      }
    } catch {
      // fallback
    }
  }

  const newId = generateId()
  const nowStr = new Date().toISOString()

  // Clean numeric values
  const pendingAmountNum = cleanNumber(params.pending_amount)
  const yetToRaisedVal = cleanString(params.yet_to_raised)
  const adminFeeNum = cleanNumber(params.admin_fee)
  const resourceFeeNum = cleanNumber(params.resource_fee)
  const tuitionFeeNum = cleanNumber(params.tuition_fee)
  
  // Auto-calculated total fee fallback if not supplied
  const totalFeeNum = params.total_fee !== undefined && params.total_fee !== null && params.total_fee !== ''
    ? cleanNumber(params.total_fee)
    : Math.max(0, adminFeeNum + resourceFeeNum + tuitionFeeNum - (cleanNumber(params.scholarship)))

  const paidAmountNum = cleanNumber(params.paid_amount || params.initial_payment)
  const totalPaidNum = cleanNumber(params.total_paid)

  // Find highest Sr No in Supabase
  let nextSrNo = 1
  try {
    const { data: maxRecord } = await supabase
      .from('aimt_report_records')
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
  }

  const recordPayload: AimtReportRecord = {
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
    initial_payment: paidAmountNum,
    coe_issued_date: cleanString(params.coe_issued_date) || null,
    email_id: cleanString(params.email_id) || null,
    phone_no: cleanString(params.phone_no) || null,
    payment_status: cleanString(params.payment_status) || 'Pending',
    extra_data: extraData,
    created_at: nowStr,
  }

  // 1. Insert into Supabase (Live Database Server)
  let savedRecord = recordPayload
  try {
    const { initial_payment, total_paid, ...dbPayload } = recordPayload as any
    const { data, error } = await supabase
      .from('aimt_report_records')
      .insert(dbPayload)
      .select()
      .single()

    if (error) {
      console.error('Supabase record insert error:', error)
      throw new Error(`Database insert error: ${error.message}`)
    }

    if (data) {
      savedRecord = data as AimtReportRecord
      // Update batch totals in Supabase
      try {
        const { data: allRows } = await supabase
          .from('aimt_report_records')
          .select('pending_amount, yet_to_raised')
          .eq('import_id', targetImportId)

        if (allRows) {
          const totalPending = allRows.reduce((acc, r) => acc + (Number(r.pending_amount) || 0), 0)
          const totalYet = allRows.reduce((acc, r) => acc + cleanNumber(r.yet_to_raised), 0)
          await supabase
            .from('aimt_report_imports')
            .update({
              total_records: allRows.length,
              total_pending_amount: totalPending,
              total_yet_to_raised: totalYet,
              updated_at: nowStr,
            })
            .eq('id', targetImportId)
        }
      } catch {
        // ignore
      }
    }
  } catch (err: any) {
    console.error('CRITICAL: Supabase insert failed:', err)
    throw err
  }

  // 2. Backup update in local server storage
  const store = readLocalReportStorage()
  if (!store.records[targetImportId!]) {
    store.records[targetImportId!] = []
  }
  store.records[targetImportId!].push(savedRecord)
  saveLocalReportStorage(store)

  return savedRecord
}

// 2. Update a student record directly in the database
export async function updateReportRecord(
  id: string,
  updates: Partial<AimtReportRecord>
): Promise<AimtReportRecord | null> {
  const supabase = await getSupabase()
  const nowStr = new Date().toISOString()

  // Clean numeric values if provided
  const cleanedUpdates: any = { ...updates }
  if (updates.pending_amount !== undefined) cleanedUpdates.pending_amount = cleanNumber(updates.pending_amount)
  if (updates.admin_fee !== undefined) cleanedUpdates.admin_fee = cleanNumber(updates.admin_fee)
  if (updates.resource_fee !== undefined) cleanedUpdates.resource_fee = cleanNumber(updates.resource_fee)
  if (updates.tuition_fee !== undefined) cleanedUpdates.tuition_fee = cleanNumber(updates.tuition_fee)
  if (updates.total_fee !== undefined) cleanedUpdates.total_fee = cleanNumber(updates.total_fee)
  if (updates.paid_amount !== undefined || updates.initial_payment !== undefined) {
    const pAmt = cleanNumber(updates.paid_amount ?? updates.initial_payment)
    cleanedUpdates.paid_amount = pAmt
  }
  if (updates.yet_to_raised !== undefined) cleanedUpdates.yet_to_raised = cleanString(updates.yet_to_raised) || null
  if (updates.document !== undefined) cleanedUpdates.document = normalizeDocumentType(updates.document) || null

  let updatedRecord: AimtReportRecord | null = null

  // 1. Supabase Update (Live Database Server)
  try {
    // Fetch existing extra_data to merge safely
    const { data: existingRec } = await supabase
      .from('aimt_report_records')
      .select('extra_data, import_id')
      .eq('id', id)
      .maybeSingle()

    const mergedExtraData = {
      ...((existingRec?.extra_data as Record<string, any>) || {}),
      ...((cleanedUpdates.extra_data as Record<string, any>) || {}),
      ...(updates.total_paid !== undefined ? { total_paid: cleanNumber(updates.total_paid) } : {}),
      ...(updates.initial_payment !== undefined || updates.paid_amount !== undefined ? { initial_payment: cleanNumber(updates.paid_amount ?? updates.initial_payment) } : {}),
    }

    cleanedUpdates.extra_data = mergedExtraData
    delete cleanedUpdates.initial_payment
    delete cleanedUpdates.total_paid

    const { data, error } = await supabase
      .from('aimt_report_records')
      .update(cleanedUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Supabase update error:', error)
      throw new Error(`Database update error: ${error.message}`)
    }

    if (data) {
      updatedRecord = data as AimtReportRecord
      const importId = updatedRecord.import_id
      if (importId) {
        // Recalculate batch totals in Supabase
        const { data: allRows } = await supabase
          .from('aimt_report_records')
          .select('pending_amount, yet_to_raised')
          .eq('import_id', importId)

        if (allRows) {
          const totalPending = allRows.reduce((acc, r) => acc + (Number(r.pending_amount) || 0), 0)
          const totalYet = allRows.reduce((acc, r) => acc + cleanNumber(r.yet_to_raised), 0)
          await supabase
            .from('aimt_report_imports')
            .update({
              total_pending_amount: totalPending,
              total_yet_to_raised: totalYet,
              updated_at: nowStr,
            })
            .eq('id', importId)
        }
      }
    }
  } catch (err: any) {
    console.error('CRITICAL: Supabase update failed:', err)
    throw err
  }

  // 2. Server storage backup update
  const store = readLocalReportStorage()
  for (const importId in store.records) {
    const recordIndex = store.records[importId].findIndex((r) => r.id === id)
    if (recordIndex !== -1) {
      store.records[importId][recordIndex] = {
        ...store.records[importId][recordIndex],
        ...cleanedUpdates,
      }
      if (!updatedRecord) {
        updatedRecord = store.records[importId][recordIndex]
      }
      saveLocalReportStorage(store)
      break
    }
  }

  return updatedRecord
}

// 3. Delete a student record directly from the database
export async function deleteReportRecord(id: string): Promise<boolean> {
  const supabase = await getSupabase()
  let importId: string | null = null

  // 1. Delete from Supabase (Live Database Server)
  try {
    const { data: target } = await supabase
      .from('aimt_report_records')
      .select('import_id')
      .eq('id', id)
      .maybeSingle()

    if (target) {
      importId = target.import_id
    }

    const { error } = await supabase.from('aimt_report_records').delete().eq('id', id)
    if (error) {
      console.error('Supabase delete error:', error)
      throw new Error(`Database delete error: ${error.message}`)
    }

    if (importId) {
      // Recalculate batch totals in Supabase
      const { data: allRows } = await supabase
        .from('aimt_report_records')
        .select('pending_amount, yet_to_raised')
        .eq('import_id', importId)

      if (allRows) {
        const totalPending = allRows.reduce((acc, r) => acc + (Number(r.pending_amount) || 0), 0)
        const totalYet = allRows.reduce((acc, r) => acc + cleanNumber(r.yet_to_raised), 0)
        await supabase
          .from('aimt_report_imports')
          .update({
            total_records: allRows.length,
            total_pending_amount: totalPending,
            total_yet_to_raised: totalYet,
            updated_at: new Date().toISOString(),
          })
          .eq('id', importId)
      }
    }
  } catch (err: any) {
    console.error('CRITICAL: Supabase delete failed:', err)
    throw err
  }

  // 2. Delete from server storage backup
  const store = readLocalReportStorage()
  for (const bId in store.records) {
    store.records[bId] = store.records[bId].filter((r) => r.id !== id)
  }
  saveLocalReportStorage(store)

  return true
}

// 4. Bulk delete student records directly from the database
export async function deleteReportRecords(ids: string[]): Promise<number> {
  if (!ids || ids.length === 0) return 0
  const supabase = await getSupabase()

  // 1. Delete from Supabase (Live Database Server)
  try {
    // Find unique import_ids for these records
    const { data: targets } = await supabase
      .from('aimt_report_records')
      .select('import_id')
      .in('id', ids)

    const importIds = Array.from(
      new Set(
        (targets || [])
          .map((t: any) => t.import_id)
          .filter(Boolean)
      )
    )

    const { error } = await supabase.from('aimt_report_records').delete().in('id', ids)
    if (error) {
      console.error('Supabase bulk delete error:', error)
      throw new Error(`Database bulk delete error: ${error.message}`)
    }

    // Recalculate batch totals in Supabase for each affected batch
    for (const impId of importIds) {
      try {
        const { data: allRows } = await supabase
          .from('aimt_report_records')
          .select('pending_amount, yet_to_raised')
          .eq('import_id', impId)

        if (allRows) {
          const totalPending = allRows.reduce((acc, r) => acc + (Number(r.pending_amount) || 0), 0)
          const totalYet = allRows.reduce((acc, r) => acc + cleanNumber(r.yet_to_raised), 0)
          await supabase
            .from('aimt_report_imports')
            .update({
              total_records: allRows.length,
              total_pending_amount: totalPending,
              total_yet_to_raised: totalYet,
              updated_at: new Date().toISOString(),
            })
            .eq('id', impId)
        }
      } catch {
        // ignore
      }
    }
  } catch (err: any) {
    console.error('CRITICAL: Supabase bulk delete failed:', err)
    throw err
  }

  // 2. Delete from server storage backup
  const idSet = new Set(ids)
  const store = readLocalReportStorage()
  for (const bId in store.records) {
    store.records[bId] = store.records[bId].filter((r) => !idSet.has(r.id))
  }
  saveLocalReportStorage(store)

  return ids.length
}

