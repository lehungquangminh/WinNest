import type { CliCommand } from "@/cli/command.js";

export function printGlobalHelp(commands: readonly CliCommand[]): void {
  console.log("WinNest");
  console.log("");
  console.log("Usage:");
  console.log("  winnest <command> [args]");
  console.log("");
  console.log("Commands:");

  const width = Math.max(...commands.map((command) => command.usage.length));
  for (const command of commands) {
    console.log(`  ${command.usage.padEnd(width)}  ${command.description}`);
  }
}

export function printCommandHelp(command: CliCommand): void {
  console.log(`Usage: winnest ${command.usage}`);
  console.log("");
  console.log(command.description);
  if (command.aliases && command.aliases.length > 0) {
    console.log("");
    console.log(`Aliases: ${command.aliases.join(", ")}`);
  }
}

export function suggestCommand(input: string, commands: readonly CliCommand[]): string | undefined {
  let best: { name: string; distance: number } | undefined;
  for (const command of commands) {
    for (const name of [command.name, ...(command.aliases ?? [])]) {
      const distance = levenshtein(input, name);
      if (!best || distance < best.distance) {
        best = { name: command.name, distance };
      }
    }
  }

  if (!best || best.distance > Math.max(2, Math.floor(input.length / 3))) {
    return undefined;
  }

  return best.name;
}

function levenshtein(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    const current = [leftIndex + 1];
    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      const replaceCost = left[leftIndex] === right[rightIndex] ? 0 : 1;
      const insert = current[rightIndex] ?? Number.POSITIVE_INFINITY;
      const remove = previous[rightIndex + 1] ?? Number.POSITIVE_INFINITY;
      const replace = previous[rightIndex] ?? Number.POSITIVE_INFINITY;
      current[rightIndex + 1] = Math.min(
        insert + 1,
        remove + 1,
        replace + replaceCost
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length] ?? Number.POSITIVE_INFINITY;
}
