import { app, BrowserWindow, Menu, nativeImage } from "electron";
import { fileURLToPath } from "node:url";
import { registerIpc } from "@/main/ipc.js";

let pendingInstallPath: string | undefined = readInstallPath(process.argv);
let pendingAppId: string | undefined = readArg(process.argv, "--app-id");
let pendingPage: string | undefined = readArg(process.argv, "--page");

const gotSingleInstanceLock = app.requestSingleInstanceLock(
  pendingInstallPath || pendingAppId
    ? { installPath: pendingInstallPath, appId: pendingAppId, page: pendingPage }
    : undefined
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
  const data = additionalData && typeof additionalData === "object" ? (additionalData as Record<string, unknown>) : {};
  const installPath = typeof data["installPath"] === "string" ? data["installPath"] : readInstallPath(argv);
  const appId = typeof data["appId"] === "string" ? data["appId"] : readArg(argv, "--app-id");
  const page = typeof data["page"] === "string" ? data["page"] : readArg(argv, "--page");

  if (installPath) {
    pendingInstallPath = installPath;
  }
  if (appId) {
    pendingAppId = appId;
  }
  if (page) {
    pendingPage = page;
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

let mainWindow: BrowserWindow | undefined;

function flushPendingInstallPath(): void {
  if (!mainWindow) {
    return;
  }

  if (pendingInstallPath || pendingAppId || pendingPage) {
    mainWindow.webContents.send("winnest:handoff-state", {
      installerPath: pendingInstallPath,
      appId: pendingAppId,
      page: pendingPage
    });
    pendingInstallPath = undefined;
    pendingAppId = undefined;
    pendingPage = undefined;
  }
}

function readInstallPath(args: readonly string[]): string | undefined {
  const index = args.indexOf("--install");
  const value = index >= 0 ? args[index + 1] : undefined;
  if (value && value.length > 0) {
    return value;
  }

  const envValue = process.env["WINNEST_INSTALL_PATH"];
  return envValue && envValue.length > 0 ? envValue : undefined;
}

function readArg(args: readonly string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  const value = index >= 0 ? args[index + 1] : undefined;
  if (value && value.length > 0) {
    return value;
  }
  const envName = flag.replace(/^--/, "WINNEST_").toUpperCase().replace(/-/g, "_");
  const envValue = process.env[envName];
  return envValue && envValue.length > 0 ? envValue : undefined;
}
