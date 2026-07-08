#!/usr/bin/env node

import { toWinNestError } from "@/shared/errors.js";
import { main as runCli } from "@/cli/runtime.js";

async function main(): Promise<void> {
  await runCli(process.argv.slice(2));
}

main().catch((error: unknown) => {
  const winNestError = toWinNestError(error);
  console.error(`${winNestError.code}: ${winNestError.message}`);
  process.exitCode = 1;
});
