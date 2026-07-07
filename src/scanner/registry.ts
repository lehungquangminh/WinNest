import type { Logger } from "@/logging/logger.js";
import { runCommand } from "@/shared/spawn.js";
import { buildWineEnv } from "@/wine/env.js";
import { detectSystemWine } from "@/wine/runner.js";

export type RegistryUninstallHint = {
  key: string;
  displayName: string | undefined;
  displayIcon: string | undefined;
  installLocation: string | undefined;
};

const UNINSTALL_KEYS = [
  "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
  "HKLM\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
  "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall"
];

export async function scanRegistryUninstallEntries(
  prefixPath: string,
  logger: Logger
): Promise<RegistryUninstallHint[]> {
  const runner = await detectSystemWine();
  if (!runner.winePath) {
    await logger.warn("registry uninstall scan skipped; wine not found", { prefixPath });
    return [];
  }

  const hints: RegistryUninstallHint[] = [];
  for (const key of UNINSTALL_KEYS) {
    try {
      const result = await runCommand(runner.winePath, ["reg", "query", key, "/s"], {
        logger,
        env: buildWineEnv(prefixPath),
        timeoutMs: 30000
      });

      if (result.exitCode !== 0) {
        await logger.warn("registry uninstall query failed", {
          key,
          exitCode: result.exitCode,
          stderr: result.stderr.slice(-2000)
        });
        continue;
      }

      hints.push(...parseRegistryOutput(result.stdout));
    } catch (error) {
      await logger.warn("registry uninstall query threw", { key, error });
    }
  }

  await logger.info("registry uninstall scan finished", {
    count: hints.length,
    hints
  });
  return hints;
}

function parseRegistryOutput(output: string): RegistryUninstallHint[] {
  const hints: RegistryUninstallHint[] = [];
  let current: RegistryUninstallHint | undefined;

  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    if (trimmed.startsWith("HKEY_") || trimmed.startsWith("HKLM\\") || trimmed.startsWith("HKCU\\")) {
      if (current && (current.displayName || current.displayIcon || current.installLocation)) {
        hints.push(current);
      }
      current = {
        key: trimmed,
        displayName: undefined,
        displayIcon: undefined,
        installLocation: undefined
      };
      continue;
    }

    if (!current) {
      continue;
    }

    const match = /^\s*(DisplayName|DisplayIcon|InstallLocation)\s+REG_\w+\s+(.+)$/.exec(line);
    if (!match) {
      continue;
    }

    const name = match[1];
    const value = match[2];
    if (!name || !value) {
      continue;
    }

    if (name === "DisplayName") {
      current.displayName = value.trim();
    } else if (name === "DisplayIcon") {
      current.displayIcon = value.trim();
    } else if (name === "InstallLocation") {
      current.installLocation = value.trim();
    }
  }

  if (current && (current.displayName || current.displayIcon || current.installLocation)) {
    hints.push(current);
  }

  return hints;
}
