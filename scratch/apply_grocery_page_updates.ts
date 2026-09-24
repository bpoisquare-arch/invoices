import fs from 'fs'

const filePath = 'D:\\\\Grocery Management\\\\src\\\\app\\\\attendance\\\\records\\\\page.tsx'
let code = fs.readFileSync(filePath, 'utf-8')

// 1. Add imports if not present
if (!code.includes('AttendanceRequestModals')) {
  const importTarget = `import { AttendanceHeader } from '@/components/attendance/AttendanceHeader'`
  const importReplacement = `import { AttendanceHeader } from '@/components/attendance/AttendanceHeader'
import {
  ApplyLeaveModal,
  RegularizeTimingModal,
  PendingRequestModal,
} from '@/components/attendance/AttendanceRequestModals'
import { AttendanceRequestItem } from '@/lib/services/attendance-requests.service'`
  code = code.replace(importTarget, importReplacement)
}

// 2. Add state & fetchRequests
const stateTarget = `  const [selectedQuickMonth, setSelectedQuickMonth] = useState<string>(initialDateRange.month)`
const stateReplacement = `  // Branch Requests State (Leave & Timing Regularization)
  const [requests, setRequests] = useState<AttendanceRequestItem[]>([])
  const [activeLeaveModal, setActiveLeaveModal] = useState<{
    isOpen: boolean
    emp: Employee | null
    date: string
  }>({ isOpen: false, emp: null, date: '' })

  const [activeTimingModal, setActiveTimingModal] = useState<{
    isOpen: boolean
    emp: Employee | null
    date: string
    requestType: 'MISSING_IN' | 'MISSING_OUT'
    existingTime?: string | null
  }>({ isOpen: false, emp: null, date: '', requestType: 'MISSING_IN' })

  const [activePendingModal, setActivePendingModal] = useState<{
    isOpen: boolean
    request: AttendanceRequestItem | null
  }>({ isOpen: false, request: null })

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/attendance/requests')
      const data = await res.json()
      if (data.success && Array.isArray(data.requests)) {
        setRequests(data.requests)
      }
    } catch (err) {
      console.error('Error fetching requests in Grocery page:', err)
    }
  }

  const [selectedQuickMonth, setSelectedQuickMonth] = useState<string>(initialDateRange.month)`

if (!code.includes('const [activeLeaveModal, setActiveLeaveModal]')) {
  code = code.replace(stateTarget, stateReplacement)
}

// 3. Add fetchRequests to loadMeta useEffect
const effectTarget = `    loadMeta()
  }, [isLahoreUser, isMultanUser])`

const effectReplacement = `    loadMeta()
    fetchRequests()
    const reqTimer = setInterval(() => {
      fetchRequests()
    }, 15000)
    return () => clearInterval(reqTimer)
  }, [isLahoreUser, isMultanUser])`

if (!code.includes('const reqTimer = setInterval')) {
  code = code.replace(effectTarget, effectReplacement)
}

// 4. Add requestsMap memo
const mapTarget = `  // Render Status Badge / Content inside each Grid Cell (Exact MIS Layout & Logic)
  const renderCellContent = (emp: Employee, date: string) => {`

const mapReplacement = `  // Requests Map for instant O(1) cell lookup
  const requestsMap = useMemo(() => {
    const map = new Map<string, AttendanceRequestItem>()
    requests.forEach((req) => {
      if (req.status === 'PENDING') {
        map.set(\`\${req.employee_id}_\${req.attendance_date}\`, req)
        if (req.batch_id) {
          map.set(\`\${req.batch_id}_\${req.attendance_date}\`, req)
        }
      }
    })
    return map
  }, [requests])

  // Render Status Badge / Content inside each Grid Cell (Exact MIS Layout & Logic)
  const renderCellContent = (emp: Employee, date: string) => {`

if (!code.includes('const requestsMap = useMemo')) {
  code = code.replace(mapTarget, mapReplacement)
}

// 5. In renderCellContent: Check pending request first
const cellStartTarget = `  const renderCellContent = (emp: Employee, date: string) => {
    const todayStr = formatDate(new Date())`

const cellStartReplacement = `  const renderCellContent = (emp: Employee, date: string) => {
    // 0. Check if there is an active pending request from branch user
    const pendingReq = requestsMap.get(\`\${emp.id}_\${date}\`) || requestsMap.get(\`\${emp.employee_id}_\${date}\`)
    if (pendingReq) {
      return (
        <div
          onClick={() => setActivePendingModal({ isOpen: true, request: pendingReq })}
          className="p-1.5 rounded-md flex flex-col items-center justify-center text-center gap-1 border bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-950 shadow-2xs cursor-pointer transition-all hover:scale-[1.02] group"
          title="Pending MIS Admin Approval - Click to view or cancel"
        >
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600 animate-spin" />
            <span className="bg-amber-500 text-white px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shadow-2xs">
              PENDING
            </span>
          </div>
          <span className="font-mono text-[10px] font-bold text-amber-900 truncate max-w-[130px]">
            {pendingReq.request_type === 'LEAVE'
              ? (pendingReq.leave_type || 'Leave')
              : pendingReq.request_type === 'MISSING_IN'
              ? \`In: \${pendingReq.requested_in_time}\`
              : \`Out: \${pendingReq.requested_out_time}\`}
          </span>
        </div>
      )
    }

    const todayStr = formatDate(new Date())`

if (!code.includes('// 0. Check if there is an active pending request')) {
  code = code.replace(cellStartTarget, cellStartReplacement)
}

// 6. Make Explicit Absent Clickable
const explicitAbsentTarget = `      // B. Explicit Absent Record
      if (isExplicitAbsent) {
        // If date is after the last uploaded date, do not show absent! Show --
        if (maxUploadedDate && date > maxUploadedDate) {
          return (
            <div className="flex items-center justify-center py-2 text-slate-300 font-mono text-xs select-none">
              --
            </div>
          )
        }

        return (
          <div className="p-1.5 rounded-md flex items-center justify-center text-center border bg-rose-50/80 border-rose-200 text-rose-950 shadow-2xs select-none">
            <span className="bg-rose-600 text-white px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shadow-2xs">
              ABSENT
            </span>
          </div>
        )
      }`

const explicitAbsentReplacement = `      // B. Explicit Absent Record (Clickable to Apply Leave)
      if (isExplicitAbsent) {
        if (maxUploadedDate && date > maxUploadedDate) {
          return (
            <div className="flex items-center justify-center py-2 text-slate-300 font-mono text-xs select-none">
              --
            </div>
          )
        }

        return (
          <div
            onClick={() => setActiveLeaveModal({ isOpen: true, emp, date })}
            className="p-1.5 rounded-md flex items-center justify-center text-center border bg-rose-50/80 hover:bg-rose-100 border-rose-200 text-rose-950 shadow-2xs select-none cursor-pointer transition-all hover:scale-[1.02] group"
            title="Absent - Click to apply for Leave"
          >
            <span className="bg-rose-600 group-hover:bg-rose-700 text-white px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shadow-2xs">
              ABSENT
            </span>
          </div>
        )
      }`

if (!code.includes('// B. Explicit Absent Record (Clickable to Apply Leave)')) {
  code = code.replace(explicitAbsentTarget, explicitAbsentReplacement)
}

// 7. Make Missing In and Missing Out Clickable
const missingPillTarget = `          {/* Status Pill */}
          {isMissingOut ? (
            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 mt-0.5">
              Missing Out
            </span>
          ) : isMissingIn ? (
            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 mt-0.5">
              Missing In
            </span>`

const missingPillReplacement = `          {/* Status Pill (Clickable for Regularization) */}
          {isMissingOut ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setActiveTimingModal({
                  isOpen: true,
                  emp,
                  date,
                  requestType: 'MISSING_OUT',
                  existingTime: rec.in_time,
                })
              }}
              className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 mt-0.5 cursor-pointer shadow-2xs transition-colors"
              title="Click to regularize Out-Time"
            >
              Missing Out ✎
            </button>
          ) : isMissingIn ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setActiveTimingModal({
                  isOpen: true,
                  emp,
                  date,
                  requestType: 'MISSING_IN',
                  existingTime: rec.out_time,
                })
              }}
              className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 mt-0.5 cursor-pointer shadow-2xs transition-colors"
              title="Click to regularize In-Time"
            >
              Missing In ✎
            </button>`

if (!code.includes('Missing Out ✎')) {
  code = code.replace(missingPillTarget, missingPillReplacement)
}

// 8. Make Implicit Absent (Today & Past) Clickable
const implicitAbsentTarget = `    // B. Today -> If in-time cutoff passed, Absent; else "--"
    if (isToday) {
      if (hasOfficeInTimePassed(date, settings)) {
        return (
          <div className="p-1.5 rounded-md flex items-center justify-center text-center border bg-rose-50/80 border-rose-200 text-rose-950 shadow-2xs select-none">
            <span className="bg-rose-600 text-white px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shadow-2xs">
              ABSENT
            </span>
          </div>
        )
      } else {
        return (
          <div className="flex items-center justify-center py-2 text-slate-400 font-mono text-xs select-none">
            --
          </div>
        )
      }
    }

    // C. Past Date up to maxUploadedDate -> Absent
    return (
      <div className="p-1.5 rounded-md flex items-center justify-center text-center border bg-rose-50/80 border-rose-200 text-rose-950 shadow-2xs select-none">
        <span className="bg-rose-600 text-white px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shadow-2xs">
          ABSENT
        </span>
      </div>
    )`

const implicitAbsentReplacement = `    // B. Today -> If in-time cutoff passed, Absent; else "--"
    if (isToday) {
      if (hasOfficeInTimePassed(date, settings)) {
        return (
          <div
            onClick={() => setActiveLeaveModal({ isOpen: true, emp, date })}
            className="p-1.5 rounded-md flex items-center justify-center text-center border bg-rose-50/80 hover:bg-rose-100 border-rose-200 text-rose-950 shadow-2xs select-none cursor-pointer transition-all hover:scale-[1.02] group"
            title="Absent Today - Click to apply for Leave"
          >
            <span className="bg-rose-600 group-hover:bg-rose-700 text-white px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shadow-2xs">
              ABSENT
            </span>
          </div>
        )
      } else {
        return (
          <div className="flex items-center justify-center py-2 text-slate-400 font-mono text-xs select-none">
            --
          </div>
        )
      }
    }

    // C. Past Date up to maxUploadedDate -> Absent (Clickable to Apply Leave)
    return (
      <div
        onClick={() => setActiveLeaveModal({ isOpen: true, emp, date })}
        className="p-1.5 rounded-md flex items-center justify-center text-center border bg-rose-50/80 hover:bg-rose-100 border-rose-200 text-rose-950 shadow-2xs select-none cursor-pointer transition-all hover:scale-[1.02] group"
        title="Absent - Click to apply for Leave"
      >
        <span className="bg-rose-600 group-hover:bg-rose-700 text-white px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shadow-2xs">
          ABSENT
        </span>
      </div>
    )`

if (!code.includes('// C. Past Date up to maxUploadedDate -> Absent (Clickable to Apply Leave)')) {
  code = code.replace(implicitAbsentTarget, implicitAbsentReplacement)
}

// 9. Render the 3 Modals right before the end of the return statement
const endTarget = `      </main>
    </div>
  )
}`

const endReplacement = `      </main>

      {/* 1. Apply Leave Modal */}
      <ApplyLeaveModal
        isOpen={activeLeaveModal.isOpen}
        onClose={() => setActiveLeaveModal({ isOpen: false, emp: null, date: '' })}
        employee={activeLeaveModal.emp}
        date={activeLeaveModal.date}
        onSubmitted={() => {
          fetchRequests()
          fetchRecords()
        }}
      />

      {/* 2. Regularize Timing Modal (Missing In / Out) */}
      <RegularizeTimingModal
        isOpen={activeTimingModal.isOpen}
        onClose={() =>
          setActiveTimingModal({
            isOpen: false,
            emp: null,
            date: '',
            requestType: 'MISSING_IN',
          })
        }
        employee={activeTimingModal.emp}
        date={activeTimingModal.date}
        requestType={activeTimingModal.requestType}
        existingTime={activeTimingModal.existingTime}
        onSubmitted={() => {
          fetchRequests()
          fetchRecords()
        }}
      />

      {/* 3. Pending Request Details & Withdraw Modal */}
      <PendingRequestModal
        isOpen={activePendingModal.isOpen}
        onClose={() => setActivePendingModal({ isOpen: false, request: null })}
        request={activePendingModal.request}
        onCancelled={() => {
          fetchRequests()
          fetchRecords()
        }}
      />
    </div>
  )
}`

if (!code.includes('<ApplyLeaveModal')) {
  code = code.replace(endTarget, endReplacement)
}

fs.writeFileSync(filePath, code, 'utf-8')
console.log('Successfully updated Grocery records page!')
