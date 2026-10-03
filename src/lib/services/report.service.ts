import * as XLSX from 'xlsx'
import { prisma } from '@/lib/prisma'
import type { AimtReportImport, AimtReportRecord } from '@/types/database.types'

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

  const str = String(val).trim()
  if (!str) return ''

  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parts = str.split('T')[0].split('-')
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }

  return str
}

function normalizeDocumentType(doc?: string | null): string {
  if (!doc) return 'Passport'
  const d = doc.trim().toLowerCase()
  if (d.includes('cnic') || d.includes('nic') || d.includes('national id')) return 'CNIC'
  return 'Passport'
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `aimt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export interface ParsedStudentRow {
  sr_no: number
  student_name: string
  student_id: string
  agent: string
  scholarship: string
  pending_invoice: string
  pending_amount: number
  yet_to_raised: string
  remarks: string
  dob: string
  document: string
  status: string
  intake: string
  end_date: string
  course: string
  admin_fee: number
  resource_fee: number
  tuition_fee: number
  total_fee: number
  paid_amount: number
  total_paid?: number
  initial_payment?: number
  follow_up?: string
  coe_issued_date: string
  email_id: string
  phone_no: string
  payment_status: string
  extra_data: Record<string, any>
}

export function parseExcelBuffer(buffer: Buffer, _fileName?: string): {
  rawHeaders: string[]
  records: ParsedStudentRow[]
} {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('Excel workbook has no sheets')

  const worksheet = workbook.Sheets[sheetName]
  const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })

  if (!rows || rows.length < 2) {
    throw new Error('Excel file must contain at least a header row and data rows')
  }

  let headerRowIndex = 0
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const rowStr = rows[i].map((c) => String(c).toLowerCase()).join(' ')
    if (rowStr.includes('student name') || rowStr.includes('agent') || rowStr.includes('pending invoice') || rowStr.includes('sr no')) {
      headerRowIndex = i
      break
    }
  }

  const headerRow = rows[headerRowIndex].map((h) => cleanString(h))
  const rawHeaders = headerRow.filter(Boolean)

  const findColIndex = (keywords: string[]): number => {
    return headerRow.findIndex((h) => {
      const lower = h.toLowerCase()
      return keywords.some((k) => lower.includes(k.toLowerCase()))
    })
  }

  const idxSrNo = findColIndex(['sr no', 'sr.no', 'sr#', 'serial', 's.no'])
  const idxStudentName = findColIndex(['student name', 'name', 'student'])
  const idxStudentId = findColIndex(['student id', 'student_id', 'id no', 'id'])
  const idxAgent = findColIndex(['agent', 'counselor', 'consultant'])
  const idxScholarship = findColIndex(['scholarship'])
  const idxPendingInvoice = findColIndex(['pending invoice', 'invoice no', 'invoice'])
  const idxPendingAmount = findColIndex(['pending amount', 'balance', 'pending'])
  const idxYetToRaised = findColIndex(['yet to raised', 'yet to raise', 'unraised'])
  const idxRemarks = findColIndex(['remarks', 'notes', 'comment'])
  const idxDob = findColIndex(['dob', 'date of birth', 'birth date'])
  const idxDocument = findColIndex(['document', 'doc type', 'cnic', 'passport'])
  const idxStatus = findColIndex(['status', 'student status'])
  const idxIntake = findColIndex(['intake', 'batch', 'session'])
  const idxEndDate = findColIndex(['end date', 'completion date', 'finish date'])
  const idxCourse = findColIndex(['course', 'program', 'qualification'])

  const idxAdminFee = findColIndex(['admin fee', 'admission fee'])
  const idxResourceFee = findColIndex(['resource fee', 'material fee', 'resources'])
  const idxTuitionFee = findColIndex(['tuition fee', 'tuition'])
  const idxTotalFee = findColIndex(['total fee', 'course fee', 'total amount'])
  const idxPaidAmount = findColIndex(['paid amount', 'initial payment', 'deposit', 'paid'])
  const idxTotalPaid = findColIndex(['total paid', 'total received'])
  const idxFollowUp = findColIndex(['follow up', 'followup', 'next action'])
  const idxCoeIssuedDate = findColIndex(['coe issued date', 'coe date', 'coe issued'])
  const idxEmailId = findColIndex(['email id', 'email', 'e-mail'])
  const idxPhoneNo = findColIndex(['phone no', 'phone', 'contact', 'mobile'])
  const idxPaymentStatus = findColIndex(['payment status', 'pay status'])

  const records: ParsedStudentRow[] = []

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.every((cell) => cell === '' || cell === null || cell === undefined)) {
      continue
    }

    const studentName = idxStudentName !== -1 ? cleanString(row[idxStudentName]) : ''
    if (!studentName) continue

    const srNo = idxSrNo !== -1 ? (cleanNumber(row[idxSrNo]) || i - headerRowIndex) : i - headerRowIndex
    const studentId = idxStudentId !== -1 ? cleanString(row[idxStudentId]) : ''
    const agent = idxAgent !== -1 ? cleanString(row[idxAgent]) : ''
    const scholarship = idxScholarship !== -1 ? cleanString(row[idxScholarship]) : ''
    const pendingInvoice = idxPendingInvoice !== -1 ? cleanString(row[idxPendingInvoice]) : ''
    const pendingAmount = idxPendingAmount !== -1 ? cleanNumber(row[idxPendingAmount]) : 0
    const yetToRaised = idxYetToRaised !== -1 ? cleanString(row[idxYetToRaised]) : ''
    const remarks = idxRemarks !== -1 ? cleanString(row[idxRemarks]) : ''
    const dob = idxDob !== -1 ? formatExcelDate(row[idxDob]) : ''
    const document = idxDocument !== -1 ? normalizeDocumentType(cleanString(row[idxDocument])) : 'Passport'
    const status = idxStatus !== -1 ? (cleanString(row[idxStatus]) || 'Current') : 'Current'
    const intake = idxIntake !== -1 ? cleanString(row[idxIntake]) : ''
    const endDate = idxEndDate !== -1 ? formatExcelDate(row[idxEndDate]) : ''
    const course = idxCourse !== -1 ? cleanString(row[idxCourse]) : ''

    const adminFee = idxAdminFee !== -1 ? cleanNumber(row[idxAdminFee]) : 0
    const resourceFee = idxResourceFee !== -1 ? cleanNumber(row[idxResourceFee]) : 0
    const tuitionFee = idxTuitionFee !== -1 ? cleanNumber(row[idxTuitionFee]) : 0
    
    let totalFee = idxTotalFee !== -1 ? cleanNumber(row[idxTotalFee]) : 0
    if (totalFee === 0 && (adminFee > 0 || resourceFee > 0 || tuitionFee > 0)) {
      totalFee = adminFee + resourceFee + tuitionFee - cleanNumber(scholarship)
      if (totalFee < 0) totalFee = 0
    }

    const paidAmount = idxPaidAmount !== -1 ? cleanNumber(row[idxPaidAmount]) : 0
    const totalPaid = idxTotalPaid !== -1 ? cleanNumber(row[idxTotalPaid]) : paidAmount
    const followUp = idxFollowUp !== -1 ? cleanString(row[idxFollowUp]) : ''
    const coeIssuedDate = idxCoeIssuedDate !== -1 ? formatExcelDate(row[idxCoeIssuedDate]) : ''
    const emailId = idxEmailId !== -1 ? cleanString(row[idxEmailId]) : ''
    const phoneNo = idxPhoneNo !== -1 ? cleanString(row[idxPhoneNo]) : ''
    const paymentStatus = idxPaymentStatus !== -1 ? cleanString(row[idxPaymentStatus]) : (pendingAmount > 0 ? 'Pending' : 'Paid')

    const extra_data: Record<string, any> = {}
    headerRow.forEach((colName, cIdx) => {
      if (colName && row[cIdx] !== undefined && row[cIdx] !== '') {
        extra_data[colName] = row[cIdx]
      }
    })

    records.push({
      sr_no: srNo,
      student_name: studentName,
      student_id: studentId,
      agent,
      scholarship,
      pending_invoice: pendingInvoice,
      pending_amount: pendingAmount,
      yet_to_raised: yetToRaised,
      remarks,
      dob,
      document,
      status,
      intake,
      end_date: endDate,
      course,
      admin_fee: adminFee,
      resource_fee: resourceFee,
      tuition_fee: tuitionFee,
      total_fee: totalFee,
      paid_amount: paidAmount,
      total_paid: totalPaid,
      initial_payment: paidAmount,
      follow_up: followUp,
      coe_issued_date: coeIssuedDate,
      email_id: emailId,
      phone_no: phoneNo,
      payment_status: paymentStatus,
      extra_data,
    })
  }

  return { rawHeaders, records }
}

export const parseStudentReportExcel = parseExcelBuffer

export async function previewReportImport(buffer: Buffer, _fileName?: string) {
  const { rawHeaders, records } = parseExcelBuffer(buffer, _fileName)
  return {
    rawHeaders,
    records,
    totalCount: records.length,
  }
}

function prismaAimtRecordToSnake(r: any): AimtReportRecord {
  const extraData = (r.extraData as Record<string, any>) || {}
  const rawFollowUp = r.followUp !== undefined && r.followUp !== null ? r.followUp : extraData.follow_up
  const safeFollowUp =
    rawFollowUp && String(rawFollowUp).trim() !== 'null' && String(rawFollowUp).trim() !== 'undefined'
      ? String(rawFollowUp).trim()
      : null

  return {
    id: r.id,
    import_id: r.importId,
    sr_no: r.srNo,
    student_name: r.studentName,
    student_id: r.studentId,
    agent: r.agent,
    scholarship: r.scholarship,
    pending_invoice: r.pendingInvoice,
    pending_amount: Number(r.pendingAmount ?? 0),
    yet_to_raised: r.yetToRaised,
    remarks: r.remarks,
    dob: r.dob,
    document: r.document,
    status: r.status,
    intake: r.intake,
    end_date: r.endDate,
    course: r.course,
    admin_fee: Number(r.adminFee ?? 0),
    resource_fee: Number(r.resourceFee ?? 0),
    tuition_fee: Number(r.tuitionFee ?? 0),
    total_fee: Number(r.totalFee ?? 0),
    paid_amount: Number(r.paidAmount ?? 0),
    total_paid: Number(r.totalPaid ?? extraData.total_paid ?? r.paidAmount ?? 0),
    initial_payment: Number(r.paidAmount ?? 0),
    follow_up: safeFollowUp,
    coe_issued_date: r.coeIssuedDate,
    email_id: r.emailId,
    phone_no: r.phoneNo,
    payment_status: r.paymentStatus,
    divided_month: r.dividedMonth !== undefined && r.dividedMonth !== null ? Number(r.dividedMonth) : (extraData.divided_month !== undefined && extraData.divided_month !== null ? Number(extraData.divided_month) : null),
    calculation_breakup: r.calculationBreakup || extraData.calculation_breakup || null,
    extra_data: extraData as any,
    created_at: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt || new Date().toISOString()),
  }
}

// Save AIMT imported Excel data to MySQL (Prisma)
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
  const entity = params.entity || 'aimt'
  const duplicateStrategy = params.duplicateStrategy || 'override'
  const nowStr = new Date().toISOString()
  const importBatchId = generateId()

  let existingRecords: AimtReportRecord[] = []
  try {
    const dbRecords = await prisma.aimtReportRecord.findMany()
    if (dbRecords && dbRecords.length > 0) {
      existingRecords = dbRecords.map(prismaAimtRecordToSnake)
    }
  } catch (err) {
    console.warn('Could not fetch existing AIMT records from MySQL:', err)
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

  if (duplicateStrategy === 'replace') {
    try {
      await prisma.aimtReportRecord.deleteMany({})
    } catch (err) {
      console.warn('Error clearing MySQL AIMT records for replace strategy:', err)
    }
    existingRecords = []
    existingById.clear()
    existingByName.clear()
  }

  let overriddenCount = 0
  let skippedCount = 0
  let newCount = 0

  const recordsToInsertPrisma: any[] = []

  await prisma.aimtReportImport.create({
    data: {
      id: importBatchId,
      fileName: params.fileName,
      fileSize: BigInt(params.fileSize || 0),
      uploadedAt: new Date(),
      uploadedBy: params.uploadedBy || 'admin@isquarebpo.com',
      totalRecords: 0,
      totalPendingAmount: 0,
      totalYetToRaised: 0,
      entity: entity,
      originalFileData: params.originalBase64 || null,
      rawHeaders: (params.rawHeaders || []) as any,
    },
  })

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
          document: normalizeDocumentType(incoming.document || existing.document),
          status: incoming.status || existing.status,
          intake: incoming.intake || existing.intake,
          endDate: incoming.end_date || existing.end_date,
          course: incoming.course || existing.course,
          adminFee: incoming.admin_fee,
          resourceFee: incoming.resource_fee,
          tuitionFee: incoming.tuition_fee,
          totalFee: incoming.total_fee,
          paidAmount: incoming.paid_amount,
          totalPaid: incoming.total_paid || existing.total_paid,
          followUp: incoming.follow_up || existing.follow_up,
          coeIssuedDate: incoming.coe_issued_date || existing.coe_issued_date,
          emailId: incoming.email_id || existing.email_id,
          phoneNo: incoming.phone_no || existing.phone_no,
          paymentStatus: incoming.payment_status || existing.payment_status,
          extraData: {
            ...((existing.extra_data as any) || {}),
            ...(incoming.extra_data || {}),
            total_paid: incoming.total_paid || existing.total_paid,
            initial_payment: incoming.paid_amount,
            follow_up: incoming.follow_up || existing.follow_up,
          },
        }

        await prisma.aimtReportRecord.update({
          where: { id: existing.id },
          data: updatedPayloadPrisma,
        })
        overriddenCount++
        continue
      }
    }

    const assignedSrNo = incoming.sr_no || nextSrNo++
    const newRecordId = generateId()

    recordsToInsertPrisma.push({
      id: newRecordId,
      importId: importBatchId,
      srNo: assignedSrNo,
      studentName: incoming.student_name,
      studentId: incoming.student_id || null,
      agent: incoming.agent || null,
      scholarship: incoming.scholarship || null,
      pendingInvoice: incoming.pending_invoice || null,
      pendingAmount: incoming.pending_amount || 0,
      yetToRaised: incoming.yet_to_raised || null,
      remarks: incoming.remarks || null,
      followUp: incoming.follow_up || null,
      dob: incoming.dob || null,
      document: normalizeDocumentType(incoming.document) || null,
      status: incoming.status || 'Current',
      intake: incoming.intake || null,
      endDate: incoming.end_date || null,
      course: incoming.course || null,
      adminFee: incoming.admin_fee || 0,
      resourceFee: incoming.resource_fee || 0,
      tuitionFee: incoming.tuition_fee || 0,
      totalFee: incoming.total_fee || 0,
      paidAmount: incoming.paid_amount || 0,
      totalPaid: incoming.total_paid || incoming.paid_amount || 0,
      coeIssuedDate: incoming.coe_issued_date || null,
      emailId: incoming.email_id || null,
      phoneNo: incoming.phone_no || null,
      paymentStatus: incoming.payment_status || 'Pending',
      extraData: {
        ...incoming.extra_data,
        total_paid: incoming.total_paid || incoming.paid_amount || 0,
        initial_payment: incoming.paid_amount || 0,
        follow_up: incoming.follow_up || null,
      },
    })
    newCount++
  }

  const CHUNK_SIZE = 250
  if (recordsToInsertPrisma.length > 0) {
    for (let i = 0; i < recordsToInsertPrisma.length; i += CHUNK_SIZE) {
      const chunk = recordsToInsertPrisma.slice(i, i + CHUNK_SIZE)
      await prisma.aimtReportRecord.createMany({ data: chunk })
    }
  }

  const allFinalRows = await prisma.aimtReportRecord.findMany({
    where: { importId: importBatchId },
    select: { pendingAmount: true, yetToRaised: true },
  })

  let sumPending = 0
  let sumYetRaised = 0
  allFinalRows.forEach((r) => {
    sumPending += Number(r.pendingAmount ?? 0)
    sumYetRaised += cleanNumber(r.yetToRaised)
  })

  await prisma.aimtReportImport.update({
    where: { id: importBatchId },
    data: {
      totalRecords: recordsToInsertPrisma.length + overriddenCount,
      totalPendingAmount: sumPending,
      totalYetToRaised: sumYetRaised,
    },
  })

  const importBatch: AimtReportImport = {
    id: importBatchId,
    file_name: params.fileName,
    file_size: params.fileSize,
    uploaded_at: nowStr,
    uploaded_by: params.uploadedBy || 'admin@isquarebpo.com',
    total_records: recordsToInsertPrisma.length + overriddenCount,
    total_pending_amount: sumPending,
    total_yet_to_raised: sumYetRaised,
    entity: entity,
    original_file_data: params.originalBase64 || null,
    raw_headers: (params.rawHeaders || []) as any,
    created_at: nowStr,
    updated_at: nowStr,
  }

  return {
    importBatch,
    recordCount: recordsToInsertPrisma.length + overriddenCount,
    overriddenCount,
    skippedCount,
    newCount,
  }
}

// Fetch all AIMT import history batches
export async function getReportImports(entity?: string): Promise<AimtReportImport[]> {
  try {
    const dbImports = await prisma.aimtReportImport.findMany({
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
        entity: imp.entity ?? 'aimt',
        original_file_data: null,
        raw_headers: (imp.rawHeaders as any) ?? [],
        created_at: imp.createdAt?.toISOString() ?? imp.uploadedAt.toISOString(),
        updated_at: imp.updatedAt?.toISOString() ?? imp.uploadedAt.toISOString(),
      })) as unknown as AimtReportImport[]
    }
  } catch (err) {
    console.warn('MySQL getReportImports failed:', err)
  }

  return []
}

// Fetch a single import batch by ID
export async function getReportImportById(id: string, includeFileData: boolean = false): Promise<AimtReportImport | null> {
  try {
    const imp = await prisma.aimtReportImport.findUnique({ where: { id } })
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
        entity: imp.entity ?? 'aimt',
        original_file_data: includeFileData ? (imp.originalFileData ?? null) : null,
        raw_headers: (imp.rawHeaders as any) ?? [],
        created_at: imp.createdAt?.toISOString() ?? imp.uploadedAt.toISOString(),
        updated_at: imp.updatedAt?.toISOString() ?? imp.uploadedAt.toISOString(),
      } as unknown as AimtReportImport
    }
  } catch (err) {
    console.warn('MySQL getReportImportById failed:', err)
  }
  return null
}

// Fetch records from aimt_report_records with filters and stats
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

    const totalCount = await prisma.aimtReportRecord.count({ where })
    const rows = await prisma.aimtReportRecord.findMany({
      where,
      orderBy: { [prismaSort]: sortOrder },
      ...(pageSize === -1 ? {} : { skip: (page - 1) * pageSize, take: pageSize }),
    })

    const allForTotals = await prisma.aimtReportRecord.findMany({
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
      records: rows.map(prismaAimtRecordToSnake),
      totalCount,
      totalPendingAmount: Number(totalPending.toFixed(2)),
      totalYetToRaised: Number(totalYetRaised.toFixed(2)),
      availableAgents: Array.from(agentSet).sort(),
      availableIntakes: Array.from(intakeSet).sort(),
      availableCourses: Array.from(courseSet).sort(),
    }
  } catch (err) {
    console.warn('MySQL getReportRecords failed:', err)
  }

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

// Delete an AIMT import batch and cascade delete its records
export async function deleteReportImport(id: string): Promise<void> {
  try {
    await prisma.aimtReportImport.delete({ where: { id } })
  } catch (mysqlErr: any) {
    if (mysqlErr?.code !== 'P2025') {
      console.error('MySQL deleteReportImport FAILED:', mysqlErr)
      throw mysqlErr
    }
  }
}

// Get or create a manual entries import batch for AIMT
export async function getOrCreateManualImportBatch(): Promise<AimtReportImport> {
  const nowStr = new Date().toISOString()

  try {
    const mysqlBatch = await prisma.aimtReportImport.findFirst({
      where: { entity: 'aimt' },
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
        entity: mysqlBatch.entity ?? 'aimt',
        original_file_data: null,
        raw_headers: (mysqlBatch.rawHeaders as any) ?? [],
        created_at: mysqlBatch.createdAt?.toISOString() ?? nowStr,
        updated_at: mysqlBatch.updatedAt?.toISOString() ?? nowStr,
      } as unknown as AimtReportImport
    }
  } catch (err) {
    console.warn('MySQL getOrCreateManualImportBatch query failed:', err)
  }

  const manualBatchId = generateId()
  const raw_headers = [
    'Sr No',
    'Student Name',
    'Agent',
    'Pending Invoice',
    'Pending Amount',
    'Yet to Raised',
    'Intake',
    'Course',
  ]

  await prisma.aimtReportImport.create({
    data: {
      id: manualBatchId,
      fileName: 'Manual Student Records',
      fileSize: 0,
      uploadedAt: new Date(),
      uploadedBy: 'admin@isquarebpo.com',
      totalRecords: 0,
      totalPendingAmount: 0,
      totalYetToRaised: 0,
      entity: 'aimt',
      rawHeaders: raw_headers,
    },
  })

  return {
    id: manualBatchId,
    file_name: 'Manual Student Records',
    file_size: 0,
    uploaded_at: nowStr,
    uploaded_by: 'admin@isquarebpo.com',
    total_records: 0,
    total_pending_amount: 0,
    total_yet_to_raised: 0,
    entity: 'aimt',
    original_file_data: null,
    raw_headers: raw_headers as any,
    created_at: nowStr,
    updated_at: nowStr,
  }
}

// Create a single new AIMT student record
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
  follow_up?: string | null
  coe_issued_date?: string | null
  email_id?: string | null
  phone_no?: string | null
  payment_status?: string | null
  divided_month?: number | string | null
  calculation_breakup?: string | null
  extra_data?: Record<string, any>
}): Promise<AimtReportRecord> {
  let targetImportId = params.importId

  if (!targetImportId) {
    const defaultBatch = await getOrCreateManualImportBatch()
    targetImportId = defaultBatch.id
  }

  const newId = generateId()

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
  const dividedMonthVal = params.divided_month !== undefined && params.divided_month !== null && String(params.divided_month).trim() !== ''
    ? cleanNumber(params.divided_month)
    : null
  const calculationBreakupVal = cleanString(params.calculation_breakup) || null

  let nextSrNo = 1
  try {
    const maxRecord = await prisma.aimtReportRecord.findFirst({
      orderBy: { srNo: 'desc' },
      select: { srNo: true },
    })
    if (maxRecord && typeof maxRecord.srNo === 'number') {
      nextSrNo = maxRecord.srNo + 1
    }
  } catch {}

  const extraData = {
    ...(params.extra_data || {}),
    total_paid: totalPaidNum,
    initial_payment: paidAmountNum,
    follow_up: followUpVal,
    divided_month: dividedMonthVal,
    calculation_breakup: calculationBreakupVal,
  }

  const importExists = await prisma.aimtReportImport.findUnique({ where: { id: targetImportId! } })
  if (!importExists) {
    await prisma.aimtReportImport.create({
      data: {
        id: targetImportId!,
        fileName: 'Manual Student Records',
        fileSize: 0,
        uploadedAt: new Date(),
        uploadedBy: 'admin@isquarebpo.com',
        totalRecords: 0,
        totalPendingAmount: 0,
        totalYetToRaised: 0,
        entity: 'aimt',
      },
    })
  }

  const mysqlRow = await prisma.aimtReportRecord.create({
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
      dividedMonth: dividedMonthVal,
      calculationBreakup: calculationBreakupVal,
      extraData: extraData as any,
    } as any,
  })

  return prismaAimtRecordToSnake(mysqlRow)
}

// Update a single AIMT student record
export async function updateReportRecord(
  id: string,
  updates: Partial<AimtReportRecord>
): Promise<AimtReportRecord | null> {
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
  if (updates.divided_month !== undefined) {
    mysqlUpdate.dividedMonth = updates.divided_month !== null && String(updates.divided_month).trim() !== ''
      ? cleanNumber(updates.divided_month)
      : null
  }
  if (updates.calculation_breakup !== undefined) {
    mysqlUpdate.calculationBreakup = cleanString(updates.calculation_breakup) || null
  }
  if (updates.extra_data !== undefined) mysqlUpdate.extraData = updates.extra_data as any

  let mysqlRow: any = null
  if (Object.keys(mysqlUpdate).length > 0) {
    mysqlRow = await prisma.aimtReportRecord.update({ where: { id }, data: mysqlUpdate })
  } else {
    mysqlRow = await prisma.aimtReportRecord.findUnique({ where: { id } })
  }

  return mysqlRow ? prismaAimtRecordToSnake(mysqlRow) : null
}

// Delete a single AIMT student record
export async function deleteReportRecord(id: string): Promise<boolean> {
  try {
    await prisma.aimtReportRecord.delete({ where: { id } })
  } catch (mysqlErr: any) {
    if (mysqlErr?.code !== 'P2025') {
      throw mysqlErr
    }
  }
  return true
}

// Bulk delete AIMT student records
export async function deleteReportRecords(ids: string[]): Promise<number> {
  if (!ids || ids.length === 0) return 0
  await prisma.aimtReportRecord.deleteMany({ where: { id: { in: ids } } })
  return ids.length
}
