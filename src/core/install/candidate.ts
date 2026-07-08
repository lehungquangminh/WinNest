import { parse } from "node:path";
import { join } from "node:path";
import { createDesktopEntry } from "@/desktop/entry.js";
import { assertValidAppId } from "@/core/id.js";
import { appRoot } from "@/core/paths.js";
import { writeApp } from "@/core/state.js";
import { createInstallTracker, readInstallState } from "@/core/install/state.js";
import { appLogPath } from "@/logging/paths.js";
import { Logger } from "@/logging/logger.js";
import { matchRecipeForInstaller } from "@/recipes/loader.js";
import { scanExecutables, type ExecutableCandidate } from "@/scanner/executables.js";
import { WinNestError } from "@/shared/errors.js";
import { detectSystemWine } from "@/wine/runner.js";
import type { ManagedApp } from "@/core/app.js";

export type InstallCandidateList = {
  appId: string;
  appName: string;
  candidates: ExecutableCandidate[];
};

export async function listInstallCandidates(appId: string): Promise<InstallCandidateList> {
  assertValidAppId(appId);
  const root = appRoot(appId);
  const state = await readInstallState(root);
  const appName = parse(state.installerPath).name;
  const recipe = await matchRecipeForInstaller(state.installerPath);
  const logger = new Logger(appLogPath(appId, "install.log"));
  const candidates = await scanExecutables(join(root, "prefix"), appName, {
    logger,
    expectedExecutableNames: recipe?.expectedExecutables ?? []
  });

  return { appId, appName: recipe?.name ?? appName, candidates: candidates.slice(0, 10) };
}

export async function selectInstallCandidate(appId: string, candidatePath: string): Promise<ManagedApp> {
  const root = appRoot(appId);
  const state = await readInstallState(root);
  const logger = new Logger(appLogPath(appId, "install.log"));
  const list = await listInstallCandidates(appId);
  const selected = list.candidates.find(
    (candidate) => candidate.windowsPath === candidatePath || candidate.linuxPath === candidatePath
  );

  if (!selected) {
    throw new WinNestError("INVALID_LAUNCH_CANDIDATE", "Selected launcher candidate was not found.", {
      appId,
      candidatePath
    });
  }

  const tracker = await createInstallTracker(root, appId, state.installerPath);
  const recipe = await matchRecipeForInstaller(state.installerPath);
  const runner = await detectSystemWine();
  const now = new Date().toISOString();
  await tracker.update("writing-metadata", "running");
  let app: ManagedApp = {
    schemaVersion: 1,
    id: appId,
    name: list.appName,
    status: "installed",
    runner: "system-wine",
    runnerVersion: runner.version ?? "unknown",
    arch: "win64",
    prefixPath: join(root, "prefix"),
    mainExe: selected.windowsPath,
    createdFrom: state.installerPath,
    createdAt: state.startedAt,
    updatedAt: now,
    deps: recipe ? [...recipe.systemDeps, ...recipe.wineDeps] : [],
    desktopEntryPath: undefined
  };
  await writeApp(app);

  await tracker.update("creating-desktop-entry", "running");
  const desktopEntryPath = await createDesktopEntry(app, logger, recipe ? { categories: recipe.categories } : {});
  app = { ...app, desktopEntryPath, updatedAt: new Date().toISOString() };
  await writeApp(app);
  await tracker.update("done", "done");
  await logger.info("selected main executable from GUI", { appId, candidate: selected });
  return app;
}
