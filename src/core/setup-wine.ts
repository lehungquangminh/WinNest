import { installSystemDeps } from "@/core/install-system-deps.js";

export async function setupWine(): Promise<void> {
  await installSystemDeps();
}
