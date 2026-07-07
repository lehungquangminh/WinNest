import { readdir } from "node:fs/promises";
import { join } from "node:path";

export async function scanShortcutFiles(prefixPath: string): Promise<string[]> {
  const roots = [
    join(prefixPath, "drive_c", "users"),
    join(prefixPath, "drive_c", "ProgramData", "Microsoft", "Windows", "Start Menu")
  ];
  const shortcuts: string[] = [];

  for (const root of roots) {
    await walk(root, shortcuts);
  }

  return shortcuts.sort();
}

async function walk(root: string, shortcuts: string[]): Promise<void> {
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
      shortcuts.push(path);
    }
  }
}
