# Day Planner — Build Guide

How to package Day Planner as a desktop app for Windows, macOS, and Linux Ubuntu.

---

## Prerequisites

Install these once on your machine before building:

| Tool | Minimum version | Download |
|------|----------------|----------|
| Node.js | 18+ | https://nodejs.org |
| pnpm | 8+ | `npm install -g pnpm` |
| electron-builder | bundled via devDeps | — |

> **Windows only:** No extra tools needed. NSIS installer is bundled automatically.  
> **macOS only:** You must build on a Mac. Code signing requires a Mac with Xcode installed.  
> **Linux only:** Build on Linux or use a CI machine. No extra tools needed for AppImage/deb.

---

## Step 1 — Install dependencies

Open a terminal in the `artifacts/planner/` folder, then run:

```
pnpm install
```

---

## Step 2 — Create icon files

Electron Builder needs platform-specific icon files. Place them in `artifacts/planner/public/`:

| File | Format | Size | Required for |
|------|--------|------|--------------|
| `public/icon.ico` | Windows ICO | 256×256 (multi-size) | Windows |
| `public/icon.icns` | macOS ICNS bundle | 512×512 | macOS |
| `public/icon.png` | PNG | 512×512 | Linux |

**Quick way to make icons from a PNG:**
- Online: https://cloudconvert.com/png-to-ico (Windows) or https://cloudconvert.com/png-to-icns (macOS)
- If you already have `icon.png` at 512×512, Linux will work as-is.

---

## Step 3 — Build for your platform

Run these commands from inside `artifacts/planner/`:

### Windows (builds on Windows)
```
pnpm electron:win
```
Output: `dist/installers/Day Planner Setup x.x.x.exe` (NSIS installer)  
Also produces a portable `.exe` that runs without installing.

### macOS (must build on a Mac)
```
pnpm electron:mac
```
Output: `dist/installers/Day Planner-x.x.x.dmg`  
Builds for both Intel (x64) and Apple Silicon (arm64) automatically.

### Linux / Ubuntu (builds on Linux)
```
pnpm electron:linux
```
Output:
- `dist/installers/Day Planner-x.x.x.AppImage` — runs on any Linux distro, no install needed
- `dist/installers/day-planner_x.x.x_amd64.deb` — Ubuntu/Debian package

### All three at once (only works on macOS — cross-compilation)
```
pnpm electron:all
```

---

## What each build step does

1. **`pnpm run build`** — Runs Vite and outputs the web frontend to `dist/public/`
2. **`electron-builder`** — Packages the Electron shell + `dist/public/` + `electron/main.cjs` into a native installer

---

## Running in development (Electron window, live reload)

Start the Vite dev server first:
```
pnpm dev
```
Then, in a second terminal:
```
pnpm electron:dev
```
This opens the Electron window pointed at `localhost:5173` with DevTools open.

---

## Firebase / Rivalry in packaged builds

The packaged app loads from `file://` protocol. The Electron main process has already been configured with:
- `webSecurity: false` — allows Firebase to reach `*.googleapis.com`
- A CSP header override via `session.webRequest` — explicitly permits Firebase WebSocket connections

If the Rivalry system shows `ERR_ADDRESS_UNREACHABLE` anyway, check:
1. Your machine has internet access
2. `firestore.googleapis.com` is not blocked by a firewall or VPN
3. The Firebase project `day-planner-5f697` is still active

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `icon.ico not found` | Create `public/icon.ico` — see Step 2 |
| `Error: Cannot find module 'electron'` | Run `pnpm install` first |
| macOS build fails on Windows | macOS `.dmg` must be built on a Mac (Apple restriction) |
| Rival system offline in packaged app | See Firebase section above |
| White screen after launch | Make sure `pnpm run build` ran before packaging — check `dist/public/index.html` exists |

---

## Output folder

All installers land in:
```
artifacts/planner/dist/installers/
```
