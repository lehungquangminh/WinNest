import { ipcMain, shell } from "electron";
import { readFile } from "node:fs/promises";
import { appRoot } from "@/core/paths.js";
import { createDoctorReport } from "@/core/doctor.js";
import { listInstallCandidates, selectInstallCandidate } from "@/core/install/candidate.js";
import { installApp } from "@/core/install/flow.js";
import { readInstallState } from "@/core/install/state.js";
import { assertValidAppId } from "@/core/id.js";
import { repairApp } from "@/core/repair.js";
import { rescanApp } from "@/core/rescan.js";
import { resetApp } from "@/core/reset.js";
import { runApp } from "@/core/run.js";
import { listApps, readApp } from "@/core/state.js";
import { uninstallApp } from "@/core/uninstall.js";
import { createDesktopIcon, removeDesktopIcon } from "@/desktop/icon.js";
import { Logger } from "@/logging/logger.js";
import { appLogPath } from "@/logging/paths.js";
import { matchRecipeForInstaller } from "@/recipes/loader.js";
import { WinNestError } from "@/shared/errors.js";

export type IpcAction =
  | "doctor"
  | "listApps"
  | "getAppInfo"
  | "startInstall"
  | "getInstallState"
  | "getLatestLog"
  | "getInstallCandidates"
  | "selectInstallCandidate"
  | "installApp"
  | "matchRecipe"
  | "runApp"
  | "rescanApp"
  | "repairApp"
  | "resetApp"
  | "uninstallApp"
  | "createDesktopIcon"
  | "removeDesktopIcon"
  | "openLogs"
  | "showAppFolder";

const runningInstalls = new Map<string, Promise<unknown>>();

export function registerIpc(): void {
  ipcMain.handle("winnest:invoke", async (_event, action: IpcAction, payload: unknown) => {
    switch (action) {
      case "doctor":
        return await createDoctorReport();
      case "listApps":
        return await listApps();
      case "getAppInfo":
        return await readApp(readAppId(payload));
      case "startInstall":
        return startInstall(payload);
      case "getInstallState":
        return await readInstallState(appRoot(readAppId(payload)));
      case "getLatestLog":
        return await readLatestInstallLog(readAppId(payload));
      case "getInstallCandidates":
        return await listInstallCandidates(readAppId(payload));
      case "selectInstallCandidate":
        return await selectInstallCandidate(readAppId(payload), readCandidatePath(payload));
      case "installApp":
        return await installApp(readPath(payload), { desktopIcon: readDesktopIcon(payload) });
      case "matchRecipe":
        return await matchRecipeForInstaller(readPath(payload));
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

function readCandidatePath(payload: unknown): string {
  if (payload && typeof payload === "object" && typeof (payload as Record<string, unknown>)["candidatePath"] === "string") {
    const candidatePath = (payload as Record<string, unknown>)["candidatePath"];
    if (typeof candidatePath === "string" && candidatePath.length > 0) {
      return candidatePath;
    }
  }

  throw new WinNestError("INVALID_IPC_PAYLOAD", "IPC payload must include a candidate path.");
}

function startInstall(payload: unknown): Promise<{ appId: string }> {
  return new Promise((resolve, reject) => {
    let resolved = false;
    const installPromise = installApp(readPath(payload), {
      desktopIcon: readDesktopIcon(payload),
      onAppIdAllocated(appId) {
        if (resolved) {
          return;
        }
        resolved = true;
        runningInstalls.set(appId, installPromise);
        resolve({ appId });
      }
    });

    installPromise
      .then((app) => {
        runningInstalls.delete(app.id);
        if (!resolved) {
          resolved = true;
          resolve({ appId: app.id });
        }
      })
      .catch((error: unknown) => {
        for (const [appId, promise] of runningInstalls.entries()) {
          if (promise === installPromise) {
            runningInstalls.delete(appId);
          }
        }
        if (!resolved) {
          resolved = true;
          reject(error);
        }
      });
  });
}

async function readLatestInstallLog(appId: string): Promise<{ path: string; lines: string[] }> {
  assertValidAppId(appId);
  const path = appLogPath(appId, "install.log");
  try {
    const raw = await readFile(path, "utf8");
    return { path, lines: raw.split(/\r?\n/).filter(Boolean).slice(-120) };
  } catch {
    return { path, lines: [] };
  }
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
