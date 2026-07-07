import { chmod, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { getPaths } from "../core/paths.js";
import { Logger } from "../logging/logger.js";
import { runCommand } from "../shared/spawn.js";
import { findExecutable } from "../shared/which.js";

const MIME_TYPES = [
  "application/x-ms-dos-executable",
  "application/x-msi",
  "application/vnd.microsoft.portable-executable"
] as const;

export async function createMimeHandler(logger: Logger): Promise<string> {
  const desktopFileName = "winnest-open.desktop";
  const desktopPath = join(getPaths().applicationsDir, desktopFileName);
  const content = `[Desktop Entry]
Type=Application
Name=WinNest
Exec=winnest-open %f
MimeType=${MIME_TYPES.join(";")};
NoDisplay=true
Terminal=false
`;

  await mkdir(dirname(desktopPath), { recursive: true });
  await writeFile(desktopPath, content, "utf8");
  await chmod(desktopPath, 0o755);
  await logger.info("mime handler desktop entry created", { desktopPath });

  const xdgMime = await findExecutable("xdg-mime");
  if (xdgMime) {
    for (const mimeType of MIME_TYPES) {
      await runCommand(xdgMime, ["default", desktopFileName, mimeType], { logger, timeoutMs: 10000 });
    }
  }

  const updateDesktopDatabase = await findExecutable("update-desktop-database");
  if (updateDesktopDatabase) {
    await runCommand(updateDesktopDatabase, [getPaths().applicationsDir], { logger, timeoutMs: 10000 });
  }

  return desktopPath;
}
