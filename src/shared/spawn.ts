import { spawn } from "node:child_process";
import type { SpawnOptions as NodeSpawnOptions } from "node:child_process";
import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { WinNestError } from "@/shared/errors.js";
import { err, ok, type Result } from "@/shared/result.js";
import type { Logger } from "@/logging/logger.js";

export type SpawnResult = {
  command: string;
  args: string[];
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  aborted: boolean;
};

export type SafeSpawnOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  signal?: AbortSignal;
  logFile?: string;
  logger?: Logger;
  stdin?: "inherit" | "ignore";
};

export type RunCommandOptions = SafeSpawnOptions & Pick<NodeSpawnOptions, "detached" | "uid" | "gid">;

export async function runCommand(
  command: string,
  args: readonly string[],
  options: RunCommandOptions = {}
): Promise<SpawnResult> {
  const result = await safeSpawn(command, [...args], options);
  if (!result.ok) {
    throw result.error;
  }

  return result.value;
}

export async function safeSpawn(
  command: string,
  args: string[],
  options: RunCommandOptions = {}
): Promise<Result<SpawnResult>> {
  if (command.trim().length === 0) {
    return err(new WinNestError("INVALID_COMMAND", "Command must not be empty."));
  }

  const { logger, stdin = "ignore", timeoutMs, logFile, signal, ...spawnOptions } = options;
  const safeArgs = [...args];
  await logger?.info("command started", {
    command,
    args: safeArgs,
    cwd: spawnOptions.cwd,
    env: summarizeEnv(spawnOptions.env)
  });
  await writeProcessLog(logFile, "command started", { command, args: safeArgs });

  return await new Promise<Result<SpawnResult>>((resolve) => {
    let settled = false;
    let timedOut = false;
    let aborted = false;
    const child = spawn(command, safeArgs, {
      ...spawnOptions,
      signal,
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

          timedOut = true;
          child.kill("SIGTERM");
        }, timeoutMs)
      : undefined;

    signal?.addEventListener(
      "abort",
      () => {
        if (settled) {
          return;
        }

        aborted = true;
        child.kill("SIGTERM");
      },
      { once: true }
    );

    child.stdout.on("data", (chunk: Buffer) => {
      stdout.push(chunk);
      void writeProcessLog(logFile, "stdout", { text: chunk.toString("utf8") });
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr.push(chunk);
      void writeProcessLog(logFile, "stderr", { text: chunk.toString("utf8") });
    });

    child.on("error", async (error) => {
      settled = true;
      if (timeout) {
        clearTimeout(timeout);
      }
      await logger?.error("command failed to start", { command, args: safeArgs, error });
      await writeProcessLog(logFile, "command failed to start", {
        command,
        args: safeArgs,
        error: error.message
      });
      resolve(err(new WinNestError("COMMAND_START_FAILED", `Failed to start command: ${command}`, error)));
    });

    child.on("close", async (code, signal) => {
      settled = true;
      if (timeout) {
        clearTimeout(timeout);
      }

      const result: SpawnResult = {
        command,
        args: safeArgs,
        exitCode: timedOut ? -2 : aborted ? -3 : code ?? -1,
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
        timedOut,
        aborted
      };

      await logger?.info("command exited", {
        command,
        args: safeArgs,
        exitCode: result.exitCode,
        signal,
        timedOut,
        aborted,
        stdout: result.stdout.slice(-4000),
        stderr: result.stderr.slice(-4000)
      });

      await writeProcessLog(logFile, "command exited", {
        command,
        args: safeArgs,
        exitCode: result.exitCode,
        signal,
        timedOut,
        aborted
      });

      resolve(ok(result));
    });
  });
}

async function writeProcessLog(logFile: string | undefined, event: string, details: unknown): Promise<void> {
  if (!logFile) {
    return;
  }

  await mkdir(dirname(logFile), { recursive: true });
  await appendFile(
    logFile,
    `${JSON.stringify({
      time: new Date().toISOString(),
      event,
      details
    })}\n`,
    "utf8"
  );
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
