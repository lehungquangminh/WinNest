import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { join, parse } from "node:path";
import { appLogPath } from "@/logging/paths.js";
import { Logger } from "@/logging/logger.js";
import { createDesktopEntry } from "@/desktop/entry.js";
import { scanExecutables, type ExecutableCandidate } from "@/scanner/executables.js";
import { scanRegistryUninstallEntries } from "@/scanner/registry.js";
import { scanShortcutFiles } from "@/scanner/shortcuts.js";
import { WinNestError } from "@/shared/errors.js";
import { appRoot } from "@/core/paths.js";
import { assertValidAppId } from "@/core/id.js";
import { acquireAppLock } from "@/core/lock.js";
import { readApp, writeApp } from "@/core/state.js";
import { createInstallTracker, readInstallState } from "@/core/install/state.js";
import { findRecipeForApp } from "@/recipes/loader.js";
import { detectSystemWine } from "@/wine/runner.js";
import { provisionPrefixFonts } from "@/wine/fonts.js";
import type { ManagedApp } from "@/core/app.js";

export async function rescanApp(appId: string): Promise<void> {
  const app = await readExistingOrRecoverableApp(appId);
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
      status: "installed" as const,
      updatedAt: new Date().toISOString()
    };
    const desktopEntryPath = await createDesktopEntry(updated, logger, recipe ? { categories: recipe.categories } : {});
    const launchArgs = recipe?.launchArgs ?? updated.launchArgs ?? [];
    const { recoveredFromInstallState, ...cleanUpdated } = updated;
    const appToWrite = {
      ...cleanUpdated,
      ...(launchArgs.length > 0 ? { launchArgs: [...launchArgs] } : {}),
      desktopEntryPath
    };
    await writeApp(appToWrite);
    if (recoveredFromInstallState) {
      const tracker = await createInstallTracker(appRoot(app.id), app.id, app.createdFrom);
      await tracker.update("done", "done");
    }
    await provisionPrefixFonts(app.prefixPath, logger);
    await logger.info("rescan finished", { appId: app.id, selected, desktopEntryPath });

    console.log(`Updated ${app.id}`);
    console.log(`Main executable: ${selected.windowsPath}`);
    console.log(`Launcher: ${desktopEntryPath}`);
  } finally {
    await lock.release();
  }
}

type RescanApp = ManagedApp & {
  recoveredFromInstallState?: boolean;
};

async function readExistingOrRecoverableApp(appId: string): Promise<RescanApp> {
  try {
    return await readApp(appId);
  } catch (error) {
    if (!(error instanceof WinNestError) || error.code !== "APP_NOT_FOUND") {
      throw error;
    }
  }

  assertValidAppId(appId);
  const root = appRoot(appId);
  const installState = await readInstallState(root);
  const recipe = await findRecipeForApp(appId, parse(installState.installerPath).name, installState.installerPath);
  const runner = await detectSystemWine();
  const now = new Date().toISOString();
  const appName = recipe?.name ?? parse(installState.installerPath).name;
  const app: RescanApp = {
    schemaVersion: 1,
    id: appId,
    name: appName,
    status: "installing",
    runner: "system-wine",
    runnerVersion: runner.version ?? "unknown",
    arch: "win64",
    prefixPath: join(root, "prefix"),
    mainExe: "",
    createdFrom: installState.installerPath,
    createdAt: installState.startedAt,
    updatedAt: now,
    deps: recipe ? [...recipe.systemDeps, ...recipe.wineDeps] : [],
    ...(recipe?.launchArgs && recipe.launchArgs.length > 0 ? { launchArgs: [...recipe.launchArgs] } : {}),
    desktopEntryPath: undefined,
    recoveredFromInstallState: true
  };

  return app;
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
