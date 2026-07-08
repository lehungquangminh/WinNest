import { repairSystem } from "@/core/repair-system.js";

export async function systemRepairCommand(args: readonly string[]): Promise<void> {
  await repairSystem({ json: args.includes("--json") });
}
