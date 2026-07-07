import { spawn } from "node:child_process";
import type { SpawnOptionsWithoutStdio } from "node:child_process";
import { WinNestError } from "./errors.js";
import type { Logger } from "../logging/logger.js";

export type SpawnResult = {
  command: string;
  args: string[];
  exitCode: number;
  stdout: string;
  stderr: string;
};

export type RunCommandOptions = SpawnOptionsWithoutStdio & {
  logger?: Logger;
  stdin?: "inherit" | "ignore";
};

export async function runCommand(
  command: string,
  args: readonly string[],
  options: RunCommandOptions = {}
): Promise<SpawnResult> {
  if (command.trim().length === 0) {
    throw new WinNestError("INVALID_COMMAND", "Command must not be empty.");
  }

  const safeArgs = [...args];
  await options.logger?.info("command started", {
    command,
    args: safeArgs,
    cwd: options.cwd,
    env: summarizeEnv(options.env)
  });

  return await new Promise<SpawnResult>((resolve, reject) => {
    const child = spawn(command, safeArgs, {
      ...options,
      shell: false,
      stdio: [options.stdin ?? "ignore", "pipe", "pipe"]
    });

    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => {
      stdout.push(chunk);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr.push(chunk);
    });

    child.on("error", async (error) => {
      await options.logger?.error("command failed to start", { command, args: safeArgs, error });
      reject(new WinNestError("COMMAND_START_FAILED", `Failed to start command: ${command}`, error));
    });

    child.on("close", async (code) => {
      const result: SpawnResult = {
        command,
        args: safeArgs,
        exitCode: code ?? -1,
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8")
      };

      await options.logger?.info("command exited", {
        command,
        args: safeArgs,
        exitCode: result.exitCode,
        stdout: result.stdout.slice(-4000),
        stderr: result.stderr.slice(-4000)
      });

      resolve(result);
    });
  });
}

function summarizeEnv(env: NodeJS.ProcessEnv | undefined): Record<string, string> | undefined {
  if (!env) {
    return undefined;
  }

  const keys = ["WINEPREFIX", "WINEARCH", "WINEDLLOVERRIDES", "PATH"];
  const summary: Record<string, string> = {};
  for (const key of keys) {
    const value = env[key];
    if (typeof value === "string") {
      summary[key] = value;
    }
  }
  return summary;
}
