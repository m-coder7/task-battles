# Task Battles - Agent Notes

## Project Structure

- `artifacts/planner/` - Main Task Battles Tauri desktop app
- `artifacts/task-battles-widgets/` - Separate Tauri widget app for floating desktop widgets
- `artifacts/supabase-schema.sql` - SQL to create Rivalry tables in Supabase

## Widget Architecture

### Why a Separate App?

Tauri v2 `WebviewWindowBuilder` secondary windows consistently render blank white inside the main app. After multiple fixes attempted (URL paths, query params, window labels, transparency toggles), all failed. The only reliable way to get working floating desktop widgets is a **separate Tauri app**.

### Data Sharing

The main app exports goals and events to a shared JSON file:
- Path: `%LOCALAPPDATA%/TaskBattles/widgets.json`
- Written by main app every 10 seconds via `export_data_for_widgets` Rust command
- Read by widget app via `read_shared_data` Rust command
- Widget app does NOT use Supabase directly to avoid auth complexity

### Widget App Features

- **Borderless, transparent windows** with drag handles
- **Always-on-top** floating windows that skip the taskbar
- **System tray** with quit menu
- **Auto-start** support via tauri-plugin-autostart
- Three widget types: Progress ring, Today's Tasks, Upcoming Events
- Main dashboard to preview widgets and spawn floating windows
- URL-based widget routing: `?widget=progress`, `?widget=tasks`, `?widget=events`

### Main App Features

- Supabase Auth with email confirmation
- Close-to-tray (main window hides instead of quitting)
- Deep-link auth support (`taskbattles://auth/callback`)
- Export data for widgets every 10 seconds
- Ember theme with System/Midnight/Ember selector
- In-app Widgets Dashboard (Settings -> Widgets tab)
- ErrorBoundary for crash recovery

## Build Notes

### Main App
```bash
cd artifacts/planner
pnpm tauri build
```

### Widget App
```bash
cd artifacts/task-battles-widgets
pnpm tauri build
```

The widget app has its own `Cargo.toml` and `tauri.conf.json`.

## Critical Config

- `main.tsx` must render synchronously — async initialization blocks React mount and causes blank screen
- Theme dropdown uses explicit `useState` toggle with click-outside close (not CSS `group-hover`)
- Autostart plugin does NOT need a `plugins.autostart` config block in `tauri.conf.json`

## Secrets

All secrets stored in root `.env` file:
- `PORT`
- `BASE_PATH`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_AUTH_REDIRECT_URL` (optional — overrides the default `taskbattles://auth/callback` for auth emails; set to `http://localhost:5173` in dev to test reset/signup in browser)

## Next Steps / TODO

- [ ] Test widget app on a fresh Windows install
- [ ] Add widget window position persistence (tauri-plugin-window-state)
- [ ] Add widget settings (size, opacity, which widgets to show)
- [ ] Make widget windows resizable
- [ ] Add widget update interval control
- [ ] Consider adding a single installer that installs both main app and widget app
