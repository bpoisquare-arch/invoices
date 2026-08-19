import {
  normalizeEmployeeName,
  matchEmployeeByName,
  calculateArrivalStatus,
  calculateDepartureStatus,
  calculateWorkingDuration,
  parseExcelAttendanceWorkbook,
  DEFAULT_ATTENDANCE_SETTINGS,
} from './src/lib/services/attendance-calculator'
import * as XLSX from 'xlsx'

console.log('=== RUNNING ATTENDANCE ENGINE VERIFICATION SUITE ===\n')

let passCount = 0
let failCount = 0

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`✓ PASS: ${testName}`)
    passCount++
  } else {
    console.error(`✗ FAIL: ${testName}`)
    failCount++
  }
}

// 1. Monday to Friday In Time & Grace Period Tests (Day = 1)
assert(calculateArrivalStatus('10:30 AM', 1) === 'On Time Arrival', 'Mon 10:30 AM is On Time')
assert(calculateArrivalStatus('10:40 AM', 1) === 'On Time Arrival', 'Mon 10:40 AM is On Time')
assert(calculateArrivalStatus('10:45 AM', 1) === 'On Time Arrival', 'Mon 10:45 AM is On Time')
assert(calculateArrivalStatus('10:46 AM', 1) === 'Late Arrival', 'Mon 10:46 AM is Late')

// 2. Monday to Friday Out Time Tests (Day = 1)
assert(calculateDepartureStatus('06:29 PM', 1) === 'Early Departure', 'Mon 6:29 PM is Early Departure')
assert(calculateDepartureStatus('06:30 PM', 1) === 'On Time Departure', 'Mon 6:30 PM is On Time Departure')
assert(calculateDepartureStatus('06:45 PM', 1) === 'On Time Departure', 'Mon 6:45 PM is On Time Departure')

// 3. Saturday In Time & Grace Period Tests (Day = 6)
assert(calculateArrivalStatus('11:00 AM', 6) === 'On Time Arrival', 'Sat 11:00 AM is On Time')
assert(calculateArrivalStatus('11:15 AM', 6) === 'On Time Arrival', 'Sat 11:15 AM is On Time')
assert(calculateArrivalStatus('11:16 AM', 6) === 'Late Arrival', 'Sat 11:16 AM is Late')

// 4. Saturday Out Time Tests (Day = 6)
assert(calculateDepartureStatus('02:59 PM', 6) === 'Early Departure', 'Sat 2:59 PM is Early Departure')
assert(calculateDepartureStatus('03:00 PM', 6) === 'On Time Departure', 'Sat 3:00 PM is On Time Departure')
assert(calculateDepartureStatus('03:30 PM', 6) === 'On Time Departure', 'Sat 3:30 PM is On Time Departure')

// 5. Total Working Duration
const dur1 = calculateWorkingDuration('10:42 AM', '06:37 PM')
assert(dur1.formatted === '7h 55m' && dur1.totalMinutes === 475, 'Duration 10:42 AM to 6:37 PM is 7h 55m')

// Multi-punch interval calculation
const rawPunches = [
  { time: '10:30 AM', state: 'C/In' },
  { time: '01:00 PM', state: 'C/Out' },
  { time: '01:30 PM', state: 'C/In' },
  { time: '06:40 PM', state: 'C/Out' },
]
const multiDur = calculateWorkingDuration('10:30 AM', '06:40 PM', rawPunches)
// 10:30 to 13:00 = 150m. 13:30 to 18:40 = 310m. Total = 460m = 7h 40m.
assert(multiDur.formatted === '7h 40m' && multiDur.totalMinutes === 460, 'Multi-punch duration is 7h 40m')

// 6. Name Normalization & Safe Matching
assert(normalizeEmployeeName(' ayesha ') === 'ayesha', 'Normalize trimmed lowercase')
assert(normalizeEmployeeName('Ali   Ahmed') === 'ali ahmed', 'Normalize multiple spaces')

const mockEmployees = [
  { id: '1', user_id: null, employee_id: 'EMP-0001', name: 'Ayesha', normalized_name: 'ayesha', designation: 'Accounts', is_active: true, created_at: '', updated_at: '' },
  { id: '2', user_id: null, employee_id: 'EMP-0002', name: 'Ali Ahmed', normalized_name: 'ali ahmed', designation: 'Ops', is_active: true, created_at: '', updated_at: '' },
]

assert(matchEmployeeByName(' ayesha ', mockEmployees).status === 'MATCHED', 'Match " ayesha " to EMP-0001')
assert(matchEmployeeByName('Ayesha Khan', mockEmployees).status === 'UNMATCHED', 'Do not match "Ayesha Khan" to "Ayesha"')
assert(matchEmployeeByName('John Smith', mockEmployees).status === 'UNMATCHED', 'Unmatched employee detected')

// 7. Full Excel Parsing & Sunday Skipping Test
const testRows = [
  ['Name', 'Time', 'State', 'New State', 'Exception', 'Operation'],
  ['Ayesha', '8/1/2026 10:43 AM', 'C/In', '', 'OK', ''],
  ['Ayesha', '8/1/2026 3:30 PM', 'C/Out', '', 'OK', ''],
  ['Ayesha', '8/2/2026 10:44 AM', 'C/In', '', 'OK', ''], // 8/2/2026 is Sunday!
  ['Ayesha', '8/2/2026 6:59 PM', 'C/Out', '', 'OK', ''], // 8/2/2026 is Sunday!
  ['Ayesha', '8/3/2026 10:42 AM', 'C/In', '', 'OK', ''], // 8/3/2026 is Monday
  ['Ayesha', '8/3/2026 6:37 PM', 'C/Out', '', 'OK', ''],
  ['Unknown Person', '8/3/2026 10:30 AM', 'C/In', '', 'OK', ''],
]

const ws = XLSX.utils.aoa_to_sheet(testRows)
const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
const wbBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

const parseResult = parseExcelAttendanceWorkbook(
  wbBuf,
  'test_attendance.xlsx',
  mockEmployees,
  new Map(),
  DEFAULT_ATTENDANCE_SETTINGS
)

assert(parseResult.stats.sundaySkippedCount === 2, 'Sunday records skipped counter == 2')
assert(parseResult.stats.unmatchedCount === 1, 'Unmatched counter == 1 (Unknown Person)')
assert(parseResult.stats.matchedCount === 2, 'Matched days == 2 (8/1 and 8/3)')

// 8. Verify Out Time and Duration from the user's exact spreadsheet format (State=C/In, New State=C/Out)
const day1 = parseResult.previewItems.find((p) => p.date === '2026-08-01')
assert(day1 !== undefined, '8/1 record found in preview')
assert(day1?.inTime === '10:43 AM', `8/1 In Time is 10:43 AM (got: ${day1?.inTime})`)
assert(day1?.outTime === '03:30 PM', `8/1 Out Time is 03:30 PM (got: ${day1?.outTime})`)
assert(day1?.totalWorkingHoursFormatted === '4h 47m', `8/1 Working Duration is 4h 47m (got: ${day1?.totalWorkingHoursFormatted})`)

const day3 = parseResult.previewItems.find((p) => p.date === '2026-08-03')
assert(day3 !== undefined, '8/3 record found in preview')
assert(day3?.inTime === '10:42 AM', `8/3 In Time is 10:42 AM (got: ${day3?.inTime})`)
assert(day3?.outTime === '06:37 PM', `8/3 Out Time is 06:37 PM (got: ${day3?.outTime})`)
assert(day3?.totalWorkingHoursFormatted === '7h 55m', `8/3 Working Duration is 7h 55m (got: ${day3?.totalWorkingHoursFormatted})`)

console.log(`\n=== SUMMARY: ${passCount} PASSED, ${failCount} FAILED ===`)

