import { readdir, stat } from "node:fs/promises";
import { basename, join, relative, sep } from "node:path";
import type { Logger } from "../logging/logger.js";
import type { RegistryUninstallHint } from "./registry.js";

export type ExecutableCandidate = {
  windowsPath: string;
  linuxPath: string;
  name: string;
  score: number;
  reasons: string[];
  sizeBytes: number;
  modifiedAt: string;
};

export type ExecutableScanSummary = {
  directoriesScanned: string[];
  exeFilesFound: number;
  candidates: ExecutableCandidate[];
};

const SKIP_DIRS = new Set(["windows", "temp", "$recycle.bin"]);
const BAD_NAME_PARTS = ["unins", "uninstall", "update", "crash", "crashreporter", "helper", "setup", "install", "repair"];

export type ExecutableScanOptions = {
  logger?: Logger;
  referenceTimeMs?: number;
  registryHints?: RegistryUninstallHint[];
};

export async function scanExecutables(
  prefixPath: string,
  appHint: string,
  options: ExecutableScanOptions = {}
): Promise<ExecutableCandidate[]> {
  const roots = [
    join(prefixPath, "drive_c", "Program Files"),
    join(prefixPath, "drive_c", "Program Files (x86)")
  ];
  const candidates: ExecutableCandidate[] = [];
  const directoriesScanned: string[] = [];
  let exeFilesFound = 0;

  for (const root of roots) {
    await walk(root, directoriesScanned, async (path) => {
      if (!path.toLowerCase().endsWith(".exe")) {
        return;
      }

      exeFilesFound += 1;
      candidates.push(await scoreExecutable(prefixPath, path, appHint, options.referenceTimeMs, options.registryHints ?? []));
    });
  }

  const sorted = candidates.sort((left, right) => right.score - left.score || left.name.localeCompare(right.name));
  await options.logger?.info("executable scan finished", {
    directoriesScanned,
    exeFilesFound,
    candidateCount: sorted.length,
    candidates: sorted.map((candidate) => ({
      path: candidate.windowsPath,
      linuxPath: candidate.linuxPath,
      score: candidate.score,
      reasons: candidate.reasons,
      sizeBytes: candidate.sizeBytes,
      modifiedAt: candidate.modifiedAt
    }))
  });

  return sorted;
}

async function walk(
  root: string,
  directoriesScanned: string[],
  onFile: (path: string) => Promise<void>
): Promise<void> {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
    directoriesScanned.push(root);
  } catch {
    return;
  }

  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name.toLowerCase())) {
        await walk(path, directoriesScanned, onFile);
      }
      continue;
    }

    if (entry.isFile()) {
      await onFile(path);
    }
  }
}

async function scoreExecutable(
  prefixPath: string,
  linuxPath: string,
  appHint: string,
  referenceTimeMs: number | undefined,
  registryHints: readonly RegistryUninstallHint[]
): Promise<ExecutableCandidate> {
  const info = await stat(linuxPath);
  const name = basename(linuxPath);
  const lowerName = name.toLowerCase();
  const normalizedName = normalizeName(name);
  const normalizedHint = normalizeName(appHint);
  const normalizedFolders = linuxPath
    .split(sep)
    .slice(0, -1)
    .map((part) => normalizeName(part))
    .filter((part) => part.length > 0);
  const reasons: string[] = [];
  let score = 20;

  if (linuxPath.includes(`${sep}Program Files${sep}`)) {
    score += 15;
    reasons.push("inside Program Files");
  }

  if (linuxPath.includes(`${sep}Program Files (x86)${sep}`)) {
    score += 12;
    reasons.push("inside Program Files (x86)");
  }

  if (normalizedHint && normalizedName.includes(normalizedHint)) {
    score += 35;
    reasons.push("filename similar to app name");
  }

  if (normalizedHint && normalizedFolders.some((folder) => folder.includes(normalizedHint) || normalizedHint.includes(folder))) {
    score += 25;
    reasons.push("folder name resembles app name");
  }

  if (BAD_NAME_PARTS.some((part) => lowerName.includes(part))) {
    score -= 45;
    reasons.push("looks like maintenance executable");
  } else {
    score += 10;
    reasons.push("not an uninstaller");
  }

  if (info.size >= 1024 * 1024) {
    score += 15;
    reasons.push("larger than tiny helper binaries");
  } else if (info.size < 128 * 1024) {
    score -= 10;
    reasons.push("very small executable");
  }

  if (referenceTimeMs && info.mtimeMs >= referenceTimeMs - 5 * 60 * 1000) {
    score += 15;
    reasons.push("recently modified");
  }

  if (matchesRegistryHint(prefixPath, linuxPath, registryHints)) {
    score += 10;
    reasons.push("matches registry uninstall hint");
  }

  return {
    windowsPath: toWindowsPath(prefixPath, linuxPath),
    linuxPath,
    name,
    score,
    reasons,
    sizeBytes: info.size,
    modifiedAt: info.mtime.toISOString()
  };
}

function matchesRegistryHint(
  prefixPath: string,
  linuxPath: string,
  registryHints: readonly RegistryUninstallHint[]
): boolean {
  const normalizedLinuxPath = linuxPath.toLowerCase();
  for (const hint of registryHints) {
    if (!hint.installLocation) {
      continue;
    }

    const linuxInstallLocation = registryWindowsPathToLinux(prefixPath, hint.installLocation);
    if (linuxInstallLocation && normalizedLinuxPath.startsWith(linuxInstallLocation.toLowerCase())) {
      return true;
    }
  }

  return false;
}

function registryWindowsPathToLinux(prefixPath: string, windowsPath: string): string | undefined {
  const match = /^c:[/\\](.*)$/i.exec(windowsPath.trim());
  const rawRelativePath = match?.[1];
  if (!rawRelativePath) {
    return undefined;
  }

  return join(prefixPath, "drive_c", ...rawRelativePath.split(/[\\/]+/).filter((part) => part.length > 0));
}

function toWindowsPath(prefixPath: string, linuxPath: string): string {
  const driveRoot = join(prefixPath, "drive_c");
  const rel = relative(driveRoot, linuxPath).split(sep).join("/");
  return `C:/${rel}`;
}

function normalizeName(value: string): string {
  return value
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}
