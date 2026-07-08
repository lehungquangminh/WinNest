#!/usr/bin/env node

import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { basename, extname } from "node:path";
import { launchGui } from "@/core/gui/launch.js";
import { Logger } from "@/logging/logger.js";
import { globalLogPath } from "@/logging/paths.js";
import { WinNestError, toWinNestError } from "@/shared/errors.js";
import { installApp } from "@/core/install/flow.js";
import { findExecutable } from "@/shared/which.js";

async function main(): Promise<void> {
  const logger = new Logger(globalLogPath("open.log"));
  const args = process.argv.slice(2);
  const filePath = args.find((arg) => !arg.startsWith("--"));
  if (!filePath) {
    throw new Error("Usage: winnest-open <file-path> [--gui|--cli|--transparent]");
  }
  const forceGui = args.includes("--gui");
  const forceCli = args.includes("--cli");
  const forceTransparent = args.includes("--transparent");
  if ((forceGui && forceCli) || (forceGui && forceTransparent) || (forceCli && forceTransparent)) {
    throw new WinNestError("CONFLICTING_OPEN_MODE", "Use either --gui, --cli, or --transparent.");
  }

  const hasTty = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  await logger.info("winnest-open started", { filePath, hasTty, forceGui, forceCli, forceTransparent });
  await validateOpenPath(filePath);

  if (!isInstallerLike(filePath)) {
    throw new WinNestError(
      "PORTABLE_EXE_NOT_SUPPORTED",
      "Portable Windows executables are not supported yet. Run an installer-like .exe or .msi, or use `winnest install <path>` manually.",
      { filePath }
    );
  }

  if (forceGui) {
    try {
      await launchGui({ installerPath: filePath });
      await logger.info("winnest-open handed installer to GUI", { filePath });
      return;
    } catch (error) {
      await logger.error("winnest-open GUI handoff failed", { filePath, error });
      throw new WinNestError("GUI_HANDOFF_FAILED", "WinNest could not open the Electron install window.", { filePath, error });
    }
  }

  if (forceCli) {
    const { main: cliMain } = await import("./runtime.js");
    await cliMain(["install", filePath]);
    return;
  }

  // Transparent mode (default or --transparent)
  console.log("WinNest transparent installer starting...");
  let allocatedAppId: string | undefined;

  try {
    const app = await installApp(filePath, {
      desktopIcon: true,
      onAppIdAllocated: (id) => {
        allocatedAppId = id;
        console.log(`Allocated Application ID: ${id}`);
        void sendDesktopNotification("WinNest Installer", `Starting installation of ${basename(filePath)} (ID: ${id})...`);
      }
    });

    console.log(`[SUCCESS] Installed: ${app.name} (${app.id})`);
    void sendDesktopNotification("WinNest Installer", `Successfully installed ${app.name}!`);
    await logger.info("winnest-open transparent install completed", { app });
  } catch (error) {
    const winNestError = toWinNestError(error);
    await logger.error("winnest-open transparent install failed", { filePath, error, allocatedAppId });

    if (!hasTty) {
      console.error("Transparent install failed; opening Electron GUI for user recovery.");
      void sendDesktopNotification(
        "WinNest Installer",
        winNestError.code === "LAUNCHER_SELECTION_REQUIRED"
          ? "Launcher selection required to complete installation."
          : "Installation failed. Click to view logs and details."
      );
      try {
        await launchGui({
          installerPath: filePath,
          appId: allocatedAppId,
          page: "install"
        });
      } catch (guiError) {
        await logger.error("winnest-open recovery GUI launch failed", guiError);
      }
    } else {
      console.error(`\n[ERROR] Transparent install failed: ${winNestError.message}`);
      if (allocatedAppId) {
        console.error(`Install logs: ~/.local/share/winnest/apps/${allocatedAppId}/logs/install.log`);
      }
      process.exitCode = 1;
    }
  }
}

async function sendDesktopNotification(title: string, message: string): Promise<void> {
  const notifySend = await findExecutable("notify-send");
  if (notifySend) {
    try {
      const { spawn } = await import("node:child_process");
      const proc = spawn(notifySend, [title, message], { stdio: "ignore", detached: true });
      proc.unref();
    } catch {
      // Ignore notification failures
    }
  }
}

main().catch((error: unknown) => {
  const winNestError = toWinNestError(error);
  console.error(`${winNestError.code}: ${winNestError.message}`);
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
