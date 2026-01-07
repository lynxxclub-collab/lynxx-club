-- Drop existing table if it exists to prevent conflicts (Use with caution in production!)
drop table if exists public.profiles cascade;

-- Create the profiles table matching the React Component Interface
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  
  -- This column fixes the error "column 'role' does not exist"
  user_type text check (user_type in ('seeker', 'earner')),
  
  first_name text,
  profile_photo text, -- URL to Supabase storage
  location_city text,
  
  is_featured boolean default false,
  is_online boolean default false,
  
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Policy: Allow public read access (needed for the Discover page)
create policy "Public profiles are viewable by everyone" 
on public.profiles for select using (true);

-- Policy: Allow users to update their own profile
create policy "Users can update own profile" 
on public.profiles for update using (auth.uid() = id);

-- Policy: Allow users to insert their own profile (on signup)
create policy "Users can insert own profile" 
on public.profiles for insert with check (auth.uid() = id);
