import { setupWine } from "@/core/system/setup.js";

export async function setupCommand(): Promise<void> {
  await setupWine();
}
