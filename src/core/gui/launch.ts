import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { globalLogPath } from "@/logging/paths.js";
import { Logger } from "@/logging/logger.js";
import { WinNestError } from "@/shared/errors.js";
import { safeSpawnDetached } from "@/shared/spawn.js";
import { findExecutable } from "@/shared/which.js";

export type GuiLaunchOptions = {
  installerPath?: string;
};

export async function launchGui(options: GuiLaunchOptions = {}): Promise<void> {
  const logger = new Logger(globalLogPath("gui.log"));
  const projectRoot = fileURLToPath(new URL("../../../", import.meta.url));
  const mainPath = join(projectRoot, "dist", "main", "index.js");
  const electronPath = await resolveElectronPath(projectRoot);
  const args = [mainPath, ...(options.installerPath ? ["--install", options.installerPath] : [])];

  await assertReadable(mainPath, "Electron main process was not built. Run `npm run build:gui` first.");
  await logger.info("launching Electron GUI", { electronPath, args });

  const result = await safeSpawnDetached(electronPath, args, {
    logger,
    cwd: projectRoot,
    env: {
      ...process.env,
      ...(options.installerPath ? { WINNEST_INSTALL_PATH: options.installerPath } : {})
    },
    logFile: globalLogPath("gui-spawn.log")
  });

  if (!result.ok) {
    throw result.error;
  }
}

async function resolveElectronPath(projectRoot: string): Promise<string> {
  const localElectron = join(projectRoot, "node_modules", ".bin", "electron");
  if (await canExecute(localElectron)) {
    return localElectron;
  }

  const globalElectron = await findExecutable("electron");
  if (globalElectron) {
    return globalElectron;
  }

  throw new WinNestError("ELECTRON_NOT_FOUND", "Electron was not found. Run `npm install` first.");
}

async function assertReadable(path: string, message: string): Promise<void> {
  try {
    await access(path, constants.R_OK);
  } catch (error) {
    throw new WinNestError("GUI_NOT_BUILT", message, { path, error });
  }
}

async function canExecute(path: string): Promise<boolean> {
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}
