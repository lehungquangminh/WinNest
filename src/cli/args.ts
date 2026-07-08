import { WinNestError } from "@/shared/errors.js";

export function requiredArg(command: string, value: string | undefined, name: string): string {
  if (!value) {
    throw new WinNestError("MISSING_ARGUMENT", `Usage: winnest ${command} <${name}>`);
  }
  return value;
}
