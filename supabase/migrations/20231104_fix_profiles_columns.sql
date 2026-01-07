-- Drop existing table to ensure clean slate with correct column names
drop table if exists public.profiles cascade;

-- Create profiles table with columns matching the AdminUser Interface
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  
  -- Matches interface property 'role'
  role text check (role in ('seeker', 'earner')),
  
  -- Matches interface property 'name'
  name text,
  
  -- Matches interface property 'profile_photos'
  profile_photos text, -- URL to image
  
  -- Additional columns from your theme
  location_city text,
  is_featured boolean default false,
  is_online boolean default false,
  
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Policy: Allow public read access
create policy "Public profiles are viewable by everyone" 
on public.profiles for select using (true);

-- Policy: Allow users to update their own profile
create policy "Users can update own profile" 
on public.profiles for update using (auth.uid() = id);

-- Policy: Allow users to insert their own profile
create policy "Users can insert own profile" 
on public.profiles for insert with check (auth.uid() = id);
