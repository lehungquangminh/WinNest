import { launchGui } from "@/core/gui/launch.js";

export async function guiCommand(args: readonly string[]): Promise<void> {
  const installIndex = args.indexOf("--install");
  const installerPath = installIndex >= 0 ? args[installIndex + 1] : undefined;
  await launchGui(installerPath ? { installerPath } : {});
}
