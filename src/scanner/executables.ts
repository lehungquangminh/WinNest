import { readdir, stat } from "node:fs/promises";
import { basename, join, relative, sep } from "node:path";

export type ExecutableCandidate = {
  windowsPath: string;
  linuxPath: string;
  name: string;
  score: number;
  reasons: string[];
};

const SKIP_DIRS = new Set(["windows", "temp", "$recycle.bin"]);
const BAD_NAME_PARTS = ["unins", "uninstall", "update", "crash", "helper", "setup", "install", "repair"];

export async function scanExecutables(prefixPath: string, appHint: string): Promise<ExecutableCandidate[]> {
  const roots = [
    join(prefixPath, "drive_c", "Program Files"),
    join(prefixPath, "drive_c", "Program Files (x86)")
  ];
  const candidates: ExecutableCandidate[] = [];

  for (const root of roots) {
    await walk(root, async (path) => {
      if (!path.toLowerCase().endsWith(".exe")) {
        return;
      }

      candidates.push(scoreExecutable(prefixPath, path, appHint));
    });
  }

  return candidates.sort((left, right) => right.score - left.score || left.name.localeCompare(right.name));
}

async function walk(root: string, onFile: (path: string) => Promise<void>): Promise<void> {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name.toLowerCase())) {
        await walk(path, onFile);
      }
      continue;
    }

    if (entry.isFile()) {
      await onFile(path);
    }
  }
}

function scoreExecutable(prefixPath: string, linuxPath: string, appHint: string): ExecutableCandidate {
  const name = basename(linuxPath);
  const lowerName = name.toLowerCase();
  const normalizedName = normalizeName(name);
  const normalizedHint = normalizeName(appHint);
  const reasons: string[] = [];
  let score = 20;

  if (linuxPath.includes(`${sep}Program Files${sep}`)) {
    score += 15;
    reasons.push("inside Program Files");
  }

  if (normalizedHint && normalizedName.includes(normalizedHint)) {
    score += 30;
    reasons.push("name matches installer");
  }

  if (BAD_NAME_PARTS.some((part) => lowerName.includes(part))) {
    score -= 45;
    reasons.push("looks like maintenance executable");
  }

  return {
    windowsPath: toWindowsPath(prefixPath, linuxPath),
    linuxPath,
    name,
    score,
    reasons
  };
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
