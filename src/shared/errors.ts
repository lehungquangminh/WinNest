export class WinNestError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "WinNestError";
  }
}

export function toWinNestError(error: unknown, fallbackCode = "UNKNOWN_ERROR"): WinNestError {
  if (error instanceof WinNestError) {
    return error;
  }

  if (error instanceof Error) {
    return new WinNestError(fallbackCode, error.message, {
      name: error.name,
      stack: error.stack
    });
  }

  return new WinNestError(fallbackCode, "An unknown WinNest error occurred.", error);
}
