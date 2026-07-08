import { setupWine } from "@/core/setup-wine.js";

export async function setupCommand(): Promise<void> {
  await setupWine();
}
