import { readdir, stat } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { runDoctor } from "../core/doctor.js";
import { installApp } from "../core/install.js";
import { appRoot } from "../core/paths.js";
import { readApp } from "../core/state.js";
import { toWinNestError } from "../shared/errors.js";

async function main(): Promise<void> {
  const installerPath = process.argv[2];
  if (!installerPath) {
    throw new Error("Usage: npm run test:real-install -- <installer-path>");
  }

  console.log("Running WinNest doctor...");
  await runDoctor({ verbose: true });
  if (process.exitCode && process.exitCode !== 0) {
    throw new Error("WinNest doctor failed. Fix the environment before running a real install.");
  }

  const resolvedInstallerPath = resolve(installerPath);
  console.log("");
  console.log(`Installing: ${resolvedInstallerPath}`);
  const installed = await installApp(resolvedInstallerPath);
  const app = await readApp(installed.id);
  const folder = appRoot(app.id);
  const latestLogPath = await findLatestLogPath(folder);

  console.log("");
  console.log("Real install smoke result:");
  console.log(`  appId: ${app.id}`);
  console.log(`  name: ${app.name}`);
  console.log(`  status: ${app.status}`);
  console.log(`  mainExe: ${app.mainExe}`);
  console.log(`  appFolder: ${folder}`);
  console.log(`  latestLog: ${latestLogPath ?? "none"}`);
  console.log("");
  console.log("App info:");
  console.log(JSON.stringify(app, null, 2));
}

async function findLatestLogPath(appFolder: string): Promise<string | undefined> {
  const logsDir = join(appFolder, "logs");
  let entries;
  try {
    entries = await readdir(logsDir, { withFileTypes: true });
  } catch {
    return undefined;
  }

  let latest: { path: string; mtimeMs: number } | undefined;
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const path = join(logsDir, entry.name);
    const info = await stat(path);
    if (!latest || info.mtimeMs > latest.mtimeMs) {
      latest = { path, mtimeMs: info.mtimeMs };
    }
  }

  return latest ? `${latest.path} (${basename(latest.path)})` : undefined;
}

main().catch((error: unknown) => {
  const winNestError = toWinNestError(error);
  console.error(`${winNestError.code}: ${winNestError.message}`);
  process.exitCode = 1;
});
