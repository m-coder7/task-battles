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

-- 5. Notes (sticky-note style notes)
create table if not exists public.notes (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  content text,
  color text default 'default',
  pinned boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. Goals (tasks/habits per day, with repeat rules)
create table if not exists public.goals (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null default 'must-do',
  date text not null,
  time text,
  completed boolean not null default false,
  completed_dates jsonb not null default '[]'::jsonb,
  repeat text default 'none',
  repeat_days jsonb,
  notifications_enabled boolean not null default false,
  notification_message text default '',
  last_notified_date text,
  created_at timestamp with time zone default now()
);

-- 7. Events (calendar events)
create table if not exists public.events (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  date text not null,
  start_time text,
  end_time text,
  color text default 'blue',
  description text,
  all_day boolean not null default false,
  repeat text default 'none',
  repeat_days jsonb,
  created_at timestamp with time zone default now()
);

-- 8. Diary (one entry per day, keyed by uuid id + date)
create table if not exists public.diary (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date text not null,
  content text,
  mood text,
  tags jsonb default '[]'::jsonb,
  streak_title text,
  streak_start_date text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (user_id, date)
);

-- Enable Row Level Security
alter table public.notes enable row level security;
alter table public.goals enable row level security;
alter table public.events enable row level security;
alter table public.diary enable row level security;

-- RLS Policies for notes
create policy "Users can select own notes" on public.notes
  for select using (auth.uid() = user_id);
create policy "Users can insert own notes" on public.notes
  for insert with check (auth.uid() = user_id);
create policy "Users can update own notes" on public.notes
  for update using (auth.uid() = user_id);
create policy "Users can delete own notes" on public.notes
  for delete using (auth.uid() = user_id);

-- RLS Policies for goals
create policy "Users can select own goals" on public.goals
  for select using (auth.uid() = user_id);
create policy "Users can insert own goals" on public.goals
  for insert with check (auth.uid() = user_id);
create policy "Users can update own goals" on public.goals
  for update using (auth.uid() = user_id);
create policy "Users can delete own goals" on public.goals
  for delete using (auth.uid() = user_id);

-- RLS Policies for events
create policy "Users can select own events" on public.events
  for select using (auth.uid() = user_id);
create policy "Users can insert own events" on public.events
  for insert with check (auth.uid() = user_id);
create policy "Users can update own events" on public.events
  for update using (auth.uid() = user_id);
create policy "Users can delete own events" on public.events
  for delete using (auth.uid() = user_id);

-- RLS Policies for diary
create policy "Users can select own diary" on public.diary
  for select using (auth.uid() = user_id);
create policy "Users can insert own diary" on public.diary
  for insert with check (auth.uid() = user_id);
create policy "Users can update own diary" on public.diary
  for update using (auth.uid() = user_id);
create policy "Users can delete own diary" on public.diary
  for delete using (auth.uid() = user_id);

-- Enable Realtime for all tables
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.daily_stats;
alter publication supabase_realtime add table public.monthly_stats;
alter publication supabase_realtime add table public.reactions;
alter publication supabase_realtime add table public.notes;
alter publication supabase_realtime add table public.goals;
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.diary;
