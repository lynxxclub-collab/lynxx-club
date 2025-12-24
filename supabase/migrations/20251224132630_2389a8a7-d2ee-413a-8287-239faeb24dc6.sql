-- Add verification columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified',
ADD COLUMN IF NOT EXISTS id_document_url TEXT,
ADD COLUMN IF NOT EXISTS selfie_url TEXT,
ADD COLUMN IF NOT EXISTS id_document_type TEXT,
ADD COLUMN IF NOT EXISTS verification_submitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verified_by_admin_id UUID,
ADD COLUMN IF NOT EXISTS verification_notes TEXT,
ADD COLUMN IF NOT EXISTS verification_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS can_reverify_at TIMESTAMPTZ;

-- Add constraint for valid statuses
ALTER TABLE public.profiles
ADD CONSTRAINT valid_verification_status 
CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected'));

-- Create index for quick filtering
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status ON public.profiles(verification_status);