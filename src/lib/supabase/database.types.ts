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
  [key: string]: Json | undefined
}

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          user_id: string | null
          name: string
          logo_url: string | null
          prefix: string
          currency: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          logo_url?: string | null
          prefix: string
          currency?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          logo_url?: string | null
          prefix?: string
          currency?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_sequences: {
        Row: {
          company_id: string
          last_number: number
        }
        Insert: {
          company_id: string
          last_number?: number
        }
        Update: {
          company_id?: string
          last_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_sequences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
      templates: {
        Row: {
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
        Insert: {
          id?: string
          company_id: string
          name: string
          company_name: string
          address?: string | null
          phone?: string | null
          email?: string | null
          payment_details?: string | null
          bank_details?: string | null
          currency?: string | null
          footer_terms?: string | null
          primary_color?: string | null
          layout_type?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          company_name?: string
          address?: string | null
          phone?: string | null
          email?: string | null
          payment_details?: string | null
          bank_details?: string | null
          currency?: string | null
          footer_terms?: string | null
          primary_color?: string | null
          layout_type?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
      invoices: {
        Row: {
          id: string
          user_id: string | null
          company_id: string
          template_id: string | null
          template_snapshot: Json
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
        Insert: {
          id?: string
          user_id?: string | null
          company_id: string
          template_id?: string | null
          template_snapshot: Json
          invoice_number: string
          reference_name?: string | null
          customer_name: string
          invoice_date: string
          due_date: string
          subtotal?: number
          total_amount?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          company_id?: string
          template_id?: string | null
          template_snapshot?: Json
          invoice_number?: string
          reference_name?: string | null
          customer_name?: string
          invoice_date?: string
          due_date?: string
          subtotal?: number
          total_amount?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          }
        ]
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          description: string
          quantity: number
          amount: number
          line_total: number
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          description: string
          quantity?: number
          amount?: number
          line_total?: number
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          description?: string
          quantity?: number
          amount?: number
          line_total?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          }
        ]
      }
      installment_schedules: {
        Row: {
          id: string
          user_id: string | null
          date: string
          student_name: string
          student_id: string
          course_name: string
          duration: string
          start_date: string
          end_date: string
          start_month_year: string | null
          end_month_offset: number | null
          admin_fee: number
          resources_fee: number
          tuition_fee: number
          scholarship: number
          total_amount: number
          first_installment_amount: number
          schedule_items: Json
          recipient_email: string | null
          from_email: string | null
          email_subject: string | null
          email_message: string | null
          last_email_sent_at: string | null
          last_email_status: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          user_id?: string | null
          date: string
          student_name: string
          student_id: string
          course_name: string
          duration: string
          start_date: string
          end_date: string
          start_month_year?: string | null
          end_month_offset?: number | null
          admin_fee?: number
          resources_fee?: number
          tuition_fee?: number
          scholarship?: number
          total_amount?: number
          first_installment_amount?: number
          schedule_items?: Json
          recipient_email?: string | null
          from_email?: string | null
          email_subject?: string | null
          email_message?: string | null
          last_email_sent_at?: string | null
          last_email_status?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          date?: string
          student_name?: string
          student_id?: string
          course_name?: string
          duration?: string
          start_date?: string
          end_date?: string
          start_month_year?: string | null
          end_month_offset?: number | null
          admin_fee?: number
          resources_fee?: number
          tuition_fee?: number
          scholarship?: number
          total_amount?: number
          first_installment_amount?: number
          schedule_items?: Json
          recipient_email?: string | null
          from_email?: string | null
          email_subject?: string | null
          email_message?: string | null
          last_email_sent_at?: string | null
          last_email_status?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      installment_email_logs: {
        Row: {
          id: string
          schedule_id: string
          from_email: string
          to_email: string
          subject: string
          message: string | null
          email_type: string
          resend_number: number
          status: string
          provider_message_id: string | null
          sent_at: string
          error_message: string | null
          next_resend_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          schedule_id: string
          from_email: string
          to_email: string
          subject: string
          message?: string | null
          email_type: string
          resend_number?: number
          status: string
          provider_message_id?: string | null
          sent_at?: string
          error_message?: string | null
          next_resend_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          schedule_id?: string
          from_email?: string
          to_email?: string
          subject?: string
          message?: string | null
          email_type?: string
          resend_number?: number
          status?: string
          provider_message_id?: string | null
          sent_at?: string
          error_message?: string | null
          next_resend_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          id: string
          user_id: string | null
          employee_id: string
          name: string
          normalized_name: string
          designation: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          employee_id: string
          name: string
          normalized_name: string
          designation: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          employee_id?: string
          name?: string
          normalized_name?: string
          designation?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      employee_sequences: {
        Row: {
          id: number
          last_number: number
        }
        Insert: {
          id?: number
          last_number?: number
        }
        Update: {
          id?: number
          last_number?: number
        }
        Relationships: []
      }
      attendance_settings: {
        Row: {
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
        Insert: {
          id?: string
          weekday_in_time?: string
          weekday_grace_minutes?: number
          weekday_out_time?: string
          saturday_in_time?: string
          saturday_grace_minutes?: number
          saturday_out_time?: string
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          weekday_in_time?: string
          weekday_grace_minutes?: number
          weekday_out_time?: string
          saturday_in_time?: string
          saturday_grace_minutes?: number
          saturday_out_time?: string
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      attendance_records: {
        Row: {
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
        Insert: {
          id?: string
          employee_id: string
          attendance_date: string
          day_of_week: string
          in_time?: string | null
          out_time?: string | null
          arrival_status: string
          departure_status: string
          total_working_minutes?: number
          total_working_hours_formatted?: string
          raw_punches?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          attendance_date?: string
          day_of_week?: string
          in_time?: string | null
          out_time?: string | null
          arrival_status?: string
          departure_status?: string
          total_working_minutes?: number
          total_working_hours_formatted?: string
          raw_punches?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          }
        ]
      }
      attendance_audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          details: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          details?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          details?: Json
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_next_invoice_number: {
        Args: {
          p_company_id: string
        }
        Returns: string
      }
      generate_next_employee_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Company = Database['public']['Tables']['companies']['Row']
export type Template = Database['public']['Tables']['templates']['Row']
export type Invoice = Database['public']['Tables']['invoices']['Row']
export type InvoiceItem = Database['public']['Tables']['invoice_items']['Row']

export interface InvoiceWithDetails extends Omit<Invoice, 'template_snapshot'> {
  template_snapshot: TemplateSnapshot
  companies?: Company | null
  templates?: Template | null
  invoice_items: InvoiceItem[]
}

export type Employee = Database['public']['Tables']['employees']['Row']
export type EmployeeInsert = Database['public']['Tables']['employees']['Insert']
export type AttendanceSettings = Database['public']['Tables']['attendance_settings']['Row']
export type AttendanceRecord = Database['public']['Tables']['attendance_records']['Row']
export type AttendanceRecordInsert = Database['public']['Tables']['attendance_records']['Insert']
export type AttendanceAuditLog = Database['public']['Tables']['attendance_audit_logs']['Row']

export interface RawPunch {
  time: string // e.g. "10:43 AM" or "10:43:00"
  state: 'C/In' | 'C/Out' | string
  rawTimestamp?: string // e.g. "8/1/2026 10:43 AM"
  originalRowIndex?: number
}

export interface AttendanceRecordWithEmployee extends AttendanceRecord {
  employee?: Employee | null
  raw_punches_parsed?: RawPunch[]
}

