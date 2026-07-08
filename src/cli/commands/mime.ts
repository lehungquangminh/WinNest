import { createMimeHandler } from "@/desktop/mime.js";
import { Logger } from "@/logging/logger.js";
import { globalLogPath } from "@/logging/paths.js";
import { findExecutable } from "@/shared/which.js";

export async function mimeCommand(args: readonly string[] = []): Promise<void> {
  const force = args.includes("--force");
  if (!force) {
    const hasOpen = await findExecutable("winnest-open");
    if (!hasOpen) {
      console.error(`winnest-open was not found in PATH.

For development, run:
  npm run build
  node dist/cli/index.js dev-install

Then run:
  winnest register-mime`);
      process.exitCode = 1;
      return;
    }
  }

  const logger = new Logger(globalLogPath("mime.log"));
  const path = await createMimeHandler(logger);
  console.log(`MIME handler registered: ${path}`);
}
