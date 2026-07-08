import { requiredArg } from "@/cli/args.js";
import { installApp } from "@/core/install/flow.js";

export async function installCommand(command: string, path: string | undefined): Promise<void> {
  const app = await installApp(requiredArg(command, path, "installer-path"));
  console.log(`Installed ${app.name}`);
  console.log(`App ID: ${app.id}`);
  console.log(`Main executable: ${app.mainExe}`);
  if (app.desktopEntryPath) {
    console.log(`Launcher: ${app.desktopEntryPath}`);
  }
}
