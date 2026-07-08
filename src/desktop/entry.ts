import { chmod, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { getPaths } from "@/core/paths.js";
import type { ManagedApp } from "@/core/app.js";
import { Logger } from "@/logging/logger.js";
import { findExecutable } from "@/shared/which.js";
import { runCommand } from "@/shared/spawn.js";

export type DesktopEntryOptions = {
  categories?: string[];
};

export async function createDesktopEntry(
  app: ManagedApp,
  logger: Logger,
  options: DesktopEntryOptions = {}
): Promise<string> {
  const filePath = join(getPaths().applicationsDir, `winnest-${app.id}.desktop`);
  const iconName = `winnest-${app.id}`;
  const categories = formatCategories(options.categories);
  const content = `[Desktop Entry]
Type=Application
Name=${sanitizeDesktopValue(app.name)}
Exec=winnest run ${app.id}
Icon=${iconName}
Categories=${categories}
Terminal=false
StartupNotify=true
`;

  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
  await chmod(filePath, 0o755);
  await logger.info("desktop entry created", { filePath, categories });

  const updateDesktopDatabase = await findExecutable("update-desktop-database");
  if (updateDesktopDatabase) {
    await runCommand(updateDesktopDatabase, [getPaths().applicationsDir], { logger, timeoutMs: 10000 });
  }

  return filePath;
}

function formatCategories(categories: readonly string[] | undefined): string {
  const clean = (categories ?? ["Utility"])
    .map((category) => category.replace(/[^A-Za-z0-9-]/g, "").trim())
    .filter((category) => category.length > 0);
  const unique = clean.length > 0 ? [...new Set(clean)] : ["Utility"];
  return `${unique.join(";")};`;
}

function sanitizeDesktopValue(value: string): string {
  return value.replace(/[\r\n]/g, " ").trim();
}
