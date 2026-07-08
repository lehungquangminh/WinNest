import { installSystemDeps } from "@/core/system/deps.js";

export async function setupWine(): Promise<void> {
  await installSystemDeps();
}
