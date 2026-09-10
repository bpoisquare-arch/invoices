-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. COMPANIES TABLE
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    prefix VARCHAR(20) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'AUD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. COMPANY SEQUENCES TABLE (For concurrency-safe sequential invoice numbering)
CREATE TABLE IF NOT EXISTS public.company_sequences (
    company_id UUID PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
    last_number BIGINT NOT NULL DEFAULT 0
);

-- 3. TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS public.templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(100),
    email VARCHAR(255),
    payment_details TEXT,
    bank_details TEXT,
    currency VARCHAR(10) DEFAULT 'AUD',
    footer_terms TEXT,
    primary_color VARCHAR(20) DEFAULT '#2563eb',
    layout_type VARCHAR(50) DEFAULT 'edlink_v1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. INVOICES TABLE
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
    template_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    reference_name VARCHAR(255),
    customer_name VARCHAR(255) NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. INVOICE ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    line_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. INSTALLMENT SCHEDULES TABLE
CREATE TABLE IF NOT EXISTS public.installment_schedules (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    student_id VARCHAR(100) NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    duration VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_month_year VARCHAR(20),
    end_month_offset INT DEFAULT 3,
    admin_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    resources_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    material_fee NUMERIC(12, 2) DEFAULT 0.00,
    tuition_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    scholarship NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    first_installment_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    schedule_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    recipient_email VARCHAR(255),
    from_email VARCHAR(255),
    email_subject TEXT,
    email_message TEXT,
    last_email_sent_at TIMESTAMPTZ,
    last_email_status VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. INSTALLMENT EMAIL LOGS TABLE
CREATE TABLE IF NOT EXISTS public.installment_email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id TEXT NOT NULL,
    from_email VARCHAR(255) NOT NULL,
    to_email VARCHAR(255) NOT NULL,
    subject TEXT NOT NULL,
    message TEXT,
    email_type VARCHAR(20) NOT NULL, -- 'initial' | 'resend'
    resend_number INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL, -- 'sent' | 'failed'
    provider_message_id VARCHAR(255),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    error_message TEXT,
    next_resend_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. STC INSTALLMENT SCHEDULES TABLE (States College Australia)
CREATE TABLE IF NOT EXISTS public.stc_installment_schedules (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    student_id VARCHAR(100) NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    duration VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_month_year VARCHAR(20),
    end_month_offset INT DEFAULT 3,
    admin_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    resources_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    material_fee NUMERIC(12, 2) DEFAULT 0.00,
    tuition_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    scholarship NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    first_installment_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    schedule_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    agency VARCHAR(255),
    recipient_email VARCHAR(255),
    from_email VARCHAR(255),
    email_subject TEXT,
    email_message TEXT,
    last_email_sent_at TIMESTAMPTZ,
    last_email_status VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. STC INSTALLMENT EMAIL LOGS TABLE
CREATE TABLE IF NOT EXISTS public.stc_installment_email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id TEXT NOT NULL,
    from_email VARCHAR(255) NOT NULL,
    to_email VARCHAR(255) NOT NULL,
    subject TEXT NOT NULL,
    message TEXT,
    email_type VARCHAR(20) NOT NULL, -- 'initial' | 'resend'
    resend_number INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL, -- 'sent' | 'failed'
    provider_message_id VARCHAR(255),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    error_message TEXT,
    next_resend_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON public.invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_name ON public.invoices(customer_name);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_installment_schedules_student_id ON public.installment_schedules(student_id);
CREATE INDEX IF NOT EXISTS idx_installment_email_logs_schedule_id ON public.installment_email_logs(schedule_id);
CREATE INDEX IF NOT EXISTS idx_installment_email_logs_sent_at ON public.installment_email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_stc_installment_schedules_student_id ON public.stc_installment_schedules(student_id);
CREATE INDEX IF NOT EXISTS idx_stc_installment_email_logs_schedule_id ON public.stc_installment_email_logs(schedule_id);
CREATE INDEX IF NOT EXISTS idx_stc_installment_email_logs_sent_at ON public.stc_installment_email_logs(sent_at DESC);

-- FUNCTION FOR SAFE SEQUENTIAL INVOICE NUMBER GENERATION
CREATE OR REPLACE FUNCTION public.generate_next_invoice_number(p_company_id UUID)
RETURNS VARCHAR(50)
LANGUAGE plpgsql
AS $$
DECLARE
    v_prefix VARCHAR(20);
    v_next_val BIGINT;
    v_invoice_num VARCHAR(50);
BEGIN
    -- Get company prefix
    SELECT prefix INTO v_prefix FROM public.companies WHERE id = p_company_id;
    IF v_prefix IS NULL THEN
        v_prefix := 'INV';
    END IF;

    -- Upsert sequence atomically with row lock
    INSERT INTO public.company_sequences (company_id, last_number)
    VALUES (p_company_id, 1)
    ON CONFLICT (company_id)
    DO UPDATE SET last_number = public.company_sequences.last_number + 1
    RETURNING last_number INTO v_next_val;

    -- Format sequence with prefix (e.g. EDL-000001)
    v_invoice_num := v_prefix || '-' || LPAD(v_next_val::TEXT, 6, '0');
    
    RETURN v_invoice_num;
END;
$$;

-- RLS POLICIES (Row Level Security)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installment_email_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated access
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated access to companies') THEN
        CREATE POLICY "Allow authenticated access to companies" ON public.companies FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated access to company_sequences') THEN
        CREATE POLICY "Allow authenticated access to company_sequences" ON public.company_sequences FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated access to templates') THEN
        CREATE POLICY "Allow authenticated access to templates" ON public.templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated access to invoices') THEN
        CREATE POLICY "Allow authenticated access to invoices" ON public.invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated access to invoice_items') THEN
        CREATE POLICY "Allow authenticated access to invoice_items" ON public.invoice_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated access to installment_schedules') THEN
        CREATE POLICY "Allow authenticated access to installment_schedules" ON public.installment_schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated access to installment_email_logs') THEN
        CREATE POLICY "Allow authenticated access to installment_email_logs" ON public.installment_email_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 8. EMPLOYEES TABLE
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    employee_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    normalized_name VARCHAR(255) NOT NULL,
    designation VARCHAR(255) NOT NULL,
    branch VARCHAR(100) DEFAULT 'Multan',
    salary NUMERIC(12, 2),
    joining_date DATE,
    is_old_staff BOOLEAN NOT NULL DEFAULT false,
    leave_quotas JSONB DEFAULT '{"annual_leaves":6,"sick_leaves":7,"casual_leaves":7,"wfh_quota":4,"probation_leaves":3}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migrations to ensure existing databases have new employee columns
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS branch VARCHAR(100) DEFAULT 'Multan';
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS salary NUMERIC(12, 2);
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS joining_date DATE;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS is_old_staff BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS leave_quotas JSONB DEFAULT '{"annual_leaves":6,"sick_leaves":7,"casual_leaves":7,"wfh_quota":4,"probation_leaves":3}'::jsonb;

-- 9. EMPLOYEE SEQUENCES TABLE (For atomic gapless EMP-0001, EMP-0002 ID generation)
CREATE TABLE IF NOT EXISTS public.employee_sequences (
    id INT PRIMARY KEY DEFAULT 1,
    last_number BIGINT NOT NULL DEFAULT 0
);

-- 10. ATTENDANCE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.attendance_settings (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
    weekday_in_time VARCHAR(10) NOT NULL DEFAULT '10:30',
    weekday_grace_minutes INT NOT NULL DEFAULT 15,
    weekday_out_time VARCHAR(10) NOT NULL DEFAULT '18:30',
    saturday_in_time VARCHAR(10) NOT NULL DEFAULT '11:00',
    saturday_grace_minutes INT NOT NULL DEFAULT 15,
    saturday_out_time VARCHAR(10) NOT NULL DEFAULT '15:00',
    timezone VARCHAR(100) NOT NULL DEFAULT 'Asia/Karachi',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. ATTENDANCE RECORDS TABLE
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    day_of_week VARCHAR(20) NOT NULL,
    in_time VARCHAR(20),
    out_time VARCHAR(20),
    arrival_status VARCHAR(50) NOT NULL,
    departure_status VARCHAR(50) NOT NULL,
    total_working_minutes INT NOT NULL DEFAULT 0,
    total_working_hours_formatted VARCHAR(50) NOT NULL DEFAULT '0h 0m',
    raw_punches JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_employee_attendance_date UNIQUE (employee_id, attendance_date)
);

-- 12. ATTENDANCE AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.attendance_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. GAZETTED HOLIDAYS TABLE
CREATE TABLE IF NOT EXISTS public.gazetted_holidays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL DEFAULT 'Gazetted Holiday',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. EMPLOYEE COMMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.employee_commissions (
    id TEXT PRIMARY KEY,
    employee_id VARCHAR(100) NOT NULL,
    month_year VARCHAR(20) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_emp_month_commission UNIQUE (employee_id, month_year)
);

-- 15. EMPLOYEE DEDUCTIONS TABLE
CREATE TABLE IF NOT EXISTS public.employee_deductions (
    id TEXT PRIMARY KEY,
    employee_id VARCHAR(100) NOT NULL,
    month_year VARCHAR(20) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    note_type VARCHAR(100) DEFAULT 'Other Deduction',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_emp_month_deduction UNIQUE (employee_id, month_year)
);

-- Function for atomic sequential Employee ID generation (e.g. EMP-0001)
CREATE OR REPLACE FUNCTION public.generate_next_employee_id()
RETURNS VARCHAR(50)
LANGUAGE plpgsql
AS $$
DECLARE
    v_next_val BIGINT;
    v_emp_id VARCHAR(50);
BEGIN
    INSERT INTO public.employee_sequences (id, last_number)
    VALUES (1, 1)
    ON CONFLICT (id)
    DO UPDATE SET last_number = public.employee_sequences.last_number + 1
    RETURNING last_number INTO v_next_val;

    v_emp_id := 'EMP-' || LPAD(v_next_val::TEXT, 4, '0');
    RETURN v_emp_id;
END;
$$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_employees_normalized_name ON public.employees(normalized_name);
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON public.employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON public.employees(is_active);
CREATE INDEX IF NOT EXISTS idx_attendance_records_employee_id ON public.attendance_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON public.attendance_records(attendance_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_records_arrival_status ON public.attendance_records(arrival_status);
CREATE INDEX IF NOT EXISTS idx_attendance_records_departure_status ON public.attendance_records(departure_status);
CREATE INDEX IF NOT EXISTS idx_attendance_audit_logs_created_at ON public.attendance_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gazetted_holidays_date ON public.gazetted_holidays(date);
CREATE INDEX IF NOT EXISTS idx_employee_commissions_lookup ON public.employee_commissions(employee_id, month_year);
CREATE INDEX IF NOT EXISTS idx_employee_deductions_lookup ON public.employee_deductions(employee_id, month_year);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gazetted_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_deductions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated access to employees') THEN
        CREATE POLICY "Allow authenticated access to employees" ON public.employees FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon access to employees') THEN
        CREATE POLICY "Allow anon access to employees" ON public.employees FOR ALL TO anon USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated access to employee_sequences') THEN
        CREATE POLICY "Allow authenticated access to employee_sequences" ON public.employee_sequences FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon access to employee_sequences') THEN
        CREATE POLICY "Allow anon access to employee_sequences" ON public.employee_sequences FOR ALL TO anon USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated access to attendance_settings') THEN
        CREATE POLICY "Allow authenticated access to attendance_settings" ON public.attendance_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon access to attendance_settings') THEN
        CREATE POLICY "Allow anon access to attendance_settings" ON public.attendance_settings FOR ALL TO anon USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated access to attendance_records') THEN
        CREATE POLICY "Allow authenticated access to attendance_records" ON public.attendance_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon access to attendance_records') THEN
        CREATE POLICY "Allow anon access to attendance_records" ON public.attendance_records FOR ALL TO anon USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated access to attendance_audit_logs') THEN
        CREATE POLICY "Allow authenticated access to attendance_audit_logs" ON public.attendance_audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon access to attendance_audit_logs') THEN
        CREATE POLICY "Allow anon access to attendance_audit_logs" ON public.attendance_audit_logs FOR ALL TO anon USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated access to gazetted_holidays') THEN
        CREATE POLICY "Allow authenticated access to gazetted_holidays" ON public.gazetted_holidays FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon access to gazetted_holidays') THEN
        CREATE POLICY "Allow anon access to gazetted_holidays" ON public.gazetted_holidays FOR ALL TO anon USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated access to employee_commissions') THEN
        CREATE POLICY "Allow authenticated access to employee_commissions" ON public.employee_commissions FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon access to employee_commissions') THEN
        CREATE POLICY "Allow anon access to employee_commissions" ON public.employee_commissions FOR ALL TO anon USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated access to employee_deductions') THEN
        CREATE POLICY "Allow authenticated access to employee_deductions" ON public.employee_deductions FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon access to employee_deductions') THEN
        CREATE POLICY "Allow anon access to employee_deductions" ON public.employee_deductions FOR ALL TO anon USING (true) WITH CHECK (true);
    END IF;
END $$;
-- 13. AIMT PAYSLIPS TABLE
CREATE TABLE IF NOT EXISTS public.aimt_payslips (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    paid_by_name VARCHAR(255) NOT NULL,
    paid_by_address_1 VARCHAR(255) NOT NULL,
    paid_by_address_2 VARCHAR(255) NOT NULL,
    paid_by_abn VARCHAR(100) NOT NULL,
    employee_name VARCHAR(255) NOT NULL,
    address_line_1 VARCHAR(255) NOT NULL,
    address_line_2 VARCHAR(255) NOT NULL,
    pay_frequency VARCHAR(100) NOT NULL,
    annual_salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    employment_basis VARCHAR(100) NOT NULL,
    pay_period_start VARCHAR(50) NOT NULL,
    pay_period_end VARCHAR(50) NOT NULL,
    payment_date VARCHAR(50) NOT NULL,
    total_earnings NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_pay NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    wages_description VARCHAR(255) NOT NULL,
    ordinary_hours NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    hourly_rate NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
    wages_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    wages_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_description VARCHAR(100) NOT NULL,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    bank_account_masked VARCHAR(100) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    payment_reference VARCHAR(255) NOT NULL,
    payment_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_aimt_payslips_employee_name ON public.aimt_payslips(employee_name);
CREATE INDEX IF NOT EXISTS idx_aimt_payslips_created_at ON public.aimt_payslips(created_at DESC);

-- Enable RLS
ALTER TABLE public.aimt_payslips ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated access to aimt_payslips') THEN
        CREATE POLICY "Allow authenticated access to aimt_payslips" ON public.aimt_payslips FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon access to aimt_payslips') THEN
        CREATE POLICY "Allow anon access to aimt_payslips" ON public.aimt_payslips FOR ALL TO anon USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated access to stc_installment_schedules') THEN
        CREATE POLICY "Allow authenticated access to stc_installment_schedules" ON public.stc_installment_schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon access to stc_installment_schedules') THEN
        CREATE POLICY "Allow anon access to stc_installment_schedules" ON public.stc_installment_schedules FOR ALL TO anon USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 15. EDLINK PAYSLIPS TABLE
CREATE TABLE IF NOT EXISTS public.edlink_payslips (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    paid_by_name VARCHAR(255) NOT NULL,
    paid_by_address_1 VARCHAR(255) NOT NULL,
    paid_by_address_2 VARCHAR(255) NOT NULL,
    paid_by_abn VARCHAR(100) NOT NULL,
    employee_name VARCHAR(255) NOT NULL,
    address_line_1 VARCHAR(255) NOT NULL,
    address_line_2 VARCHAR(255) NOT NULL,
    pay_frequency VARCHAR(100) NOT NULL,
    annual_salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    employment_basis VARCHAR(100) NOT NULL,
    pay_period_start VARCHAR(50) NOT NULL,
    pay_period_end VARCHAR(50) NOT NULL,
    payment_date VARCHAR(50) NOT NULL,
    total_earnings NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_pay NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    wages_description VARCHAR(255) NOT NULL,
    ordinary_hours NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    hourly_rate NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
    wages_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    wages_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_description VARCHAR(100) NOT NULL,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    bank_account_masked VARCHAR(100) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    payment_reference VARCHAR(255) NOT NULL,
    payment_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_edlink_payslips_employee_name ON public.edlink_payslips(employee_name);
CREATE INDEX IF NOT EXISTS idx_edlink_payslips_created_at ON public.edlink_payslips(created_at DESC);

-- Enable RLS
ALTER TABLE public.edlink_payslips ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated access to edlink_payslips') THEN
        CREATE POLICY "Allow authenticated access to edlink_payslips" ON public.edlink_payslips FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon access to edlink_payslips') THEN
        CREATE POLICY "Allow anon access to edlink_payslips" ON public.edlink_payslips FOR ALL TO anon USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 16. AIMT REPORT IMPORTS TABLE (Stores uploaded Excel file metadata & raw file for exact re-download)
CREATE TABLE IF NOT EXISTS public.aimt_report_imports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT DEFAULT 0,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    uploaded_by VARCHAR(255),
    total_records INT NOT NULL DEFAULT 0,
    total_pending_amount NUMERIC(14, 2) DEFAULT 0.00,
    total_yet_to_raised NUMERIC(14, 2) DEFAULT 0.00,
    entity VARCHAR(50) NOT NULL DEFAULT 'aimt',
    original_file_data TEXT, -- Base64 encoded raw excel binary for exact original download
    raw_headers JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. AIMT REPORT RECORDS TABLE (Stores parsed student records with the 8 target columns & raw data)
CREATE TABLE IF NOT EXISTS public.aimt_report_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    import_id UUID NOT NULL REFERENCES public.aimt_report_imports(id) ON DELETE CASCADE,
    sr_no INT,
    student_name VARCHAR(255) NOT NULL,
    student_id VARCHAR(100),
    agent VARCHAR(255),
    scholarship VARCHAR(100),
    pending_invoice VARCHAR(100),
    pending_amount NUMERIC(14, 2) DEFAULT 0.00,
    yet_to_raised VARCHAR(100),
    remarks TEXT,
    dob VARCHAR(50),
    document VARCHAR(255),
    status VARCHAR(100),
    intake VARCHAR(100),
    end_date VARCHAR(100),
    course VARCHAR(255),
    admin_fee NUMERIC(14, 2) DEFAULT 0.00,
    resource_fee NUMERIC(14, 2) DEFAULT 0.00,
    tuition_fee NUMERIC(14, 2) DEFAULT 0.00,
    total_fee NUMERIC(14, 2) DEFAULT 0.00,
    paid_amount NUMERIC(14, 2) DEFAULT 0.00,
    coe_issued_date VARCHAR(100),
    email_id VARCHAR(255),
    phone_no VARCHAR(100),
    payment_status VARCHAR(100),
    extra_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance & rapid searching
CREATE INDEX IF NOT EXISTS idx_aimt_report_imports_uploaded_at ON public.aimt_report_imports(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_aimt_report_imports_entity ON public.aimt_report_imports(entity);
CREATE INDEX IF NOT EXISTS idx_aimt_report_records_import_id ON public.aimt_report_records(import_id);
CREATE INDEX IF NOT EXISTS idx_aimt_report_records_student_name ON public.aimt_report_records(student_name);
CREATE INDEX IF NOT EXISTS idx_aimt_report_records_agent ON public.aimt_report_records(agent);
CREATE INDEX IF NOT EXISTS idx_aimt_report_records_intake ON public.aimt_report_records(intake);
CREATE INDEX IF NOT EXISTS idx_aimt_report_records_course ON public.aimt_report_records(course);

-- Enable RLS
ALTER TABLE public.aimt_report_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aimt_report_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated access to aimt_report_imports') THEN
        CREATE POLICY "Allow authenticated access to aimt_report_imports" ON public.aimt_report_imports FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon access to aimt_report_imports') THEN
        CREATE POLICY "Allow anon access to aimt_report_imports" ON public.aimt_report_imports FOR ALL TO anon USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated access to aimt_report_records') THEN
        CREATE POLICY "Allow authenticated access to aimt_report_records" ON public.aimt_report_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon access to aimt_report_records') THEN
        CREATE POLICY "Allow anon access to aimt_report_records" ON public.aimt_report_records FOR ALL TO anon USING (true) WITH CHECK (true);
    END IF;
END $$;



