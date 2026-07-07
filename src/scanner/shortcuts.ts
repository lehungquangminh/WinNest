import { readdir } from "node:fs/promises";
import { join } from "node:path";
import type { Logger } from "../logging/logger.js";

export type ShortcutCandidate = {
  linuxPath: string;
  parserStatus: "not-implemented";
};

export async function scanShortcutFiles(prefixPath: string, logger?: Logger): Promise<ShortcutCandidate[]> {
  const roots = [
    join(prefixPath, "drive_c", "users"),
    join(prefixPath, "drive_c", "ProgramData", "Microsoft", "Windows", "Start Menu")
  ];
  const shortcuts: ShortcutCandidate[] = [];

  for (const root of roots) {
    await walk(root, shortcuts);
  }

  const sorted = shortcuts.sort((left, right) => left.linuxPath.localeCompare(right.linuxPath));
  await logger?.info("start menu shortcut scan finished", {
    roots,
    count: sorted.length,
    shortcuts: sorted,
    parserStatus: "TODO: parse .lnk targets without adding a heavy dependency"
  });

  return sorted;
}

async function walk(root: string, shortcuts: ShortcutCandidate[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      await walk(path, shortcuts);
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".lnk")) {
      shortcuts.push({
        linuxPath: path,
        parserStatus: "not-implemented"
      });
    }
  }
}
