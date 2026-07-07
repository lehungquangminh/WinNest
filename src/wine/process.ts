import { Logger } from "@/logging/logger.js";
import { WinNestError } from "@/shared/errors.js";
import { runCommand } from "@/shared/spawn.js";
import { buildWineEnv } from "@/wine/env.js";
import { detectSystemWine } from "@/wine/runner.js";

export async function runInstaller(
  prefixPath: string,
  installerPath: string,
  installerKind: "exe" | "msi",
  logger: Logger
): Promise<void> {
  const runner = await detectSystemWine();
  if (!runner.winePath) {
    throw new WinNestError("WINE_NOT_FOUND", "Wine was not found on this system.");
  }

  const args = installerKind === "msi" ? ["msiexec", "/i", installerPath] : [installerPath];
  const result = await runCommand(runner.winePath, args, {
    logger,
    env: buildWineEnv(prefixPath),
    stdin: "ignore"
  });

  if (result.exitCode !== 0) {
    throw new WinNestError("INSTALLER_FAILED", "Windows installer exited with an error.", {
      installerPath,
      exitCode: result.exitCode,
      stderr: result.stderr
    });
  }
}

export async function runWindowsExe(prefixPath: string, windowsExe: string, logger: Logger): Promise<void> {
  const runner = await detectSystemWine();
  if (!runner.winePath) {
    throw new WinNestError("WINE_NOT_FOUND", "Wine was not found on this system.");
  }

  const result = await runCommand(runner.winePath, [windowsExe], {
    logger,
    env: buildWineEnv(prefixPath),
    stdin: "ignore"
  });

  if (result.exitCode !== 0) {
    throw new WinNestError("APP_RUN_FAILED", "Windows app exited with an error.", {
      windowsExe,
      exitCode: result.exitCode,
      stderr: result.stderr
    });
  }
}
