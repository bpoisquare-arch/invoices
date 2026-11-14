import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import type { ReportSlip } from '@/types/report-slip.types'
import {
  createCommissionInvoice,
  getNextInvoiceReference,
  CommissionInvoice,
} from './commission-invoice.service'

export interface StudentCommissionPayout {
  recordId: string // Unique student report record ID
  studentId?: string | null // e.g. AIMT00196
  studentName?: string
  agentName?: string
  commissionPaid: number // Amount paid so far to the agent
  paymentDate?: string
  paymentMethod?: 'Cash' | 'Bank'
  bankTransactionId?: string
  reference?: string
  invoiceReference?: string
  slips?: ReportSlip[]
  notes?: string
  updatedAt: string
}

export interface AgencyPayoutLog {
  id: string
  agentName: string
  amountPaid: number
  paymentDate: string
  paymentMethod?: 'Cash' | 'Bank'
  bankTransactionId?: string
  reference?: string
  invoiceReference?: string
  slips?: ReportSlip[]
  notes?: string
  allocatedStudentCount: number
  createdAt: string
}

const PAYOUTS_FILE = path.join(
  process.cwd(),
  'data',
  'aimt_student_commission_payouts.json'
)

const AGENCY_LOGS_FILE = path.join(
  process.cwd(),
  'data',
  'aimt_agency_payout_logs.json'
)

let inMemoryPayouts: Record<string, StudentCommissionPayout> | null = null
let inMemoryAgencyLogs: AgencyPayoutLog[] | null = null

function readPayoutsFromFile(): Record<string, StudentCommissionPayout> {
  try {
    if (!fs.existsSync(PAYOUTS_FILE)) {
      return {}
    }
    const raw = fs.readFileSync(PAYOUTS_FILE, 'utf-8')
    return JSON.parse(raw) || {}
  } catch (error) {
    console.error('Error reading student commission payouts file:', error)
    return {}
  }
}

function writePayoutsToFile(payouts: Record<string, StudentCommissionPayout>): void {
  try {
    const dir = path.dirname(PAYOUTS_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(PAYOUTS_FILE, JSON.stringify(payouts, null, 2), 'utf-8')
  } catch (error) {
    console.error('Error writing student commission payouts file:', error)
  }
}

function readAgencyLogsFromFile(): AgencyPayoutLog[] {
  try {
    if (!fs.existsSync(AGENCY_LOGS_FILE)) {
      return []
    }
    const raw = fs.readFileSync(AGENCY_LOGS_FILE, 'utf-8')
    return JSON.parse(raw) || []
  } catch (error) {
    console.error('Error reading agency payout logs file:', error)
    return []
  }
}

function writeAgencyLogsToFile(logs: AgencyPayoutLog[]): void {
  try {
    const dir = path.dirname(AGENCY_LOGS_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(AGENCY_LOGS_FILE, JSON.stringify(logs, null, 2), 'utf-8')
  } catch (error) {
    console.error('Error writing agency payout logs file:', error)
  }
}

/**
 * Get all student commission payouts mapped by recordId
 */
export async function getAllCommissionPayouts(): Promise<Record<string, StudentCommissionPayout>> {
  if (inMemoryPayouts) {
    return inMemoryPayouts
  }
  const payouts = readPayoutsFromFile()
  inMemoryPayouts = payouts
  return payouts
}

/**
 * Get all agency disbursement logs
 */
export async function getAllAgencyPayoutLogs(): Promise<AgencyPayoutLog[]> {
  if (inMemoryAgencyLogs) {
    return inMemoryAgencyLogs
  }
  const logs = readAgencyLogsFromFile()
  inMemoryAgencyLogs = logs
  return logs
}

/**
 * Save or update commission payout for a specific student record
 */
export async function saveCommissionPayout(params: {
  recordId: string
  studentId?: string | null
  studentName?: string
  agentName?: string
  commissionPaid: number
  notes?: string
  paymentDate?: string
  paymentMethod?: 'Cash' | 'Bank'
  bankTransactionId?: string
  reference?: string
  invoiceReference?: string
  slips?: ReportSlip[]
}): Promise<StudentCommissionPayout> {
  const payouts = await getAllCommissionPayouts()
  const now = new Date().toISOString()

  const updated: StudentCommissionPayout = {
    recordId: params.recordId,
    studentId: params.studentId || null,
    studentName: params.studentName || '',
    agentName: params.agentName || '',
    commissionPaid: Math.max(0, Number(params.commissionPaid) || 0),
    notes: params.notes?.trim() || '',
    paymentDate: params.paymentDate || now,
    paymentMethod: params.paymentMethod || 'Bank',
    bankTransactionId: params.bankTransactionId?.trim() || '',
    reference: params.reference?.trim() || params.bankTransactionId?.trim() || '',
    invoiceReference: params.invoiceReference?.trim() || '',
    slips: params.slips || [],
    updatedAt: now,
  }

  payouts[params.recordId] = updated
  inMemoryPayouts = payouts
  writePayoutsToFile(payouts)

  // Asynchronously sync to MySQL aimtReportRecord extra_data
  try {
    const existingDb = await prisma.aimtReportRecord.findUnique({
      where: { id: params.recordId },
      select: { id: true, extraData: true },
    })
    if (existingDb) {
      const extraData = (existingDb.extraData as Record<string, any>) || {}
      await prisma.aimtReportRecord.update({
        where: { id: params.recordId },
        data: {
          extraData: {
            ...extraData,
            commission_payout: updated,
            commission_paid: updated.commissionPaid,
            commission_slips: updated.slips || [],
          } as any,
        },
      })
    }
  } catch (err) {
    console.warn(`Could not sync payout to MySQL for student ${params.recordId}:`, err)
  }

  return updated
}

/**
 * Disburse a lump-sum payout directly to an Agency in one click!
 * Automatically allocates the disbursement across the agency's students
 * and logs the disbursement receipt.
 */
export async function saveAgencyBulkPayout(params: {
  agentName: string
  amount: number
  paymentDate?: string
  paymentMethod?: 'Cash' | 'Bank'
  bankTransactionId?: string
  reference?: string
  invoiceReference?: string
  slips?: ReportSlip[]
  notes?: string
  students: Array<{
    recordId: string
    studentId?: string | null
    studentName?: string
    payable: number
    currentlyPaid: number
  }>
}): Promise<{
  updatedPayouts: Record<string, StudentCommissionPayout>
  payoutLog: AgencyPayoutLog
  invoice?: CommissionInvoice | null
}> {
  const payouts = await getAllCommissionPayouts()
  const logs = await getAllAgencyPayoutLogs()

  let remainingToDistribute = Math.max(0, Number(params.amount) || 0)
  const now = new Date().toISOString()
  const paymentDate = params.paymentDate || now
  const paymentMethod = params.paymentMethod || 'Bank'
  const bankTransactionId = params.bankTransactionId?.trim() || ''
  const invoiceReference = params.invoiceReference?.trim() || ''
  const slips = params.slips || []
  let allocatedStudentCount = 0
  const affectedRecordIds: string[] = []

  // 1. First allocate to students that have an outstanding balance
  const studentsWithBalance = params.students
    .map((s) => ({
      ...s,
      balance: Math.max(0, (Number(s.payable) || 0) - (Number(s.currentlyPaid) || 0)),
    }))
    .filter((s) => s.balance > 0)

  for (const student of studentsWithBalance) {
    if (remainingToDistribute <= 0) break

    const toAllocate = Math.min(remainingToDistribute, student.balance)
    const newTotalPaid = Math.round(((Number(student.currentlyPaid) || 0) + toAllocate) * 100) / 100

    payouts[student.recordId] = {
      recordId: student.recordId,
      studentId: student.studentId || null,
      studentName: student.studentName || '',
      agentName: params.agentName,
      commissionPaid: newTotalPaid,
      notes: params.notes ? `${params.notes} (Bulk Agency Payout)` : 'Bulk Agency Payout',
      paymentDate,
      paymentMethod,
      bankTransactionId,
      invoiceReference,
      slips,
      updatedAt: now,
    }

    affectedRecordIds.push(student.recordId)
    remainingToDistribute = Math.round((remainingToDistribute - toAllocate) * 100) / 100
    allocatedStudentCount++
  }

  // 2. If any excess remains (e.g. advance payout), allocate it to the first student
  if (remainingToDistribute > 0 && params.students.length > 0) {
    const firstStudent = params.students[0]
    const currentPaid = payouts[firstStudent.recordId]?.commissionPaid ?? firstStudent.currentlyPaid ?? 0
    payouts[firstStudent.recordId] = {
      recordId: firstStudent.recordId,
      studentId: firstStudent.studentId || null,
      studentName: firstStudent.studentName || '',
      agentName: params.agentName,
      commissionPaid: Math.round((currentPaid + remainingToDistribute) * 100) / 100,
      notes: params.notes ? `${params.notes} (Surplus Agency Payout)` : 'Surplus Agency Payout',
      paymentDate,
      paymentMethod,
      bankTransactionId,
      invoiceReference,
      slips,
      updatedAt: now,
    }
    if (!affectedRecordIds.includes(firstStudent.recordId)) {
      affectedRecordIds.push(firstStudent.recordId)
    }
  }

  inMemoryPayouts = payouts
  writePayoutsToFile(payouts)

  // 3. Ensure a Commission Invoice is generated and persisted for this disbursement
  let finalInvoiceRef = params.invoiceReference?.trim()
  if (!finalInvoiceRef) {
    finalInvoiceRef = await getNextInvoiceReference()
  }

  let createdInvoice: CommissionInvoice | null = null
  try {
    createdInvoice = await createCommissionInvoice({
      referenceNumber: finalInvoiceRef,
      agencyName: params.agentName,
      totalAmount: Math.max(0, Number(params.amount) || 0),
      invoiceDate: paymentDate,
      paymentMethod,
      bankTransactionId,
      slips,
      notes: params.notes,
      allocatedStudentsCount: allocatedStudentCount,
    })
  } catch (invErr) {
    console.warn('Could not auto-create commission invoice record:', invErr)
  }

  // 4. Create and append the Agency Payout Log
  const payoutLog: AgencyPayoutLog = {
    id: `agency_pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    agentName: params.agentName,
    amountPaid: Math.max(0, Number(params.amount) || 0),
    paymentDate,
    paymentMethod,
    bankTransactionId,
    reference: params.reference || bankTransactionId || finalInvoiceRef || '',
    invoiceReference: finalInvoiceRef,
    slips,
    notes: params.notes || '',
    allocatedStudentCount,
    createdAt: now,
  }

  logs.unshift(payoutLog)
  inMemoryAgencyLogs = logs
  writeAgencyLogsToFile(logs)

  // 4. Asynchronously sync updated payout records to live MySQL aimtReportRecord
  if (affectedRecordIds.length > 0) {
    try {
      for (const recId of affectedRecordIds) {
        const studentPayout = payouts[recId]
        if (!studentPayout) continue
        const dbRec = await prisma.aimtReportRecord.findUnique({
          where: { id: recId },
          select: { id: true, extraData: true },
        })
        if (dbRec) {
          const ex = (dbRec.extraData as Record<string, any>) || {}
          await prisma.aimtReportRecord.update({
            where: { id: recId },
            data: {
              extraData: {
                ...ex,
                commission_payout: studentPayout,
                commission_paid: studentPayout.commissionPaid,
                commission_slips: slips,
              } as any,
            },
          })
        }
      }
    } catch (err) {
      console.warn('Could not sync bulk agency payout to MySQL aimtReportRecord:', err)
    }
  }

  return {
    updatedPayouts: payouts,
    payoutLog,
    invoice: createdInvoice,
  }
}


