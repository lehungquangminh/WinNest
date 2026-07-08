import { requiredArg } from "@/cli/args.js";
import { installApp } from "@/core/install/flow.js";

export async function installCommand(command: string, args: readonly string[]): Promise<void> {
  const app = await installApp(requiredArg(command, args[0], "installer-path"), {
    desktopIcon: args.includes("--desktop-icon")
  });
  console.log(`Installed ${app.name}`);
  console.log(`App ID: ${app.id}`);
  console.log(`Main executable: ${app.mainExe}`);
  if (app.desktopEntryPath) {
    console.log(`Launcher: ${app.desktopEntryPath}`);
  }
}
