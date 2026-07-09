import { constants } from "node:fs";
import { access, copyFile, mkdir } from "node:fs/promises";
import { basename, join } from "node:path";
import { Logger } from "@/logging/logger.js";
import { runCommand } from "@/shared/spawn.js";
import { buildWineEnv } from "@/wine/env.js";
import { detectSystemWine } from "@/wine/runner.js";

type FontProvisionResult = {
  copied: string[];
  skipped: string[];
  availableFamilies: string[];
  replacements: string[];
  warnings: string[];
};

const FONT_FAMILIES = [
  "Noto Sans",
  "Noto Serif",
  "Noto Sans Mono",
  "DejaVu Sans",
  "DejaVu Serif",
  "DejaVu Sans Mono",
  "Liberation Sans",
  "Liberation Serif",
  "Liberation Mono"
];

const SANS_FAMILIES = ["Noto Sans", "DejaVu Sans", "Liberation Sans"];
const SERIF_FAMILIES = ["Noto Serif", "DejaVu Serif", "Liberation Serif"];
const MONO_FAMILIES = ["Noto Sans Mono", "DejaVu Sans Mono", "Liberation Mono"];

export async function provisionPrefixFonts(prefixPath: string, logger: Logger): Promise<FontProvisionResult> {
  const result: FontProvisionResult = {
    copied: [],
    skipped: [],
    availableFamilies: [],
    replacements: [],
    warnings: []
  };
  const fontsDir = join(prefixPath, "drive_c", "windows", "Fonts");

  await logger.info("prefix font provisioning started", { prefixPath, fontsDir });

  try {
    await mkdir(fontsDir, { recursive: true });
  } catch (error) {
    result.warnings.push("Could not create Wine Fonts directory.");
    await logger.warn("prefix font directory unavailable", { prefixPath, fontsDir, error });
    return result;
  }

  if (!(await hasFontconfig(logger))) {
    result.warnings.push("fontconfig fc-match is unavailable.");
    await logger.warn("prefix font provisioning skipped; fc-match unavailable", { prefixPath });
    return result;
  }

  for (const family of FONT_FAMILIES) {
    const fontFile = await resolveFontFile(family, logger);
    if (!fontFile) {
      continue;
    }

    result.availableFamilies.push(family);
    const target = join(fontsDir, basename(fontFile));
    try {
      await access(target, constants.R_OK);
      result.skipped.push(target);
      continue;
    } catch {
      // Missing target is expected; copy below.
    }

    try {
      await copyFile(fontFile, target);
      result.copied.push(target);
    } catch (error) {
      result.warnings.push(`Could not copy font: ${fontFile}`);
      await logger.warn("font copy failed", { family, fontFile, target, error });
    }
  }

  const replacements = await registerFontReplacements(prefixPath, result.availableFamilies, logger);
  result.replacements.push(...replacements);

  await logger.info("prefix font provisioning finished", result);
  return result;
}

async function hasFontconfig(logger: Logger): Promise<boolean> {
  try {
    const result = await runCommand("fc-match", ["--version"], { logger, timeoutMs: 5000 });
    return result.exitCode === 0;
  } catch (error) {
    await logger.warn("fc-match command unavailable", { error });
    return false;
  }
}

async function resolveFontFile(family: string, logger: Logger): Promise<string | undefined> {
  try {
    const result = await runCommand("fc-match", ["-f", "%{file}\n", family], { logger, timeoutMs: 5000 });
    if (result.exitCode !== 0) {
      await logger.warn("font lookup failed", { family, exitCode: result.exitCode, stderr: result.stderr });
      return undefined;
    }

    const fontFile = result.stdout.trim().split(/\r?\n/u)[0];
    if (!fontFile) {
      return undefined;
    }

    await access(fontFile, constants.R_OK);
    return fontFile;
  } catch (error) {
    await logger.warn("font lookup unavailable", { family, error });
    return undefined;
  }
}

async function registerFontReplacements(
  prefixPath: string,
  availableFamilies: readonly string[],
  logger: Logger
): Promise<string[]> {
  const runner = await detectSystemWine();
  if (!runner.winePath) {
    await logger.warn("font replacement registration skipped; wine missing", { prefixPath });
    return [];
  }

  const sans = pickFamily(availableFamilies, SANS_FAMILIES);
  const serif = pickFamily(availableFamilies, SERIF_FAMILIES);
  const mono = pickFamily(availableFamilies, MONO_FAMILIES);
  const replacements: Array<[string, string]> = [];
  if (sans) {
    replacements.push(
      ["Arial", sans],
      ["Arial Unicode MS", sans],
      ["Microsoft Sans Serif", sans],
      ["Segoe UI", sans],
      ["Tahoma", sans],
      ["Verdana", sans]
    );
  }
  if (serif) {
    replacements.push(["Times New Roman", serif], ["Georgia", serif]);
  }
  if (mono) {
    replacements.push(["Courier New", mono], ["Consolas", mono]);
  }
  const applied: string[] = [];

  for (const [windowsFamily, replacementFamily] of replacements) {
    const result = await runCommand(
      runner.winePath,
      ["reg", "add", "HKCU\\Software\\Wine\\Fonts\\Replacements", "/v", windowsFamily, "/d", replacementFamily, "/f"],
      {
        logger,
        env: buildWineEnv(prefixPath),
        timeoutMs: 10000,
        stdin: "ignore"
      }
    );

    if (result.exitCode === 0) {
      applied.push(`${windowsFamily}=${replacementFamily}`);
    } else {
      await logger.warn("font replacement registration failed", {
        windowsFamily,
        replacementFamily,
        exitCode: result.exitCode,
        stderr: result.stderr
      });
    }
  }

  return applied;
}

function pickFamily(availableFamilies: readonly string[], preferred: readonly string[]): string | undefined {
  return preferred.find((family) => availableFamilies.includes(family));
}
