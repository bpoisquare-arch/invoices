import fs from 'fs'
import path from 'path'
import type { ReportSlip } from '@/types/report-slip.types'

export interface CommissionInvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  amount: number
}

export interface CommissionInvoice {
  id: string
  referenceNumber: string // e.g. CAP-001
  invoiceDate: string // e.g. 2026-11-13 or 13 Nov 2026
  dueDate?: string
  agencyName: string
  totalAmount: number
  currency: string // "AUD"
  description: string
  items: CommissionInvoiceItem[]
  paymentMethod?: 'Cash' | 'Bank'
  bankTransactionId?: string
  slips?: ReportSlip[]
  notes?: string
  payoutLogId?: string
  allocatedStudentsCount?: number
  createdBy?: string
  createdAt: string
}

const INVOICES_FILE = path.join(
  process.cwd(),
  'data',
  'aimt_commission_invoices.json'
)

let inMemoryInvoices: CommissionInvoice[] | null = null

function readInvoicesFromFile(): CommissionInvoice[] {
  try {
    if (!fs.existsSync(INVOICES_FILE)) {
      return []
    }
    const raw = fs.readFileSync(INVOICES_FILE, 'utf-8')
    return JSON.parse(raw) || []
  } catch (error) {
    console.error('Error reading commission invoices file:', error)
    return []
  }
}

function writeInvoicesToFile(invoices: CommissionInvoice[]): void {
  try {
    const dir = path.dirname(INVOICES_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(INVOICES_FILE, JSON.stringify(invoices, null, 2), 'utf-8')
  } catch (error) {
    console.error('Error writing commission invoices file:', error)
  }
}

export async function getAllCommissionInvoices(): Promise<CommissionInvoice[]> {
  const invoices = readInvoicesFromFile()
  inMemoryInvoices = invoices
  return invoices
}

export async function clearAllCommissionInvoices(): Promise<void> {
  inMemoryInvoices = []
  writeInvoicesToFile([])
}

/**
 * Generates the next sequential unique reference number starting from CAP-001.
 * Increments by 1: CAP-001, CAP-002, CAP-003, etc.
 */
export async function getNextInvoiceReference(): Promise<string> {
  const invoices = await getAllCommissionInvoices()
  let maxSeq = 0

  invoices.forEach((inv) => {
    if (inv.referenceNumber) {
      const match = inv.referenceNumber.match(/^CAP-(\d+)$/i)
      if (match) {
        const num = parseInt(match[1], 10)
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num
        }
      }
    }
  })

  const nextSeq = maxSeq + 1
  return `CAP-${String(nextSeq).padStart(3, '0')}`
}

/**
 * Creates and saves a new commission disbursement invoice
 */
export async function createCommissionInvoice(params: {
  referenceNumber?: string
  agencyName: string
  totalAmount: number
  invoiceDate?: string
  dueDate?: string
  description?: string
  paymentMethod?: 'Cash' | 'Bank'
  bankTransactionId?: string
  slips?: ReportSlip[]
  notes?: string
  payoutLogId?: string
  allocatedStudentsCount?: number
  createdBy?: string
}): Promise<CommissionInvoice> {
  const invoices = await getAllCommissionInvoices()

  const referenceNumber = params.referenceNumber?.trim() || (await getNextInvoiceReference())
  const invoiceDate = params.invoiceDate || new Date().toISOString().split('T')[0]
  const dueDate = params.dueDate || invoiceDate
  const totalAmount = Math.max(0, Number(params.totalAmount) || 0)
  const description = params.description || `${params.agencyName} - Paid by AIMT`

  const newInvoice: CommissionInvoice = {
    id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    referenceNumber,
    invoiceDate,
    dueDate,
    agencyName: params.agencyName.trim(),
    totalAmount,
    currency: 'AUD',
    description,
    items: [
      {
        description,
        quantity: 1.0,
        unitPrice: totalAmount,
        amount: totalAmount,
      },
    ],
    paymentMethod: params.paymentMethod || 'Cash',
    bankTransactionId: params.bankTransactionId?.trim() || '',
    slips: params.slips || [],
    notes: params.notes?.trim() || '',
    payoutLogId: params.payoutLogId,
    allocatedStudentsCount: params.allocatedStudentsCount,
    createdBy: params.createdBy || 'AIMT Finance',
    createdAt: new Date().toISOString(),
  }

  // If invoice with same reference already exists, update it, otherwise insert at top
  const existingIdx = invoices.findIndex(
    (inv) => inv.referenceNumber.toLowerCase() === referenceNumber.toLowerCase()
  )

  if (existingIdx >= 0) {
    invoices[existingIdx] = newInvoice
  } else {
    invoices.unshift(newInvoice)
  }

  inMemoryInvoices = invoices
  writeInvoicesToFile(invoices)

  return newInvoice
}
