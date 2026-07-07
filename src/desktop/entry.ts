import { chmod, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { getPaths } from "@/core/paths.js";
import type { ManagedApp } from "@/core/app.js";
import { Logger } from "@/logging/logger.js";
import { findExecutable } from "@/shared/which.js";
import { runCommand } from "@/shared/spawn.js";

export async function createDesktopEntry(app: ManagedApp, logger: Logger): Promise<string> {
  const filePath = join(getPaths().applicationsDir, `winnest-${app.id}.desktop`);
  const iconName = `winnest-${app.id}`;
  const content = `[Desktop Entry]
Type=Application
Name=${sanitizeDesktopValue(app.name)}
Exec=winnest run ${app.id}
Icon=${iconName}
Categories=Utility;
Terminal=false
StartupNotify=true
`;

  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
  await chmod(filePath, 0o755);
  await logger.info("desktop entry created", { filePath });

  const updateDesktopDatabase = await findExecutable("update-desktop-database");
  if (updateDesktopDatabase) {
    await runCommand(updateDesktopDatabase, [getPaths().applicationsDir], { logger, timeoutMs: 10000 });
  }

  return filePath;
}

function sanitizeDesktopValue(value: string): string {
  return value.replace(/[\r\n]/g, " ").trim();
}
