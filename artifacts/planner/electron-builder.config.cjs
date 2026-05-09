/**
 * Electron Builder configuration for Windows packaging.
 * Run: npx electron-builder --win after building the Vite frontend.
 *
 * Build steps:
 *   1. pnpm run build          (Vite build → dist/public)
 *   2. npx electron-builder    (packages into dist/installers)
 */

module.exports = {
  appId: "com.dayplanner.app",
  productName: "Day Planner",
  copyright: `Copyright © ${new Date().getFullYear()}`,
  directories: {
    output: "dist/installers",
  },
  files: [
    "electron/**/*",
    "dist/public/**/*",
    "package.json",
  ],
  win: {
    target: [{ target: "nsis", arch: ["x64"] }],
    icon: "public/icon.ico",
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
  },
  mac: {
    target: "dmg",
    category: "public.app-category.productivity",
  },
  linux: {
    target: "AppImage",
    category: "Office",
  },
};
