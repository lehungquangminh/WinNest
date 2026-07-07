import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { delimiter, join } from "node:path";

export async function findExecutable(name: string): Promise<string | undefined> {
  const pathEnv = process.env.PATH;
  if (!pathEnv) {
    return undefined;
  }

  for (const dir of pathEnv.split(delimiter)) {
    if (!dir) {
      continue;
    }

    const candidate = join(dir, name);
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Try the next PATH entry.
    }
  }

  return undefined;
}
