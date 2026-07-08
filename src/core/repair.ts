import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { appLogPath } from "@/logging/paths.js";
import { Logger } from "@/logging/logger.js";
import { createPrefix } from "@/wine/prefix.js";
import { windowsPathToLinux } from "@/wine/path.js";
import { appRoot } from "@/core/paths.js";
import { acquireAppLock } from "@/core/lock.js";
import { readApp } from "@/core/state.js";
import { createDoctorReport, formatMissingDependencies, printFixHints } from "@/core/doctor.js";
import { findRecipeForApp } from "@/recipes/loader.js";

export async function repairApp(appId: string): Promise<void> {
  const app = await readApp(appId);
  const lock = await acquireAppLock(appRoot(app.id), "repair");
  const logger = new Logger(appLogPath(appId, "repair.log"));

  try {
    await logger.info("repair started", {
      appId,
      appName: app.name,
      prefixPath: app.prefixPath,
      mainExe: app.mainExe
    });

    const [report, recipe, mainExe] = await Promise.all([
      createDoctorReport(logger),
      findRecipeForApp(app.id, app.name, app.createdFrom),
      resolveMainExe(app.prefixPath, app.mainExe)
    ]);

    await logger.info("repair diagnostics collected", {
      appId,
      recipe: recipe ? { id: recipe.id, name: recipe.name, systemDeps: recipe.systemDeps } : undefined,
      doctorOk: report.ok,
      missingSystemDeps: report.missingSystemDeps,
      mainExe
    });

    console.log(`Repairing ${app.name}`);
    console.log("");
    console.log("Detected:");
    console.log(`  recipe: ${recipe ? recipe.name : "none"}`);
    console.log(`  Wine ready: ${report.ok ? "yes" : "needs attention"}`);
    console.log(`  32-bit Wine support: ${report.wine.support32 ? "yes" : "missing"}`);
    console.log(`  main executable: ${mainExe.exists ? "ok" : "missing"}`);
    console.log(`  main executable path: ${mainExe.linuxPath ?? "unresolved"}`);

    const missing = formatMissingDependencies(report.missingSystemDeps);
    if (missing.length > 0) {
      console.log(`  missing system dependencies: ${missing.join(", ")}`);
    }

    console.log("");
    console.log("Repair actions:");
    console.log("  running wineboot for this prefix");
    await createPrefix(app.prefixPath, logger);
    await logger.info("repair prefix boot completed", { appId, prefixPath: app.prefixPath });

    if (report.hints.length > 0) {
      printFixHints(report.hints);
    }

    if (!mainExe.exists) {
      console.log("");
      console.log("Next steps:");
      console.log(`  winnest rescan ${app.id}`);
      console.log(`  winnest run ${app.id}`);
    }

    await logger.info("repair finished", { appId, doctorOk: report.ok, mainExeExists: mainExe.exists });
  } finally {
    await lock.release();
  }
}

async function resolveMainExe(
  prefixPath: string,
  mainExe: string
): Promise<{ exists: boolean; linuxPath: string | undefined }> {
  try {
    const linuxPath = windowsPathToLinux(prefixPath, mainExe);
    await access(linuxPath, constants.R_OK);
    return { exists: true, linuxPath };
  } catch {
    return { exists: false, linuxPath: undefined };
  }
}
