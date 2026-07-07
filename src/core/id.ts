import { constants } from "node:fs";
import { access, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { getPaths } from "./paths.js";
import { WinNestError } from "../shared/errors.js";

const APP_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type ReservedAppFolder = {
  appId: string;
  root: string;
};

export function assertValidAppId(appId: string): void {
  if (!APP_ID_PATTERN.test(appId)) {
    throw new WinNestError(
      "INVALID_APP_ID",
      "App ID must use only lowercase letters, numbers, and single dashes.",
      { appId }
    );
  }
}

export async function reserveAppFolder(name: string): Promise<ReservedAppFolder> {
  const base = createAppIdBase(name);

  for (let index = 0; index < 100; index += 1) {
    const appId = index === 0 ? base : `${base}-${index + 1}`;
    const root = join(getPaths().appsRoot, appId);

    try {
      await mkdir(root, { recursive: false });
      return { appId, root };
    } catch (error) {
      if (isFileExistsError(error)) {
        continue;
      }
      throw error;
    }
  }

  throw new WinNestError("APP_ID_EXHAUSTED", "Could not allocate a unique app id.", { name });
}

export async function appFolderExists(appId: string): Promise<boolean> {
  assertValidAppId(appId);
  try {
    await access(join(getPaths().appsRoot, appId), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function createAppIdBase(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "") || "windows-app"
  );
}

function isFileExistsError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "EEXIST";
}
