import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { appLogPath } from "@/logging/paths.js";
import { Logger } from "@/logging/logger.js";
import { WinNestError } from "@/shared/errors.js";
import { runWindowsExe } from "@/wine/process.js";
import { windowsPathToLinux } from "@/wine/path.js";
import { appRoot } from "@/core/paths.js";
import { acquireAppLock } from "@/core/lock.js";
import { readApp } from "@/core/state.js";

export async function runApp(appId: string): Promise<void> {
  const app = await readApp(appId);
  if (app.status !== "installed") {
    throw new WinNestError("APP_NOT_INSTALLED", `App is not installed: ${appId}`, { status: app.status });
  }

  const lock = await acquireAppLock(appRoot(app.id), "run");
  const logger = new Logger(appLogPath(appId, "run.log"));
  try {
    await logger.info("run started", { appId, mainExe: app.mainExe, prefixPath: app.prefixPath });
    await validateMainExe(app.prefixPath, app.mainExe);
    await runWindowsExe(app.prefixPath, app.mainExe, logger);
    await logger.info("run finished", { appId });
  } finally {
    await lock.release();
  }
}

async function validateMainExe(prefixPath: string, mainExe: string): Promise<void> {
  const linuxPath = windowsPathToLinux(prefixPath, mainExe);

  try {
    await access(linuxPath, constants.R_OK);
  } catch (error) {
    throw new WinNestError(
      "MAIN_EXE_MISSING",
      "The configured Windows app executable is missing. Try running 'winnest repair <app-id>' or reinstalling the app.",
      { mainExe, linuxPath, error }
    );
  }
}
