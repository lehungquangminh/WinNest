import { repairSystem } from "@/core/system/repair.js";

export async function systemRepairCommand(args: readonly string[]): Promise<void> {
  await repairSystem({ json: args.includes("--json") });
}
