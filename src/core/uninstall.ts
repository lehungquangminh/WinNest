import { unlink } from "node:fs/promises";
import { appLogPath } from "../logging/paths.js";
import { Logger } from "../logging/logger.js";
import { findExecutable } from "../shared/which.js";
import { runCommand } from "../shared/spawn.js";
import { getPaths } from "./paths.js";
import { readApp, removeAppFolder } from "./state.js";

export async function uninstallApp(appId: string): Promise<void> {
  const app = await readApp(appId);
  const logger = new Logger(appLogPath(appId, "uninstall.log"));
  await logger.warn("uninstall started", { appId });

  if (app.desktopEntryPath) {
    await unlink(app.desktopEntryPath).catch(() => undefined);
    await logger.info("desktop entry removed", { desktopEntryPath: app.desktopEntryPath });
  }

  const updateDesktopDatabase = await findExecutable("update-desktop-database");
  if (updateDesktopDatabase) {
    await runCommand(updateDesktopDatabase, [getPaths().applicationsDir], { logger, timeoutMs: 10000 });
  }

  await removeAppFolder(appId);
}
