import { globalLogPath } from "@/logging/paths.js";
import { Logger } from "@/logging/logger.js";
import { WinNestError } from "@/shared/errors.js";
import { err, ok, type Result } from "@/shared/result.js";
import { safeSpawn } from "@/shared/spawn.js";
import { buildWineEnv } from "@/wine/env.js";
import { detectSystemWine } from "@/wine/runner.js";

export async function stopPrefix(prefixPath: string): Promise<Result<void>> {
  return await runWineserver(prefixPath, ["-w"], "WINESERVER_STOP_FAILED");
}

export async function killPrefix(prefixPath: string): Promise<Result<void>> {
  return await runWineserver(prefixPath, ["-k"], "WINESERVER_KILL_FAILED");
}

async function runWineserver(
  prefixPath: string,
  args: string[],
  errorCode: "WINESERVER_STOP_FAILED" | "WINESERVER_KILL_FAILED"
): Promise<Result<void>> {
  const runner = await detectSystemWine();
  if (!runner.wineserverPath) {
    return err(new WinNestError("WINESERVER_NOT_FOUND", "wineserver was not found on this system."));
  }

  const logger = new Logger(globalLogPath("wineserver.log"));
  const result = await safeSpawn(runner.wineserverPath, args, {
    logger,
    env: buildWineEnv(prefixPath),
    timeoutMs: 30000
  });

  if (!result.ok) {
    return err(result.error);
  }

  if (result.value.exitCode !== 0) {
    return err(
      new WinNestError(errorCode, "wineserver exited with an error.", {
        prefixPath,
        args,
        exitCode: result.value.exitCode,
        stderr: result.value.stderr
      })
    );
  }

  return ok(undefined);
}
