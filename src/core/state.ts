import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { appMetadataPath, appRoot, getPaths } from "./paths.js";
import { isManagedApp, type ManagedApp } from "./app.js";
import { WinNestError } from "../shared/errors.js";
import { assertValidAppId } from "./id.js";

export async function writeApp(app: ManagedApp): Promise<void> {
  const path = appMetadataPath(app.id);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(app, null, 2)}\n`, "utf8");
}

export async function readApp(appId: string): Promise<ManagedApp> {
  assertValidAppId(appId);
  const path = appMetadataPath(appId);
  let raw: string;

  try {
    raw = await readFile(path, "utf8");
  } catch (error) {
    throw new WinNestError("APP_NOT_FOUND", `WinNest app was not found: ${appId}`, error);
  }

  const parsed: unknown = JSON.parse(raw);
  if (!isManagedApp(parsed)) {
    throw new WinNestError("INVALID_APP_METADATA", `Invalid app metadata: ${path}`);
  }

  return parsed;
}

export async function listApps(): Promise<ManagedApp[]> {
  const paths = getPaths();
  await mkdir(paths.appsRoot, { recursive: true });
  const entries = await readdir(paths.appsRoot, { withFileTypes: true });
  const apps: ManagedApp[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    try {
      apps.push(await readApp(entry.name));
    } catch {
      // Ignore incomplete app folders; install/repair flows can recover them later.
    }
  }

  return apps.sort((left, right) => left.name.localeCompare(right.name));
}

export async function removeAppFolder(appId: string): Promise<void> {
  assertValidAppId(appId);
  await rm(appRoot(appId), { recursive: true, force: true });
}
