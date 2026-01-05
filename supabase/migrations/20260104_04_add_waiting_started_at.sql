alter table public.video_dates
add column if not exists waiting_started_at timestamptz,
add column if not exists actual_start timestamptz;

create index if not exists idx_video_dates_waiting_started_at
on public.video_dates (waiting_started_at)
where status = 'waiting' and actual_start is null;