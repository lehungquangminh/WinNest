import { findCommand } from "@/cli/command.js";
import { COMMANDS } from "@/cli/commands/index.js";
import { printCommandHelp, printGlobalHelp, suggestCommand } from "@/cli/help.js";
import { WinNestError } from "@/shared/errors.js";

export async function main(args: readonly string[]): Promise<void> {
  const [commandName, ...commandArgs] = args;

  if (!commandName || isHelp(commandName)) {
    if (commandName === "help" && commandArgs[0]) {
      printSpecificHelp(commandArgs[0]);
      return;
    }

    printGlobalHelp(COMMANDS);
    return;
  }

  const command = findCommand(COMMANDS, commandName);
  if (!command) {
    const suggestion = suggestCommand(commandName, COMMANDS);
    const suffix = suggestion ? ` Did you mean: ${suggestion}?` : "";
    throw new WinNestError("UNKNOWN_COMMAND", `Unknown command: ${commandName}.${suffix}`);
  }

  if (commandArgs.some(isHelp)) {
    printCommandHelp(command);
    return;
  }

  await command.run({ command: commandName, args: commandArgs });
}

function printSpecificHelp(commandName: string): void {
  const command = findCommand(COMMANDS, commandName);
  if (!command) {
    const suggestion = suggestCommand(commandName, COMMANDS);
    const suffix = suggestion ? ` Did you mean: ${suggestion}?` : "";
    throw new WinNestError("UNKNOWN_COMMAND", `Unknown command: ${commandName}.${suffix}`);
  }

  printCommandHelp(command);
}

function isHelp(value: string): boolean {
  return value === "help" || value === "--help" || value === "-h";
}
