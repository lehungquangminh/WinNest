import { constants } from "node:fs";
import { access, rm } from "node:fs/promises";
import { join } from "node:path";
import { getPaths } from "@/core/paths.js";
import type { ManagedApp } from "@/core/app.js";
import { createDesktopEntry, desktopEntryFileName } from "@/desktop/entry.js";
import type { Logger } from "@/logging/logger.js";
import { WinNestError } from "@/shared/errors.js";

export async function createDesktopIcon(app: ManagedApp, logger: Logger): Promise<string> {
  const desktopDir = getPaths().desktopDir;
  if (!(await isWritableDirectory(desktopDir))) {
    throw new WinNestError("DESKTOP_DIR_NOT_WRITABLE", "Desktop folder does not exist or is not writable.", {
      desktopDir
    });
  }

  const iconPath = join(desktopDir, desktopEntryFileName(app));
  const createdPath = await createDesktopEntry(app, logger, { targetPath: iconPath });
  await logger.info("desktop icon created", { appId: app.id, iconPath: createdPath });
  return createdPath;
}

export async function removeDesktopIcon(app: ManagedApp, logger: Logger): Promise<string> {
  const iconPath = join(getPaths().desktopDir, desktopEntryFileName(app));
  await rm(iconPath, { force: true });
  await logger.info("desktop icon removed", { appId: app.id, iconPath });
  return iconPath;
}

async function isWritableDirectory(path: string): Promise<boolean> {
  try {
    await access(path, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}
