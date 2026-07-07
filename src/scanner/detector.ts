import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { Logger } from "../logging/logger.js";
import { WinNestError } from "../shared/errors.js";
import { scanExecutables, type ExecutableCandidate } from "./executables.js";
import { scanShortcutFiles } from "./shortcuts.js";
import { scanRegistryUninstallEntries } from "./registry.js";

export async function detectMainExecutable(
  prefixPath: string,
  appHint: string,
  logger: Logger,
  options: { onSelectionRequired?: () => Promise<void>; referenceTimeMs?: number } = {}
): Promise<ExecutableCandidate> {
  await scanShortcutFiles(prefixPath, logger);
  const registryHints = await scanRegistryUninstallEntries(prefixPath, logger);
  const scanOptions =
    options.referenceTimeMs === undefined
      ? { logger, registryHints }
      : { logger, referenceTimeMs: options.referenceTimeMs, registryHints };
  const candidates = await scanExecutables(prefixPath, appHint, scanOptions);
  await logger.info("scanner candidates", {
    count: candidates.length,
    candidates: candidates.slice(0, 20).map((candidate) => ({
      path: candidate.windowsPath,
      score: candidate.score,
      reasons: candidate.reasons
    }))
  });

  if (candidates.length === 0) {
    throw new WinNestError("NO_LAUNCH_CANDIDATE", "No installed Windows executable was detected.");
  }

  const [best, second] = candidates;
  if (best && best.score >= 70 && (!second || best.score - second.score >= 15)) {
    await logger.info("selected main executable", { mode: "automatic", candidate: best });
    return best;
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new WinNestError(
      "LAUNCHER_SELECTION_REQUIRED",
      "Multiple possible launch targets were found. Run install from an interactive terminal."
    );
  }

  await options.onSelectionRequired?.();
  const selected = await askUserToSelect(candidates.slice(0, 10));
  await logger.info("selected main executable", { mode: "manual", candidate: selected });
  return selected;
}

async function askUserToSelect(candidates: readonly ExecutableCandidate[]): Promise<ExecutableCandidate> {
  console.log("");
  console.log("Multiple launch targets were found:");
  candidates.forEach((candidate, index) => {
    console.log(`  ${index + 1}. ${candidate.windowsPath}`);
  });

  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question("Choose the app to launch [1]: ");
    const index = answer.trim() ? Number.parseInt(answer.trim(), 10) - 1 : 0;
    const selected = candidates[index];
    if (!selected) {
      throw new WinNestError("INVALID_SELECTION", "Invalid launch target selection.");
    }
    return selected;
  } finally {
    rl.close();
  }
}
