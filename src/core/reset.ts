import { rm } from "node:fs/promises";
import { appLogPath } from "../logging/paths.js";
import { Logger } from "../logging/logger.js";
import { createPrefix } from "../wine/prefix.js";
import { appRoot } from "./paths.js";
import { acquireAppLock } from "./lock.js";
import { readApp, writeApp } from "./state.js";

export async function resetApp(appId: string): Promise<void> {
  const app = await readApp(appId);
  const lock = await acquireAppLock(appRoot(app.id), "reset");
  const logger = new Logger(appLogPath(appId, "reset.log"));
  try {
    await logger.warn("reset started", { appId, prefixPath: app.prefixPath });
    await rm(app.prefixPath, { recursive: true, force: true });
    await createPrefix(app.prefixPath, logger);
    await writeApp({
      ...app,
      status: "failed",
      updatedAt: new Date().toISOString()
    });
    await logger.warn("reset finished; app needs reinstall", { appId });
  } finally {
    await lock.release();
  }
}
