import { constants } from "node:fs";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getPaths } from "./paths.js";
import { globalLogPath } from "../logging/paths.js";
import { Logger } from "../logging/logger.js";
import { runCommand } from "../shared/spawn.js";
import { findExecutable } from "../shared/which.js";
import { detectSystemWine } from "../wine/runner.js";

type Check = {
  label: string;
  ok: boolean;
  value: string;
};

export async function runDoctor(): Promise<void> {
  const logger = new Logger(globalLogPath("doctor.log"));
  const paths = getPaths();
  const runner = await detectSystemWine();

  await logger.info("doctor started", {
    platform: process.platform,
    node: process.version,
    paths,
    runner
  });

  const homeWritable = await isWritable(paths.home);
  const dataWritable = await isWritable(paths.dataRoot);
  const applicationsWritable = await isWritable(paths.applicationsDir);
  const xdgMime = await findExecutable("xdg-mime");
  const xdgDesktopMenu = await findExecutable("xdg-desktop-menu");
  const updateDesktopDatabase = await findExecutable("update-desktop-database");
  const updateMimeDatabase = await findExecutable("update-mime-database");
  const prefixCheck = await checkTemporaryPrefix(runner.winebootPath, logger);

  const systemChecks: Check[] = [
    { label: "Linux", ok: process.platform === "linux", value: yesNo(process.platform === "linux") },
    { label: "Node runtime", ok: true, value: process.version },
    { label: "Home writable", ok: homeWritable, value: yesNo(homeWritable) },
    { label: "App data path", ok: dataWritable, value: paths.dataRoot }
  ];

  const wineChecks: Check[] = [
    { label: "wine", ok: Boolean(runner.winePath), value: runner.winePath ?? "missing" },
    { label: "wineboot", ok: Boolean(runner.winebootPath), value: runner.winebootPath ?? "missing" },
    { label: "version", ok: Boolean(runner.version), value: runner.version ?? "unknown" },
    { label: "temporary prefix", ok: prefixCheck.ok, value: prefixCheck.value }
  ];

  const desktopChecks: Check[] = [
    { label: "xdg-mime", ok: Boolean(xdgMime), value: xdgMime ?? "missing" },
    { label: "xdg-desktop-menu", ok: Boolean(xdgDesktopMenu), value: xdgDesktopMenu ?? "missing optional" },
    {
      label: "update-desktop-database",
      ok: Boolean(updateDesktopDatabase),
      value: updateDesktopDatabase ?? "missing optional"
    },
    {
      label: "update-mime-database",
      ok: Boolean(updateMimeDatabase),
      value: updateMimeDatabase ?? "missing optional"
    },
    { label: "applications dir", ok: applicationsWritable, value: applicationsWritable ? "writable" : "not writable" }
  ];

  printDoctor(systemChecks, wineChecks, desktopChecks);

  const requiredOk =
    systemChecks.every((check) => check.ok) &&
    wineChecks.every((check) => check.ok) &&
    applicationsWritable &&
    Boolean(xdgMime);

  console.log("");
  console.log("Optional:");
  console.log("  Vulkan: not checked");
  console.log("  DXVK: not installed");
  console.log("");
  console.log("Result:");
  console.log(requiredOk ? "  WinNest is ready." : "  WinNest needs attention.");

  await logger.info("doctor finished", { requiredOk });

  if (!requiredOk) {
    process.exitCode = 1;
  }
}

function printDoctor(system: readonly Check[], wine: readonly Check[], desktop: readonly Check[]): void {
  console.log("WinNest Doctor");
  console.log("");
  console.log("System:");
  for (const check of system) {
    console.log(`  ${check.label}: ${check.value}`);
  }
  console.log("");
  console.log("Wine:");
  for (const check of wine) {
    console.log(`  ${check.label}: ${check.value}`);
  }
  console.log("");
  console.log("Desktop integration:");
  for (const check of desktop) {
    console.log(`  ${check.label}: ${check.value}`);
  }
}

async function isWritable(path: string): Promise<boolean> {
  try {
    await mkdir(path, { recursive: true });
    const probe = join(path, `.winnest-write-test-${process.pid}`);
    await writeFile(probe, "ok", "utf8");
    await rm(probe, { force: true });
    await access(path, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

async function checkTemporaryPrefix(
  winebootPath: string | undefined,
  logger: Logger
): Promise<{ ok: boolean; value: string }> {
  if (!winebootPath) {
    return { ok: false, value: "skipped" };
  }

  const prefixPath = await mkdtemp(join(tmpdir(), "winnest-prefix-"));
  try {
    const result = await runCommand(winebootPath, ["-u"], {
      logger,
      timeoutMs: 45000,
      env: {
        ...process.env,
        WINEPREFIX: prefixPath,
        WINEARCH: "win64"
      }
    });

    if (result.exitCode === 0) {
      return { ok: true, value: "ok" };
    }

    return { ok: false, value: `failed exit ${result.exitCode}` };
  } catch (error) {
    await logger.error("temporary prefix check failed", error);
    return { ok: false, value: "failed" };
  } finally {
    await rm(prefixPath, { recursive: true, force: true });
  }
}

function yesNo(value: boolean): string {
  return value ? "yes" : "no";
}
