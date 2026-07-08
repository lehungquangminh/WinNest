import { runDoctor } from "@/core/doctor.js";

export async function doctorCommand(args: readonly string[]): Promise<void> {
  await runDoctor({
    verbose: args.includes("--verbose"),
    fixHints: args.includes("--fix-hints"),
    json: args.includes("--json")
  });
}
