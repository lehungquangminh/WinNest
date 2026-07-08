import { requiredArg } from "@/cli/args.js";
import { readApp } from "@/core/state.js";
import { createDesktopIcon, removeDesktopIcon } from "@/desktop/icon.js";
import { Logger } from "@/logging/logger.js";
import { appLogPath } from "@/logging/paths.js";

export async function createDesktopIconCommand(command: string, appId: string | undefined): Promise<void> {
  const id = requiredArg(command, appId, "app-id");
  const app = await readApp(id);
  const logger = new Logger(appLogPath(app.id, "desktop-icon.log"));
  const path = await createDesktopIcon(app, logger);
  console.log(`Desktop icon created: ${path}`);
}

export async function removeDesktopIconCommand(command: string, appId: string | undefined): Promise<void> {
  const id = requiredArg(command, appId, "app-id");
  const app = await readApp(id);
  const logger = new Logger(appLogPath(app.id, "desktop-icon.log"));
  const path = await removeDesktopIcon(app, logger);
  console.log(`Desktop icon removed: ${path}`);
}
