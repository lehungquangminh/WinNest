import { spawn } from "node:child_process";
import type { SpawnOptions } from "node:child_process";
import { WinNestError } from "./errors.js";
import type { Logger } from "../logging/logger.js";

export type SpawnResult = {
  command: string;
  args: string[];
  exitCode: number;
  stdout: string;
  stderr: string;
};

export type RunCommandOptions = SpawnOptions & {
  logger?: Logger;
  stdin?: "inherit" | "ignore";
  timeoutMs?: number;
};

export async function runCommand(
  command: string,
  args: readonly string[],
  options: RunCommandOptions = {}
): Promise<SpawnResult> {
  if (command.trim().length === 0) {
    throw new WinNestError("INVALID_COMMAND", "Command must not be empty.");
  }

  const { logger, stdin = "ignore", timeoutMs, ...spawnOptions } = options;
  const safeArgs = [...args];
  await logger?.info("command started", {
    command,
    args: safeArgs,
    cwd: spawnOptions.cwd,
    env: summarizeEnv(spawnOptions.env)
  });

  return await new Promise<SpawnResult>((resolve, reject) => {
    let settled = false;
    const child = spawn(command, safeArgs, {
      ...spawnOptions,
      shell: false,
      stdio: [stdin, "pipe", "pipe"]
    });

    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    const timeout = timeoutMs
      ? setTimeout(() => {
          if (settled) {
            return;
          }

          child.kill("SIGTERM");
        }, options.timeoutMs)
      : undefined;

    child.stdout.on("data", (chunk: Buffer) => {
      stdout.push(chunk);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr.push(chunk);
    });

    child.on("error", async (error) => {
      settled = true;
      if (timeout) {
        clearTimeout(timeout);
      }
      await logger?.error("command failed to start", { command, args: safeArgs, error });
      reject(new WinNestError("COMMAND_START_FAILED", `Failed to start command: ${command}`, error));
    });

    child.on("close", async (code, signal) => {
      settled = true;
      if (timeout) {
        clearTimeout(timeout);
      }

      const result: SpawnResult = {
        command,
        args: safeArgs,
        exitCode: signal === "SIGTERM" && timeoutMs ? -2 : code ?? -1,
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8")
      };

      await logger?.info("command exited", {
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
