import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { Logger } from "@/logging/logger.js";
import { WinNestError } from "@/shared/errors.js";
import { scanExecutables, type ExecutableCandidate } from "@/scanner/executables.js";
import { scanShortcutFiles } from "@/scanner/shortcuts.js";
import { scanRegistryUninstallEntries } from "@/scanner/registry.js";

export async function detectMainExecutable(
  prefixPath: string,
  appHint: string,
  logger: Logger,
  options: { onSelectionRequired?: () => Promise<void>; referenceTimeMs?: number; expectedExecutableNames?: string[] } = {}
): Promise<ExecutableCandidate> {
  await scanShortcutFiles(prefixPath, logger);
  const registryHints = await scanRegistryUninstallEntries(prefixPath, logger);
  const scanOptions = {
    logger,
    registryHints,
    ...(options.referenceTimeMs === undefined ? {} : { referenceTimeMs: options.referenceTimeMs }),
    ...(options.expectedExecutableNames === undefined ? {} : { expectedExecutableNames: options.expectedExecutableNames })
  };
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
  // PRIMARY: recipe's first expectedExecutable (score >= 130) auto-selects unconditionally.
  // This handles ties where multiple recipe executables have high scores.
  const PRIMARY_RECIPE_SCORE = 130;
  if (best && best.score >= PRIMARY_RECIPE_SCORE && best.reasons.includes("matches recipe primary expected executable")) {
    await logger.info("selected main executable", { mode: "automatic-primary-recipe", candidate: best });
    return best;
  }
  // SECONDARY: any very high-confidence single winner with a clear lead.
  const HIGH_CONFIDENCE_SCORE = 90;
  if (best && best.score >= HIGH_CONFIDENCE_SCORE && (!second || best.score - second.score >= 15)) {
    await logger.info("selected main executable", { mode: "automatic", candidate: best });
    return best;
  }

  await options.onSelectionRequired?.();

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new WinNestError(
      "LAUNCHER_SELECTION_REQUIRED",
      "Multiple possible launch targets were found. Run install from an interactive terminal."
    );
  }

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
