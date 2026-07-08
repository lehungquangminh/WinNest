export type CliCommandContext = {
  command: string;
  args: readonly string[];
};

export type CliCommand = {
  name: string;
  usage: string;
  description: string;
  aliases?: string[];
  run: (context: CliCommandContext) => Promise<void>;
};

export function findCommand(commands: readonly CliCommand[], name: string): CliCommand | undefined {
  return commands.find((command) => command.name === name || command.aliases?.includes(name));
}
