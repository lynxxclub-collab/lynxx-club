-- Enable realtime replication for launch_signups table
-- This allows real-time updates for seeker and earner spot counts on the auth page

ALTER PUBLICATION supabase_realtime ADD TABLE launch_signups;