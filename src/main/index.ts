import { app, BrowserWindow, Menu, nativeImage } from "electron";
import { fileURLToPath } from "node:url";
import { registerIpc } from "@/main/ipc.js";

let mainWindow: BrowserWindow | undefined;
let pendingInstallPath: string | undefined = readInstallPath(process.argv);

const gotSingleInstanceLock = app.requestSingleInstanceLock(
  pendingInstallPath ? { installPath: pendingInstallPath } : undefined
);
if (!gotSingleInstanceLock) {
  app.quit();
}

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

  mainWindow.webContents.on("did-finish-load", () => {
    flushPendingInstallPath();
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

app.on("second-instance", (_event, argv, _workingDirectory, additionalData) => {
  const installPathFromData =
    additionalData && typeof additionalData === "object"
      ? (additionalData as Record<string, unknown>)["installPath"]
      : undefined;
  const installPath = typeof installPathFromData === "string" ? installPathFromData : readInstallPath(argv);
  if (installPath) {
    pendingInstallPath = installPath;
  }

  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
    flushPendingInstallPath();
  } else {
    void createWindow();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

function flushPendingInstallPath(): void {
  if (!mainWindow || !pendingInstallPath) {
    return;
  }

  mainWindow.webContents.send("winnest:install-path", pendingInstallPath);
  pendingInstallPath = undefined;
}

function readInstallPath(args: readonly string[]): string | undefined {
  const index = args.indexOf("--install");
  const value = index >= 0 ? args[index + 1] : undefined;
  return value && value.length > 0 ? value : undefined;
}
