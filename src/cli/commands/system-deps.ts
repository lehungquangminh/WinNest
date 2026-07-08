import { installSystemDeps } from "@/core/system/deps.js";

export async function systemDepsCommand(): Promise<void> {
  await installSystemDeps();
}
