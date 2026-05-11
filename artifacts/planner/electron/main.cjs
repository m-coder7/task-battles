const { app, BrowserWindow, shell, session } = require("electron");
const path = require("path");
const url = require("url");

let mainWindow;

function createWindow() {
  const isMac = process.platform === "darwin";
  const isWin = process.platform === "win32";

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // Required for Firebase (Firestore WebSocket connections) to work
      // when the app is loaded from file:// protocol
      webSecurity: false,
    },
    // Mac: native title bar (traffic lights)
    titleBarStyle: isMac ? "hiddenInset" : "hidden",
    // Windows/Linux: custom overlay
    ...(isWin ? {
      titleBarOverlay: {
        color: "#ffffff",
        symbolColor: "#374151",
        height: 40,
      },
    } : {}),
    backgroundColor: "#ffffff",
    show: false,
    icon: path.join(__dirname, "../public/icon.png"),
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, "../dist/public/index.html");
    mainWindow.loadURL(
      url.format({
        pathname: indexPath,
        protocol: "file:",
        slashes: true,
      })
    );
  }

  // Allow Firebase / Google APIs by overriding CSP headers from file:// context
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          [
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:",
            "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com",
            "https://*.firebase.com https://*.firebasestorage.googleapis.com",
            "wss://*.firebaseio.com wss://*.googleapis.com https:",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "font-src 'self' data: https:",
            "img-src 'self' data: https:",
          ].join("; "),
        ],
      },
    });
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url: openUrl }) => {
    shell.openExternal(openUrl);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (mainWindow === null) createWindow();
});
