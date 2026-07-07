import { mkdir } from "node:fs/promises";
import { Logger } from "../logging/logger.js";
import { WinNestError } from "../shared/errors.js";
import { runCommand } from "../shared/spawn.js";
import { buildWineEnv } from "./env.js";
import { detectSystemWine } from "./runner.js";

export async function createPrefix(prefixPath: string, logger: Logger): Promise<void> {
  const runner = await detectSystemWine();
  if (!runner.winebootPath) {
    throw new WinNestError("WINEBOOT_NOT_FOUND", "wineboot was not found on this system.");
  }

  await mkdir(prefixPath, { recursive: true });
  await logger.info("creating wine prefix", { prefixPath });

  const result = await runCommand(runner.winebootPath, ["-u"], {
    logger,
    env: buildWineEnv(prefixPath),
    timeoutMs: 120000
  });

  if (result.exitCode !== 0) {
    throw new WinNestError("PREFIX_CREATE_FAILED", "Wine prefix creation failed.", {
      prefixPath,
      exitCode: result.exitCode,
      stderr: result.stderr
    });
  }
}
