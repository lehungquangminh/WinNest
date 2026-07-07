import { join } from "node:path";
import { WinNestError } from "../shared/errors.js";

export function windowsPathToLinux(prefixPath: string, windowsPath: string): string {
  const match = /^c:[/\\](.*)$/i.exec(windowsPath);
  if (!match) {
    throw new WinNestError("UNSUPPORTED_WINDOWS_PATH", "Only C: drive paths are supported for launch targets.", {
      windowsPath
    });
  }

  const rawRelativePath = match[1];
  if (rawRelativePath === undefined) {
    throw new WinNestError("UNSUPPORTED_WINDOWS_PATH", "Windows path did not include a launch target.", {
      windowsPath
    });
  }

  const relativePath = rawRelativePath
    .split(/[\\/]+/)
    .filter((part) => part.length > 0);
  return join(prefixPath, "drive_c", ...relativePath);
}
