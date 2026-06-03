-- Task Battles — Supabase schema setup
-- Run this entire file in your Supabase SQL Editor (dashboard.supabase.com → SQL Editor)

-- ─── Drop existing tables (safe on fresh project) ──────────────────────────
drop table if exists reactions    cascade;
drop table if exists monthly_stats cascade;
drop table if exists daily_stats   cascade;
drop table if exists profiles      cascade;

-- ─── profiles ──────────────────────────────────────────────────────────────
create table profiles (
  invite_code  text primary key,
  user_id      text not null unique,
  display_name text not null,
  created_at   timestamptz default now()
);

-- ─── daily_stats ───────────────────────────────────────────────────────────
create table daily_stats (
  id         text primary key,    -- format: "{user_id}_{yyyy-MM-dd}"
  user_id    text not null,
  completed  int  not null default 0,
  total      int  not null default 0,
  rate       int  not null default 0,
  date       text not null,
  updated_at timestamptz default now()
);

-- ─── monthly_stats ─────────────────────────────────────────────────────────
create table monthly_stats (
  id           text primary key,  -- format: "{user_id}_{yyyy-MM}"
  user_id      text not null,
  year_month   text not null,
  days_tracked int  not null default 0,
  sum_rate     int  not null default 0,
  avg_rate     int  not null default 0,
  last_updated timestamptz default now()
);

-- ─── reactions ─────────────────────────────────────────────────────────────
create table reactions (
  invite_code text primary key,   -- recipient's invite_code
  from_name   text not null,
  emoji       text not null,
  sent_at     timestamptz default now(),
  seen        boolean not null default false
);

-- ─── Row Level Security — open read/write for anon key ─────────────────────
-- (The app uses a public-facing anon key — data is not sensitive)
-- You can lock this down with proper auth later.

alter table profiles      enable row level security;
alter table daily_stats   enable row level security;
alter table monthly_stats enable row level security;
alter table reactions     enable row level security;

create policy "public read/write profiles"      on profiles      for all using (true) with check (true);
create policy "public read/write daily_stats"   on daily_stats   for all using (true) with check (true);
create policy "public read/write monthly_stats" on monthly_stats for all using (true) with check (true);
create policy "public read/write reactions"     on reactions     for all using (true) with check (true);

-- ─── Enable Realtime on all rivalry tables ─────────────────────────────────
-- In Supabase Dashboard → Database → Replication → enable for:
--   profiles, daily_stats, monthly_stats, reactions
-- Or run:
alter publication supabase_realtime add table profiles;
alter publication supabase_realtime add table daily_stats;
alter publication supabase_realtime add table monthly_stats;
alter publication supabase_realtime add table reactions;
