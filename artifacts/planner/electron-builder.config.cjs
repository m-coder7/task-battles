/**
 * Electron Builder — cross-platform desktop packaging.
 *
 * ICON FILES NEEDED (place in artifacts/planner/public/):
 *   public/icon.ico   — Windows (256×256 .ico)
 *   public/icon.icns  — macOS   (.icns bundle)
 *   public/icon.png   — Linux   (512×512 PNG)
 *
 * BUILD COMMANDS (run from artifacts/planner/ directory):
 *   pnpm electron:win    → Windows .exe installer (NSIS)
 *   pnpm electron:mac    → macOS   .dmg (Intel + Apple Silicon)
 *   pnpm electron:linux  → Linux   .AppImage + .deb (x64)
 *   pnpm electron:all    → All three platforms at once
 *
 * Prerequisites: Node.js 18+, pnpm, then run `pnpm install` first.
 */

module.exports = {
  appId: "com.dayplanner.app",
  productName: "Day Planner",
  copyright: `Copyright © ${new Date().getFullYear()} Day Planner`,

  directories: {
    output: "dist/installers",
    buildResources: "public",
  },

  files: [
    "electron/**/*",
    "dist/public/**/*",
    "package.json",
  ],

  // ─── Windows ──────────────────────────────────────────────────────────────
  win: {
    target: [
      { target: "nsis",     arch: ["x64"] },
      { target: "portable", arch: ["x64"] },
    ],
    icon: "public/icon.ico",
    requestedExecutionLevel: "asInvoker",
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "Day Planner",
  },

  // ─── macOS ────────────────────────────────────────────────────────────────
  mac: {
    target: [
      { target: "dmg", arch: ["x64", "arm64"] },
    ],
    icon: "public/icon.icns",
    category: "public.app-category.productivity",
    hardenedRuntime: true,
    gatekeeperAssess: false,
  },
  dmg: {
    title: "Day Planner",
    contents: [
      { x: 130, y: 220 },
      { x: 410, y: 220, type: "link", path: "/Applications" },
    ],
  },

  // ─── Linux ────────────────────────────────────────────────────────────────
  linux: {
    target: [
      { target: "AppImage", arch: ["x64"] },
      { target: "deb",      arch: ["x64"] },
    ],
    icon: "public/icon.png",
    category: "Office",
    synopsis: "Personal calendar and goal planner with rivalry system",
    description: "Day Planner — month/week/day calendar, recurring goals, Windows notifications, and a live rivalry system powered by Firebase.",
    maintainer: "Day Planner",
  },
  deb: {
    afterInstall: "",
  },
};
