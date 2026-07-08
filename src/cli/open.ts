#!/usr/bin/env node

import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { basename, extname } from "node:path";
import { Logger } from "@/logging/logger.js";
import { globalLogPath } from "@/logging/paths.js";
import { WinNestError, toWinNestError } from "@/shared/errors.js";

async function main(): Promise<void> {
  const logger = new Logger(globalLogPath("open.log"));
  const filePath = process.argv[2];
  if (!filePath) {
    throw new Error("Usage: winnest-open <file-path>");
  }

  await logger.info("winnest-open started", { filePath, hasTty: process.stdin.isTTY && process.stdout.isTTY });
  await validateOpenPath(filePath);

  if (!isInstallerLike(filePath)) {
    throw new WinNestError(
      "PORTABLE_EXE_NOT_SUPPORTED",
      "Portable Windows executables are not supported yet. Run an installer-like .exe or .msi, or use `winnest install <path>` manually.",
      { filePath }
    );
  }

  const { main: cliMain } = await import("./runtime.js");
  await cliMain(["open", filePath]);
}

main().catch((error: unknown) => {
  const winNestError = toWinNestError(error);
  console.error(`${winNestError.code}: ${winNestError.message}`);
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.error("Run `winnest install <path>` from a terminal to see interactive launcher selection if needed.");
  }
  process.exitCode = 1;
});

async function validateOpenPath(filePath: string): Promise<void> {
  try {
    await access(filePath, constants.R_OK);
  } catch (error) {
    throw new WinNestError("OPEN_PATH_NOT_READABLE", "File manager path is not readable.", { filePath, error });
  }
}

function isInstallerLike(filePath: string): boolean {
  const extension = extname(filePath).toLowerCase();
  if (extension === ".msi") {
    return true;
  }
  if (extension !== ".exe") {
    return false;
  }

  const name = basename(filePath).toLowerCase();
  return /setup|install|installer|npp|winscp|7z|iview|zalo/.test(name);
}
