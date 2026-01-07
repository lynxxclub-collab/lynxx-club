-- ============================================
-- MIGRATION: setup_reporting_system.sql
-- DESCRIPTION: Creates the reports table for users
--              to flag inappropriate behavior.
-- ============================================

-- 1. Create Enum for Report Status
CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'action_taken', 'dismissed');

-- 2. Create Reports Table
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    reported_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    reason TEXT NOT NULL,
    description TEXT,
    status report_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Indexes
CREATE INDEX idx_reports_reported_user ON public.reports(reported_id);
CREATE INDEX idx_reports_status ON public.reports(status);
CREATE INDEX idx_reports_reporter ON public.reports(reporter_id);

-- 4. Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 5. Policies
-- Users can insert reports
CREATE POLICY "Users can create reports" ON public.reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view own reports" ON public.reports
    FOR SELECT USING (auth.uid() = reporter_id);

-- Admins (or moderators) can view all reports (Assuming admin role check logic exists in app)
-- Ideally you check auth.uid() against an admin table, but for now:
CREATE POLICY "Admins can view all reports" ON public.reports
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'admin')
    );

-- 6. Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reports_updated_at
    BEFORE UPDATE ON public.reports
    FOR EACH ROW EXECUTE FUNCTION update_reports_updated_at();
