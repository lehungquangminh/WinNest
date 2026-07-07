import { rm, unlink } from "node:fs/promises";
import { appLogPath } from "@/logging/paths.js";
import { Logger } from "@/logging/logger.js";
import { findExecutable } from "@/shared/which.js";
import { runCommand } from "@/shared/spawn.js";
import { stopPrefix } from "@/wine/control.js";
import { appRoot, getPaths } from "@/core/paths.js";
import { acquireAppLock } from "@/core/lock.js";
import { isSafeDesktopEntryPath, validateManagedAppPaths } from "@/core/safety.js";
import { readApp } from "@/core/state.js";

export async function uninstallApp(appId: string): Promise<void> {
  const app = await readApp(appId);
  const lock = await acquireAppLock(appRoot(app.id), "uninstall");
  const logger = new Logger(appLogPath(appId, "uninstall.log"));
  try {
    const paths = validateManagedAppPaths(app);
    await logger.warn("uninstall started", { appId, appFolder: paths.appFolder, prefixPath: paths.prefixPath });
    const stopResult = await stopPrefix(paths.prefixPath);
    if (!stopResult.ok) {
      await logger.warn("prefix stop failed before uninstall", stopResult.error);
    }

    if (app.desktopEntryPath && isSafeDesktopEntryPath(app.desktopEntryPath, app.id)) {
      await unlink(app.desktopEntryPath).catch(() => undefined);
      await logger.info("desktop entry removed", { desktopEntryPath: app.desktopEntryPath });
    } else if (app.desktopEntryPath) {
      await logger.warn("desktop entry path skipped because it is outside WinNest control", {
        desktopEntryPath: app.desktopEntryPath
      });
    }

    const updateDesktopDatabase = await findExecutable("update-desktop-database");
    if (updateDesktopDatabase) {
      await runCommand(updateDesktopDatabase, [getPaths().applicationsDir], { logger, timeoutMs: 10000 });
    }

    await logger.warn("removing app folder", { appFolder: paths.appFolder });
    await rm(paths.appFolder, { recursive: true, force: true });
  } finally {
    await lock.release();
  }
}
