import * as XLSX from 'xlsx'
import { AttendanceSettings, Employee, RawPunch } from '@/lib/supabase/database.types'

export const DEFAULT_ATTENDANCE_SETTINGS: AttendanceSettings = {
  id: 'default',
  weekday_in_time: '10:30',
  weekday_grace_minutes: 15,
  weekday_out_time: '18:30',
  saturday_in_time: '11:00',
  saturday_grace_minutes: 15,
  saturday_out_time: '15:00',
  timezone: 'Asia/Karachi',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

/**
 * Normalizes an employee name for deterministic, safe matching.
 * Trims leading/trailing spaces, collapses multiple whitespace characters, and lowercases.
 */
export function normalizeEmployeeName(name: string | null | undefined): string {
  if (!name) return ''
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

/**
 * Safely parses a time string into 24-hour minutes from midnight.
 * Supports formats: "10:30 AM", "10:30:00 AM", "18:30", "18:30:00", "8/1/2026 10:43 AM"
 */
export function parseTimeToMinutes(timeStr: string | null | undefined): { minutes: number; formatted: string; rawHours: number; rawMinutes: number } | null {
  if (!timeStr) return null
  const str = timeStr.trim()

  // Match e.g. "10:43:12 AM" or "10:43 AM" or "10:43"
  const timeRegex = /(?:(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?\s*(AM|PM)?)/i
  const match = str.match(timeRegex)

  if (!match) return null

  let hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  const meridiem = match[4] ? match[4].toUpperCase() : null

  if (meridiem === 'PM' && hours < 12) {
    hours += 12
  } else if (meridiem === 'AM' && hours === 12) {
    hours = 0
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null
  }

  const totalMinutes = hours * 60 + minutes

  // Format nicely to 12-hour AM/PM string e.g. "10:43 AM"
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  const displayAmPm = hours >= 12 ? 'PM' : 'AM'
  const formatted = `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${displayAmPm}`

  return {
    minutes: totalMinutes,
    formatted,
    rawHours: hours,
    rawMinutes: minutes,
  }
}

/**
 * Parses settings "HH:mm" e.g. "10:30" or "18:30" to minutes from midnight
 */
export function parseScheduleTimeToMinutes(hhmm: string): number {
  if (!hhmm) return 0
  const parts = hhmm.split(':')
  const h = parseInt(parts[0] || '0', 10)
  const m = parseInt(parts[1] || '0', 10)
  return h * 60 + m
}

/**
 * Calculates arrival status based on day of week and active settings.
 * Monday-Friday (1-5): In <= OfficialIn + Grace -> On Time Arrival; else Late Arrival
 * Saturday (6): In <= OfficialIn + Grace -> On Time Arrival; else Late Arrival
 * Sunday (0): Sunday
 */
export function calculateArrivalStatus(
  inTimeStr: string | null | undefined,
  dayOfWeek: number, // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  settings: AttendanceSettings = DEFAULT_ATTENDANCE_SETTINGS
): 'On Time Arrival' | 'Late Arrival' | 'Missing In Time' {
  if (!inTimeStr) return 'Missing In Time'

  const parsed = parseTimeToMinutes(inTimeStr)
  if (!parsed) return 'Missing In Time'

  if (dayOfWeek === 6) {
    // Saturday
    const satOfficialInMin = parseScheduleTimeToMinutes(settings.saturday_in_time) // e.g. 11:00 -> 660
    const satCutoffMin = satOfficialInMin + (settings.saturday_grace_minutes || 15) // e.g. 11:15 -> 675
    return parsed.minutes <= satCutoffMin ? 'On Time Arrival' : 'Late Arrival'
  }

  // Monday - Friday
  const weekdayOfficialInMin = parseScheduleTimeToMinutes(settings.weekday_in_time) // e.g. 10:30 -> 630
  const weekdayCutoffMin = weekdayOfficialInMin + (settings.weekday_grace_minutes || 15) // e.g. 10:45 -> 645
  return parsed.minutes <= weekdayCutoffMin ? 'On Time Arrival' : 'Late Arrival'
}

/**
 * Calculates departure status based on day of week and active settings.
 * Monday-Friday (1-5): Out >= OfficialOut -> On Time Departure; else Early Departure
 * Saturday (6): Out >= OfficialOut -> On Time Departure; else Early Departure
 */
export function calculateDepartureStatus(
  outTimeStr: string | null | undefined,
  dayOfWeek: number,
  settings: AttendanceSettings = DEFAULT_ATTENDANCE_SETTINGS
): 'On Time Departure' | 'Early Departure' | 'Missing Out Time' {
  if (!outTimeStr) return 'Missing Out Time'

  const parsed = parseTimeToMinutes(outTimeStr)
  if (!parsed) return 'Missing Out Time'

  if (dayOfWeek === 6) {
    // Saturday
    const satOfficialOutMin = parseScheduleTimeToMinutes(settings.saturday_out_time) // e.g. 15:00 -> 900
    return parsed.minutes >= satOfficialOutMin ? 'On Time Departure' : 'Early Departure'
  }

  // Monday - Friday
  const weekdayOfficialOutMin = parseScheduleTimeToMinutes(settings.weekday_out_time) // e.g. 18:30 -> 1110
  return parsed.minutes >= weekdayOfficialOutMin ? 'On Time Departure' : 'Early Departure'
}

/**
 * Calculates total working minutes and human-readable formatted string (e.g. "7h 55m")
 * Supports multi-punch intervals if raw punches are available.
 */
export function calculateWorkingDuration(
  inTimeStr: string | null | undefined,
  outTimeStr: string | null | undefined,
  rawPunches?: RawPunch[]
): { totalMinutes: number; formatted: string } {
  if (!inTimeStr || !outTimeStr) {
    return { totalMinutes: 0, formatted: '--' }
  }

  // If raw punches are provided and have multiple In/Out events
  if (rawPunches && rawPunches.length >= 2) {
    // Sort chronologically
    const sorted = [...rawPunches]
      .map((p) => {
        const parsed = parseTimeToMinutes(p.time)
        return {
          ...p,
          minutes: parsed ? parsed.minutes : null,
        }
      })
      .filter((p): p is typeof p & { minutes: number } => p.minutes !== null)
      .sort((a, b) => a.minutes - b.minutes)

    let totalDuration = 0
    let currentInMin: number | null = null

    for (const punch of sorted) {
      const stateNorm = (punch.state || '').trim().toLowerCase()
      const isIn = stateNorm.includes('in') || stateNorm === 'c/in'
      const isOut = stateNorm.includes('out') || stateNorm === 'c/out'

      if (isIn && currentInMin === null) {
        currentInMin = punch.minutes
      } else if (isOut && currentInMin !== null) {
        if (punch.minutes >= currentInMin) {
          totalDuration += punch.minutes - currentInMin
        }
        currentInMin = null
      }
    }

    if (totalDuration > 0) {
      const hours = Math.floor(totalDuration / 60)
      const mins = totalDuration % 60
      return {
        totalMinutes: totalDuration,
        formatted: `${hours}h ${mins}m`,
      }
    }
  }

  // Fallback to direct calculation: outTime - inTime
  const inParsed = parseTimeToMinutes(inTimeStr)
  const outParsed = parseTimeToMinutes(outTimeStr)

  if (!inParsed || !outParsed) {
    return { totalMinutes: 0, formatted: '--' }
  }

  let diff = outParsed.minutes - inParsed.minutes
  if (diff < 0) diff = 0 // Out before In handling

  const hours = Math.floor(diff / 60)
  const mins = diff % 60

  return {
    totalMinutes: diff,
    formatted: `${hours}h ${mins}m`,
  }
}

/**
 * Day of week names mapping
 */
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/**
 * Parses date string or Excel serial number into YYYY-MM-DD and Day info
 */
export function parseDateString(rawDate: any): { dateString: string; dayOfWeek: number; dayName: string } | null {
  if (rawDate === null || rawDate === undefined || rawDate === '') return null

  // Handle Excel Serial Number (e.g. 45505)
  if (typeof rawDate === 'number') {
    const jsDate = new Date((rawDate - 25569) * 86400 * 1000)
    if (isNaN(jsDate.getTime())) return null
    const year = jsDate.getUTCFullYear()
    const month = String(jsDate.getUTCMonth() + 1).padStart(2, '0')
    const day = String(jsDate.getUTCDate()).padStart(2, '0')
    const dateString = `${year}-${month}-${day}`
    const dayOfWeek = jsDate.getUTCDay()
    return {
      dateString,
      dayOfWeek,
      dayName: DAY_NAMES[dayOfWeek],
    }
  }

  const str = String(rawDate).trim()

  // Match M/D/YYYY or MM/DD/YYYY or YYYY-MM-DD or DD/MM/YYYY
  // First check ISO YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10)
    const month = parseInt(isoMatch[2], 10)
    const day = parseInt(isoMatch[3], 10)
    const d = new Date(Date.UTC(year, month - 1, day))
    if (!isNaN(d.getTime())) {
      const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const dayOfWeek = d.getUTCDay()
      return { dateString, dayOfWeek, dayName: DAY_NAMES[dayOfWeek] }
    }
  }

  // Check M/D/YYYY (e.g. 8/1/2026 or 08/01/2026)
  const usMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
  if (usMatch) {
    const month = parseInt(usMatch[1], 10)
    const day = parseInt(usMatch[2], 10)
    const year = parseInt(usMatch[3], 10)
    const d = new Date(Date.UTC(year, month - 1, day))
    if (!isNaN(d.getTime())) {
      const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const dayOfWeek = d.getUTCDay()
      return { dateString, dayOfWeek, dayName: DAY_NAMES[dayOfWeek] }
    }
  }

  // Generic date fallback
  const d = new Date(str)
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const dateString = `${year}-${month}-${day}`
    const dayOfWeek = d.getDay()
    return { dateString, dayOfWeek, dayName: DAY_NAMES[dayOfWeek] }
  }

  return null
}

/**
 * Match status result for Excel import
 */
export type MatchStatus = 'MATCHED' | 'UNMATCHED' | 'AMBIGUOUS'

export interface EmployeeMatchResult {
  status: MatchStatus
  employee?: Employee
  candidates?: Employee[]
  rawName: string
  normalizedName: string
}

/**
 * Deterministically matches Excel employee name against existing employees.
 * ONLY uses normalized Employee Name.
 */
export function matchEmployeeByName(
  rawName: string,
  employees: Employee[]
): EmployeeMatchResult {
  const normalized = normalizeEmployeeName(rawName)

  if (!normalized) {
    return {
      status: 'UNMATCHED',
      rawName: rawName || '',
      normalizedName: '',
    }
  }

  const matches = employees.filter((emp) => {
    const empNorm = emp.normalized_name || normalizeEmployeeName(emp.name)
    return empNorm === normalized
  })

  if (matches.length === 1) {
    return {
      status: 'MATCHED',
      employee: matches[0],
      rawName,
      normalizedName: normalized,
    }
  }

  if (matches.length > 1) {
    return {
      status: 'AMBIGUOUS',
      candidates: matches,
      rawName,
      normalizedName: normalized,
    }
  }

  return {
    status: 'UNMATCHED',
    rawName,
    normalizedName: normalized,
  }
}

/**
 * Excel parsed row structure
 */
export interface ExcelRawRow {
  rowIndex: number
  name: string
  time: string
  state: string
  rawRow: Record<string, any>
}

/**
 * Intermediate grouped day attendance item for import preview
 */
export interface ParsedAttendancePreviewItem {
  key: string // employeeIdOrName + '___' + date
  rawEmployeeName: string
  employee?: Employee
  employeeIdDisplay: string
  designationDisplay: string
  matchStatus: MatchStatus
  candidates?: Employee[]
  date: string // YYYY-MM-DD
  dayOfWeek: number
  dayName: string
  inTime: string | null
  outTime: string | null
  arrivalStatus: 'On Time Arrival' | 'Late Arrival' | 'Missing In Time' | '--'
  departureStatus: 'On Time Departure' | 'Early Departure' | 'Missing Out Time' | '--'
  totalWorkingMinutes: number
  totalWorkingHoursFormatted: string
  rawPunches: RawPunch[]
  isSundaySkipped: boolean
  isDuplicateExisting: boolean
  isInvalid: boolean
  validationErrors: string[]
  resolvedEmployeeId?: string // for ambiguous resolution
}

export interface ExcelImportParseResult {
  success: boolean
  fileName: string
  totalRawRows: number
  detectedColumns: {
    nameColumn: string
    timeColumn: string
    stateColumn: string
    availableColumns: string[]
  }
  previewItems: ParsedAttendancePreviewItem[]
  stats: {
    totalRows: number
    validDays: number
    matchedCount: number
    unmatchedCount: number
    ambiguousCount: number
    sundaySkippedCount: number
    duplicateCount: number
    invalidRowsCount: number
  }
  unmatchedNames: string[]
  ambiguousNames: string[]
  errorDetails: Array<{
    rowIndex: number
    name: string
    time: string
    issue: string
    action: string
  }>
}

/**
 * Parses uploaded Excel workbook and generates complete validation & preview breakdown.
 */
export function parseExcelAttendanceWorkbook(
  workbookBuffer: ArrayBuffer | Buffer,
  fileName: string,
  existingEmployees: Employee[],
  existingAttendanceDatesByEmpId: Map<string, Set<string>>,
  settings: AttendanceSettings = DEFAULT_ATTENDANCE_SETTINGS,
  columnMapping?: { nameCol?: string; timeCol?: string; stateCol?: string }
): ExcelImportParseResult {
  const workbook = XLSX.read(workbookBuffer, { type: 'buffer', cellDates: true })
  const firstSheetName = workbook.SheetNames[0]

  if (!firstSheetName) {
    throw new Error('Excel workbook contains no sheets.')
  }

  const worksheet = workbook.Sheets[firstSheetName]
  const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  })

  if (!rawJson || rawJson.length < 2) {
    throw new Error('Excel sheet is empty or contains only a header row.')
  }

  // Extract header row
  const headerRow = (rawJson[0] as any[]).map((col) => String(col || '').trim())
  const availableColumns = headerRow.filter(Boolean)

  // Detect columns
  let nameColIdx = headerRow.findIndex((c) => /^name$/i.test(c) || /employee.*name/i.test(c))
  let timeColIdx = headerRow.findIndex((c) => /^time$/i.test(c) || /date.*time/i.test(c) || /timestamp/i.test(c))
  let stateColIdx = headerRow.findIndex((c) => /^state$/i.test(c) || /^status$/i.test(c) || /^in.*out$/i.test(c))
  let newStateColIdx = headerRow.findIndex((c) => /^new[\s_]*state$/i.test(c) || /new.*state/i.test(c))

  // Override with manual mapping if supplied
  if (columnMapping?.nameCol) {
    const idx = headerRow.indexOf(columnMapping.nameCol)
    if (idx !== -1) nameColIdx = idx
  }
  if (columnMapping?.timeCol) {
    const idx = headerRow.indexOf(columnMapping.timeCol)
    if (idx !== -1) timeColIdx = idx
  }
  if (columnMapping?.stateCol) {
    const idx = headerRow.indexOf(columnMapping.stateCol)
    if (idx !== -1) stateColIdx = idx
  }

  // Fallbacks if not named identically
  if (nameColIdx === -1) nameColIdx = 0
  if (timeColIdx === -1) timeColIdx = Math.min(1, headerRow.length - 1)
  if (stateColIdx === -1) stateColIdx = Math.min(2, headerRow.length - 1)

  const detectedColumns = {
    nameColumn: headerRow[nameColIdx] || 'Column ' + (nameColIdx + 1),
    timeColumn: headerRow[timeColIdx] || 'Column ' + (timeColIdx + 1),
    stateColumn: headerRow[stateColIdx] || 'Column ' + (stateColIdx + 1),
    availableColumns,
  }

  const rawRows: ExcelRawRow[] = []
  const errorDetails: Array<{ rowIndex: number; name: string; time: string; issue: string; action: string }> = []
  let sundaySkippedCount = 0
  let invalidRowsCount = 0

  for (let i = 1; i < rawJson.length; i++) {
    const row = rawJson[i] as any[]
    if (!row || row.length === 0 || row.every((c) => c === '' || c === null || c === undefined)) {
      continue // skip empty rows
    }

    const rowIndex = i + 1 // 1-indexed row number in spreadsheet
    const rawName = String(row[nameColIdx] || '').trim()
    const rawTime = row[timeColIdx]
    const rawState = String(row[stateColIdx] || '').trim()
    const rawNewState = newStateColIdx !== -1 ? String(row[newStateColIdx] || '').trim() : ''

    // Effective state: if New State is populated, it overrides State (e.g. State="C/In", New State="C/Out")
    const effectiveState = rawNewState ? rawNewState : (rawState || 'C/In')

    if (!rawName) {
      invalidRowsCount++
      errorDetails.push({
        rowIndex,
        name: '(Empty Name)',
        time: String(rawTime || ''),
        issue: 'Missing employee name',
        action: 'Fill in the employee name in Excel',
      })
      continue
    }

    rawRows.push({
      rowIndex,
      name: rawName,
      time: String(rawTime || ''),
      state: effectiveState,
      rawRow: row.reduce((acc, val, idx) => {
        acc[headerRow[idx] || `col_${idx}`] = val
        return acc
      }, {} as Record<string, any>),
    })
  }

  // Group raw rows by Employee (Normalized Name) + Date
  // Structure: Map<groupKey, { rawName, date, dayOfWeek, dayName, punches: RawPunch[], rows: ExcelRawRow[] }>
  type DayGroup = {
    rawName: string
    dateString: string
    dayOfWeek: number
    dayName: string
    punches: RawPunch[]
    rowIndices: number[]
  }

  const dayGroups = new Map<string, DayGroup>()
  const unmatchedNamesSet = new Set<string>()
  const ambiguousNamesSet = new Set<string>()

  for (const rawRow of rawRows) {
    const normalizedName = normalizeEmployeeName(rawRow.name)
    const dateParsed = parseDateString(rawRow.time)

    if (!dateParsed) {
      invalidRowsCount++
      errorDetails.push({
        rowIndex: rawRow.rowIndex,
        name: rawRow.name,
        time: rawRow.time,
        issue: 'Invalid date/time timestamp format',
        action: 'Correct the time format (e.g. 8/1/2026 10:43 AM)',
      })
      continue
    }

    // Check Sunday rule
    if (dateParsed.dayOfWeek === 0) {
      sundaySkippedCount++
      errorDetails.push({
        rowIndex: rawRow.rowIndex,
        name: rawRow.name,
        time: rawRow.time,
        issue: 'Sunday record skipped automatically (non-working day)',
        action: 'No action needed; Sundays are excluded from attendance',
      })
      continue
    }

    const groupKey = `${normalizedName}___${dateParsed.dateString}`

    if (!dayGroups.has(groupKey)) {
      dayGroups.set(groupKey, {
        rawName: rawRow.name,
        dateString: dateParsed.dateString,
        dayOfWeek: dateParsed.dayOfWeek,
        dayName: dateParsed.dayName,
        punches: [],
        rowIndices: [],
      })
    }

    const group = dayGroups.get(groupKey)!
    group.rowIndices.push(rawRow.rowIndex)

    // Parse time for this punch
    const timeParsed = parseTimeToMinutes(rawRow.time)
    const formattedTime = timeParsed ? timeParsed.formatted : String(rawRow.time)

    group.punches.push({
      time: formattedTime,
      state: rawRow.state || 'C/In',
      rawTimestamp: rawRow.time,
      originalRowIndex: rawRow.rowIndex,
    })
  }

  // Build Preview Items
  const previewItems: ParsedAttendancePreviewItem[] = []
  let matchedCount = 0
  let unmatchedCount = 0
  let ambiguousCount = 0
  let duplicateCount = 0

  for (const [groupKey, group] of dayGroups.entries()) {
    const match = matchEmployeeByName(group.rawName, existingEmployees)

    if (match.status === 'MATCHED') {
      matchedCount++
    } else if (match.status === 'UNMATCHED') {
      unmatchedCount++
      unmatchedNamesSet.add(group.rawName)
      errorDetails.push({
        rowIndex: group.rowIndices[0] || 0,
        name: group.rawName,
        time: group.dateString,
        issue: 'Employee not found in database',
        action: 'Add this employee in Employees section before importing',
      })
    } else if (match.status === 'AMBIGUOUS') {
      ambiguousCount++
      ambiguousNamesSet.add(group.rawName)
      errorDetails.push({
        rowIndex: group.rowIndices[0] || 0,
        name: group.rawName,
        time: group.dateString,
        issue: 'Multiple employees found with this exact name',
        action: 'Select which employee ID to assign this record to',
      })
    }

    // Identify In / Out punches
    // Sort punches chronologically by time
    const sortedPunches = [...group.punches].sort((a, b) => {
      const ta = parseTimeToMinutes(a.time)?.minutes || 0
      const tb = parseTimeToMinutes(b.time)?.minutes || 0
      return ta - tb
    })

    let inPunches = sortedPunches.filter((p) => {
      const s = (p.state || '').trim().toLowerCase()
      return s.includes('in') || s === 'c/in'
    })

    let outPunches = sortedPunches.filter((p) => {
      const s = (p.state || '').trim().toLowerCase()
      return s.includes('out') || s === 'c/out'
    })

    // Fail-safe: if all punches were marked C/In but there are 2 or more distinct punches on this day
    if (outPunches.length === 0 && sortedPunches.length >= 2) {
      const firstPunch = sortedPunches[0]
      const lastPunch = sortedPunches[sortedPunches.length - 1]
      const minFirst = parseTimeToMinutes(firstPunch.time)?.minutes || 0
      const minLast = parseTimeToMinutes(lastPunch.time)?.minutes || 0

      if (minLast > minFirst) {
        firstPunch.state = 'C/In'
        lastPunch.state = 'C/Out'
        inPunches = [firstPunch]
        outPunches = [lastPunch]
      }
    }

    const firstIn = inPunches.length > 0 ? inPunches[0].time : (sortedPunches[0]?.time || null)
    const lastOut = outPunches.length > 0 ? outPunches[outPunches.length - 1].time : null

    // Calculate arrival & departure statuses
    const arrivalStatus = calculateArrivalStatus(firstIn, group.dayOfWeek, settings)
    const departureStatus = calculateDepartureStatus(lastOut, group.dayOfWeek, settings)

    // Calculate total working hours
    const { totalMinutes, formatted: workingHoursFormatted } = calculateWorkingDuration(
      firstIn,
      lastOut,
      sortedPunches
    )

    // Check duplicate against existing DB records
    let isDuplicate = false
    if (match.employee?.id) {
      const datesSet = existingAttendanceDatesByEmpId.get(match.employee.id)
      if (datesSet && datesSet.has(group.dateString)) {
        isDuplicate = true
        duplicateCount++
      }
    }

    const validationErrors: string[] = []
    if (match.status === 'UNMATCHED') {
      validationErrors.push('Unmatched employee name')
    }
    if (match.status === 'AMBIGUOUS') {
      validationErrors.push('Ambiguous employee match: manual selection required')
    }
    if (!firstIn && !lastOut) {
      validationErrors.push('No valid In or Out punches detected')
    }

    previewItems.push({
      key: groupKey,
      rawEmployeeName: group.rawName,
      employee: match.employee,
      employeeIdDisplay: match.employee ? match.employee.employee_id : 'N/A',
      designationDisplay: match.employee ? match.employee.designation : 'N/A',
      matchStatus: match.status,
      candidates: match.candidates,
      date: group.dateString,
      dayOfWeek: group.dayOfWeek,
      dayName: group.dayName,
      inTime: firstIn,
      outTime: lastOut,
      arrivalStatus,
      departureStatus,
      totalWorkingMinutes: totalMinutes,
      totalWorkingHoursFormatted: workingHoursFormatted,
      rawPunches: sortedPunches,
      isSundaySkipped: false,
      isDuplicateExisting: isDuplicate,
      isInvalid: validationErrors.length > 0,
      validationErrors,
    })
  }

  // Sort preview items by date descending, then employee name
  previewItems.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date)
    return a.rawEmployeeName.localeCompare(b.rawEmployeeName)
  })

  return {
    success: true,
    fileName,
    totalRawRows: rawRows.length,
    detectedColumns,
    previewItems,
    stats: {
      totalRows: rawRows.length,
      validDays: previewItems.length,
      matchedCount,
      unmatchedCount,
      ambiguousCount,
      sundaySkippedCount,
      duplicateCount,
      invalidRowsCount,
    },
    unmatchedNames: Array.from(unmatchedNamesSet),
    ambiguousNames: Array.from(ambiguousNamesSet),
    errorDetails,
  }
}
