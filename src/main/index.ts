import { app, BrowserWindow, Menu, nativeImage } from "electron";
import { fileURLToPath } from "node:url";
import { registerIpc } from "@/main/ipc.js";

let mainWindow: BrowserWindow | undefined;

async function createWindow(): Promise<void> {
  const preload = fileURLToPath(new URL("./preload.cjs", import.meta.url));
  const iconPath = fileURLToPath(new URL("../../pages/icon.png", import.meta.url));
  const icon = nativeImage.createFromPath(iconPath);
  mainWindow = new BrowserWindow({
    width: 1040,
    height: 720,
    minWidth: 860,
    minHeight: 560,
    title: "WinNest",
    icon,
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.setMenu(null);

  mainWindow.webContents.on("console-message", (event, level, message, line, sourceId) => {
    console.log(`[RENDERER CONSOLE] [Level:${level}] ${message} (Source:${sourceId}:${line})`);
  });


  const devServerUrl = process.env["WINNEST_RENDERER_URL"];
  if (devServerUrl) {
    await mainWindow.loadURL(devServerUrl);
    return;
  }

  const rendererHtml = fileURLToPath(new URL("../../dist-renderer/index.html", import.meta.url));
  await mainWindow.loadFile(rendererHtml);
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  registerIpc();
  await createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
