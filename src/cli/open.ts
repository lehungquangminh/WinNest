#!/usr/bin/env node

import { toWinNestError } from "@/shared/errors.js";

async function main(): Promise<void> {
  const filePath = process.argv[2];
  if (!filePath) {
    throw new Error("Usage: winnest-open <file-path>");
  }

  const { main: cliMain } = await import("./runtime.js");
  await cliMain(["open", filePath]);
}

main().catch((error: unknown) => {
  const winNestError = toWinNestError(error);
  console.error(`${winNestError.code}: ${winNestError.message}`);
  process.exitCode = 1;
});
