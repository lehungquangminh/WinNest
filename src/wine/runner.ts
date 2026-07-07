import { findExecutable } from "../shared/which.js";
import { runCommand } from "../shared/spawn.js";

export type WineRunner = {
  id: "system-wine";
  winePath: string | undefined;
  winebootPath: string | undefined;
  version: string | undefined;
};

export async function detectSystemWine(): Promise<WineRunner> {
  const winePath = await findExecutable("wine");
  const winebootPath = await findExecutable("wineboot");
  const version = winePath ? await getWineVersion(winePath) : undefined;

  return {
    id: "system-wine",
    winePath,
    winebootPath,
    version
  };
}

async function getWineVersion(winePath: string): Promise<string | undefined> {
  const result = await runCommand(winePath, ["--version"], { timeoutMs: 5000 });
  if (result.exitCode !== 0) {
    return undefined;
  }

  const version = result.stdout.trim() || result.stderr.trim();
  return version.length > 0 ? version : undefined;
}
