-- ============================================
-- MIGRATION: make_city_optional.sql
-- DESCRIPTION: Allows users to save profiles without
--              specifying a city.
-- ============================================

-- Make location_city nullable
ALTER TABLE public.profiles
ALTER COLUMN location_city DROP NOT NULL;
