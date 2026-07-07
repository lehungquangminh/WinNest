import { appLogPath } from "../logging/paths.js";
import { Logger } from "../logging/logger.js";
import { createPrefix } from "../wine/prefix.js";
import { appRoot } from "./paths.js";
import { acquireAppLock } from "./lock.js";
import { readApp } from "./state.js";

export async function repairApp(appId: string): Promise<void> {
  const app = await readApp(appId);
  const lock = await acquireAppLock(appRoot(app.id), "repair");
  const logger = new Logger(appLogPath(appId, "repair.log"));
  try {
    await logger.info("repair started", { appId, prefixPath: app.prefixPath });
    await createPrefix(app.prefixPath, logger);
    await logger.info("repair finished", { appId });
  } finally {
    await lock.release();
  }
}
