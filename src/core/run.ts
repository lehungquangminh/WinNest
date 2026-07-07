import { appLogPath } from "../logging/paths.js";
import { Logger } from "../logging/logger.js";
import { WinNestError } from "../shared/errors.js";
import { runWindowsExe } from "../wine/process.js";
import { appRoot } from "./paths.js";
import { acquireAppLock } from "./lock.js";
import { readApp } from "./state.js";

export async function runApp(appId: string): Promise<void> {
  const app = await readApp(appId);
  if (app.status !== "installed") {
    throw new WinNestError("APP_NOT_INSTALLED", `App is not installed: ${appId}`, { status: app.status });
  }

  const lock = await acquireAppLock(appRoot(app.id), "run");
  const logger = new Logger(appLogPath(appId, "run.log"));
  try {
    await logger.info("run started", { appId, mainExe: app.mainExe, prefixPath: app.prefixPath });
    await runWindowsExe(app.prefixPath, app.mainExe, logger);
    await logger.info("run finished", { appId });
  } finally {
    await lock.release();
  }
}
