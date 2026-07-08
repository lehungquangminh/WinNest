import { requiredArg } from "@/cli/args.js";
import { printAppInfo } from "@/core/info.js";

export async function infoCommand(appId: string | undefined): Promise<void> {
  await printAppInfo(requiredArg("info", appId, "app-id"));
}
