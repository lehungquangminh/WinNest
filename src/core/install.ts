import { constants } from "node:fs";
import { access, copyFile, mkdir } from "node:fs/promises";
import { basename, extname, join, parse } from "node:path";
import { appLogPath } from "../logging/paths.js";
import { Logger } from "../logging/logger.js";
import { WinNestError } from "../shared/errors.js";
import { createDesktopEntry } from "../desktop/entry.js";
import { detectMainExecutable } from "../scanner/detector.js";
import { createPrefix } from "../wine/prefix.js";
import { runInstaller } from "../wine/process.js";
import { detectSystemWine } from "../wine/runner.js";
import { appRoot } from "./paths.js";
import { writeApp } from "./state.js";
import type { ManagedApp } from "./app.js";

export type InstallState =
  | "idle"
  | "validating"
  | "creating-app-folder"
  | "copying-installer"
  | "creating-prefix"
  | "booting-prefix"
  | "running-installer"
  | "scanning"
  | "selecting-launcher"
  | "writing-metadata"
  | "creating-desktop-entry"
  | "done"
  | "failed";

export async function installApp(installerInputPath: string): Promise<ManagedApp> {
  let state: InstallState = "idle";

  state = "validating";
  const installerPath = await validateInstaller(installerInputPath);
  const installerKind = getInstallerKind(installerPath);
  const appName = parse(installerPath).name;
  const appId = await allocateAppId(appName);
  const root = appRoot(appId);
  const logger = new Logger(appLogPath(appId, "install.log"));
  await logger.info("install started", { state, installerPath, installerKind, appId });

  try {
    state = "creating-app-folder";
    await createAppFolders(root);

    state = "copying-installer";
    const storedInstallerPath = join(root, "installers", basename(installerPath));
    await copyFile(installerPath, storedInstallerPath);
    await logger.info("installer copied", { from: installerPath, to: storedInstallerPath });

    state = "creating-prefix";
    const prefixPath = join(root, "prefix");
    await createPrefix(prefixPath, logger);

    state = "running-installer";
    await runInstaller(prefixPath, storedInstallerPath, installerKind, logger);

    state = "scanning";
    const mainCandidate = await detectMainExecutable(prefixPath, appName, logger);
    const runner = await detectSystemWine();
    const now = new Date().toISOString();

    state = "writing-metadata";
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
    const desktopEntryPath = await createDesktopEntry(app, logger);
    app = { ...app, desktopEntryPath, updatedAt: new Date().toISOString() };
    await writeApp(app);

    state = "done";
    await logger.info("install finished", { state, app });
    return app;
  } catch (error) {
    await logger.error("install failed", { state, error });
    throw error;
  }
}

async function validateInstaller(path: string): Promise<string> {
  const kind = getInstallerKind(path);
  if (!kind) {
    throw new WinNestError("UNSUPPORTED_INSTALLER", "Installer must be a .exe or .msi file.", { path });
  }

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

async function allocateAppId(name: string): Promise<string> {
  const base = slugify(name) || "windows-app";
  for (let index = 0; index < 100; index += 1) {
    const id = index === 0 ? base : `${base}-${index + 1}`;
    try {
      await access(appRoot(id), constants.F_OK);
    } catch {
      return id;
    }
  }

  throw new WinNestError("APP_ID_EXHAUSTED", "Could not allocate a unique app id.", { name });
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
