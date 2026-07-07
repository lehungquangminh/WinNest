import { constants } from "node:fs";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { arch, release, tmpdir, type } from "node:os";
import { join } from "node:path";
import { getPaths } from "./paths.js";
import { globalLogPath } from "../logging/paths.js";
import { Logger } from "../logging/logger.js";
import { runCommand } from "../shared/spawn.js";
import { findExecutable } from "../shared/which.js";
import { detectSystemWine } from "../wine/runner.js";
import { WINNEST_VERSION } from "../shared/version.js";

type Check = {
  label: string;
  ok: boolean;
  value: string;
};

export type DoctorOptions = {
  verbose?: boolean;
};

type PrefixCheck = {
  ok: boolean;
  value: string;
  prefixPath: string | undefined;
  stdout: string;
  stderr: string;
  exitCode: number | undefined;
};

export async function runDoctor(options: DoctorOptions = {}): Promise<void> {
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
  const mimePackagesWritable = await isWritable(paths.mimePackagesDir);
  const xdgMime = await findExecutable("xdg-mime");
  const xdgDesktopMenu = await findExecutable("xdg-desktop-menu");
  const updateDesktopDatabase = await findExecutable("update-desktop-database");
  const updateMimeDatabase = await findExecutable("update-mime-database");
  const prefixCheck = await checkTemporaryPrefix(runner.winebootPath, logger);

  const systemChecks: Check[] = [
    { label: "Linux", ok: process.platform === "linux", value: yesNo(process.platform === "linux") },
    { label: "Node runtime", ok: true, value: process.version },
    { label: "Home writable", ok: homeWritable, value: yesNo(homeWritable) },
    { label: "App data writable", ok: dataWritable, value: yesNo(dataWritable) },
    { label: "App data path", ok: dataWritable, value: paths.dataRoot }
  ];

  const wineChecks: Check[] = [
    { label: "wine", ok: Boolean(runner.winePath), value: formatTool(runner.winePath) },
    { label: "wineboot", ok: Boolean(runner.winebootPath), value: formatTool(runner.winebootPath) },
    { label: "wineserver", ok: Boolean(runner.wineserverPath), value: formatTool(runner.wineserverPath) },
    { label: "version", ok: Boolean(runner.version), value: runner.version ?? "unknown" },
    { label: "temporary prefix", ok: prefixCheck.ok, value: prefixCheck.value }
  ];

  const desktopChecks: Check[] = [
    { label: "xdg-mime", ok: Boolean(xdgMime), value: formatTool(xdgMime) },
    { label: "xdg-desktop-menu", ok: Boolean(xdgDesktopMenu), value: formatTool(xdgDesktopMenu, true) },
    {
      label: "update-desktop-database",
      ok: Boolean(updateDesktopDatabase),
      value: formatTool(updateDesktopDatabase, true)
    },
    {
      label: "update-mime-database",
      ok: Boolean(updateMimeDatabase),
      value: formatTool(updateMimeDatabase, true)
    },
    { label: "applications dir", ok: applicationsWritable, value: applicationsWritable ? "writable" : "not writable" },
    { label: "MIME packages dir", ok: mimePackagesWritable, value: mimePackagesWritable ? "writable" : "not writable" }
  ];

  const winNestChecks: Check[] = [
    { label: "version", ok: true, value: WINNEST_VERSION }
  ];

  printDoctor(systemChecks, wineChecks, desktopChecks, winNestChecks);

  if (options.verbose) {
    printVerboseDoctor({
      paths,
      runner,
      prefixCheck,
      tools: {
        xdgMime,
        xdgDesktopMenu,
        updateDesktopDatabase,
        updateMimeDatabase
      }
    });
  }

  const requiredOk =
    systemChecks.every((check) => check.ok) &&
    wineChecks.every((check) => check.ok) &&
    applicationsWritable &&
    mimePackagesWritable &&
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

function printDoctor(
  system: readonly Check[],
  wine: readonly Check[],
  desktop: readonly Check[],
  winNest: readonly Check[]
): void {
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
  console.log("");
  console.log("WinNest:");
  for (const check of winNest) {
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
): Promise<PrefixCheck> {
  if (!winebootPath) {
    return { ok: false, value: "skipped", prefixPath: undefined, stdout: "", stderr: "", exitCode: undefined };
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
      return {
        ok: true,
        value: "ok",
        prefixPath,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode
      };
    }

    return {
      ok: false,
      value: `failed exit ${result.exitCode}`,
      prefixPath,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode
    };
  } catch (error) {
    await logger.error("temporary prefix check failed", error);
    return { ok: false, value: "failed", prefixPath, stdout: "", stderr: String(error), exitCode: undefined };
  } finally {
    await rm(prefixPath, { recursive: true, force: true });
  }
}

function yesNo(value: boolean): string {
  return value ? "yes" : "no";
}

function formatTool(path: string | undefined, optional = false): string {
  if (path) {
    return `found ${path}`;
  }

  return optional ? "missing optional" : "missing";
}

function printVerboseDoctor(details: {
  paths: ReturnType<typeof getPaths>;
  runner: Awaited<ReturnType<typeof detectSystemWine>>;
  prefixCheck: PrefixCheck;
  tools: {
    xdgMime: string | undefined;
    xdgDesktopMenu: string | undefined;
    updateDesktopDatabase: string | undefined;
    updateMimeDatabase: string | undefined;
  };
}): void {
  console.log("");
  console.log("Verbose:");
  console.log("  Paths:");
  console.log(`    home: ${details.paths.home}`);
  console.log(`    dataRoot: ${details.paths.dataRoot}`);
  console.log(`    appsRoot: ${details.paths.appsRoot}`);
  console.log(`    globalLogsRoot: ${details.paths.globalLogsRoot}`);
  console.log(`    applicationsDir: ${details.paths.applicationsDir}`);
  console.log(`    mimePackagesDir: ${details.paths.mimePackagesDir}`);
  console.log("  Wine:");
  console.log(`    winePath: ${details.runner.winePath ?? "missing"}`);
  console.log(`    winebootPath: ${details.runner.winebootPath ?? "missing"}`);
  console.log(`    wineserverPath: ${details.runner.wineserverPath ?? "missing"}`);
  console.log(`    wineVersionOutput: ${details.runner.version ?? "unknown"}`);
  console.log(`    tempPrefixPath: ${details.prefixCheck.prefixPath ?? "none"}`);
  console.log(`    tempPrefixResult: ${details.prefixCheck.value}`);
  console.log(`    tempPrefixExitCode: ${details.prefixCheck.exitCode ?? "none"}`);
  console.log(`    tempPrefixStdout: ${trimForConsole(details.prefixCheck.stdout)}`);
  console.log(`    tempPrefixStderr: ${trimForConsole(details.prefixCheck.stderr)}`);
  console.log("  Desktop tools:");
  console.log(`    xdgMime: ${details.tools.xdgMime ?? "missing"}`);
  console.log(`    xdgDesktopMenu: ${details.tools.xdgDesktopMenu ?? "missing"}`);
  console.log(`    updateDesktopDatabase: ${details.tools.updateDesktopDatabase ?? "missing"}`);
  console.log(`    updateMimeDatabase: ${details.tools.updateMimeDatabase ?? "missing"}`);
  console.log("  Runtime:");
  console.log(`    PATH: ${process.env.PATH ?? ""}`);
  console.log(`    node: ${process.version}`);
  console.log(`    platform: ${process.platform}`);
  console.log(`    osType: ${type()}`);
  console.log(`    osRelease: ${release()}`);
  console.log(`    arch: ${arch()}`);
}

function trimForConsole(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  return trimmed.length > 600 ? `${trimmed.slice(0, 600)}...` : trimmed;
}
