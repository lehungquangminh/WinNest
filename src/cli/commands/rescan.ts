import { requiredArg } from "@/cli/args.js";
import { rescanApp } from "@/core/rescan.js";

export async function rescanCommand(command: string, appId: string | undefined): Promise<void> {
  await rescanApp(requiredArg(command, appId, "app-id"));
}
