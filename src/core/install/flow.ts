import { constants } from "node:fs";
import { access, copyFile, mkdir } from "node:fs/promises";
import { basename, extname, join, parse, resolve } from "node:path";
import { appLogPath } from "@/logging/paths.js";
import { Logger } from "@/logging/logger.js";
import { WinNestError, toWinNestError } from "@/shared/errors.js";
import { createDesktopEntry } from "@/desktop/entry.js";
import { detectMainExecutable } from "@/scanner/detector.js";
import { createPrefix } from "@/wine/prefix.js";
import { runInstaller } from "@/wine/process.js";
import { detectSystemWine } from "@/wine/runner.js";
import { writeApp } from "@/core/state.js";
import { createInstallTracker, type InstallStep } from "@/core/install/state.js";
import { acquireAppLock } from "@/core/lock.js";
import { reserveAppFolder } from "@/core/id.js";
import { createDoctorReport, printFixHints } from "@/core/doctor.js";
import { matchRecipeForInstaller } from "@/recipes/loader.js";
import { createSystemFixHints, type SystemDependencyCode } from "@/system/fix-hints.js";
import { collectErrorText, diagnoseWineFailure } from "@/core/install/diagnosis.js";
import type { AppRecipe } from "@/recipes/model.js";
import type { ManagedApp } from "@/core/app.js";

export async function installApp(installerInputPath: string): Promise<ManagedApp> {
  let state: InstallStep = "validating";
  const startedAtMs = Date.now();
  const installerPath = resolve(installerInputPath);
  const installerKind = getInstallerKind(installerPath);
  const appName = parse(installerPath).name;
  const { appId, root } = await reserveAppFolder(appName);
  const lock = await acquireAppLock(root, "install");
  const logger = new Logger(appLogPath(appId, "install.log"));
  const tracker = await createInstallTracker(root, appId, installerPath);

  await tracker.update(state, "running");
  await validateInstaller(installerPath);
  await logger.info("app id allocated", { appId, root });
  await logger.info("install started", { state, installerPath, installerKind, appId });
  const recipe = await matchRecipeForInstaller(installerPath);
  if (recipe) {
    await logger.info("recipe matched", {
      recipeId: recipe.id,
      recipeName: recipe.name,
      systemDeps: recipe.systemDeps,
      wineDeps: recipe.wineDeps,
      expectedExecutables: recipe.expectedExecutables
    });
  } else {
    await logger.info("no recipe matched", { installerPath });
  }

  try {
    state = "creating-app-folder";
    await tracker.update(state, "running");
    await createAppFolders(root);

    state = "copying-installer";
    await tracker.update(state, "running");
    const storedInstallerPath = join(root, "installers", basename(installerPath));
    await copyFile(installerPath, storedInstallerPath);
    await logger.info("installer copied", { from: installerPath, to: storedInstallerPath });

    state = "creating-prefix";
    await tracker.update(state, "running");
    const prefixPath = join(root, "prefix");
    state = "booting-prefix";
    await tracker.update(state, "running");
    await createPrefix(prefixPath, logger);

    await warnAboutRecipeDependencies(recipe, logger);

    state = "running-installer";
    await tracker.update(state, "running");
    await runInstaller(prefixPath, storedInstallerPath, installerKind, logger);

    state = "scanning";
    await tracker.update(state, "running");
    const mainCandidate = await detectMainExecutable(prefixPath, appName, logger, {
      referenceTimeMs: startedAtMs,
      ...(recipe ? { expectedExecutableNames: recipe.expectedExecutables } : {}),
      onSelectionRequired: async () => {
        state = "selecting-launcher";
        await tracker.update(state, "running");
      }
    });
    const runner = await detectSystemWine();
    const now = new Date().toISOString();
    const displayName = recipe?.name ?? appName;

    state = "writing-metadata";
    await tracker.update(state, "running");
    let app: ManagedApp = {
      schemaVersion: 1,
      id: appId,
      name: displayName,
      status: "installed",
      runner: "system-wine",
      runnerVersion: runner.version ?? "unknown",
      arch: "win64",
      prefixPath,
      mainExe: mainCandidate.windowsPath,
      createdFrom: installerPath,
      createdAt: now,
      updatedAt: now,
      deps: recipe ? [...recipe.systemDeps, ...recipe.wineDeps] : [],
      desktopEntryPath: undefined
    };
    await writeApp(app);

    state = "creating-desktop-entry";
    await tracker.update(state, "running");
    const desktopEntryPath = await createDesktopEntry(app, logger, recipe ? { categories: recipe.categories } : {});
    app = { ...app, desktopEntryPath, updatedAt: new Date().toISOString() };
    await writeApp(app);

    state = "done";
    await tracker.update(state, "done");
    await logger.info("install finished", { state, app });
    return app;
  } catch (error) {
    const winNestError = toWinNestError(error);
    const report = await createDoctorReport(logger);
    const diagnosis = diagnoseWineFailure(collectErrorText(winNestError), report.hints);
    await tracker.update("failed", "failed", {
      code: diagnosis.code,
      message: diagnosis.message,
      hints: diagnosis.hints,
      diagnosis: diagnosis.code
    });
    await logger.error("install failed", {
      state,
      error,
      originalCode: winNestError.code,
      originalMessage: winNestError.message,
      diagnosis
    });
    throw error;
  } finally {
    await lock.release();
  }
}

async function warnAboutRecipeDependencies(recipe: AppRecipe | undefined, logger: Logger): Promise<void> {
  if (!recipe || recipe.systemDeps.length === 0) {
    return;
  }

  const report = await createDoctorReport(logger);
  const missingDeps = recipe.systemDeps.filter((dep): dep is SystemDependencyCode =>
    isRecipeSystemDepMissing(dep, report)
  );
  if (missingDeps.length === 0) {
    await logger.info("recipe system dependencies satisfied", {
      recipeId: recipe.id,
      systemDeps: recipe.systemDeps
    });
    return;
  }

  const hints = createSystemFixHints(report.system.distro, missingDeps);
  await logger.warn("recipe system dependencies missing", {
    recipeId: recipe.id,
    recipeName: recipe.name,
    missingDeps
  });

  console.warn("");
  console.warn(`WinNest matched recipe: ${recipe.name}`);
  console.warn("");
  console.warn("This app may need system dependencies that are currently missing:");
  for (const dep of missingDeps) {
    console.warn(`  - ${dep}`);
  }
  console.warn("");
  console.warn("You can continue, but installation may fail.");
  printFixHints(hints);
  console.warn("");
}

function isRecipeSystemDepMissing(dep: string, report: Awaited<ReturnType<typeof createDoctorReport>>): dep is SystemDependencyCode {
  switch (dep) {
    case "wine":
      return !report.wine.winePath;
    case "wineboot":
      return !report.wine.winebootPath;
    case "wineserver":
      return !report.wine.wineserverPath;
    case "wine32":
      return !report.wine.support32;
    case "winbind":
      return !report.tools.winbind;
    case "cabextract":
      return !report.tools.cabextract;
    case "p7zip":
      return !report.tools.sevenZip;
    case "vulkaninfo":
      return !report.tools.vulkaninfo;
    default:
      return false;
  }
}

async function validateInstaller(path: string): Promise<string> {
  getInstallerKind(path);

  try {
    await access(path, constants.R_OK);
  } catch (error) {
    throw new WinNestError("INSTALLER_NOT_READABLE", "Installer path is not readable.", { path, error });
  }

  return path;
}

function getInstallerKind(path: string): "exe" | "msi" {
  const extension = extname(path).toLowerCase();
  if (extension === ".exe") {
    return "exe";
  }
  if (extension === ".msi") {
    return "msi";
  }
  throw new WinNestError("UNSUPPORTED_INSTALLER", "Installer must be a .exe or .msi file.", { path });
}

async function createAppFolders(root: string): Promise<void> {
  const folders = ["prefix", "installers", "icons", "logs", "shortcuts", "snapshots", "cache"];
  for (const folder of folders) {
    await mkdir(join(root, folder), { recursive: true });
  }
}
