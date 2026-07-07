import type { WinNestError } from "./errors.js";

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: WinNestError };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function err<T = never>(error: WinNestError): Result<T> {
  return { ok: false, error };
}
