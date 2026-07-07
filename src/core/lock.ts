import { open, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { WinNestError } from "../shared/errors.js";

export type AppLockCommand = "install" | "run" | "repair" | "reset" | "uninstall";

export type AppLockFile = {
  pid: number;
  command: AppLockCommand;
  createdAt: string;
};

export type AppLock = {
  appFolder: string;
  path: string;
  release: () => Promise<void>;
};

export async function acquireAppLock(appFolder: string, command: AppLockCommand): Promise<AppLock> {
  const lockPath = appLockPath(appFolder);
  const lock: AppLockFile = {
    pid: process.pid,
    command,
    createdAt: new Date().toISOString()
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const handle = await open(lockPath, "wx");
      await handle.writeFile(`${JSON.stringify(lock, null, 2)}\n`, "utf8");
      await handle.close();
      return {
        appFolder,
        path: lockPath,
        release: async () => {
          await releaseAppLock(lockPath, lock);
        }
      };
    } catch (error) {
      if (!isFileExistsError(error)) {
        throw error;
      }

      const existing = await readExistingLock(lockPath);
      if (existing && isPidAlive(existing.pid)) {
        throw new WinNestError(
          "APP_LOCKED",
          `This app is already busy with '${existing.command}' in process ${existing.pid}.`,
          { lockPath, existing }
        );
      }

      await rm(lockPath, { force: true });
    }
  }

  throw new WinNestError("APP_LOCK_FAILED", "Could not acquire app lock.", { lockPath });
}

export function appLockPath(appFolder: string): string {
  return join(appFolder, ".lock");
}

async function releaseAppLock(lockPath: string, expected: AppLockFile): Promise<void> {
  const existing = await readExistingLock(lockPath);
  if (!existing) {
    return;
  }

  if (existing.pid === expected.pid && existing.command === expected.command && existing.createdAt === expected.createdAt) {
    await rm(lockPath, { force: true });
  }
}

async function readExistingLock(lockPath: string): Promise<AppLockFile | undefined> {
  try {
    const raw = await readFile(lockPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<AppLockFile>;
    if (
      typeof parsed.pid === "number" &&
      isKnownCommand(parsed.command) &&
      typeof parsed.createdAt === "string"
    ) {
      return {
        pid: parsed.pid,
        command: parsed.command,
        createdAt: parsed.createdAt
      };
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function isPidAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (isNodeError(error) && error.code === "EPERM") {
      return true;
    }
    return false;
  }
}

function isKnownCommand(value: unknown): value is AppLockCommand {
  return value === "install" || value === "run" || value === "repair" || value === "reset" || value === "uninstall";
}

function isFileExistsError(error: unknown): boolean {
  return isNodeError(error) && error.code === "EEXIST";
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
