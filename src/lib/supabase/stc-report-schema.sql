-- =========================================================================
-- STATES COLLEGE AUSTRALIA (STC) - REPORT MANAGEMENT TABLES SCHEMA
-- 100% Isolated live Supabase tables for States College Report Records & Imports
-- =========================================================================

-- 1. STC REPORT IMPORTS TABLE
CREATE TABLE IF NOT EXISTS public.stc_report_imports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT DEFAULT 0,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    uploaded_by VARCHAR(255),
    total_records INT NOT NULL DEFAULT 0,
    total_pending_amount NUMERIC(14, 2) DEFAULT 0.00,
    total_yet_to_raised NUMERIC(14, 2) DEFAULT 0.00,
    entity VARCHAR(50) NOT NULL DEFAULT 'stc',
    original_file_data TEXT, -- Base64 encoded raw excel binary for exact original download
    raw_headers JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. STC REPORT RECORDS TABLE
CREATE TABLE IF NOT EXISTS public.stc_report_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    import_id UUID NOT NULL REFERENCES public.stc_report_imports(id) ON DELETE CASCADE,
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
    total_paid NUMERIC(14, 2) DEFAULT 0.00,
    follow_up TEXT,
    coe_issued_date VARCHAR(100),
    email_id VARCHAR(255),
    phone_no VARCHAR(100),
    payment_status VARCHAR(100),
    extra_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for lightning fast searching and filtering
CREATE INDEX IF NOT EXISTS idx_stc_report_imports_uploaded_at ON public.stc_report_imports(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_stc_report_imports_entity ON public.stc_report_imports(entity);
CREATE INDEX IF NOT EXISTS idx_stc_report_records_import_id ON public.stc_report_records(import_id);
CREATE INDEX IF NOT EXISTS idx_stc_report_records_student_name ON public.stc_report_records(student_name);
CREATE INDEX IF NOT EXISTS idx_stc_report_records_student_id ON public.stc_report_records(student_id);
CREATE INDEX IF NOT EXISTS idx_stc_report_records_agent ON public.stc_report_records(agent);
CREATE INDEX IF NOT EXISTS idx_stc_report_records_intake ON public.stc_report_records(intake);
CREATE INDEX IF NOT EXISTS idx_stc_report_records_course ON public.stc_report_records(course);

-- Enable Row Level Security (RLS)
ALTER TABLE public.stc_report_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stc_report_records ENABLE ROW LEVEL SECURITY;

-- Setup RLS Policies for authenticated and anon access
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated access to stc_report_imports') THEN
        CREATE POLICY "Allow authenticated access to stc_report_imports" ON public.stc_report_imports FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon access to stc_report_imports') THEN
        CREATE POLICY "Allow anon access to stc_report_imports" ON public.stc_report_imports FOR ALL TO anon USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated access to stc_report_records') THEN
        CREATE POLICY "Allow authenticated access to stc_report_records" ON public.stc_report_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon access to stc_report_records') THEN
        CREATE POLICY "Allow anon access to stc_report_records" ON public.stc_report_records FOR ALL TO anon USING (true) WITH CHECK (true);
    END IF;
END $$;
