import { ipcMain, shell } from "electron";
import { appRoot } from "@/core/paths.js";
import { createDoctorReport } from "@/core/doctor.js";
import { installApp } from "@/core/install/flow.js";
import { repairApp } from "@/core/repair.js";
import { rescanApp } from "@/core/rescan.js";
import { resetApp } from "@/core/reset.js";
import { runApp } from "@/core/run.js";
import { listApps, readApp } from "@/core/state.js";
import { uninstallApp } from "@/core/uninstall.js";
import { createDesktopIcon, removeDesktopIcon } from "@/desktop/icon.js";
import { Logger } from "@/logging/logger.js";
import { appLogPath } from "@/logging/paths.js";
import { WinNestError } from "@/shared/errors.js";

export type IpcAction =
  | "doctor"
  | "listApps"
  | "getAppInfo"
  | "installApp"
  | "runApp"
  | "rescanApp"
  | "repairApp"
  | "resetApp"
  | "uninstallApp"
  | "createDesktopIcon"
  | "removeDesktopIcon"
  | "openLogs"
  | "showAppFolder";

export function registerIpc(): void {
  ipcMain.handle("winnest:invoke", async (_event, action: IpcAction, payload: unknown) => {
    switch (action) {
      case "doctor":
        return await createDoctorReport();
      case "listApps":
        return await listApps();
      case "getAppInfo":
        return await readApp(readAppId(payload));
      case "installApp":
        return await installApp(readPath(payload), { desktopIcon: readDesktopIcon(payload) });
      case "runApp":
        await runApp(readAppId(payload));
        return undefined;
      case "rescanApp":
        await rescanApp(readAppId(payload));
        return undefined;
      case "repairApp":
        await repairApp(readAppId(payload));
        return undefined;
      case "resetApp":
        await resetApp(readAppId(payload));
        return undefined;
      case "uninstallApp":
        await uninstallApp(readAppId(payload));
        return undefined;
      case "createDesktopIcon":
        return await createIcon(readAppId(payload));
      case "removeDesktopIcon":
        return await removeIcon(readAppId(payload));
      case "openLogs":
        return await shell.openPath(`${appRoot(readAppId(payload))}/logs`);
      case "showAppFolder":
        return await shell.openPath(appRoot(readAppId(payload)));
      default:
        throw new WinNestError("UNKNOWN_IPC_ACTION", `Unknown IPC action: ${String(action)}`);
    }
  });
}

async function createIcon(appId: string): Promise<string> {
  const app = await readApp(appId);
  return await createDesktopIcon(app, new Logger(appLogPath(app.id, "desktop-icon.log")));
}

async function removeIcon(appId: string): Promise<string> {
  const app = await readApp(appId);
  return await removeDesktopIcon(app, new Logger(appLogPath(app.id, "desktop-icon.log")));
}

function readAppId(payload: unknown): string {
  if (typeof payload === "string" && payload.length > 0) {
    return payload;
  }

  if (payload && typeof payload === "object" && typeof (payload as Record<string, unknown>)["appId"] === "string") {
    const appId = (payload as Record<string, unknown>)["appId"];
    if (typeof appId === "string") {
      return appId;
    }
  }

  throw new WinNestError("INVALID_IPC_PAYLOAD", "IPC payload must include an app ID.");
}

function readPath(payload: unknown): string {
  if (typeof payload === "string" && payload.length > 0) {
    return payload;
  }

  if (payload && typeof payload === "object" && typeof (payload as Record<string, unknown>)["path"] === "string") {
    const path = (payload as Record<string, unknown>)["path"];
    if (typeof path === "string") {
      return path;
    }
  }

  throw new WinNestError("INVALID_IPC_PAYLOAD", "IPC payload must include a path.");
}

function readDesktopIcon(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  return (payload as Record<string, unknown>)["desktopIcon"] === true;
}
