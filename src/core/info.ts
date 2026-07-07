import { constants } from "node:fs";
import { access, readdir, readFile, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import { appRoot } from "./paths.js";
import { readApp } from "./state.js";
import { installStatePath, type InstallStateFile } from "./install-state.js";
import { windowsPathToLinux } from "../wine/path.js";

export async function printAppInfo(appId: string): Promise<void> {
  const app = await readApp(appId);
  const folder = appRoot(app.id);
  const installState = await readLatestInstallState(folder);
  const latestLogPath = await findLatestLogPath(folder);
  const mainExeResolution = await resolveMainExe(app.prefixPath, app.mainExe);

  console.log(`App ID: ${app.id}`);
  console.log(`Name: ${app.name}`);
  console.log(`Status: ${app.status}`);
  console.log(`Runner: ${app.runner}`);
  console.log(`Runner version: ${app.runnerVersion}`);
  console.log(`Arch: ${app.arch}`);
  console.log(`Prefix path: ${app.prefixPath}`);
  console.log(`Main executable: ${app.mainExe}`);
  console.log(`Main executable exists: ${mainExeResolution.exists ? "yes" : "no"}`);
  console.log(`Main executable path: ${mainExeResolution.linuxPath ?? "unresolved"}`);
  console.log(`Desktop launcher: ${app.desktopEntryPath ?? "none"}`);
  console.log(`Created from: ${app.createdFrom}`);
  console.log(`Created at: ${app.createdAt}`);
  console.log(`Updated at: ${app.updatedAt}`);
  console.log(`Latest log: ${latestLogPath ?? "none"}`);
  console.log("Latest install state:");
  if (installState) {
    console.log(`  step: ${installState.currentStep}`);
    console.log(`  status: ${installState.status}`);
    console.log(`  updatedAt: ${installState.updatedAt}`);
    console.log(`  error: ${installState.error ? `${installState.error.code}: ${installState.error.message}` : "none"}`);
  } else {
    console.log("  none");
  }
}

async function readLatestInstallState(appFolder: string): Promise<InstallStateFile | undefined> {
  try {
    const raw = await readFile(installStatePath(appFolder), "utf8");
    const parsed = JSON.parse(raw) as InstallStateFile;
    if (parsed.schemaVersion === 1) {
      return parsed;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

async function findLatestLogPath(appFolder: string): Promise<string | undefined> {
  const logsDir = join(appFolder, "logs");
  let entries;
  try {
    entries = await readdir(logsDir, { withFileTypes: true });
  } catch {
    return undefined;
  }

  let latest: { path: string; mtimeMs: number } | undefined;
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const path = join(logsDir, entry.name);
    const info = await stat(path);
    if (!latest || info.mtimeMs > latest.mtimeMs) {
      latest = { path, mtimeMs: info.mtimeMs };
    }
  }

  return latest ? `${latest.path} (${basename(latest.path)})` : undefined;
}

async function resolveMainExe(
  prefixPath: string,
  mainExe: string
): Promise<{ exists: boolean; linuxPath: string | undefined }> {
  try {
    const linuxPath = windowsPathToLinux(prefixPath, mainExe);
    await access(linuxPath, constants.R_OK);
    return { exists: true, linuxPath };
  } catch {
    return { exists: false, linuxPath: undefined };
  }
}
