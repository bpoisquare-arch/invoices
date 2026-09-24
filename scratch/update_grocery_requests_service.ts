import fs from 'fs'

// 1. D:\Grocery Management\src\lib\services\attendance-requests.service.ts
const servicePath = 'D:\\\\Grocery Management\\\\src\\\\lib\\\\services\\\\attendance-requests.service.ts'
let serviceCode = fs.readFileSync(servicePath, 'utf-8')

if (!serviceCode.includes('leave_duration?: number | null')) {
  serviceCode = serviceCode.replace(
    'leave_type?: string | null\n  requested_in_time?: string | null',
    'leave_type?: string | null\n  leave_duration?: number | null\n  requested_in_time?: string | null'
  )
}

if (!serviceCode.includes('leave_duration?: number | null\n  requested_in_time?: string | null,')) {
  serviceCode = serviceCode.replace(
    'leave_type?: string | null\n  requested_in_time?: string | null\n  requested_out_time?: string | null\n  reason?: string | null\n  submitted_by?: string | null\n}): Promise<AttendanceRequestItem>',
    'leave_type?: string | null\n  leave_duration?: number | null\n  requested_in_time?: string | null\n  requested_out_time?: string | null\n  reason?: string | null\n  submitted_by?: string | null\n}): Promise<AttendanceRequestItem>'
  )
}

if (!serviceCode.includes('leave_duration: params.leave_duration !== undefined')) {
  serviceCode = serviceCode.replace(
    'leave_type: params.leave_type || null,\n    requested_in_time:',
    'leave_type: params.leave_type || null,\n    leave_duration: params.leave_duration !== undefined ? params.leave_duration : (params.request_type === \'LEAVE\' ? 1 : null),\n    requested_in_time:'
  )
}

fs.writeFileSync(servicePath, serviceCode, 'utf-8')
console.log('Updated Grocery attendance-requests.service.ts')

// 2. D:\Grocery Management\src\app\api\attendance\requests\route.ts
const routePath = 'D:\\\\Grocery Management\\\\src\\\\app\\\\api\\\\attendance\\\\requests\\\\route.ts'
let routeCode = fs.readFileSync(routePath, 'utf-8')

if (!routeCode.includes('leave_duration,')) {
  routeCode = routeCode.replace(
    'request_type,\n      leave_type,\n      requested_in_time,',
    'request_type,\n      leave_type,\n      leave_duration,\n      requested_in_time,'
  )
  routeCode = routeCode.replace(
    'leave_type,\n      requested_in_time,',
    'leave_type,\n      leave_duration: typeof leave_duration === \'number\' ? leave_duration : parseFloat(leave_duration) || 1,\n      requested_in_time,'
  )
  fs.writeFileSync(routePath, routeCode, 'utf-8')
  console.log('Updated Grocery api/attendance/requests/route.ts')
}
