import { appLogPath } from "../logging/paths.js";
import { Logger } from "../logging/logger.js";
import { createPrefix } from "../wine/prefix.js";
import { readApp } from "./state.js";

export async function repairApp(appId: string): Promise<void> {
  const app = await readApp(appId);
  const logger = new Logger(appLogPath(appId, "repair.log"));
  await logger.info("repair started", { appId, prefixPath: app.prefixPath });
  await createPrefix(app.prefixPath, logger);
  await logger.info("repair finished", { appId });
}
