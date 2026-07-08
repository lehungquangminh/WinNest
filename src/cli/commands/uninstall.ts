import { requiredArg } from "@/cli/args.js";
import { uninstallApp } from "@/core/uninstall.js";

export async function uninstallCommand(command: string, appId: string | undefined): Promise<void> {
  const id = requiredArg(command, appId, "app-id");
  await uninstallApp(id);
  console.log(`Uninstalled ${id}`);
}
