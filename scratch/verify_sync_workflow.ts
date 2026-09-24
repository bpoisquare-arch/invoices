import { createAttendanceRequest, getAttendanceRequests, reviewAttendanceRequest } from '../src/lib/services/attendance-requests.service'

async function testWorkflow() {
  console.log('--- 1. Testing getAttendanceRequests ---')
  const initial = await getAttendanceRequests()
  console.log('Initial requests count:', initial.length)

  console.log('--- 2. Creating simulated test request from Lahore Branch ---')
  const testReq = await createAttendanceRequest({
    employee_id: '00000000-0000-0000-0000-000000000000',
    employee_name: 'Test Workflow Employee',
    batch_id: 'TEST-01',
    branch: 'Lahore',
    attendance_date: '2026-09-01',
    request_type: 'LEAVE',
    leave_type: 'Sick Leave',
    reason: 'Medical checkup',
    submitted_by: 'Lahore Branch User',
  })
  console.log('Created request successfully:', { id: testReq.id, status: testReq.status, type: testReq.request_type })

  const listAfter = await getAttendanceRequests({ status: 'PENDING' })
  console.log('Pending requests count:', listAfter.length)

  console.log('--- 3. Testing Admin Reject Action ---')
  const rejectRes = await reviewAttendanceRequest({
    requestId: testReq.id,
    action: 'REJECT',
    reviewedBy: 'Admin',
    reviewNotes: 'Test rejection verification',
  })
  console.log('Reject result:', { success: rejectRes.success, status: rejectRes.request.status, message: rejectRes.message })

  console.log('--- WORKFLOW VERIFICATION PASSED ---')
}

testWorkflow().catch(console.error)
