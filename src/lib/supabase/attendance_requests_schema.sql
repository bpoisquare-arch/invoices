-- ATTENDANCE REQUESTS / REGULARIZATION TABLE
-- Supports: Leave Applications, Missing In Regularization, Missing Out Regularization
-- Live synchronization between Grocery Management (Branch Users) and Invoice Gen (MIS Admin)

CREATE TABLE IF NOT EXISTS public.attendance_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    branch VARCHAR(50) NOT NULL,
    request_type VARCHAR(50) NOT NULL, -- 'LEAVE', 'MISSING_IN', 'MISSING_OUT'
    leave_type VARCHAR(100),           -- 'Sick Leave', 'Casual Leave', 'Annual Leave', 'Probation Leave', 'Half Day', etc.
    requested_in_time VARCHAR(20),     -- e.g. '10:30 AM'
    requested_out_time VARCHAR(20),    -- e.g. '06:30 PM'
    reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'
    submitted_by VARCHAR(100),
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast Indexing
CREATE INDEX IF NOT EXISTS idx_att_requests_emp_date ON public.attendance_requests(employee_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_att_requests_status ON public.attendance_requests(status);
CREATE INDEX IF NOT EXISTS idx_att_requests_branch ON public.attendance_requests(branch);

-- Row Level Security matching attendance_records
ALTER TABLE public.attendance_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated access to attendance_requests') THEN
        CREATE POLICY "Allow authenticated access to attendance_requests" ON public.attendance_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon access to attendance_requests') THEN
        CREATE POLICY "Allow anon access to attendance_requests" ON public.attendance_requests FOR ALL TO anon USING (true) WITH CHECK (true);
    END IF;
END $$;
