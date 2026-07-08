import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { appLogPath } from "@/logging/paths.js";
import { Logger } from "@/logging/logger.js";
import { createDesktopEntry } from "@/desktop/entry.js";
import { scanExecutables, type ExecutableCandidate } from "@/scanner/executables.js";
import { scanRegistryUninstallEntries } from "@/scanner/registry.js";
import { scanShortcutFiles } from "@/scanner/shortcuts.js";
import { WinNestError } from "@/shared/errors.js";
import { appRoot } from "@/core/paths.js";
import { acquireAppLock } from "@/core/lock.js";
import { readApp, writeApp } from "@/core/state.js";
import { findRecipeForApp } from "@/recipes/loader.js";

export async function rescanApp(appId: string): Promise<void> {
  const app = await readApp(appId);
  const lock = await acquireAppLock(appRoot(app.id), "rescan");
  const logger = new Logger(appLogPath(app.id, "rescan.log"));

  try {
    await logger.info("rescan started", { appId: app.id, prefixPath: app.prefixPath });
    const recipe = await findRecipeForApp(app.id, app.name, app.createdFrom);
    await scanShortcutFiles(app.prefixPath, logger);
    const registryHints = await scanRegistryUninstallEntries(app.prefixPath, logger);
    const candidates = await scanExecutables(app.prefixPath, app.name, {
      logger,
      registryHints,
      ...(recipe ? { expectedExecutableNames: recipe.expectedExecutables } : {})
    });
    if (candidates.length === 0) {
      throw new WinNestError("NO_LAUNCH_CANDIDATE", "No installed Windows executable was detected.");
    }

    printCandidates(candidates.slice(0, 10));
    const selected = await selectCandidate(candidates);
    const updated = {
      ...app,
      mainExe: selected.windowsPath,
      updatedAt: new Date().toISOString()
    };
    const desktopEntryPath = await createDesktopEntry(updated, logger, recipe ? { categories: recipe.categories } : {});
    await writeApp({ ...updated, desktopEntryPath });
    await logger.info("rescan finished", { appId: app.id, selected, desktopEntryPath });

    console.log(`Updated ${app.id}`);
    console.log(`Main executable: ${selected.windowsPath}`);
    console.log(`Launcher: ${desktopEntryPath}`);
  } finally {
    await lock.release();
  }
}

function printCandidates(candidates: readonly ExecutableCandidate[]): void {
  console.log("");
  console.log("Launch candidates:");
  candidates.forEach((candidate, index) => {
    console.log(`  ${index + 1}. ${candidate.windowsPath}`);
    console.log(`     score: ${candidate.score}`);
    console.log(`     reasons: ${candidate.reasons.join(", ")}`);
  });
}

async function selectCandidate(candidates: readonly ExecutableCandidate[]): Promise<ExecutableCandidate> {
  const [best, second] = candidates;
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    if (best && best.score >= 70 && (!second || best.score - second.score >= 15)) {
      return best;
    }

    throw new WinNestError(
      "LAUNCHER_SELECTION_REQUIRED",
      "Multiple possible launch targets were found. Run rescan from an interactive terminal."
    );
  }

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
