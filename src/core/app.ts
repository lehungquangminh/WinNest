export type AppStatus = "installing" | "installed" | "failed";

export type ManagedApp = {
  schemaVersion: 1;
  id: string;
  name: string;
  status: AppStatus;
  runner: "system-wine";
  runnerVersion: string;
  arch: "win64";
  prefixPath: string;
  mainExe: string;
  createdFrom: string;
  createdAt: string;
  updatedAt: string;
  deps: string[];
  launchArgs?: string[];
  desktopEntryPath: string | undefined;
};

export function isManagedApp(value: unknown): value is ManagedApp {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    record["schemaVersion"] === 1 &&
    typeof record["id"] === "string" &&
    typeof record["name"] === "string" &&
    isAppStatus(record["status"]) &&
    record["runner"] === "system-wine" &&
    typeof record["runnerVersion"] === "string" &&
    record["arch"] === "win64" &&
    typeof record["prefixPath"] === "string" &&
    typeof record["mainExe"] === "string" &&
    typeof record["createdFrom"] === "string" &&
    typeof record["createdAt"] === "string" &&
    typeof record["updatedAt"] === "string" &&
    Array.isArray(record["deps"]) &&
    record["deps"].every((dep) => typeof dep === "string") &&
    (record["launchArgs"] === undefined ||
      (Array.isArray(record["launchArgs"]) && record["launchArgs"].every((arg) => typeof arg === "string"))) &&
    (typeof record["desktopEntryPath"] === "string" || record["desktopEntryPath"] === undefined)
  );
}

function isAppStatus(value: unknown): value is AppStatus {
  return value === "installing" || value === "installed" || value === "failed";
}
