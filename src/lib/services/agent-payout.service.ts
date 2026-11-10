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

const PAYOUTS_FILE = path.join(
  process.cwd(),
  'data',
  'aimt_student_commission_payouts.json'
)

let inMemoryPayouts: Record<string, StudentCommissionPayout> | null = null

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

