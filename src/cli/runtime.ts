import { WinNestError } from "@/shared/errors.js";
import { runDoctor } from "@/core/doctor.js";
import { installApp } from "@/core/install.js";
import { printAppInfo } from "@/core/info.js";
import { runApp } from "@/core/run.js";
import { repairApp } from "@/core/repair.js";
import { resetApp } from "@/core/reset.js";
import { rescanApp } from "@/core/rescan.js";
import { setupWine } from "@/core/setup-wine.js";
import { listApps } from "@/core/state.js";
import { uninstallApp } from "@/core/uninstall.js";
import { createMimeHandler } from "@/desktop/mime.js";
import { Logger } from "@/logging/logger.js";
import { globalLogPath } from "@/logging/paths.js";

export async function main(args: readonly string[]): Promise<void> {
  const [command, firstArg] = args;

  switch (command) {
    case "doctor":
      await runDoctor({
        verbose: args.includes("--verbose"),
        fixHints: args.includes("--fix-hints"),
        json: args.includes("--json")
      });
      return;
    case "install":
      await installCommand(firstArg);
      return;
    case "open":
      await installCommand(firstArg);
      return;
    case "run":
      await runApp(requiredArg(command, firstArg, "app-id"));
      return;
    case "list":
      await listCommand();
      return;
    case "info":
      await infoCommand(firstArg);
      return;
    case "repair":
      await repairApp(requiredArg(command, firstArg, "app-id"));
      console.log(`Repaired ${firstArg}`);
      return;
    case "reset":
      await resetApp(requiredArg(command, firstArg, "app-id"));
      console.log(`Reset ${firstArg}. Reinstall is required before running it again.`);
      return;
    case "rescan":
      await rescanApp(requiredArg(command, firstArg, "app-id"));
      return;
    case "uninstall":
      await uninstallApp(requiredArg(command, firstArg, "app-id"));
      console.log(`Uninstalled ${firstArg}`);
      return;
    case "register-mime":
      await registerMimeCommand();
      return;
    case "setup-wine":
      await setupWine();
      return;
    default:
      throw new WinNestError("COMMAND_NOT_IMPLEMENTED", `Command is not implemented yet: ${command ?? "help"}`);
  }
}

async function installCommand(path: string | undefined): Promise<void> {
  const app = await installApp(requiredArg("install", path, "installer-path"));
  console.log(`Installed ${app.name}`);
  console.log(`App ID: ${app.id}`);
  console.log(`Main executable: ${app.mainExe}`);
  if (app.desktopEntryPath) {
    console.log(`Launcher: ${app.desktopEntryPath}`);
  }
}

async function listCommand(): Promise<void> {
  const apps = await listApps();
  if (apps.length === 0) {
    console.log("No Windows apps installed yet.");
    return;
  }

  for (const app of apps) {
    console.log(`${app.id}\t${app.status}\t${app.name}`);
  }
}

async function infoCommand(appId: string | undefined): Promise<void> {
  await printAppInfo(requiredArg("info", appId, "app-id"));
}

function requiredArg(command: string, value: string | undefined, name: string): string {
  if (!value) {
    throw new WinNestError("MISSING_ARGUMENT", `Usage: winnest ${command} <${name}>`);
  }
  return value;
}

async function registerMimeCommand(): Promise<void> {
  const logger = new Logger(globalLogPath("mime.log"));
  const path = await createMimeHandler(logger);
  console.log(`MIME handler registered: ${path}`);
}
