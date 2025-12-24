-- Grant admin role to user
INSERT INTO public.user_roles (user_id, role)
VALUES ('8544f30a-3edb-495c-9ee8-9eb888264d68', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;