import { createClient } from '@/lib/supabase/client'
import { addMonths, format, parseISO, differenceInMonths, subMonths } from 'date-fns'

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

const STORAGE_KEY = 'aimt_student_installments'
const FIXED_INFO_KEY = 'aimt_fixed_info_settings'

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
  tuition_fee: number
  scholarship: number
  first_installment_amount: number
}): { scheduleItems: InstallmentRow[]; totalAmount: number } {
  const admin = Number(params.admin_fee) || 0
  const resources = Number(params.resources_fee) || 0
  const tuition = Number(params.tuition_fee) || 0
  const scholarship = Number(params.scholarship) || 0
  const offsetMonths = typeof params.end_month_offset === 'number' ? params.end_month_offset : 3

  const totalAmount = Math.max(0, Math.round(admin + resources + tuition - scholarship))

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

    // Dynamic 1st row description logic based on firstAmt vs fees
    let firstRowDescription = ''
    let isFirstInstallmentIncluded = true

    if (admin > 0 && firstAmt === admin) {
      firstRowDescription = 'Admin Fee'
      isFirstInstallmentIncluded = false
    } else if (resources > 0 && firstAmt === resources && admin === 0) {
      firstRowDescription = 'Resource Fee'
      isFirstInstallmentIncluded = false
    } else if (admin > 0 && resources > 0 && firstAmt === admin + resources) {
      firstRowDescription = 'Admin fee and Resource fee'
      isFirstInstallmentIncluded = false
    } else if (resources === 0 && admin > 0 && firstAmt > admin) {
      firstRowDescription = 'Admin Fee including 1st Installment'
      isFirstInstallmentIncluded = true
    } else if (admin > 0 && resources > 0 && firstAmt > (admin + resources)) {
      firstRowDescription = '1st Installment including Admin fee and Resource fee'
      isFirstInstallmentIncluded = true
    } else if (admin > 0 && firstAmt > admin && firstAmt < (admin + resources)) {
      firstRowDescription = 'Admin Fee including Partial Resource Fee'
      isFirstInstallmentIncluded = false
    } else {
      // Default fallback
      firstRowDescription = '1st Installment'
      if (admin > 0 && resources > 0) {
        firstRowDescription = '1st Installment including Admin fee and Resource fee'
      } else if (admin > 0) {
        firstRowDescription = '1st Installment including Admin fee'
      } else if (resources > 0) {
        firstRowDescription = '1st Installment including Resource fee'
      }
      isFirstInstallmentIncluded = true
    }

    // 1st Row Independent Month Label (Selected manually by user, e.g. Dec-25)
    rows.push({
      monthLabel: format(startD, 'MMM-yy'),
      description: firstRowDescription,
      amount: firstAmt,
    })

    // Course Start Date base (e.g. 21/09/2026 -> Sep-26)
    const courseStartD = parseISO(params.start_date)
    const validCourseStart = !isNaN(courseStartD.getTime()) ? courseStartD : startD

    // Last installment month = End date month minus offsetMonths (e.g. 3 or 2)
    const lastInstallmentD = subMonths(endD, offsetMonths)
    const targetEnd = lastInstallmentD >= validCourseStart ? lastInstallmentD : endD

    // Calculate total course-based installment count from start_date to targetEnd
    let totalCourseMonthsCount = differenceInMonths(targetEnd, validCourseStart) + 1
    if (totalCourseMonthsCount < 1) totalCourseMonthsCount = 1

    const remainingMonths = totalCourseMonthsCount - 1

    if (remainingMonths > 0) {
      const basePerMonth = Math.floor(remainingTotal / remainingMonths)
      const remainder = remainingTotal - basePerMonth * remainingMonths

      for (let i = 1; i <= remainingMonths; i++) {
        // Forward count from course start month: 2nd row = courseStartD + 1 month (e.g. Oct-26 if start is Sep-26)
        const currentDate = addMonths(validCourseStart, i)
        const monthLabel = format(currentDate, 'MMM-yy')

        // Ordinal counter logic: If 1st row was not 1st installment, counting starts at 1st Installment for 2nd row
        const installmentIndex = isFirstInstallmentIncluded ? (i + 1) : i
        const ordinal = getOrdinal(installmentIndex)
        const description = `${ordinal} Installment`

        // Add remainder to the last installment month to ensure total matches exactly
        const amt = i === remainingMonths ? basePerMonth + remainder : basePerMonth

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

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export function getLocalInstallments(): StudentInstallmentSchedule[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const items: StudentInstallmentSchedule[] = JSON.parse(raw)
    return items.map((item) => ({
      ...item,
      schedule_items: item.schedule_items?.map((s) => ({
        ...s,
        description: s.description ? s.description.replace(' + ', ' including ') : s.description,
      })),
    }))
  } catch {
    return []
  }
}

export function setLocalInstallments(items: StudentInstallmentSchedule[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Ignore storage errors
  }
}

function mapDbRowToSchedule(row: any): StudentInstallmentSchedule {
  let scheduleItems: InstallmentRow[] = []
  if (typeof row.schedule_items === 'string') {
    try {
      scheduleItems = JSON.parse(row.schedule_items)
    } catch {
      scheduleItems = []
    }
  } else if (Array.isArray(row.schedule_items)) {
    scheduleItems = row.schedule_items
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
    admin_fee: Number(row.admin_fee) || 0,
    resources_fee: Number(row.resources_fee) || 0,
    tuition_fee: Number(row.tuition_fee) || 0,
    scholarship: Number(row.scholarship) || 0,
    total_amount: Number(row.total_amount) || 0,
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
  return {
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
}

/**
 * Automatically migrates and syncs any local installment schedules from localStorage into Supabase DB.
 * Ensures data saved on Laptop A is uploaded to Cloud and available across all devices.
 */
export async function syncLocalInstallmentsToSupabase(): Promise<{ syncedCount: number; error?: string }> {
  const localList = getLocalInstallments()
  if (localList.length === 0) {
    return { syncedCount: 0 }
  }

  try {
    const supabase = createClient()
    // Filter out dummy default if it's the only one and not customized
    const toUpload = localList.map(mapScheduleToDbRow)

    const { error } = await supabase
      .from('installment_schedules')
      .upsert(toUpload, { onConflict: 'id' })

    if (error) {
      console.warn('Sync to Supabase warning:', error.message)
      return { syncedCount: 0, error: error.message }
    }

    return { syncedCount: toUpload.length }
  } catch (err: any) {
    console.warn('Sync to Supabase exception:', err?.message)
    return { syncedCount: 0, error: err?.message }
  }
}

export async function getInstallments(): Promise<StudentInstallmentSchedule[]> {
  const localList = getLocalInstallments()

  try {
    const supabase = createClient()

    // 1. If local items exist, trigger auto-sync to cloud in background
    if (localList.length > 0) {
      syncLocalInstallmentsToSupabase().catch(() => {})
    }

    // 2. Fetch all installment schedules from Supabase
    const { data, error } = await supabase
      .from('installment_schedules')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data && data.length > 0) {
      const dbSchedules = data.map(mapDbRowToSchedule)
      // Merge with any local items not yet on DB
      const mergedMap = new Map<string, StudentInstallmentSchedule>()
      localList.forEach((item) => mergedMap.set(item.id, item))
      dbSchedules.forEach((item) => mergedMap.set(item.id, item)) // DB overrides local
      const merged = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      )

      setLocalInstallments(merged)
      return merged
    }

    // If Supabase returned empty but local has items, upload local items
    if (!error && data && data.length === 0 && localList.length > 0) {
      await syncLocalInstallmentsToSupabase()
      return localList
    }
  } catch (err) {
    console.warn('Error fetching installments from Supabase, using local cache:', err)
  }

  // Fallback to local
  return localList
}

export async function getInstallmentById(id: string): Promise<StudentInstallmentSchedule | null> {
  // 1. Try Supabase
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('installment_schedules')
      .select('*')
      .eq('id', id)
      .single()

    if (!error && data) {
      return mapDbRowToSchedule(data)
    }
  } catch (err) {
    console.warn('Error fetching installment by ID from Supabase:', err)
  }

  // 2. Fallback to local cache
  const localList = getLocalInstallments()
  return localList.find((item) => item.id === id) || null
}

export async function saveInstallment(
  schedule: Omit<StudentInstallmentSchedule, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): Promise<StudentInstallmentSchedule> {
  const now = new Date().toISOString()
  const localList = getLocalInstallments()

  let finalSchedule: StudentInstallmentSchedule

  if (schedule.id) {
    const existing = localList.find((item) => item.id === schedule.id)
    finalSchedule = {
      ...existing,
      ...schedule,
      id: schedule.id,
      created_at: existing?.created_at || now,
      updated_at: now,
    }
  } else {
    finalSchedule = {
      ...schedule,
      id: `aimt-sch-${Date.now()}`,
      created_at: now,
      updated_at: now,
    }
  }

  // Update local cache immediately
  const updatedList = [
    finalSchedule,
    ...localList.filter((item) => item.id !== finalSchedule.id),
  ]
  setLocalInstallments(updatedList)

  // Persist to Supabase Database
  try {
    const supabase = createClient()
    const dbRow = mapScheduleToDbRow(finalSchedule)
    const { error } = await supabase
      .from('installment_schedules')
      .upsert(dbRow, { onConflict: 'id' })

    if (error) {
      console.error('Failed to save installment schedule to Supabase:', error.message)
    }
  } catch (err) {
    console.error('Exception saving installment schedule to Supabase:', err)
  }

  return finalSchedule
}

export async function deleteInstallment(id: string): Promise<void> {
  // 1. Delete from local cache
  const localList = getLocalInstallments()
  const updated = localList.filter((item) => item.id !== id)
  setLocalInstallments(updated)

  // 2. Delete from Supabase
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('installment_schedules')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Failed to delete installment from Supabase:', error.message)
    }
  } catch (err) {
    console.error('Exception deleting installment from Supabase:', err)
  }
}

