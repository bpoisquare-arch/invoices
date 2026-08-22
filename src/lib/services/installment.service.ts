import { createClient } from '@/lib/supabase/client'
import { format, parseISO } from 'date-fns'

export interface AIMTFixedInfo {
  college_name: string
  address: string
  rto: string
  cricos: string
  logo_url: string
}

export const DEFAULT_AIMT_FIXED_INFO: AIMTFixedInfo = {
  college_name: 'Australian Institute of Management and Technology',
  address: '84 Buckley Street, Footscray, VIC 3011.',
  rto: '22316',
  cricos: '03266E',
  logo_url: '/aimt-logo.png',
}

export interface CourseOption {
  name: string
  duration: string
}

export const AIMT_COURSES: CourseOption[] = [
  { name: 'Certificate IV in Automotive Mechanical Diagnosis', duration: '24 weeks' },
  { name: 'Diploma of Automotive Management', duration: '52 weeks' },
  { name: 'Certificate III in Light Vehicle Mechanical Technology', duration: '52 weeks' },
  { name: 'Certificate IV in Automotive Management', duration: '26 weeks' },
  { name: 'Diploma of Leadership and Management', duration: '52 weeks' },
  { name: 'Advanced Diploma of Leadership and Management', duration: '60 weeks' },
  { name: 'Graduate Diploma of Management (Learning)', duration: '52 weeks' },
  { name: 'Certificate II in Security Operations', duration: '10 weeks' },
  { name: 'Diploma of Building and Construction (Building)', duration: '52 weeks' },
  { name: 'Certificate III in Wall and Floor Tiling', duration: '52 weeks' },
  { name: 'Certificate III in Bricklaying and Blocklaying', duration: '52 weeks' },
  { name: 'Certificate III in Solid Plastering', duration: '52 weeks' },
]

export interface InstallmentRow {
  monthLabel: string // e.g. "Sep-26"
  description: string // e.g. "1st Installment and Admin fee and Resource fee"
  amount: number // Integer AUD
}

export interface StudentInstallmentSchedule {
  id: string
  date: string // DD/MM/YYYY or YYYY-MM-DD
  student_name: string
  student_id: string
  course_name: string
  duration: string
  start_date: string // YYYY-MM-DD
  end_date: string // YYYY-MM-DD
  start_month_year?: string // YYYY-MM manual selection
  end_month_offset?: number // Months to subtract before end date (default 3)
  admin_fee: number
  resources_fee: number
  material_fee?: number
  tuition_fee: number
  scholarship: number
  total_amount: number
  first_installment_amount: number
  schedule_items: InstallmentRow[]
  // Optional Email Fields
  recipient_email?: string
  from_email?: string
  email_subject?: string
  email_message?: string
  last_email_sent_at?: string
  last_email_status?: 'sent' | 'failed'
  created_at: string
  updated_at: string
}

const FIXED_INFO_KEY = 'aimt_fixed_info_settings'

// Clean up stale localStorage cache from previous offline sync versions
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('aimt_student_installments')
  } catch {
    // Ignore
  }
}

export function getAimtFixedInfo(): AIMTFixedInfo {
  if (typeof window === 'undefined') return DEFAULT_AIMT_FIXED_INFO
  try {
    const raw = localStorage.getItem(FIXED_INFO_KEY)
    if (!raw) return DEFAULT_AIMT_FIXED_INFO
    const parsed = JSON.parse(raw)
    if (parsed.logo_url === '/aimt-logo.svg' || parsed.logo_url === '/aimt-logo.png') {
      parsed.logo_url = '/aimt-logo.png'
      localStorage.setItem(FIXED_INFO_KEY, JSON.stringify(parsed))
    }
    return { ...DEFAULT_AIMT_FIXED_INFO, ...parsed }
  } catch {
    return DEFAULT_AIMT_FIXED_INFO
  }
}

export function updateAimtFixedInfo(info: Partial<AIMTFixedInfo>): AIMTFixedInfo {
  if (typeof window === 'undefined') return DEFAULT_AIMT_FIXED_INFO
  try {
    const existing = getAimtFixedInfo()
    const updated = { ...existing, ...info }
    localStorage.setItem(FIXED_INFO_KEY, JSON.stringify(updated))
    return updated
  } catch {
    return DEFAULT_AIMT_FIXED_INFO
  }
}

export function calculateInstallmentScheduleItems(params: {
  start_date: string
  end_date: string
  start_month_year?: string // YYYY-MM
  end_month_offset?: number // default 3
  admin_fee: number
  resources_fee: number
  material_fee?: number
  tuition_fee: number
  scholarship: number
  first_installment_amount: number
}): { scheduleItems: InstallmentRow[]; totalAmount: number } {
  const admin = Number(params.admin_fee) || 0
  const resources = Number(params.resources_fee) || 0
  const material = Number(params.material_fee) || 0
  const tuition = Number(params.tuition_fee) || 0
  const scholarship = Number(params.scholarship) || 0
  const offsetMonths = typeof params.end_month_offset === 'number' ? params.end_month_offset : 3

  const totalAmount = Math.max(0, Math.round(admin + resources + material + tuition - scholarship))

  if (!params.start_date || !params.end_date) {
    return { scheduleItems: [], totalAmount }
  }

  try {
    // Start date base
    let startD = parseISO(params.start_date)

    // If manual Month & Year picker selected, override month and year for 1st installment
    if (params.start_month_year && params.start_month_year.length === 7) {
      const [y, m] = params.start_month_year.split('-').map(Number)
      if (!isNaN(y) && !isNaN(m)) {
        startD = new Date(y, m - 1, 1)
      }
    }

    const endD = parseISO(params.end_date)

    if (isNaN(startD.getTime()) || isNaN(endD.getTime())) {
      return { scheduleItems: [], totalAmount }
    }

    const firstAmt = Math.min(totalAmount, Math.round(Number(params.first_installment_amount) || 0))
    const remainingTotal = Math.max(0, totalAmount - firstAmt)

    const rows: InstallmentRow[] = []

    // Fee allocation state across schedule rows
    const feeState = {
      unallocatedAdmin: admin,
      unallocatedResources: resources,
      unallocatedMaterial: material,
      installmentCounter: 0,
    }

    const firstRowDescription = getRowDescription(firstAmt, admin, resources, material, feeState)

    // 1st Row Independent Month Label (Selected manually by user, e.g. Dec-25)
    rows.push({
      monthLabel: format(startD, 'MMM-yy'),
      description: firstRowDescription,
      amount: firstAmt,
    })

    // Course Start Date base (e.g. 21/09/2026 -> Sep-26)
    const courseStartD = parseISO(params.start_date)
    const validCourseStart = !isNaN(courseStartD.getTime()) ? courseStartD : startD

    const startYear = validCourseStart.getFullYear()
    const startMonth = validCourseStart.getMonth() // 0-indexed

    const endYear = endD.getFullYear()
    const endMonth = endD.getMonth() // 0-indexed

    // Target end month index (subtracting offset months from end date month)
    const startMonthIndex = startYear * 12 + startMonth
    const rawTargetEndMonthIndex = (endYear * 12 + endMonth) - offsetMonths
    const targetEndMonthIndex = Math.max(startMonthIndex, rawTargetEndMonthIndex)

    // Calculate total course-based installment count from start_date to targetEnd
    let totalCourseMonthsCount = targetEndMonthIndex - startMonthIndex + 1
    if (totalCourseMonthsCount < 1) totalCourseMonthsCount = 1

    const remainingMonths = totalCourseMonthsCount - 1

    if (remainingMonths > 0) {
      const basePerMonth = Math.floor(remainingTotal / remainingMonths)
      const remainder = remainingTotal - basePerMonth * remainingMonths

      for (let i = 1; i <= remainingMonths; i++) {
        // Forward count from course start month: 2nd row = next calendar month
        const currentDate = new Date(startYear, startMonth + i, 1)
        const monthLabel = format(currentDate, 'MMM-yy')

        // Add remainder to the last installment month to ensure total matches exactly with integers
        const amt = i === remainingMonths ? basePerMonth + remainder : basePerMonth

        const description = getRowDescription(amt, admin, resources, material, feeState)

        rows.push({
          monthLabel,
          description,
          amount: amt,
        })
      }
    }

    return { scheduleItems: rows, totalAmount }
  } catch (e) {
    return { scheduleItems: [], totalAmount }
  }
}

function getRowDescription(
  amount: number,
  totalAdmin: number,
  totalResources: number,
  totalMaterial: number,
  state: {
    unallocatedAdmin: number
    unallocatedResources: number
    unallocatedMaterial: number
    installmentCounter: number
  }
): string {
  const paidAdmin = Math.min(amount, state.unallocatedAdmin)
  state.unallocatedAdmin -= paidAdmin
  const remAfterAdmin = amount - paidAdmin

  const paidResources = Math.min(remAfterAdmin, state.unallocatedResources)
  state.unallocatedResources -= paidResources
  const remAfterResources = remAfterAdmin - paidResources

  const paidMaterial = Math.min(remAfterResources, state.unallocatedMaterial)
  state.unallocatedMaterial -= paidMaterial
  const remAfterMaterial = remAfterResources - paidMaterial

  const paidTuition = remAfterMaterial

  const adminWasPartial = (state.unallocatedAdmin + paidAdmin) < totalAdmin
  const adminIsPartial = state.unallocatedAdmin > 0

  const resourceWasPartial = (state.unallocatedResources + paidResources) < totalResources
  const resourceIsPartial = state.unallocatedResources > 0

  const materialWasPartial = (state.unallocatedMaterial + paidMaterial) < totalMaterial
  const materialIsPartial = state.unallocatedMaterial > 0

  let installmentStr = ''
  if (paidTuition > 0) {
    state.installmentCounter++
    installmentStr = `${getOrdinal(state.installmentCounter)} Installment`
  }

  // Helper when Material Fee is involved
  if (totalMaterial > 0) {
    if (paidAdmin > 0 && paidResources === 0 && paidMaterial === 0 && paidTuition === 0) {
      return adminIsPartial ? 'Partial Admin Fee' : (adminWasPartial ? 'Remaining Admin fee' : 'Admin Fee')
    }
    if (paidAdmin === 0 && paidResources > 0 && paidMaterial === 0 && paidTuition === 0) {
      return resourceIsPartial ? 'Partial Resource Fee' : (resourceWasPartial ? 'Remaining Resource fee' : 'Resource Fee')
    }
    if (paidAdmin === 0 && paidResources === 0 && paidMaterial > 0 && paidTuition === 0) {
      return materialIsPartial ? 'Partial Material Fee' : (materialWasPartial ? 'Remaining Material fee' : 'Material Fee')
    }
    if (paidAdmin > 0 && paidResources > 0 && paidMaterial === 0 && paidTuition === 0) {
      return resourceIsPartial
        ? (adminWasPartial ? 'Remaining Admin fee including Partial Resource fee' : 'Admin Fee including Partial Resource Fee')
        : 'Admin fee and Resource fee'
    }
    if (paidAdmin === 0 && paidResources > 0 && paidMaterial > 0 && paidTuition === 0) {
      return materialIsPartial
        ? (resourceWasPartial ? 'Remaining Resource fee including Partial Material fee' : 'Resource fee including Partial Material fee')
        : 'Resource fee and Material fee'
    }
    if (paidAdmin === 0 && paidResources === 0 && paidMaterial > 0 && paidTuition > 0) {
      return materialWasPartial
        ? `Remaining Material fee including ${installmentStr}`
        : `${installmentStr} including Material fee`
    }
    if (paidAdmin > 0 && paidResources > 0 && paidMaterial > 0 && paidTuition > 0) {
      return `${installmentStr} including Admin fee, Resource fee and Material fee`
    }
    if (paidAdmin === 0 && paidResources > 0 && paidMaterial > 0 && paidTuition > 0) {
      return `${installmentStr} including Resource fee and Material fee`
    }
  }

  // 1. Only Admin Fee paid
  if (paidAdmin > 0 && paidResources === 0 && paidTuition === 0) {
    if (adminIsPartial) {
      return 'Partial Admin Fee'
    }
    if (adminWasPartial) {
      return 'Remaining Admin fee'
    }
    return 'Admin Fee'
  }

  // 2. Only Resource Fee paid
  if (paidAdmin === 0 && paidResources > 0 && paidTuition === 0) {
    if (resourceIsPartial) {
      return 'Partial Resource Fee'
    }
    if (resourceWasPartial) {
      return 'Remaining Resource fee'
    }
    return 'Resource Fee'
  }

  // 3. Admin + Resource Fee paid (No Tuition)
  if (paidAdmin > 0 && paidResources > 0 && paidTuition === 0) {
    if (resourceIsPartial) {
      if (adminWasPartial) {
        return 'Remaining Admin fee including Partial Resource fee'
      }
      return 'Admin Fee including Partial Resource Fee'
    }
    // Resource is complete
    if (adminWasPartial && resourceWasPartial) {
      return 'Remaining Admin fee and Remaining Resource fee'
    }
    if (adminWasPartial) {
      return 'Remaining Admin fee and Resource fee'
    }
    return 'Admin fee and Resource fee'
  }

  // 4. Resource + Tuition paid (No Admin)
  if (paidAdmin === 0 && paidResources > 0 && paidTuition > 0) {
    if (resourceWasPartial) {
      return `Remaining Resources fee including ${installmentStr}`
    }
    return `${installmentStr} including Resource fee`
  }

  // 5. Admin + Tuition paid (No Resource)
  if (paidAdmin > 0 && paidResources === 0 && paidTuition > 0) {
    if (adminWasPartial) {
      return `Remaining Admin fee including ${installmentStr}`
    }
    return `Admin Fee including ${installmentStr}`
  }

  // 6. Admin + Resource + Tuition all paid in this row
  if (paidAdmin > 0 && paidResources > 0 && paidTuition > 0) {
    if (adminWasPartial && resourceWasPartial) {
      return `${installmentStr} including Remaining Admin fee and Remaining Resource fee`
    }
    if (adminWasPartial) {
      return `${installmentStr} including Remaining Admin fee and Resource fee`
    }
    return `${installmentStr} including Admin fee and Resource fee`
  }

  // 7. Only Tuition paid
  if (paidTuition > 0) {
    return installmentStr
  }

  // Fallback
  return `${getOrdinal(state.installmentCounter + 1)} Installment`
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function mapDbRowToSchedule(row: any): StudentInstallmentSchedule {
  let scheduleItems: InstallmentRow[] = []
  let extraMaterialFee: number | undefined = undefined

  if (typeof row.schedule_items === 'string') {
    try {
      const parsed = JSON.parse(row.schedule_items)
      if (Array.isArray(parsed)) {
        scheduleItems = parsed
      } else if (parsed && typeof parsed === 'object') {
        scheduleItems = parsed.items || []
        extraMaterialFee = parsed.__material_fee
      }
    } catch {
      scheduleItems = []
    }
  } else if (Array.isArray(row.schedule_items)) {
    scheduleItems = row.schedule_items
  }

  const admin = Number(row.admin_fee) || 0
  const resources = Number(row.resources_fee) || 0
  const tuition = Number(row.tuition_fee) || 0
  const scholarship = Number(row.scholarship) || 0
  const total = Number(row.total_amount) || 0

  let matFee = Number(row.material_fee) || Number(extraMaterialFee) || 0
  if (!matFee && total > (admin + resources + tuition - scholarship)) {
    matFee = total - (admin + resources + tuition - scholarship)
  }

  return {
    id: row.id,
    date: row.date,
    student_name: row.student_name,
    student_id: row.student_id,
    course_name: row.course_name,
    duration: row.duration,
    start_date: row.start_date,
    end_date: row.end_date,
    start_month_year: row.start_month_year || undefined,
    end_month_offset: row.end_month_offset ?? 3,
    admin_fee: admin,
    resources_fee: resources,
    material_fee: matFee > 0 ? matFee : undefined,
    tuition_fee: tuition,
    scholarship: scholarship,
    total_amount: total,
    first_installment_amount: Number(row.first_installment_amount) || 0,
    schedule_items: scheduleItems.map((s) => ({
      ...s,
      description: s.description ? s.description.replace(' + ', ' including ') : s.description,
    })),
    recipient_email: row.recipient_email || undefined,
    from_email: row.from_email || undefined,
    email_subject: row.email_subject || undefined,
    email_message: row.email_message || undefined,
    last_email_sent_at: row.last_email_sent_at || undefined,
    last_email_status: row.last_email_status || undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function mapScheduleToDbRow(schedule: StudentInstallmentSchedule): any {
  const row: any = {
    id: schedule.id,
    date: schedule.date,
    student_name: schedule.student_name,
    student_id: schedule.student_id,
    course_name: schedule.course_name,
    duration: schedule.duration,
    start_date: schedule.start_date,
    end_date: schedule.end_date,
    start_month_year: schedule.start_month_year || null,
    end_month_offset: schedule.end_month_offset ?? 3,
    admin_fee: Number(schedule.admin_fee) || 0,
    resources_fee: Number(schedule.resources_fee) || 0,
    tuition_fee: Number(schedule.tuition_fee) || 0,
    scholarship: Number(schedule.scholarship) || 0,
    total_amount: Number(schedule.total_amount) || 0,
    first_installment_amount: Number(schedule.first_installment_amount) || 0,
    schedule_items: schedule.schedule_items || [],
    recipient_email: schedule.recipient_email || null,
    from_email: schedule.from_email || null,
    email_subject: schedule.email_subject || null,
    email_message: schedule.email_message || null,
    last_email_sent_at: schedule.last_email_sent_at || null,
    last_email_status: schedule.last_email_status || null,
    created_at: schedule.created_at,
    updated_at: schedule.updated_at,
  }

  if (schedule.material_fee !== undefined && schedule.material_fee > 0) {
    row.material_fee = Number(schedule.material_fee)
  }

  return row
}

export async function getInstallments(): Promise<StudentInstallmentSchedule[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('installment_schedules')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching installment schedules from Supabase:', error.message)
      return []
    }

    return (data || []).map(mapDbRowToSchedule)
  } catch (err) {
    console.error('Exception fetching installment schedules:', err)
    return []
  }
}

export async function getInstallmentById(id: string): Promise<StudentInstallmentSchedule | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('installment_schedules')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return null
    }

    return mapDbRowToSchedule(data)
  } catch (err) {
    console.error('Exception fetching installment by ID:', err)
    return null
  }
}

export async function saveInstallment(
  schedule: Omit<StudentInstallmentSchedule, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): Promise<StudentInstallmentSchedule> {
  const now = new Date().toISOString()
  const scheduleId = schedule.id || `aimt-sch-${Date.now()}`

  const finalSchedule: StudentInstallmentSchedule = {
    ...schedule,
    id: scheduleId,
    created_at: schedule.id ? (schedule as any).created_at || now : now,
    updated_at: now,
  }

  const supabase = createClient()
  const dbRow = mapScheduleToDbRow(finalSchedule)
  let { error } = await supabase
    .from('installment_schedules')
    .upsert(dbRow, { onConflict: 'id' })

  // If material_fee column doesn't exist yet in Supabase schema, gracefully retry
  if (error && (error.message.includes('material_fee') || error.code === '42703')) {
    delete dbRow.material_fee
    const retry = await supabase
      .from('installment_schedules')
      .upsert(dbRow, { onConflict: 'id' })
    error = retry.error
  }

  if (error) {
    throw new Error(error.message || 'Failed to save installment schedule to database')
  }

  return finalSchedule
}

export async function deleteInstallment(id: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('installment_email_logs').delete().eq('schedule_id', id)
  const { error } = await supabase
    .from('installment_schedules')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(error.message || 'Failed to delete installment schedule from database')
  }
}

// Deprecated no-op for backward compatibility
export async function syncLocalInstallmentsToSupabase(): Promise<{ syncedCount: number; error?: string }> {
  return { syncedCount: 0 }
}

export function getLocalInstallments(): StudentInstallmentSchedule[] {
  return []
}

export function setLocalInstallments(items: StudentInstallmentSchedule[]): void {
  // No-op
}
