import { resolve, join, relative } from "node:path";
import type { ManagedApp } from "@/core/app.js";
import { appRoot, getPaths } from "@/core/paths.js";
import { assertValidAppId } from "@/core/id.js";
import { WinNestError } from "@/shared/errors.js";

export type ManagedAppPaths = {
  appsRoot: string;
  appFolder: string;
  prefixPath: string;
};

export function validateManagedAppPaths(app: ManagedApp): ManagedAppPaths {
  assertValidAppId(app.id);

  const appsRoot = resolve(getPaths().appsRoot);
  const appFolder = resolve(appRoot(app.id));
  const prefixPath = resolve(app.prefixPath);
  const expectedPrefixPath = resolve(join(appFolder, "prefix"));

  if (!isInside(appFolder, appsRoot)) {
    throw new WinNestError("UNSAFE_APP_FOLDER", "App folder is outside the WinNest apps directory.", {
      appId: app.id,
      appFolder,
      appsRoot
    });
  }

  if (prefixPath !== expectedPrefixPath) {
    throw new WinNestError("UNSAFE_PREFIX_PATH", "App prefix path does not match the managed app folder.", {
      appId: app.id,
      prefixPath,
      expectedPrefixPath
    });
  }

  return { appsRoot, appFolder, prefixPath };
}

export function isSafeDesktopEntryPath(path: string, appId: string): boolean {
  assertValidAppId(appId);
  const applicationsDir = resolve(getPaths().applicationsDir);
  const desktopPath = resolve(path);
  const expectedPath = resolve(join(applicationsDir, `winnest-${appId}.desktop`));

  return desktopPath === expectedPath && isInside(desktopPath, applicationsDir);
}

function isInside(child: string, parent: string): boolean {
  const rel = relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !rel.startsWith("/") && rel !== "..");
}
