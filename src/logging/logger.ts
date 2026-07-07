import { mkdir, appendFile } from "node:fs/promises";
import { dirname } from "node:path";

type LogLevel = "info" | "warn" | "error";

export class Logger {
  constructor(private readonly filePath: string) {}

  async info(message: string, details?: unknown): Promise<void> {
    await this.write("info", message, details);
  }

  async warn(message: string, details?: unknown): Promise<void> {
    await this.write("warn", message, details);
  }

  async error(message: string, details?: unknown): Promise<void> {
    await this.write("error", message, details);
  }

  private async write(level: LogLevel, message: string, details?: unknown): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const entry = {
      time: new Date().toISOString(),
      level,
      message,
      details: sanitizeDetails(details)
    };
    await appendFile(this.filePath, `${JSON.stringify(entry)}\n`, "utf8");
  }
}

function sanitizeDetails(details: unknown): unknown {
  if (details instanceof Error) {
    return {
      name: details.name,
      message: details.message,
      stack: details.stack
    };
  }

  return details;
}
