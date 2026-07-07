import { join } from "node:path";
import { appRoot, getPaths } from "../core/paths.js";

export function globalLogPath(name = "winnest.log"): string {
  return join(getPaths().globalLogsRoot, name);
}

export function appLogPath(appId: string, name = "app.log"): string {
  return join(appRoot(appId), "logs", name);
}
