import { requiredArg } from "@/cli/args.js";
import { runApp } from "@/core/run.js";

export async function runCommand(command: string, appId: string | undefined): Promise<void> {
  await runApp(requiredArg(command, appId, "app-id"));
}
