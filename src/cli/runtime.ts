import { WinNestError } from "../shared/errors.js";

export async function main(args: readonly string[]): Promise<void> {
  const [command] = args;
  throw new WinNestError("COMMAND_NOT_IMPLEMENTED", `Command is not implemented yet: ${command ?? "help"}`);
}
