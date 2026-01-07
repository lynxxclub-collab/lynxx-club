ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';

-- Optional: index for filtering admins quickly
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles (role);
