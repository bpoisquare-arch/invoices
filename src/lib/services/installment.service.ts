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
  schedule_start_month?: string // YYYY-MM schedule table start month
  schedule_end_month?: string // YYYY-MM schedule table end month
  first_installment_custom_month?: string // Optional YYYY-MM 1st installment override
  start_month_year?: string // Legacy YYYY-MM manual selection
  end_month_offset?: number // Legacy Months to subtract before end date
  admin_fee: number
  resources_fee: number
  material_fee?: number
  tuition_fee: number
  scholarship: number
  total_amount: number
  first_installment_amount: number
  initial_fees?: number[]
  schedule_items: InstallmentRow[]
  // Optional Agency Field
  agency?: string | null
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

export interface InstallmentCalculationParams {
  start_date?: string
  end_date?: string
  schedule_start_month?: string // YYYY-MM
  schedule_end_month?: string // YYYY-MM
  first_installment_custom_month?: string // YYYY-MM override for 1st installment only
  start_month_year?: string // Legacy YYYY-MM
  end_month_offset?: number // Legacy
  admin_fee: number
  resources_fee: number
  material_fee?: number
  tuition_fee: number
  scholarship: number
  first_installment_amount?: number
  initial_fees?: number[]
}

export function calculateInstallmentScheduleItems(params: InstallmentCalculationParams): {
  scheduleItems: InstallmentRow[]
  totalAmount: number
} {
  const admin = Number(params.admin_fee) || 0
  const resources = Number(params.resources_fee) || 0
  const material = Number(params.material_fee) || 0
  const tuition = Number(params.tuition_fee) || 0
  const scholarship = Number(params.scholarship) || 0

  const totalAmount = Math.max(0, Math.round(admin + resources + material + tuition - scholarship))

  try {
    // 1. Determine Schedule Start Month & Year
    let schStartYear = 2026
    let schStartMonth = 8 // Sep (0-indexed)

    if (params.schedule_start_month && params.schedule_start_month.length === 7) {
      const [y, m] = params.schedule_start_month.split('-').map(Number)
      if (!isNaN(y) && !isNaN(m)) {
        schStartYear = y
        schStartMonth = m - 1
      }
    } else if (params.start_date) {
      const parsedStart = parseISO(params.start_date)
      if (!isNaN(parsedStart.getTime())) {
        schStartYear = parsedStart.getFullYear()
        schStartMonth = parsedStart.getMonth()
      }
    }

    // 2. Determine Schedule End Month & Year
    let schEndYear = schStartYear + 1
    let schEndMonth = schStartMonth - 1 // 12 months total default
    if (schEndMonth < 0) {
      schEndMonth += 12
      schEndYear -= 1
    }

    if (params.schedule_end_month && params.schedule_end_month.length === 7) {
      const [y, m] = params.schedule_end_month.split('-').map(Number)
      if (!isNaN(y) && !isNaN(m)) {
        schEndYear = y
        schEndMonth = m - 1
      }
    } else if (params.end_date) {
      const parsedEnd = parseISO(params.end_date)
      if (!isNaN(parsedEnd.getTime())) {
        const offset = typeof params.end_month_offset === 'number' ? params.end_month_offset : 3
        const rawEndIdx = parsedEnd.getFullYear() * 12 + parsedEnd.getMonth() - offset
        schEndYear = Math.floor(rawEndIdx / 12)
        schEndMonth = rawEndIdx % 12
      }
    }

    const startMonthIndex = schStartYear * 12 + schStartMonth
    const targetEndMonthIndex = Math.max(startMonthIndex, schEndYear * 12 + schEndMonth)
    let totalScheduleMonths = targetEndMonthIndex - startMonthIndex + 1
    if (totalScheduleMonths < 1) totalScheduleMonths = 1

    // 3. Resolve initial fee inputs array
    let initialFees: number[] = []
    if (Array.isArray(params.initial_fees) && params.initial_fees.length > 0) {
      initialFees = params.initial_fees.map((n) => Math.max(0, Math.round(Number(n) || 0)))
    } else {
      const single = Math.max(0, Math.round(Number(params.first_installment_amount) || 0))
      initialFees = [single]
    }

    const rows: InstallmentRow[] = []

    // Fee allocation state across schedule rows
    const feeState = {
      unallocatedAdmin: admin,
      unallocatedResources: resources,
      unallocatedMaterial: material,
      installmentCounter: 0,
    }

    // 4. Resolve 1st Installment custom month override (if provided)
    let firstRowCustomDate: Date | null = null
    const customFirst = params.first_installment_custom_month || (params.start_month_year && params.start_month_year !== params.schedule_start_month ? params.start_month_year : undefined)
    if (customFirst && customFirst.length === 7) {
      const [cy, cm] = customFirst.split('-').map(Number)
      if (!isNaN(cy) && !isNaN(cm)) {
        firstRowCustomDate = new Date(cy, cm - 1, 1)
      }
    }

    let sumInitialFees = 0

    // Push initial fee rows
    for (let k = 0; k < initialFees.length; k++) {
      const amt = initialFees[k]
      sumInitialFees += amt

      let monthLabel = ''
      if (k === 0 && firstRowCustomDate) {
        monthLabel = format(firstRowCustomDate, 'MMM-yy')
      } else {
        const d = new Date(schStartYear, schStartMonth + k, 1)
        monthLabel = format(d, 'MMM-yy')
      }

      const description = getRowDescription(amt, admin, resources, material, feeState)

      rows.push({
        monthLabel,
        description,
        amount: amt,
      })
    }

    // Remaining total to divide across remaining schedule months
    const remainingTotal = Math.max(0, totalAmount - sumInitialFees)
    const remainingMonths = Math.max(0, totalScheduleMonths - initialFees.length)

    if (remainingMonths > 0 && remainingTotal > 0) {
      const basePerMonth = Math.floor(remainingTotal / remainingMonths)
      const remainder = remainingTotal - basePerMonth * remainingMonths

      for (let i = 1; i <= remainingMonths; i++) {
        const monthOffset = initialFees.length + i - 1
        const currentDate = new Date(schStartYear, schStartMonth + monthOffset, 1)
        const monthLabel = format(currentDate, 'MMM-yy')

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
  const prevUnallocatedAdmin = state.unallocatedAdmin
  state.unallocatedAdmin -= paidAdmin
  const remAfterAdmin = amount - paidAdmin

  const paidResources = Math.min(remAfterAdmin, state.unallocatedResources)
  const prevUnallocatedResources = state.unallocatedResources
  state.unallocatedResources -= paidResources
  const remAfterResources = remAfterAdmin - paidResources

  const paidMaterial = Math.min(remAfterResources, state.unallocatedMaterial)
  const prevUnallocatedMaterial = state.unallocatedMaterial
  state.unallocatedMaterial -= paidMaterial
  const remAfterMaterial = remAfterResources - paidMaterial

  const paidTuition = remAfterMaterial

  const adminWasPartial = (totalAdmin - prevUnallocatedAdmin) > 0
  const adminIsPartial = state.unallocatedAdmin > 0

  const resourceWasPartial = (totalResources - prevUnallocatedResources) > 0
  const resourceIsPartial = state.unallocatedResources > 0

  const materialWasPartial = (totalMaterial - prevUnallocatedMaterial) > 0
  const materialIsPartial = state.unallocatedMaterial > 0

  let instText = ''
  if (paidTuition > 0) {
    state.installmentCounter++
    instText = `${getOrdinal(state.installmentCounter)} Installment`
  }

  const feeParts: string[] = []
  if (paidAdmin > 0) {
    if (adminIsPartial) feeParts.push('Partial Admin Fee')
    else if (adminWasPartial) feeParts.push('Remaining Admin fee')
    else feeParts.push('Admin fee')
  }
  if (paidResources > 0) {
    if (resourceIsPartial) feeParts.push('Partial Resource fee')
    else if (resourceWasPartial) feeParts.push('Remaining Resource fee')
    else feeParts.push('Resource fee')
  }
  if (paidMaterial > 0) {
    if (materialIsPartial) feeParts.push('Partial Material fee')
    else if (materialWasPartial) feeParts.push('Remaining Material fee')
    else feeParts.push('Material fee')
  }

  // Combine fee parts with installment if tuition is paid
  if (paidTuition > 0) {
    if (feeParts.length === 0) {
      return instText
    }
    let combinedFees = ''
    if (feeParts.length === 1) {
      combinedFees = feeParts[0]
    } else if (feeParts.length === 2) {
      combinedFees = `${feeParts[0]} and ${feeParts[1]}`
    } else {
      combinedFees = `${feeParts.slice(0, -1).join(', ')} and ${feeParts[feeParts.length - 1]}`
    }

    return `${instText} including ${combinedFees}`
  }

  // When only upfront fees are paid in this row
  if (feeParts.length === 0) {
    return `${getOrdinal(state.installmentCounter + 1)} Installment`
  }

  if (feeParts.length === 1) {
    const single = feeParts[0]
    if (single === 'Admin fee') return 'Admin Fee'
    if (single === 'Resource fee') return 'Resource Fee'
    if (single === 'Material fee') return 'Material Fee'
    if (single === 'Partial Resource fee') return 'Partial Resource Fee'
    if (single === 'Partial Material fee') return 'Partial Material Fee'
    return single
  }

  if (feeParts.length === 2) {
    if (feeParts[0] === 'Admin fee' && feeParts[1] === 'Partial Resource fee') {
      return 'Admin Fee including Partial Resource Fee'
    }
    if (feeParts[0] === 'Remaining Admin fee' && feeParts[1] === 'Partial Resource fee') {
      return 'Remaining Admin fee including Partial Resource fee'
    }
    return `${feeParts[0]} and ${feeParts[1]}`
  }

  return feeParts.slice(0, -1).join(', ') + ' and ' + feeParts[feeParts.length - 1]
}

export function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function mapDbRowToSchedule(row: any): StudentInstallmentSchedule {
  let scheduleItems: InstallmentRow[] = []
  let extraMaterialFee: number | undefined = undefined
  let extraInitialFees: number[] | undefined = undefined
  let extraAgency: string | undefined = undefined
  let extraScheduleStartMonth: string | undefined = undefined
  let extraScheduleEndMonth: string | undefined = undefined
  let extraFirstCustomMonth: string | undefined = undefined

  if (typeof row.schedule_items === 'string') {
    try {
      const parsed = JSON.parse(row.schedule_items)
      if (Array.isArray(parsed)) {
        scheduleItems = parsed
      } else if (parsed && typeof parsed === 'object') {
        scheduleItems = parsed.items || []
        extraMaterialFee = parsed.__material_fee
        extraInitialFees = parsed.__initial_fees
        extraAgency = parsed.__agency
        extraScheduleStartMonth = parsed.__schedule_start_month
        extraScheduleEndMonth = parsed.__schedule_end_month
        extraFirstCustomMonth = parsed.__first_installment_custom_month
      }
    } catch {
      scheduleItems = []
    }
  } else if (row.schedule_items && typeof row.schedule_items === 'object' && !Array.isArray(row.schedule_items)) {
    scheduleItems = row.schedule_items.items || []
    extraMaterialFee = row.schedule_items.__material_fee
    extraInitialFees = row.schedule_items.__initial_fees
    extraAgency = row.schedule_items.__agency
    extraScheduleStartMonth = row.schedule_items.__schedule_start_month
    extraScheduleEndMonth = row.schedule_items.__schedule_end_month
    extraFirstCustomMonth = row.schedule_items.__first_installment_custom_month
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

  // Fallback resolution for schedule timeline if not explicitly saved
  const scheduleStartMonth = extraScheduleStartMonth || (row.start_date ? row.start_date.substring(0, 7) : undefined)
  let scheduleEndMonth = extraScheduleEndMonth
  if (!scheduleEndMonth && row.end_date) {
    const endParts = row.end_date.split('-').map(Number)
    if (endParts.length >= 2) {
      const offset = row.end_month_offset ?? 3
      const rawEndIdx = endParts[0] * 12 + (endParts[1] - 1) - offset
      const ey = Math.floor(rawEndIdx / 12)
      const em = (rawEndIdx % 12) + 1
      scheduleEndMonth = `${ey}-${em < 10 ? '0' : ''}${em}`
    }
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
    schedule_start_month: scheduleStartMonth,
    schedule_end_month: scheduleEndMonth,
    first_installment_custom_month: extraFirstCustomMonth || row.start_month_year || undefined,
    start_month_year: row.start_month_year || undefined,
    end_month_offset: row.end_month_offset ?? 3,
    admin_fee: admin,
    resources_fee: resources,
    material_fee: matFee > 0 ? matFee : undefined,
    tuition_fee: tuition,
    scholarship: scholarship,
    total_amount: total,
    first_installment_amount: Number(row.first_installment_amount) || 0,
    initial_fees: extraInitialFees || [Number(row.first_installment_amount) || 0],
    schedule_items: scheduleItems.map((s) => ({
      ...s,
      description: s.description ? s.description.replace(' + ', ' including ') : s.description,
    })),
    agency: row.agency || extraAgency || undefined,
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
    start_month_year: schedule.first_installment_custom_month || schedule.start_month_year || null,
    end_month_offset: schedule.end_month_offset ?? 3,
    admin_fee: Number(schedule.admin_fee) || 0,
    resources_fee: Number(schedule.resources_fee) || 0,
    tuition_fee: Number(schedule.tuition_fee) || 0,
    scholarship: Number(schedule.scholarship) || 0,
    total_amount: Number(schedule.total_amount) || 0,
    first_installment_amount: Number(schedule.first_installment_amount) || 0,
    schedule_items: {
      items: schedule.schedule_items || [],
      __material_fee: schedule.material_fee,
      __initial_fees: schedule.initial_fees,
      __agency: schedule.agency || null,
      __schedule_start_month: schedule.schedule_start_month,
      __schedule_end_month: schedule.schedule_end_month,
      __first_installment_custom_month: schedule.first_installment_custom_month,
    },
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
