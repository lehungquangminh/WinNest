#!/usr/bin/env node

import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { basename, extname } from "node:path";
import { launchGui } from "@/core/gui/launch.js";
import { Logger } from "@/logging/logger.js";
import { globalLogPath } from "@/logging/paths.js";
import { WinNestError, toWinNestError } from "@/shared/errors.js";

async function main(): Promise<void> {
  const logger = new Logger(globalLogPath("open.log"));
  const args = process.argv.slice(2);
  const filePath = args.find((arg) => !arg.startsWith("--"));
  if (!filePath) {
    throw new Error("Usage: winnest-open <file-path> [--gui|--cli]");
  }
  const forceGui = args.includes("--gui");
  const forceCli = args.includes("--cli");
  if (forceGui && forceCli) {
    throw new WinNestError("CONFLICTING_OPEN_MODE", "Use either --gui or --cli, not both.");
  }

  const hasTty = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  await logger.info("winnest-open started", { filePath, hasTty, forceGui, forceCli });
  await validateOpenPath(filePath);

  if (!isInstallerLike(filePath)) {
    throw new WinNestError(
      "PORTABLE_EXE_NOT_SUPPORTED",
      "Portable Windows executables are not supported yet. Run an installer-like .exe or .msi, or use `winnest install <path>` manually.",
      { filePath }
    );
  }

  if (forceGui || (!forceCli && !hasTty)) {
    try {
      await launchGui({ installerPath: filePath });
      await logger.info("winnest-open handed installer to GUI", { filePath });
      return;
    } catch (error) {
      await logger.error("winnest-open GUI handoff failed", { filePath, error });
      if (!hasTty) {
        throw new WinNestError(
          "GUI_HANDOFF_FAILED",
          "WinNest could not open the Electron install window. Run `winnest install <path>` from a terminal.",
          { filePath, error }
        );
      }
      console.error("GUI handoff failed; falling back to CLI install.");
    }
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
