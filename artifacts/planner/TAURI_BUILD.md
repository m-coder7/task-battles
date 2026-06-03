# Building Task Battles Desktop App (Tauri 2)

To build the **native desktop app** (.exe / .dmg / .AppImage), follow these steps on your local machine.

## Prerequisites

Install on your local machine (one-time):

```bash
# 1. Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# 2. System libraries (Linux only)
sudo apt update && sudo apt install -y \
  libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf \
  libgtk-3-dev libssl-dev

# 3. Node.js 20+ and pnpm (if not already installed)
npm install -g pnpm
```

macOS and Windows only need Rust — no extra system libs required.

## Environment Variables

Create `artifacts/planner/.env` (never commit this):

```
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_SUPABASE_URL=https://mzkjnmbyryzfcpozjccq.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_lYoxybMAD2JIYd9WvB73Jw_NijzRLzw
```

## Generate Icons (one-time after cloning)

The `public/icon.png` is already generated. Convert it to all required sizes:

```bash
cd artifacts/planner
pnpm tauri:icon
```

This creates `src-tauri/icons/` with all platform-specific sizes.

## Development (desktop window)

```bash
cd artifacts/planner
pnpm install
pnpm tauri:dev
```

This starts the Vite dev server on port 5173 and opens a native window.

## Production Builds

```bash
# Current platform
pnpm tauri:build

# Specific platforms (requires cross-compilation toolchain)
pnpm tauri:build:win      # → Windows .exe + .msi
pnpm tauri:build:mac      # → macOS .dmg (Apple Silicon)
pnpm tauri:build:mac:intel # → macOS .dmg (Intel)
pnpm tauri:build:linux    # → Linux .AppImage + .deb
```

Installers are output to `src-tauri/target/release/bundle/`.

## CSP / Network

The Tauri window allows connections to:
- `*.supabase.co` (WebSocket + HTTPS)
- `*.googleapis.com` / `*.firebaseio.com` (Firebase rivalry)

No `webSecurity: false` hack needed — Tauri's CSP handles it cleanly.
