import { rm } from "node:fs/promises";
import { appLogPath } from "../logging/paths.js";
import { Logger } from "../logging/logger.js";
import { createPrefix } from "../wine/prefix.js";
import { readApp, writeApp } from "./state.js";

export async function resetApp(appId: string): Promise<void> {
  const app = await readApp(appId);
  const logger = new Logger(appLogPath(appId, "reset.log"));
  await logger.warn("reset started", { appId, prefixPath: app.prefixPath });
  await rm(app.prefixPath, { recursive: true, force: true });
  await createPrefix(app.prefixPath, logger);
  await writeApp({
    ...app,
    status: "failed",
    updatedAt: new Date().toISOString()
  });
  await logger.warn("reset finished; app needs reinstall", { appId });
}
