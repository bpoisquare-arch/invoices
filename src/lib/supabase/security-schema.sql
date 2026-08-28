-- ====================================================
-- SECURITY MIGRATION & HARDENING SCHEMA
-- Execute this SQL script in the Supabase SQL Editor
-- ====================================================

-- 1. Create Profiles Table for User Roles & MFA
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user', -- 'super_admin' | 'admin' | 'user'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Trigger Function to Automatically Sync Users on Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role)
    VALUES (
        new.id,
        new.email,
        -- Set first user in the profiles table to 'super_admin', others to 'user'
        CASE 
            WHEN NOT EXISTS (SELECT 1 FROM public.profiles) THEN 'super_admin'
            ELSE 'user'
        END
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed existing users from auth.users into public.profiles
INSERT INTO public.profiles (id, email, role)
SELECT id, email, 'admin'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 3. Security Helper Functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'super_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create Security Audit Logs Table
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    module VARCHAR(100) NOT NULL,
    record_id VARCHAR(255),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on Audit Logs
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- 5. Hardened Row Level Security Policies
-- Drops all existing policies to ensure clean re-application

-- 5.1 Profiles Policies
DROP POLICY IF EXISTS "Allow users to read own profile" ON public.profiles;
CREATE POLICY "Allow users to read own profile" ON public.profiles
    FOR SELECT TO authenticated USING (id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Allow users to update own profile" ON public.profiles;
CREATE POLICY "Allow users to update own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Allow admins full access to profiles" ON public.profiles;
CREATE POLICY "Allow admins full access to profiles" ON public.profiles
    FOR ALL TO authenticated USING (is_admin());

-- 5.2 Companies Policies
DROP POLICY IF EXISTS "Allow authenticated access to companies" ON public.companies;
DROP POLICY IF EXISTS "Hardened select companies policy" ON public.companies;
CREATE POLICY "Hardened select companies policy" ON public.companies
    FOR SELECT TO authenticated USING (user_id = auth.uid() OR user_id IS NULL OR is_admin());

DROP POLICY IF EXISTS "Hardened insert companies policy" ON public.companies;
CREATE POLICY "Hardened insert companies policy" ON public.companies
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Hardened update companies policy" ON public.companies;
CREATE POLICY "Hardened update companies policy" ON public.companies
    FOR UPDATE TO authenticated USING (user_id = auth.uid() OR is_admin()) WITH CHECK (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Hardened delete companies policy" ON public.companies;
CREATE POLICY "Hardened delete companies policy" ON public.companies
    FOR DELETE TO authenticated USING (user_id = auth.uid() OR is_admin());

-- 5.3 Company Sequences Policies
DROP POLICY IF EXISTS "Allow authenticated access to company_sequences" ON public.company_sequences;
DROP POLICY IF EXISTS "Hardened company_sequences policy" ON public.company_sequences;
CREATE POLICY "Hardened company_sequences policy" ON public.company_sequences
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.companies
            WHERE id = company_id AND (user_id = auth.uid() OR user_id IS NULL OR is_admin())
        )
    );

-- 5.4 Templates Policies
DROP POLICY IF EXISTS "Allow authenticated access to templates" ON public.templates;
DROP POLICY IF EXISTS "Hardened templates policy" ON public.templates;
CREATE POLICY "Hardened templates policy" ON public.templates
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.companies
            WHERE id = company_id AND (user_id = auth.uid() OR user_id IS NULL OR is_admin())
        )
    );

-- 5.5 Invoices Policies
DROP POLICY IF EXISTS "Allow authenticated access to invoices" ON public.invoices;
DROP POLICY IF EXISTS "Hardened select invoices policy" ON public.invoices;
CREATE POLICY "Hardened select invoices policy" ON public.invoices
    FOR SELECT TO authenticated USING (user_id = auth.uid() OR user_id IS NULL OR is_admin());

DROP POLICY IF EXISTS "Hardened insert invoices policy" ON public.invoices;
CREATE POLICY "Hardened insert invoices policy" ON public.invoices
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Hardened update invoices policy" ON public.invoices;
CREATE POLICY "Hardened update invoices policy" ON public.invoices
    FOR UPDATE TO authenticated USING (user_id = auth.uid() OR is_admin()) WITH CHECK (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Hardened delete invoices policy" ON public.invoices;
CREATE POLICY "Hardened delete invoices policy" ON public.invoices
    FOR DELETE TO authenticated USING (user_id = auth.uid() OR is_admin());

-- 5.6 Invoice Items Policies
DROP POLICY IF EXISTS "Allow authenticated access to invoice_items" ON public.invoice_items;
DROP POLICY IF EXISTS "Hardened invoice_items policy" ON public.invoice_items;
CREATE POLICY "Hardened invoice_items policy" ON public.invoice_items
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.invoices
            WHERE id = invoice_id AND (user_id = auth.uid() OR user_id IS NULL OR is_admin())
        )
    );

-- 5.7 Installment Schedules Policies
DROP POLICY IF EXISTS "Allow authenticated access to installment_schedules" ON public.installment_schedules;
DROP POLICY IF EXISTS "Hardened select installment schedules policy" ON public.installment_schedules;
CREATE POLICY "Hardened select installment schedules policy" ON public.installment_schedules
    FOR SELECT TO authenticated USING (user_id = auth.uid() OR user_id IS NULL OR is_admin());

DROP POLICY IF EXISTS "Hardened insert installment schedules policy" ON public.installment_schedules;
CREATE POLICY "Hardened insert installment schedules policy" ON public.installment_schedules
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Hardened update installment schedules policy" ON public.installment_schedules;
CREATE POLICY "Hardened update installment schedules policy" ON public.installment_schedules
    FOR UPDATE TO authenticated USING (user_id = auth.uid() OR is_admin()) WITH CHECK (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Hardened delete installment schedules policy" ON public.installment_schedules;
CREATE POLICY "Hardened delete installment schedules policy" ON public.installment_schedules
    FOR DELETE TO authenticated USING (user_id = auth.uid() OR is_admin());

-- 5.8 Installment Email Logs Policies
DROP POLICY IF EXISTS "Allow authenticated access to installment_email_logs" ON public.installment_email_logs;
DROP POLICY IF EXISTS "Hardened installment_email_logs policy" ON public.installment_email_logs;
CREATE POLICY "Hardened installment_email_logs policy" ON public.installment_email_logs
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.installment_schedules
            WHERE id = schedule_id AND (user_id = auth.uid() OR user_id IS NULL OR is_admin())
        )
    );

-- 5.9 Employees Policies
DROP POLICY IF EXISTS "Allow authenticated access to employees" ON public.employees;
DROP POLICY IF EXISTS "Hardened select employees policy" ON public.employees;
CREATE POLICY "Hardened select employees policy" ON public.employees
    FOR SELECT TO authenticated USING (user_id = auth.uid() OR user_id IS NULL OR is_admin());

DROP POLICY IF EXISTS "Hardened insert employees policy" ON public.employees;
CREATE POLICY "Hardened insert employees policy" ON public.employees
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Hardened update employees policy" ON public.employees;
CREATE POLICY "Hardened update employees policy" ON public.employees
    FOR UPDATE TO authenticated USING (user_id = auth.uid() OR is_admin()) WITH CHECK (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Hardened delete employees policy" ON public.employees;
CREATE POLICY "Hardened delete employees policy" ON public.employees
    FOR DELETE TO authenticated USING (user_id = auth.uid() OR is_admin());

-- 5.10 Employee Sequences Policies
DROP POLICY IF EXISTS "Allow authenticated access to employee_sequences" ON public.employee_sequences;
DROP POLICY IF EXISTS "Hardened employee_sequences policy" ON public.employee_sequences;
CREATE POLICY "Hardened employee_sequences policy" ON public.employee_sequences
    FOR ALL TO authenticated USING (is_admin());

-- 5.11 Attendance Settings Policies
DROP POLICY IF EXISTS "Allow authenticated access to attendance_settings" ON public.attendance_settings;
DROP POLICY IF EXISTS "Hardened attendance_settings policy" ON public.attendance_settings;
CREATE POLICY "Hardened attendance_settings policy" ON public.attendance_settings
    FOR ALL TO authenticated USING (is_admin());

-- 5.12 Attendance Records Policies
DROP POLICY IF EXISTS "Allow authenticated access to attendance_records" ON public.attendance_records;
DROP POLICY IF EXISTS "Hardened select attendance_records policy" ON public.attendance_records;
CREATE POLICY "Hardened select attendance_records policy" ON public.attendance_records
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE id = employee_id AND (user_id = auth.uid() OR user_id IS NULL OR is_admin())
        )
    );

DROP POLICY IF EXISTS "Hardened write attendance_records policy" ON public.attendance_records;
CREATE POLICY "Hardened write attendance_records policy" ON public.attendance_records
    FOR ALL TO authenticated USING (is_admin());

-- 5.13 Attendance Audit Logs Policies
DROP POLICY IF EXISTS "Allow authenticated access to attendance_audit_logs" ON public.attendance_audit_logs;
DROP POLICY IF EXISTS "Hardened attendance_audit_logs policy" ON public.attendance_audit_logs;
CREATE POLICY "Hardened attendance_audit_logs policy" ON public.attendance_audit_logs
    FOR ALL TO authenticated USING (is_admin());

-- 5.14 Security Audit Logs Policies
DROP POLICY IF EXISTS "Hardened security_audit_logs policy" ON public.security_audit_logs;
CREATE POLICY "Hardened security_audit_logs policy" ON public.security_audit_logs
    FOR ALL TO authenticated USING (is_admin());
