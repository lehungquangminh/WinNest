import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { safeSpawn } from "../shared/spawn.js";

const CASES = [
  join("Bộ cài Test App", "setup file.exe"),
  join("Test App (2026)", "setup.exe"),
  join("Minh's App", "setup.exe"),
  join("Bracket [Test] App", "setup file.exe"),
  join("Long Filename App", `${"very-long-".repeat(12)}setup.exe`)
];

async function main(): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), "winnest-path-torture-"));
  const logFile = join(root, "spawn.log");

  try {
    for (const relativePath of CASES) {
      const filePath = join(root, relativePath);
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, "fake installer", "utf8");

      const result = await safeSpawn(
        process.execPath,
        ["-e", "process.stdout.write(process.argv[1] ?? '')", filePath],
        { logFile, timeoutMs: 5000 }
      );

      if (!result.ok) {
        throw result.error;
      }

      if (result.value.exitCode !== 0 || result.value.stdout !== filePath) {
        throw new Error(`Path torture case failed: ${filePath}`);
      }
    }

    const log = await readFile(logFile, "utf8");
    for (const relativePath of CASES) {
      const filePath = join(root, relativePath);
      if (!log.includes(filePath)) {
        throw new Error(`Log file does not include path: ${filePath}`);
      }
    }

    console.log(`Path torture passed: ${CASES.length} cases`);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
