#!/usr/bin/env node

import { WinNestError, toWinNestError } from "@/shared/errors.js";
import { main as runCli } from "@/cli/runtime.js";

async function main(): Promise<void> {
  const [, , command, ...args] = process.argv;

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  await runCli([command, ...args]);
}

function printHelp(): void {
  console.log(`WinNest

Usage:
  winnest doctor [--verbose] [--fix-hints] [--json]
  winnest install <installer-path>
  winnest open <file-path>
  winnest run <app-id>
  winnest list
  winnest info <app-id>
  winnest repair <app-id>
  winnest repair-system [--json]
  winnest reset <app-id>
  winnest rescan <app-id>
  winnest uninstall <app-id>
  winnest register-mime
  winnest setup-wine`);
}

main().catch((error: unknown) => {
  const winNestError = toWinNestError(error);
  console.error(`${winNestError.code}: ${winNestError.message}`);
  process.exitCode = 1;
});
