-- Task Battles — Supabase schema setup
-- Run this entire file in your Supabase SQL Editor (dashboard.supabase.com → SQL Editor)
-- NOTE: This is a reference/fresh-install script. Since your project already has live
-- user data, do NOT re-run this against your current database — it will drop and
-- recreate every table, deleting all existing data. Only use this on a brand-new project.

-- ─── profiles ──────────────────────────────────────────────────────────────
create table if not exists profiles (
  invite_code  text primary key,
  user_id      uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null,
  created_at   timestamptz default now()
);

-- ─── daily_stats ───────────────────────────────────────────────────────────
create table if not exists daily_stats (
  id         text primary key,    -- format: "{user_id}_{yyyy-MM-dd}"
  user_id    uuid not null references auth.users(id) on delete cascade,
  completed  int  not null default 0,
  total      int  not null default 0,
  rate       int  not null default 0,
  date       text not null,
  updated_at timestamptz default now()
);

-- ─── monthly_stats ─────────────────────────────────────────────────────────
create table if not exists monthly_stats (
  id           text primary key,  -- format: "{user_id}_{yyyy-MM}"
  user_id      uuid not null references auth.users(id) on delete cascade,
  year_month   text not null,
  days_tracked int  not null default 0,
  sum_rate     int  not null default 0,
  avg_rate     int  not null default 0,
  last_updated timestamptz default now()
);

-- ─── reactions ─────────────────────────────────────────────────────────────
create table if not exists reactions (
  invite_code text primary key,   -- recipient's invite_code
  from_name   text not null,
  emoji       text not null,
  sent_at     timestamptz default now(),
  seen        boolean not null default false
);

-- ─── Row Level Security — writes scoped to the authenticated owner ─────────
alter table profiles      enable row level security;
alter table daily_stats   enable row level security;
alter table monthly_stats enable row level security;
alter table reactions     enable row level security;

create policy "profiles_select_all" on profiles for select using (true);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = user_id);
create policy "profiles_delete_own" on profiles for delete using (auth.uid() = user_id);

create policy "daily_stats_select_all" on daily_stats for select using (true);
create policy "daily_stats_insert_own" on daily_stats for insert with check (auth.uid() = user_id);
create policy "daily_stats_update_own" on daily_stats for update using (auth.uid() = user_id);
create policy "daily_stats_delete_own" on daily_stats for delete using (auth.uid() = user_id);

create policy "monthly_stats_select_all" on monthly_stats for select using (true);
create policy "monthly_stats_insert_own" on monthly_stats for insert with check (auth.uid() = user_id);
create policy "monthly_stats_update_own" on monthly_stats for update using (auth.uid() = user_id);
create policy "monthly_stats_delete_own" on monthly_stats for delete using (auth.uid() = user_id);

create policy "reactions_select_all" on reactions for select using (true);
create policy "reactions_insert_any" on reactions for insert with check (true);
create policy "reactions_update_recipient_only" on reactions for update using (
  exists (select 1 from profiles where invite_code = reactions.invite_code and user_id = auth.uid())
);

-- ─── Enable Realtime on all rivalry tables ─────────────────────────────────
alter publication supabase_realtime add table profiles;
alter publication supabase_realtime add table daily_stats;
alter publication supabase_realtime add table monthly_stats;
alter publication supabase_realtime add table reactions;
