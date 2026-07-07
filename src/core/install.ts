import { constants } from "node:fs";
import { access, copyFile, mkdir } from "node:fs/promises";
import { basename, extname, join, parse, resolve } from "node:path";
import { appLogPath } from "../logging/paths.js";
import { Logger } from "../logging/logger.js";
import { WinNestError, toWinNestError } from "../shared/errors.js";
import { createDesktopEntry } from "../desktop/entry.js";
import { detectMainExecutable } from "../scanner/detector.js";
import { createPrefix } from "../wine/prefix.js";
import { runInstaller } from "../wine/process.js";
import { detectSystemWine } from "../wine/runner.js";
import { writeApp } from "./state.js";
import { createInstallTracker, type InstallStep } from "./install-state.js";
import { acquireAppLock } from "./lock.js";
import { reserveAppFolder } from "./id.js";
import type { ManagedApp } from "./app.js";

export async function installApp(installerInputPath: string): Promise<ManagedApp> {
  let state: InstallStep = "validating";
  const installerPath = resolve(installerInputPath);
  const installerKind = getInstallerKind(installerPath);
  const appName = parse(installerPath).name;
  const { appId, root } = await reserveAppFolder(appName);
  const lock = await acquireAppLock(root, "install");
  const logger = new Logger(appLogPath(appId, "install.log"));
  const tracker = await createInstallTracker(root, appId, installerPath);

  await tracker.update(state, "running");
  await validateInstaller(installerPath);
  await logger.info("app id allocated", { appId, root });
  await logger.info("install started", { state, installerPath, installerKind, appId });

  try {
    state = "creating-app-folder";
    await tracker.update(state, "running");
    await createAppFolders(root);

    state = "copying-installer";
    await tracker.update(state, "running");
    const storedInstallerPath = join(root, "installers", basename(installerPath));
    await copyFile(installerPath, storedInstallerPath);
    await logger.info("installer copied", { from: installerPath, to: storedInstallerPath });

    state = "creating-prefix";
    await tracker.update(state, "running");
    const prefixPath = join(root, "prefix");
    state = "booting-prefix";
    await tracker.update(state, "running");
    await createPrefix(prefixPath, logger);

    state = "running-installer";
    await tracker.update(state, "running");
    await runInstaller(prefixPath, storedInstallerPath, installerKind, logger);

    state = "scanning";
    await tracker.update(state, "running");
    const mainCandidate = await detectMainExecutable(prefixPath, appName, logger, {
      onSelectionRequired: async () => {
        state = "selecting-launcher";
        await tracker.update(state, "running");
      }
    });
    const runner = await detectSystemWine();
    const now = new Date().toISOString();

    state = "writing-metadata";
    await tracker.update(state, "running");
    let app: ManagedApp = {
      schemaVersion: 1,
      id: appId,
      name: appName,
      status: "installed",
      runner: "system-wine",
      runnerVersion: runner.version ?? "unknown",
      arch: "win64",
      prefixPath,
      mainExe: mainCandidate.windowsPath,
      createdFrom: installerPath,
      createdAt: now,
      updatedAt: now,
      deps: [],
      desktopEntryPath: undefined
    };
    await writeApp(app);

    state = "creating-desktop-entry";
    await tracker.update(state, "running");
    const desktopEntryPath = await createDesktopEntry(app, logger);
    app = { ...app, desktopEntryPath, updatedAt: new Date().toISOString() };
    await writeApp(app);

    state = "done";
    await tracker.update(state, "done");
    await logger.info("install finished", { state, app });
    return app;
  } catch (error) {
    const winNestError = toWinNestError(error);
    await tracker.update("failed", "failed", {
      code: winNestError.code,
      message: winNestError.message
    });
    await logger.error("install failed", { state, error });
    throw error;
  } finally {
    await lock.release();
  }
}

async function validateInstaller(path: string): Promise<string> {
  getInstallerKind(path);

  try {
    await access(path, constants.R_OK);
  } catch (error) {
    throw new WinNestError("INSTALLER_NOT_READABLE", "Installer path is not readable.", { path, error });
  }

  return path;
}

function getInstallerKind(path: string): "exe" | "msi" {
  const extension = extname(path).toLowerCase();
  if (extension === ".exe") {
    return "exe";
  }
  if (extension === ".msi") {
    return "msi";
  }
  throw new WinNestError("UNSUPPORTED_INSTALLER", "Installer must be a .exe or .msi file.", { path });
}

async function createAppFolders(root: string): Promise<void> {
  const folders = ["prefix", "installers", "icons", "logs", "shortcuts", "snapshots", "cache"];
  for (const folder of folders) {
    await mkdir(join(root, folder), { recursive: true });
  }
}
