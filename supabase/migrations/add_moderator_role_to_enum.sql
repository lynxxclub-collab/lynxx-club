-- ============================================
-- MIGRATION: add_moderator_role_to_enum.sql
-- DESCRIPTION: Adds 'moderator' to the user_role enum
--              to support frontend role checks.
-- ============================================

-- Postgres doesn't support renaming enum values directly or easily adding values.
-- We recreate the type.

-- 1. Create a temporary type with the new values
CREATE TYPE user_role_new AS ENUM ('seeker', 'earner', 'admin', 'moderator');

-- 2. Alter the column to use the new type (this casts existing values)
ALTER TABLE public.profiles
ALTER COLUMN user_type TYPE user_role_new
USING user_type::text::user_role_new;

-- 3. Drop the old type
DROP TYPE public.user_role;

-- 4. Rename the new type to the original name
ALTER TYPE user_role_new RENAME TO user_role;

-- 5. Ensure the profiles table is updated correctly (implicit by step 2)