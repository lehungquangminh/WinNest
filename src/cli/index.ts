#!/usr/bin/env node

import { WinNestError, toWinNestError } from "../shared/errors.js";

async function main(): Promise<void> {
  const [, , command] = process.argv;

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  throw new WinNestError("COMMAND_NOT_IMPLEMENTED", `Command is not implemented yet: ${command}`);
}

function printHelp(): void {
  console.log(`WinNest

Usage:
  winnest doctor
  winnest install <installer-path>
  winnest open <file-path>
  winnest run <app-id>
  winnest list
  winnest info <app-id>
  winnest repair <app-id>
  winnest reset <app-id>
  winnest uninstall <app-id>`);
}

main().catch((error: unknown) => {
  const winNestError = toWinNestError(error);
  console.error(`${winNestError.code}: ${winNestError.message}`);
  process.exitCode = 1;
});
