import { rm } from "node:fs/promises";
import { appLogPath } from "@/logging/paths.js";
import { Logger } from "@/logging/logger.js";
import { WinNestError } from "@/shared/errors.js";
import { stopPrefix } from "@/wine/control.js";
import { createPrefix } from "@/wine/prefix.js";
import { detectSystemWine } from "@/wine/runner.js";
import { appRoot } from "@/core/paths.js";
import { acquireAppLock } from "@/core/lock.js";
import { validateManagedAppPaths } from "@/core/safety.js";
import { readApp, writeApp } from "@/core/state.js";

export async function resetApp(appId: string): Promise<void> {
  const app = await readApp(appId);
  const lock = await acquireAppLock(appRoot(app.id), "reset");
  const logger = new Logger(appLogPath(appId, "reset.log"));
  try {
    const paths = validateManagedAppPaths(app);
    await logger.warn("reset started", { appId, prefixPath: paths.prefixPath });
    const stopResult = await stopPrefix(paths.prefixPath);
    if (!stopResult.ok) {
      await logger.warn("prefix stop failed before reset", stopResult.error);
    }

    const runner = await detectSystemWine();
    if (!runner.winebootPath) {
      throw new WinNestError("WINEBOOT_NOT_FOUND", "wineboot was not found on this system; reset cannot recreate the prefix.");
    }

    await logger.warn("removing prefix", { prefixPath: paths.prefixPath });
    await rm(paths.prefixPath, { recursive: true, force: true });
    await createPrefix(paths.prefixPath, logger);
    await writeApp({
      ...app,
      status: "failed",
      prefixPath: paths.prefixPath,
      updatedAt: new Date().toISOString()
    });
    await logger.warn("reset finished; app needs reinstall", { appId });
  } finally {
    await lock.release();
  }
}
