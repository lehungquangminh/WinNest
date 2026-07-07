import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { Logger } from "../logging/logger.js";
import { WinNestError } from "../shared/errors.js";
import { scanExecutables, type ExecutableCandidate } from "./executables.js";

export async function detectMainExecutable(
  prefixPath: string,
  appHint: string,
  logger: Logger
): Promise<ExecutableCandidate> {
  const candidates = await scanExecutables(prefixPath, appHint);
  await logger.info("scanner candidates", { count: candidates.length, candidates: candidates.slice(0, 20) });

  if (candidates.length === 0) {
    throw new WinNestError("NO_LAUNCH_CANDIDATE", "No installed Windows executable was detected.");
  }

  const [best, second] = candidates;
  if (best && (!second || best.score - second.score >= 20)) {
    await logger.info("selected main executable", best);
    return best;
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new WinNestError(
      "LAUNCHER_SELECTION_REQUIRED",
      "Multiple possible launch targets were found. Run install from an interactive terminal."
    );
  }

  const selected = await askUserToSelect(candidates.slice(0, 10));
  await logger.info("selected main executable", selected);
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
