import { constants } from "node:fs";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { arch, release, type } from "node:os";
import { join } from "node:path";
import { getPaths } from "@/core/paths.js";
import { globalLogPath } from "@/logging/paths.js";
import { Logger } from "@/logging/logger.js";
import { runCommand } from "@/shared/spawn.js";
import { findExecutable } from "@/shared/which.js";
import { detectSystemWine } from "@/wine/runner.js";
import { WINNEST_VERSION } from "@/shared/version.js";
import { detectDistro, type DistroInfo } from "@/system/distro.js";
import {
  createSystemFixHints,
  dependencyDisplayName,
  type FixHint,
  type SystemDependencyCode
} from "@/system/fix-hints.js";

type Check = {
  label: string;
  ok: boolean;
  value: string;
};

export type DoctorOptions = {
  verbose?: boolean;
  fixHints?: boolean;
  json?: boolean;
};

type PrefixCheck = {
  ok: boolean;
  value: string;
  prefixPath: string | undefined;
  stdout: string;
  stderr: string;
  exitCode: number | undefined;
  support64: boolean;
  support32: boolean;
};

export type DoctorReport = {
  ok: boolean;
  system: {
    platform: string;
    arch: string;
    distro?: DistroInfo;
    appDataWritable: boolean;
    homeWritable: boolean;
    applicationsWritable: boolean;
    mimePackagesWritable: boolean;
    paths: ReturnType<typeof getPaths>;
    nodeVersion: string;
    osType: string;
    osRelease: string;
  };
  wine: {
    winePath?: string;
    winebootPath?: string;
    wineserverPath?: string;
    version?: string;
    prefixCreationOk: boolean;
    prefixCheck: PrefixCheck;
    support64: boolean;
    support32: boolean;
    issues: string[];
  };
  tools: {
    xdgMime?: string;
    xdgDesktopMenu?: string;
    updateDesktopDatabase?: string;
    updateMimeDatabase?: string;
    winbind?: string;
    cabextract?: string;
    sevenZip?: string;
    vulkaninfo?: string;
    mimeHandlerDesktopEntry?: string;
    mimeDefaults?: Record<string, string>;
  };
  hints: FixHint[];
  missingSystemDeps: SystemDependencyCode[];
  version: string;
};

export async function runDoctor(options: DoctorOptions = {}): Promise<void> {
  const logger = new Logger(globalLogPath("doctor.log"));
  const report = await createDoctorReport(logger);

  if (options.json) {
    console.log(JSON.stringify(stripVerboseReport(report), null, 2));
    if (!report.ok) {
      process.exitCode = 1;
    }
    return;
  }

  printDoctor(report);

  if (options.verbose) {
    printVerboseDoctor(report);
  }

  if (options.fixHints) {
    printFixHints(report.hints);
  }

  console.log("");
  console.log("Result:");
  console.log(report.ok ? "  WinNest is ready." : "  WinNest needs attention.");

  await logger.info("doctor finished", { ok: report.ok, missingSystemDeps: report.missingSystemDeps });

  if (!report.ok) {
    process.exitCode = 1;
  }
}

export async function createDoctorReport(logger = new Logger(globalLogPath("doctor.log"))): Promise<DoctorReport> {
  const paths = getPaths();
  const runner = await detectSystemWine();
  const distro = await detectDistro();

  await logger.info("doctor started", {
    platform: process.platform,
    node: process.version,
    paths,
    runner,
    distro
  });

  const homeWritable = await isWritable(paths.home);
  const dataWritable = await isWritable(paths.dataRoot);
  const applicationsWritable = await isWritable(paths.applicationsDir);
  const mimePackagesWritable = await isWritable(paths.mimePackagesDir);
  const xdgMime = await findExecutable("xdg-mime");
  const xdgDesktopMenu = await findExecutable("xdg-desktop-menu");
  const updateDesktopDatabase = await findExecutable("update-desktop-database");
  const updateMimeDatabase = await findExecutable("update-mime-database");
  const mimeHandlerDesktopEntryPath = join(paths.applicationsDir, "winnest-open.desktop");
  const mimeHandlerDesktopEntry = (await fileExists(mimeHandlerDesktopEntryPath)) ? mimeHandlerDesktopEntryPath : undefined;
  const mimeDefaults = xdgMime ? await queryMimeDefaults(xdgMime) : {};
  const winbind = (await findExecutable("ntlm_auth")) ?? (await findExecutable("winbindd"));
  const cabextract = await findExecutable("cabextract");
  const sevenZip = (await findExecutable("7z")) ?? (await findExecutable("7zz"));
  const vulkaninfo = await findExecutable("vulkaninfo");
  const prefixCheck = await checkTemporaryPrefix(runner.winebootPath, logger);

  const wineIssues: string[] = [];
  const missingSystemDeps: SystemDependencyCode[] = [];

  if (!runner.winePath) {
    missingSystemDeps.push("wine");
    wineIssues.push("wine was not found");
  }
  if (!runner.winebootPath) {
    missingSystemDeps.push("wineboot");
    wineIssues.push("wineboot was not found");
  }
  if (!runner.wineserverPath) {
    missingSystemDeps.push("wineserver");
    wineIssues.push("wineserver was not found");
  }
  if (!prefixCheck.ok) {
    wineIssues.push("Wine could not create a temporary prefix");
  }
  if (!prefixCheck.support64) {
    wineIssues.push("64-bit Wine support was not detected");
  }
  if (!prefixCheck.support32) {
    missingSystemDeps.push("wine32");
    wineIssues.push("32-bit Wine support is missing");
  }
  if (!winbind) {
    missingSystemDeps.push("winbind");
  }
  if (!cabextract) {
    missingSystemDeps.push("cabextract");
  }
  if (!sevenZip) {
    missingSystemDeps.push("p7zip");
  }
  if (!vulkaninfo) {
    missingSystemDeps.push("vulkaninfo");
  }

  const requiredOk =
    process.platform === "linux" &&
    homeWritable &&
    dataWritable &&
    applicationsWritable &&
    Boolean(runner.winePath) &&
    Boolean(runner.winebootPath) &&
    Boolean(runner.wineserverPath) &&
    prefixCheck.ok &&
    prefixCheck.support64 &&
    prefixCheck.support32 &&
    Boolean(xdgMime);

  const tools = optionalTools({
    xdgMime,
    xdgDesktopMenu,
    updateDesktopDatabase,
    updateMimeDatabase,
    mimeHandlerDesktopEntry,
    mimeDefaults,
    winbind,
    cabextract,
    sevenZip,
    vulkaninfo
  });

  const wine = optionalWine({
    winePath: runner.winePath,
    winebootPath: runner.winebootPath,
    wineserverPath: runner.wineserverPath,
    version: runner.version,
    prefixCreationOk: prefixCheck.ok,
    prefixCheck,
    support64: prefixCheck.support64,
    support32: prefixCheck.support32,
    issues: wineIssues
  });

  return {
    ok: requiredOk,
    system: {
      platform: process.platform,
      arch: arch(),
      distro,
      appDataWritable: dataWritable,
      homeWritable,
      applicationsWritable,
      mimePackagesWritable,
      paths,
      nodeVersion: process.version,
      osType: type(),
      osRelease: release()
    },
    wine,
    tools,
    hints: createSystemFixHints(distro, missingSystemDeps),
    missingSystemDeps,
    version: WINNEST_VERSION
  };
}

function printDoctor(report: DoctorReport): void {
  const systemChecks: Check[] = [
    { label: "Linux", ok: report.system.platform === "linux", value: yesNo(report.system.platform === "linux") },
    { label: "Distro", ok: true, value: report.system.distro?.prettyName ?? report.system.distro?.id ?? "unknown" },
    { label: "Architecture", ok: true, value: report.system.arch },
    { label: "Node runtime", ok: true, value: report.system.nodeVersion },
    { label: "Home writable", ok: report.system.homeWritable, value: yesNo(report.system.homeWritable) },
    { label: "App data writable", ok: report.system.appDataWritable, value: yesNo(report.system.appDataWritable) }
  ];
  const wineChecks: Check[] = [
    { label: "wine", ok: Boolean(report.wine.winePath), value: formatTool(report.wine.winePath) },
    { label: "wineboot", ok: Boolean(report.wine.winebootPath), value: formatTool(report.wine.winebootPath) },
    { label: "wineserver", ok: Boolean(report.wine.wineserverPath), value: formatTool(report.wine.wineserverPath) },
    { label: "version", ok: Boolean(report.wine.version), value: report.wine.version ?? "unknown" },
    { label: "temporary prefix", ok: report.wine.prefixCreationOk, value: report.wine.prefixCheck.value },
    { label: "64-bit support", ok: report.wine.support64, value: yesNo(report.wine.support64) },
    { label: "32-bit support", ok: report.wine.support32, value: report.wine.support32 ? "yes" : "missing" }
  ];
  const desktopChecks: Check[] = [
    { label: "xdg-mime", ok: Boolean(report.tools.xdgMime), value: formatTool(report.tools.xdgMime) },
    { label: "xdg-desktop-menu", ok: Boolean(report.tools.xdgDesktopMenu), value: formatTool(report.tools.xdgDesktopMenu, true) },
    {
      label: "update-desktop-database",
      ok: Boolean(report.tools.updateDesktopDatabase),
      value: formatTool(report.tools.updateDesktopDatabase, true)
    },
    {
      label: "update-mime-database",
      ok: Boolean(report.tools.updateMimeDatabase),
      value: formatTool(report.tools.updateMimeDatabase, true)
    },
    {
      label: "applications dir",
      ok: report.system.applicationsWritable,
      value: report.system.applicationsWritable ? "writable" : "not writable"
    },
    {
      label: "MIME packages dir",
      ok: report.system.mimePackagesWritable,
      value: report.system.mimePackagesWritable ? "writable" : "not writable"
    },
    {
      label: "WinNest MIME handler",
      ok: Boolean(report.tools.mimeHandlerDesktopEntry),
      value: report.tools.mimeHandlerDesktopEntry ? `found ${report.tools.mimeHandlerDesktopEntry}` : "not registered"
    },
    {
      label: "MIME defaults",
      ok: mimeDefaultCount(report.tools.mimeDefaults) > 0,
      value: `${mimeDefaultCount(report.tools.mimeDefaults)}/3 set to WinNest`
    }
  ];
  const optionalChecks: Check[] = [
    { label: "winbind", ok: Boolean(report.tools.winbind), value: formatTool(report.tools.winbind, true) },
    { label: "cabextract", ok: Boolean(report.tools.cabextract), value: formatTool(report.tools.cabextract, true) },
    { label: "7z", ok: Boolean(report.tools.sevenZip), value: formatTool(report.tools.sevenZip, true) },
    { label: "vulkaninfo", ok: Boolean(report.tools.vulkaninfo), value: formatTool(report.tools.vulkaninfo, true) }
  ];

  console.log("WinNest Doctor");
  printSection("System", systemChecks);
  printSection("Wine", wineChecks);
  printSection("Desktop integration", desktopChecks);
  printSection("Optional tools", optionalChecks);
  printSection("WinNest", [{ label: "version", ok: true, value: report.version }]);
}

function printSection(title: string, checks: readonly Check[]): void {
  console.log("");
  console.log(`${title}:`);
  for (const check of checks) {
    console.log(`  ${check.label}: ${check.value}`);
  }
}

function printVerboseDoctor(report: DoctorReport): void {
  console.log("");
  console.log("Verbose:");
  console.log("  Paths:");
  console.log(`    home: ${report.system.paths.home}`);
  console.log(`    dataRoot: ${report.system.paths.dataRoot}`);
  console.log(`    appsRoot: ${report.system.paths.appsRoot}`);
  console.log(`    globalLogsRoot: ${report.system.paths.globalLogsRoot}`);
  console.log(`    applicationsDir: ${report.system.paths.applicationsDir}`);
  console.log(`    mimePackagesDir: ${report.system.paths.mimePackagesDir}`);
  console.log("  Wine:");
  console.log(`    winePath: ${report.wine.winePath ?? "missing"}`);
  console.log(`    winebootPath: ${report.wine.winebootPath ?? "missing"}`);
  console.log(`    wineserverPath: ${report.wine.wineserverPath ?? "missing"}`);
  console.log(`    wineVersionOutput: ${report.wine.version ?? "unknown"}`);
  console.log(`    canCreateTemporaryPrefix: ${yesNo(report.wine.prefixCreationOk)}`);
  console.log(`    tempPrefixPath: ${report.wine.prefixCheck.prefixPath ?? "none"}`);
  console.log(`    tempPrefixResult: ${report.wine.prefixCheck.value}`);
  console.log(`    tempPrefixExitCode: ${report.wine.prefixCheck.exitCode ?? "none"}`);
  console.log(`    tempPrefixStdout: ${trimForConsole(report.wine.prefixCheck.stdout)}`);
  console.log(`    tempPrefixStderr: ${trimForConsole(report.wine.prefixCheck.stderr)}`);
  console.log("  Desktop tools:");
  console.log(`    xdgMime: ${report.tools.xdgMime ?? "missing"}`);
  console.log(`    xdgDesktopMenu: ${report.tools.xdgDesktopMenu ?? "missing"}`);
  console.log(`    updateDesktopDatabase: ${report.tools.updateDesktopDatabase ?? "missing"}`);
  console.log(`    updateMimeDatabase: ${report.tools.updateMimeDatabase ?? "missing"}`);
  console.log(`    mimeHandlerDesktopEntry: ${report.tools.mimeHandlerDesktopEntry ?? "missing"}`);
  for (const [mimeType, desktopEntry] of Object.entries(report.tools.mimeDefaults ?? {})) {
    console.log(`    ${mimeType}: ${desktopEntry || "unset"}`);
  }
  console.log("  Runtime:");
  console.log(`    PATH: ${process.env.PATH ?? ""}`);
  console.log(`    node: ${report.system.nodeVersion}`);
  console.log(`    platform: ${report.system.platform}`);
  console.log(`    osType: ${report.system.osType}`);
  console.log(`    osRelease: ${report.system.osRelease}`);
  console.log(`    arch: ${report.system.arch}`);
}

export function printFixHints(hints: readonly FixHint[]): void {
  if (hints.length === 0) {
    console.log("");
    console.log("Fix hints:");
    console.log("  No missing system dependencies detected.");
    return;
  }

  console.log("");
  console.log("Fix hints:");
  for (const hint of hints) {
    console.log(`  ${hint.title}:`);
    for (const command of hint.commands) {
      console.log(`    ${command}`);
    }
    for (const note of hint.notes) {
      console.log(`    note: ${note}`);
    }
  }
}

export function formatMissingDependencies(deps: readonly SystemDependencyCode[]): string[] {
  return [...new Set(deps)].map((dep) => dependencyDisplayName(dep));
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
    return emptyPrefixCheck("skipped");
  }

  const tempRoot = join(getPaths().dataRoot, "cache");
  await mkdir(tempRoot, { recursive: true });
  const prefixPath = await mkdtemp(join(tempRoot, "doctor-prefix-"));
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
    const support64 = await fileExists(join(prefixPath, "drive_c", "windows", "system32", "ntdll.dll"));
    const support32 = await fileExists(join(prefixPath, "drive_c", "windows", "syswow64", "ntdll.dll"));

    return {
      ok: result.exitCode === 0,
      value: result.exitCode === 0 ? "ok" : `failed exit ${result.exitCode}`,
      prefixPath,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      support64,
      support32: support32 && !isWine32Missing(result.stderr)
    };
  } catch (error) {
    await logger.error("temporary prefix check failed", error);
    return {
      ok: false,
      value: "failed",
      prefixPath,
      stdout: "",
      stderr: String(error),
      exitCode: undefined,
      support64: false,
      support32: false
    };
  } finally {
    await rm(prefixPath, { recursive: true, force: true });
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
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

function trimForConsole(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  return trimmed.length > 600 ? `${trimmed.slice(0, 600)}...` : trimmed;
}

function isWine32Missing(stderr: string): boolean {
  return /wine32 is missing/i.test(stderr) || /syswow64[\\/]+ntdll\.dll/i.test(stderr);
}

async function queryMimeDefaults(xdgMimePath: string): Promise<Record<string, string>> {
  const mimeTypes = [
    "application/x-ms-dos-executable",
    "application/x-msi",
    "application/vnd.microsoft.portable-executable"
  ];
  const defaults: Record<string, string> = {};

  for (const mimeType of mimeTypes) {
    try {
      const result = await runCommand(xdgMimePath, ["query", "default", mimeType], { timeoutMs: 5000 });
      defaults[mimeType] = result.exitCode === 0 ? result.stdout.trim() : "";
    } catch {
      defaults[mimeType] = "";
    }
  }

  return defaults;
}

function mimeDefaultCount(defaults: Record<string, string> | undefined): number {
  return Object.values(defaults ?? {}).filter((value) => value === "winnest-open.desktop").length;
}

function emptyPrefixCheck(value: string): PrefixCheck {
  return {
    ok: false,
    value,
    prefixPath: undefined,
    stdout: "",
    stderr: "",
    exitCode: undefined,
    support64: false,
    support32: false
  };
}

function optionalTools(tools: {
  xdgMime: string | undefined;
  xdgDesktopMenu: string | undefined;
  updateDesktopDatabase: string | undefined;
  updateMimeDatabase: string | undefined;
  mimeHandlerDesktopEntry: string | undefined;
  mimeDefaults: Record<string, string>;
  winbind: string | undefined;
  cabextract: string | undefined;
  sevenZip: string | undefined;
  vulkaninfo: string | undefined;
}): DoctorReport["tools"] {
  const result: DoctorReport["tools"] = {};
  if (tools.xdgMime) {
    result.xdgMime = tools.xdgMime;
  }
  if (tools.xdgDesktopMenu) {
    result.xdgDesktopMenu = tools.xdgDesktopMenu;
  }
  if (tools.updateDesktopDatabase) {
    result.updateDesktopDatabase = tools.updateDesktopDatabase;
  }
  if (tools.updateMimeDatabase) {
    result.updateMimeDatabase = tools.updateMimeDatabase;
  }
  if (tools.mimeHandlerDesktopEntry) {
    result.mimeHandlerDesktopEntry = tools.mimeHandlerDesktopEntry;
  }
  result.mimeDefaults = tools.mimeDefaults;
  if (tools.winbind) {
    result.winbind = tools.winbind;
  }
  if (tools.cabextract) {
    result.cabextract = tools.cabextract;
  }
  if (tools.sevenZip) {
    result.sevenZip = tools.sevenZip;
  }
  if (tools.vulkaninfo) {
    result.vulkaninfo = tools.vulkaninfo;
  }
  return result;
}

function optionalWine(wine: {
  winePath: string | undefined;
  winebootPath: string | undefined;
  wineserverPath: string | undefined;
  version: string | undefined;
  prefixCreationOk: boolean;
  prefixCheck: PrefixCheck;
  support64: boolean;
  support32: boolean;
  issues: string[];
}): DoctorReport["wine"] {
  const result: DoctorReport["wine"] = {
    prefixCreationOk: wine.prefixCreationOk,
    prefixCheck: wine.prefixCheck,
    support64: wine.support64,
    support32: wine.support32,
    issues: wine.issues
  };

  if (wine.winePath) {
    result.winePath = wine.winePath;
  }
  if (wine.winebootPath) {
    result.winebootPath = wine.winebootPath;
  }
  if (wine.wineserverPath) {
    result.wineserverPath = wine.wineserverPath;
  }
  if (wine.version) {
    result.version = wine.version;
  }

  return result;
}

function stripVerboseReport(report: DoctorReport): Omit<DoctorReport, "version"> {
  const { version: _version, ...jsonReport } = report;
  return jsonReport;
}
