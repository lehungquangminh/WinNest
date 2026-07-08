import { app, BrowserWindow } from "electron";
import { fileURLToPath } from "node:url";
import { registerIpc } from "@/main/ipc.js";

let mainWindow: BrowserWindow | undefined;

async function createWindow(): Promise<void> {
  const preload = fileURLToPath(new URL("./preload.js", import.meta.url));
  mainWindow = new BrowserWindow({
    width: 1040,
    height: 720,
    minWidth: 860,
    minHeight: 560,
    title: "WinNest",
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false
    }
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
