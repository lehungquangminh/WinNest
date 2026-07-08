import { createMimeHandler } from "@/desktop/mime.js";
import { Logger } from "@/logging/logger.js";
import { globalLogPath } from "@/logging/paths.js";

export async function mimeCommand(): Promise<void> {
  const logger = new Logger(globalLogPath("mime.log"));
  const path = await createMimeHandler(logger);
  console.log(`MIME handler registered: ${path}`);
}
