import { installSystemDeps } from "@/core/install-system-deps.js";

export async function systemDepsCommand(): Promise<void> {
  await installSystemDeps();
}
