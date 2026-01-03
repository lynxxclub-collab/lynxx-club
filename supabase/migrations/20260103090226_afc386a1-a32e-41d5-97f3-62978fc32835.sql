-- Remove the overly permissive RLS policy that exposes all user data
-- This policy allows ANY authenticated user to view ALL active/verified profiles including PII
DROP POLICY IF EXISTS "Authenticated users can view active profiles" ON profiles;