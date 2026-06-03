# Task Battles

A cross-platform day planner with a real-time rivalry system, goals tracking, notes, and diary. Available as a web app (React + Vite) and mobile app (Expo).

## Run & Operate

- `pnpm --filter @workspace/planner run dev` — run the web app (via workflow)
- `pnpm --filter @workspace/day-planner-mobile run dev` — run the mobile app (via workflow)
- `pnpm --filter @workspace/planner run typecheck` — typecheck web app
- `pnpm run typecheck` — full typecheck across all packages
- Run `SUPABASE_SETUP.sql` in your Supabase dashboard SQL editor to initialize the DB schema

## Stack

- **Monorepo**: pnpm workspaces, Node.js 24, TypeScript 5.9
- **Web**: React 19 + Vite, Tailwind CSS, shadcn/ui, date-fns, lucide-react, recharts
- **Mobile**: Expo (React Native), expo-router, expo-blur, @expo/vector-icons
- **Backend**: Supabase (Postgres + Realtime channels) — replaces Firebase
- **Desktop**: Tauri 2.0 (configured, build with `pnpm tauri:build`)

## Where things live

- `artifacts/planner/` — web app (React + Vite + Tailwind)
  - `src/hooks/useRivalry.ts` — Supabase rivalry system (offline queue included)
  - `src/hooks/useNotes.ts` — localStorage-backed notes
  - `src/hooks/useDiary.ts` — localStorage-backed diary
  - `src/hooks/useEvents.ts` — events with repeat support
  - `src/hooks/useGoals.ts` — goals with repeat/custom weekday support
  - `src/lib/supabase.ts` — Supabase client
  - `src-tauri/` — Tauri 2.0 desktop config
- `artifacts/day-planner-mobile/` — Expo mobile app
  - `lib/supabase.ts` — Supabase client (AsyncStorage)
  - `hooks/useRivalry.ts` — Supabase rivalry (AsyncStorage + offline queue)
  - `hooks/useNotes.ts` — AsyncStorage-backed notes
  - `app/(tabs)/` — Today, Calendar, Goals, Notes, Rivalry tabs
- `SUPABASE_SETUP.sql` — run once in Supabase SQL editor

## Architecture decisions

- **Supabase over Firebase**: Supabase Realtime channels for live rivalry stats; RLS policies set to open for simplicity (lock down when adding auth).
- **Offline queue**: writes are queued in localStorage/AsyncStorage when offline, flushed on reconnect.
- **Rival data via invite codes**: no auth required — users share 6-char codes. Profile + stats keyed by `user_id` (random UUID).
- **localStorage for notes/diary**: no Supabase sync for notes/diary yet — stored locally. Can be migrated later.
- **Repeat events use same logic as goals**: `getEventsForDate` filters by date+repeat pattern; recurring events always matched by `id` from original storage.

## Product

- **Calendar**: Day/Week/Month/Agenda views, event creation with color labels and repeat (daily/weekdays/weekly/custom)
- **Goals**: Priority categories (must-do/should-do/nice-to-have), repeat scheduling, notifications
- **Rivalry**: Real-time head-to-head goal completion rate vs. a friend (Supabase Realtime), emoji reactions, 7-day history chart, monthly averages
- **Notes**: Color-coded sticky-note style, pin support, search
- **Diary**: Daily entries with mood picker, tags, and history view
- **Mobile**: 5-tab Expo app (Today, Calendar, Goals, Notes, Rivalry) with native iOS blur + SF Symbols

## User preferences

- User said "do it all in one go, no stops" — implement all parts without pausing for confirmation
- Keep Firebase env vars for now until Supabase is confirmed working in production

## Gotchas

- **Supabase Realtime** requires enabling replication on tables via the SQL in `SUPABASE_SETUP.sql`
- RLS policies are permissive — add auth before going production
- **Tauri build** requires Rust toolchain (`rustup`) — not available in Replit container
- `pnpm run typecheck` for mobile does not catch all Expo-specific issues (use `expo lint` separately)
- Never run `pnpm dev` at workspace root — use workflows
- Mobile `useRivalry.ts` uses `initialized: boolean` field — rivalry screen shows a spinner until AsyncStorage loads

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
