import fs from 'fs'
import path from 'path'

// 1. Add getEmployeeLeaveBalanceSummary to D:\Grocery Management\src\lib\services\attendance.service.ts
const servicePath = 'D:\\\\Grocery Management\\\\src\\\\lib\\\\services\\\\attendance.service.ts'
let serviceCode = fs.readFileSync(servicePath, 'utf-8')

const balanceSummaryCode = `
export const DEFAULT_EMPLOYEE_LEAVE_QUOTAS = {
  annual_leaves: 6,
  sick_leaves: 7,
  casual_leaves: 7,
  wfh_quota: 4,
  probation_leaves: 3,
}

function parseLeaveValue(notesOrStatus?: string | null): number {
  if (!notesOrStatus) return 1
  const m = notesOrStatus.match(/\\(([0-9]+(?:\\.[0-9]+)?)\\s*day/i) || notesOrStatus.match(/([0-9]+(?:\\.[0-9]+)?)\\s*day/i)
  if (m && m[1]) {
    const val = parseFloat(m[1])
    return isNaN(val) || val <= 0 ? 1 : val
  }
  if (notesOrStatus.toLowerCase().includes('half day')) return 0.5
  return 1
}

export async function getEmployeeLeaveBalanceSummary(
  employeeIdOrUuid: string,
  targetDate?: string,
  excludeRecordId?: string
): Promise<{
  isProbation: boolean
  joiningDate: string | null
  quotas: {
    probation_leaves: number
    annual_leaves: number
    sick_leaves: number
    casual_leaves: number
    wfh_quota: number
  }
  used: {
    probation_leaves: number
    annual_leaves: number
    sick_leaves: number
    casual_leaves: number
    wfh_quota: number
  }
  remaining: {
    probation_leaves: number
    annual_leaves: number
    sick_leaves: number
    casual_leaves: number
    wfh_quota: number
  }
  probationDates: string[]
  hasProbationInTargetMonth: boolean
}> {
  const supabase = getSupabaseClient()
  const [empRes, metaMap] = await Promise.all([
    supabase.from('employees').select('*').or(\`id.eq.\${employeeIdOrUuid},employee_id.eq.\${employeeIdOrUuid}\`).limit(1).single(),
    getEmployeeMetadataMap(),
  ])

  const emp = empRes.data as any
  const meta = (emp?.id && metaMap[emp.id]) || (emp?.employee_id && metaMap[emp.employee_id]) || metaMap[employeeIdOrUuid] || {}
  const isOldStaff = meta.is_old_staff !== undefined ? Boolean(meta.is_old_staff) : Boolean(emp?.is_old_staff)
  const joiningDate = isOldStaff ? null : (meta.joining_date || emp?.joining_date || emp?.created_at || null)

  const initialQuotas = meta.leave_quotas || {
    annual_leaves: DEFAULT_EMPLOYEE_LEAVE_QUOTAS.annual_leaves,
    sick_leaves: DEFAULT_EMPLOYEE_LEAVE_QUOTAS.sick_leaves,
    casual_leaves: DEFAULT_EMPLOYEE_LEAVE_QUOTAS.casual_leaves,
    wfh_quota: DEFAULT_EMPLOYEE_LEAVE_QUOTAS.wfh_quota,
    probation_leaves: isOldStaff ? 0 : DEFAULT_EMPLOYEE_LEAVE_QUOTAS.probation_leaves,
  }

  const initial_prob = isOldStaff ? 0 : (initialQuotas.probation_leaves !== undefined ? Number(initialQuotas.probation_leaves) : 3)
  const initial_ann = initialQuotas.annual_leaves !== undefined ? Number(initialQuotas.annual_leaves) : 6
  const initial_sick = initialQuotas.sick_leaves !== undefined ? Number(initialQuotas.sick_leaves) : 7
  const initial_cas = initialQuotas.casual_leaves !== undefined ? Number(initialQuotas.casual_leaves) : 7
  const initial_wfh = initialQuotas.wfh_quota !== undefined ? Number(initialQuotas.wfh_quota) : 4

  const empDbId = emp?.id || employeeIdOrUuid

  let allRecords: any[] = []
  if (empDbId) {
    const { data } = await supabase
      .from('attendance_records')
      .select('id, attendance_date, arrival_status, departure_status, raw_punches, notes')
      .eq('employee_id', empDbId)
      .gte('attendance_date', '2026-09-01')
    allRecords = data || []
  }

  const probationDates: string[] = []
  let used_annual = 0
  let used_sick = 0
  let used_casual = 0
  let used_probation = 0
  let used_wfh = 0

  const targetDateStr = targetDate ? targetDate.split('T')[0] : ''
  const targetMonthStr = targetDateStr ? targetDateStr.substring(0, 7) : ''

  if (allRecords && allRecords.length > 0) {
    for (const r of allRecords) {
      if (excludeRecordId && r.id === excludeRecordId) continue
      if (targetDateStr && r.attendance_date === targetDateStr) continue

      const arrStatus = r.arrival_status || ''
      const depStatus = r.departure_status || ''

      let noteStr: string | null = r.notes || null
      if (Array.isArray(r.raw_punches)) {
        const found = (r.raw_punches as any[]).find((p) => p && typeof p === 'object' && p.notes)
        if (found) noteStr = found.notes
      }
      const leaveVal = parseLeaveValue(noteStr || depStatus)

      const isLeave = arrStatus === 'Leave' || depStatus.includes('Leave') || ['Sick Leave', 'Casual Leave', 'Annual Leave', 'Probation Leave', 'Probation Leaves'].includes(depStatus)
      const isWfh = depStatus === 'Work From Home' || arrStatus === 'Work From Home'

      if (isWfh) {
        used_wfh += leaveVal
      } else if (isLeave) {
        if (depStatus.includes('Probation') || arrStatus.includes('Probation')) {
          used_probation += leaveVal
          if (r.attendance_date) {
            probationDates.push(r.attendance_date.split('T')[0])
          }
        } else if (depStatus.includes('Annual') || arrStatus.includes('Annual')) {
          used_annual += leaveVal
        } else if (depStatus.includes('Sick') || arrStatus.includes('Sick')) {
          used_sick += leaveVal
        } else if (depStatus.includes('Casual') || arrStatus.includes('Casual')) {
          used_casual += leaveVal
        }
      }
    }
  }

  let isProbation = false
  if (!isOldStaff && joiningDate && targetDateStr) {
    const j = new Date(joiningDate.split('T')[0])
    const t = new Date(targetDateStr)
    if (!isNaN(j.getTime()) && !isNaN(t.getTime())) {
      const monthsDiff = (t.getFullYear() - j.getFullYear()) * 12 + (t.getMonth() - j.getMonth())
      const daysDiff = Math.floor((t.getTime() - j.getTime()) / (1000 * 60 * 60 * 24))
      isProbation = daysDiff >= 0 && monthsDiff < 3
    }
  }

  const hasProbationInTargetMonth = targetMonthStr
    ? probationDates.some((d) => d.startsWith(targetMonthStr))
    : false

  return {
    isProbation,
    joiningDate,
    quotas: {
      probation_leaves: initial_prob,
      annual_leaves: initial_ann,
      sick_leaves: initial_sick,
      casual_leaves: initial_cas,
      wfh_quota: initial_wfh,
    },
    used: {
      probation_leaves: Number(used_probation.toFixed(2)),
      annual_leaves: Number(used_annual.toFixed(2)),
      sick_leaves: Number(used_sick.toFixed(2)),
      casual_leaves: Number(used_casual.toFixed(2)),
      wfh_quota: Number(used_wfh.toFixed(2)),
    },
    remaining: {
      probation_leaves: Math.max(0, Number((initial_prob - used_probation).toFixed(2))),
      annual_leaves: Math.max(0, Number((initial_ann - used_annual).toFixed(2))),
      sick_leaves: Math.max(0, Number((initial_sick - used_sick).toFixed(2))),
      casual_leaves: Math.max(0, Number((initial_cas - used_casual).toFixed(2))),
      wfh_quota: Math.max(0, Number((initial_wfh - used_wfh).toFixed(2))),
    },
    probationDates,
    hasProbationInTargetMonth,
  }
}
`

if (!serviceCode.includes('getEmployeeLeaveBalanceSummary')) {
  serviceCode += balanceSummaryCode
  fs.writeFileSync(servicePath, serviceCode, 'utf-8')
  console.log('Appended getEmployeeLeaveBalanceSummary to Grocery attendance.service.ts')
}

// 2. Create D:\Grocery Management\src\app\api\attendance\leave-balance\route.ts
const routePath = 'D:\\\\Grocery Management\\\\src\\\\app\\\\api\\\\attendance\\\\leave-balance\\\\route.ts'
const routeCode = `import { NextRequest, NextResponse } from 'next/server'
import { getEmployeeLeaveBalanceSummary } from '@/lib/services/attendance.service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const date = searchParams.get('date') || undefined
    const excludeRecordId = searchParams.get('excludeRecordId') || undefined

    if (!employeeId) {
      return NextResponse.json({ success: false, error: 'Employee ID is required.' }, { status: 400 })
    }

    const summary = await getEmployeeLeaveBalanceSummary(employeeId, date, excludeRecordId)

    return NextResponse.json({
      success: true,
      ...summary,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
`

fs.mkdirSync(path.dirname(routePath), { recursive: true })
fs.writeFileSync(routePath, routeCode, 'utf-8')
console.log('Successfully wrote', routePath)
