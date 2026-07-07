import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type InstallStep =
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

export type InstallStatus = "running" | "done" | "failed";

export type InstallStateError = {
  code: string;
  message: string;
};

export type InstallStateFile = {
  schemaVersion: 1;
  appId: string;
  installerPath: string;
  currentStep: InstallStep;
  status: InstallStatus;
  startedAt: string;
  updatedAt: string;
  error: InstallStateError | null;
};

export type InstallStateTracker = {
  update: (step: InstallStep, status: InstallStatus, error?: InstallStateError) => Promise<void>;
};

export async function createInstallTracker(
  appFolder: string,
  appId: string,
  installerPath: string
): Promise<InstallStateTracker> {
  const filePath = installStatePath(appFolder);
  const startedAt = await readStartedAt(filePath);

  return {
    async update(step, status, error = undefined) {
      const now = new Date().toISOString();
      const state: InstallStateFile = {
        schemaVersion: 1,
        appId,
        installerPath,
        currentStep: step,
        status,
        startedAt,
        updatedAt: now,
        error: error ?? null
      };
      await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    }
  };
}

export function installStatePath(appFolder: string): string {
  return join(appFolder, "install-state.json");
}

async function readStartedAt(filePath: string): Promise<string> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<InstallStateFile>;
    if (typeof parsed.startedAt === "string") {
      return parsed.startedAt;
    }
  } catch {
    // A new install or an unreadable old state starts a fresh timestamp.
  }

  return new Date().toISOString();
}
