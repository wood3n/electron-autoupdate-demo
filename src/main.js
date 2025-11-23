const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const log = require("electron-log");
const { autoUpdater } = require("electron-updater");

const isDev = process.env.NODE_ENV === "development";
const UPDATE_MODE = process.env.UPDATE_MODE || "prompt"; // 'prompt' | 'immediate'

log.initialize({ preload: true });
autoUpdater.logger = log;
autoUpdater.autoDownload = UPDATE_MODE === "immediate";

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      devTools: isDev,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    const allowed = /^https:\/\/github\.com\//.test(url);
    if (!allowed) return { action: "deny" };
    shell.openExternal(url);
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (e, url) => {
    if (!url.startsWith("file://")) e.preventDefault();
  });

  win.loadFile(path.join(__dirname, "renderer", "index.html"));

  if (!app.isPackaged) {
    win.webContents.openDevTools({
      mode: "bottom",
    });
  }
}

app.whenReady().then(async () => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("check-for-updates", async () => {
  try {
    log.info("Checking for updates...");
    const result = await autoUpdater.checkForUpdates();
    return { ok: true, versionInfo: result?.updateInfo || null };
  } catch (err) {
    log.error(err);
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle("download-update", async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { ok: true };
  } catch (err) {
    log.error(err);
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle("quit-and-install", () => {
  try {
    autoUpdater.quitAndInstall();
    return { ok: true };
  } catch (err) {
    log.error(err);
    return { ok: false, error: String(err) };
  }
});

autoUpdater.on("checking-for-update", () => {
  BrowserWindow.getAllWindows().forEach((w) =>
    w.webContents.send("update-message", {
      type: "checking",
    })
  );
});

autoUpdater.on("update-available", (info) => {
  BrowserWindow.getAllWindows().forEach((w) =>
    w.webContents.send("update-message", {
      type: "available",
      info,
    })
  );
  if (UPDATE_MODE === "immediate") {
    autoUpdater
      .downloadUpdate()
      .catch((err) => log.error("download error", err));
  }
});

autoUpdater.on("update-not-available", (info) => {
  BrowserWindow.getAllWindows().forEach((w) =>
    w.webContents.send("update-message", {
      type: "none",
      info,
    })
  );
});

autoUpdater.on("error", (err) => {
  BrowserWindow.getAllWindows().forEach((w) =>
    w.webContents.send("update-message", {
      type: "error",
      error: String(err),
    })
  );
});

autoUpdater.on("download-progress", (progress) => {
  BrowserWindow.getAllWindows().forEach((w) =>
    w.webContents.send("update-message", {
      type: "progress",
      progress,
    })
  );
});

autoUpdater.on("update-downloaded", (info) => {
  BrowserWindow.getAllWindows().forEach((w) =>
    w.webContents.send("update-message", {
      type: "downloaded",
      info,
    })
  );
  if (UPDATE_MODE === "immediate") {
    dialog
      .showMessageBox({
        type: "info",
        title: "Update ready",
        message: "Update downloaded. The app will now restart to install.",
      })
      .then(() => autoUpdater.quitAndInstall());
  }
});
