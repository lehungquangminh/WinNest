import { requiredArg } from "@/cli/args.js";
import { repairApp } from "@/core/repair.js";

export async function repairCommand(command: string, appId: string | undefined): Promise<void> {
  await repairApp(requiredArg(command, appId, "app-id"));
}
