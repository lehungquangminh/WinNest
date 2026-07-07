import { WinNestError } from "../shared/errors.js";
import { runDoctor } from "../core/doctor.js";

export async function main(args: readonly string[]): Promise<void> {
  const [command] = args;

  switch (command) {
    case "doctor":
      await runDoctor();
      return;
    default:
      throw new WinNestError("COMMAND_NOT_IMPLEMENTED", `Command is not implemented yet: ${command ?? "help"}`);
  }
}
