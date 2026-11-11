import fs from 'fs'
import path from 'path'

export interface StudentCommissionPayout {
  recordId: string // Unique student report record ID
  studentId?: string | null // e.g. AIMT00196
  studentName?: string
  agentName?: string
  commissionPaid: number // Amount paid so far to the agent
  paymentDate?: string
  notes?: string
  updatedAt: string
}

export interface AgencyPayoutLog {
  id: string
  agentName: string
  amountPaid: number
  paymentDate: string
  reference?: string
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
}): Promise<StudentCommissionPayout> {
  const payouts = await getAllCommissionPayouts()

  const updated: StudentCommissionPayout = {
    recordId: params.recordId,
    studentId: params.studentId || null,
    studentName: params.studentName || '',
    agentName: params.agentName || '',
    commissionPaid: Math.max(0, Number(params.commissionPaid) || 0),
    notes: params.notes?.trim() || '',
    paymentDate: params.paymentDate || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  payouts[params.recordId] = updated
  inMemoryPayouts = payouts
  writePayoutsToFile(payouts)

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
  reference?: string
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
}> {
  const payouts = await getAllCommissionPayouts()
  const logs = await getAllAgencyPayoutLogs()

  let remainingToDistribute = Math.max(0, Number(params.amount) || 0)
  const now = new Date().toISOString()
  const paymentDate = params.paymentDate || now
  let allocatedStudentCount = 0

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
      updatedAt: now,
    }

    remainingToDistribute = Math.round((remainingToDistribute - toAllocate) * 100) / 100
    allocatedStudentCount++
  }

  // 2. If any excess remains (e.g. advance payout), allocate it to the first student or create a pool
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
      updatedAt: now,
    }
  }

  inMemoryPayouts = payouts
  writePayoutsToFile(payouts)

  // 3. Create and append the Agency Payout Log
  const payoutLog: AgencyPayoutLog = {
    id: `agency_pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    agentName: params.agentName,
    amountPaid: Math.max(0, Number(params.amount) || 0),
    paymentDate,
    reference: params.reference || '',
    notes: params.notes || '',
    allocatedStudentCount,
    createdAt: now,
  }

  logs.unshift(payoutLog)
  inMemoryAgencyLogs = logs
  writeAgencyLogsToFile(logs)

  return {
    updatedPayouts: payouts,
    payoutLog,
  }
}


