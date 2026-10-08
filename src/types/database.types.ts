export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface TemplateSnapshot {
  company_name: string
  address?: string | null
  phone?: string | null
  email?: string | null
  payment_details?: string | null
  bank_details?: string | null
  currency?: string | null
  footer_terms?: string | null
  primary_color?: string | null
  logo_url?: string | null
  layout_type?: string | null
  header_mode?: 'logo' | 'text' | null
  bill_to_label?: string | null
  is_anonymous?: boolean | null
  logo_size?: number | string | null
  gst_rate?: number | null
  gst_amount?: number | null
  amount_in_words?: string | null
  includes_gst?: boolean | null
  [key: string]: Json | undefined
}

export interface Company {
  id: string
  user_id: string | null
  name: string
  logo_url: string | null
  prefix: string
  currency: string
  created_at: string
  updated_at: string
}

export interface Template {
  id: string
  company_id: string
  name: string
  company_name: string
  address: string | null
  phone: string | null
  email: string | null
  payment_details: string | null
  bank_details: string | null
  currency: string | null
  footer_terms: string | null
  primary_color: string | null
  layout_type: string | null
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: string
  user_id: string | null
  company_id: string
  entity?: string | null
  template_id: string | null
  template_snapshot: TemplateSnapshot
  invoice_number: string
  reference_name: string | null
  customer_name: string
  invoice_date: string
  due_date: string
  subtotal: number
  total_amount: number
  created_at: string
  updated_at: string
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  description: string
  quantity: number
  amount: number
  line_total: number
  created_at: string
}

export interface InvoiceWithDetails extends Omit<Invoice, 'template_snapshot'> {
  template_snapshot: TemplateSnapshot
  companies?: Company | null
  templates?: Template | null
  invoice_items: InvoiceItem[]
}

export interface EmployeeLeaveQuotas {
  annual_leaves?: number
  sick_leaves?: number
  casual_leaves?: number
  wfh_quota?: number
  probation_leaves?: number
}

export interface Employee {
  id: string
  user_id?: string | null
  employee_id: string
  name: string
  normalized_name: string
  designation: string
  branch?: string | null
  salary?: number | null
  joining_date?: string | null
  is_old_staff?: boolean | null
  is_attendance_exempt?: boolean | null
  email?: string | null
  leave_quotas?: EmployeeLeaveQuotas
  base_leave_quotas?: EmployeeLeaveQuotas
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AttendanceSettings {
  id: string
  weekday_in_time: string
  weekday_grace_minutes: number
  weekday_out_time: string
  saturday_in_time: string
  saturday_grace_minutes: number
  saturday_out_time: string
  timezone: string
  created_at: string
  updated_at: string
}

export interface AttendanceRecord {
  id: string
  employee_id: string
  attendance_date: string
  day_of_week: string
  in_time: string | null
  out_time: string | null
  arrival_status: string
  departure_status: string
  total_working_minutes: number
  total_working_hours_formatted: string
  raw_punches: Json
  created_at: string
  updated_at: string
}

export interface RawPunch {
  time: string
  state: 'C/In' | 'C/Out' | string
  rawTimestamp?: string
  originalRowIndex?: number
  notes?: string | null
  type?: string
}

export interface AttendanceRecordWithEmployee extends AttendanceRecord {
  employee?: Employee | null
  raw_punches_parsed?: RawPunch[]
  notes?: string | null
}

export interface StcReportImport {
  id: string
  file_name: string
  file_size: number
  uploaded_at: string
  uploaded_by: string | null
  total_records: number
  total_pending_amount: number
  total_yet_to_raised: number
  entity: string
  original_file_data: string | null
  raw_headers: Json
  created_at: string
  updated_at: string
}

export interface StcReportRecord {
  id: string
  import_id: string
  sr_no: number | null
  student_name: string
  student_id: string | null
  agent: string | null
  scholarship: string | null
  pending_invoice: string | null
  pending_amount: number
  yet_to_raised: string | null
  remarks: string | null
  dob: string | null
  document: string | null
  status: string | null
  intake: string | null
  end_date: string | null
  course: string | null
  admin_fee: number
  resource_fee: number
  tuition_fee: number
  total_fee: number
  paid_amount: number
  total_paid?: number | null
  initial_payment?: number | null
  follow_up?: string | null
  coe_issued_date: string | null
  email_id: string | null
  phone_no: string | null
  payment_status: string | null
  divided_month?: number | string | null
  calculation_breakup?: string | null
  admin_comments?: string | null
  extra_data: Json
  created_at: string
}

export interface AimtReportImport {
  id: string
  file_name: string
  file_size: number
  uploaded_at: string
  uploaded_by: string | null
  total_records: number
  total_pending_amount: number
  total_yet_to_raised: number
  entity: string
  original_file_data: string | null
  raw_headers: Json
  created_at: string
  updated_at: string
}

export interface AimtReportRecord {
  id: string
  import_id: string
  sr_no: number | null
  student_name: string
  student_id: string | null
  agent: string | null
  scholarship: string | null
  pending_invoice: string | null
  pending_amount: number
  yet_to_raised: string | null
  remarks: string | null
  dob: string | null
  document: string | null
  status: string | null
  intake: string | null
  end_date: string | null
  course: string | null
  admin_fee: number
  resource_fee: number
  tuition_fee: number
  total_fee: number
  paid_amount: number
  total_paid?: number | null
  initial_payment?: number | null
  follow_up?: string | null
  coe_issued_date: string | null
  email_id: string | null
  phone_no: string | null
  payment_status: string | null
  divided_month?: number | null
  calculation_breakup?: string | null
  admin_comments?: string | null
  extra_data: Json
  created_at: string
}
