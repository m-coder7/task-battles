-- Task Battles Rivalry Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Profiles table (stores user rivalry profiles)
create table if not exists public.profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  invite_code text not null unique,
  created_at timestamp with time zone default now()
);

-- 2. Daily stats table (stores daily completion rates)
create table if not exists public.daily_stats (
  id text primary key, -- format: "userId_yyyy-MM-dd"
  user_id uuid not null references auth.users(id) on delete cascade,
  completed integer not null default 0,
  total integer not null default 0,
  rate integer not null default 0, -- percentage 0-100
  date text not null, -- yyyy-MM-dd
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 3. Monthly stats table (stores monthly averages)
create table if not exists public.monthly_stats (
  id text primary key, -- format: "userId_yyyy-MM"
  user_id uuid not null references auth.users(id) on delete cascade,
  year_month text not null, -- yyyy-MM
  days_tracked integer not null default 0,
  sum_rate integer not null default 0,
  avg_rate integer not null default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 4. Reactions table (stores emoji reactions between rivals)
create table if not exists public.reactions (
  id uuid default gen_random_uuid() primary key,
  invite_code text not null references public.profiles(invite_code) on delete cascade,
  from_name text not null,
  emoji text not null,
  seen boolean not null default false,
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.daily_stats enable row level security;
alter table public.monthly_stats enable row level security;
alter table public.reactions enable row level security;

-- RLS Policies for profiles
-- Users can read any profile (needed to find rivals by invite code)
create policy "Profiles are viewable by everyone" on public.profiles
  for select using (true);

-- Users can only insert their own profile
create policy "Users can insert their own profile" on public.profiles
  for insert with check (auth.uid() = user_id);

-- Users can only update their own profile
create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = user_id);

-- Users can only delete their own profile
create policy "Users can delete their own profile" on public.profiles
  for delete using (auth.uid() = user_id);

-- RLS Policies for daily_stats
-- Users can read any daily stats (needed for rival comparison)
create policy "Daily stats are viewable by everyone" on public.daily_stats
  for select using (true);

-- Users can only insert/update their own stats
create policy "Users can insert their own daily stats" on public.daily_stats
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own daily stats" on public.daily_stats
  for update using (auth.uid() = user_id);

create policy "Users can delete their own daily stats" on public.daily_stats
  for delete using (auth.uid() = user_id);

-- RLS Policies for monthly_stats
create policy "Monthly stats are viewable by everyone" on public.monthly_stats
  for select using (true);

create policy "Users can insert their own monthly stats" on public.monthly_stats
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own monthly stats" on public.monthly_stats
  for update using (auth.uid() = user_id);

create policy "Users can delete their own monthly stats" on public.monthly_stats
  for delete using (auth.uid() = user_id);

-- RLS Policies for reactions
-- Anyone can read reactions for a given invite code
create policy "Reactions are viewable by everyone" on public.reactions
  for select using (true);

-- Anyone can insert a reaction (rivals send reactions to each other)
create policy "Anyone can insert reactions" on public.reactions
  for insert with check (true);

-- Only the profile owner can update reactions (mark as seen)
create policy "Profile owner can update reactions" on public.reactions
  for update using (exists (
    select 1 from public.profiles where invite_code = reactions.invite_code and user_id = auth.uid()
  ));

-- Enable Realtime for all tables
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.daily_stats;
alter publication supabase_realtime add table public.monthly_stats;
alter publication supabase_realtime add table public.reactions;
