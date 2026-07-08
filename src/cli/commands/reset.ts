import { requiredArg } from "@/cli/args.js";
import { resetApp } from "@/core/reset.js";

export async function resetCommand(command: string, appId: string | undefined): Promise<void> {
  const id = requiredArg(command, appId, "app-id");
  await resetApp(id);
  console.log(`Reset ${id}. Reinstall is required before running it again.`);
}
