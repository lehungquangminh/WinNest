import { homedir } from "node:os";
import { join } from "node:path";

export type WinNestPaths = {
  home: string;
  dataRoot: string;
  appsRoot: string;
  globalLogsRoot: string;
  applicationsDir: string;
  mimePackagesDir: string;
};

function envPath(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export function getPaths(): WinNestPaths {
  const home = homedir();
  const dataHome = envPath("XDG_DATA_HOME") ?? join(home, ".local", "share");

  return {
    home,
    dataRoot: join(dataHome, "winnest"),
    appsRoot: join(dataHome, "winnest", "apps"),
    globalLogsRoot: join(dataHome, "winnest", "logs"),
    applicationsDir: join(dataHome, "applications"),
    mimePackagesDir: join(dataHome, "mime", "packages")
  };
}

export function appRoot(appId: string): string {
  return join(getPaths().appsRoot, appId);
}

export function appMetadataPath(appId: string): string {
  return join(appRoot(appId), "app.json");
}
