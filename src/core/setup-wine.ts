import { runDoctor } from "@/core/doctor.js";
import { Logger } from "@/logging/logger.js";
import { globalLogPath } from "@/logging/paths.js";
import { WinNestError } from "@/shared/errors.js";
import { runCommand } from "@/shared/spawn.js";
import { findExecutable } from "@/shared/which.js";

const REQUIRED_PACKAGES = [
  "wine",
  "wine64",
  "wine32:i386",
  "xdg-utils",
  "desktop-file-utils",
  "shared-mime-info"
];

const RECOMMENDED_PACKAGES = [
  "winetricks",
  "cabextract",
  "p7zip-full",
  "mesa-vulkan-drivers",
  "mesa-vulkan-drivers:i386"
];

export async function setupWine(): Promise<void> {
  if (process.platform !== "linux") {
    throw new WinNestError("UNSUPPORTED_OS", "Wine setup is currently supported only on Linux.");
  }

  const aptGet = await findExecutable("apt-get");
  const dpkg = await findExecutable("dpkg");
  if (!aptGet || !dpkg) {
    throw new WinNestError(
      "APT_NOT_FOUND",
      "Automatic Wine setup currently supports Debian/Ubuntu/nonlaOS systems with apt-get and dpkg."
    );
  }

  const logger = new Logger(globalLogPath("setup-wine.log"));
  const sudo = await getSudoCommand();
  await logger.info("wine setup started", { aptGet, dpkg, sudo });

  console.log("WinNest Wine Setup");
  console.log("");
  console.log("This will install Wine and desktop integration packages with apt.");
  console.log("If sudo asks for a password, type it in your terminal. WinNest never reads or stores it.");
  console.log("");

  const hasI386 = await hasForeignArchitecture(dpkg, "i386");
  if (!hasI386) {
    console.log("Enabling i386 architecture for 32-bit Wine support...");
    await runSystemCommand(sudo, dpkg, ["--add-architecture", "i386"], logger);
  } else {
    console.log("i386 architecture already enabled.");
  }

  console.log("Updating package indexes...");
  await runSystemCommand(sudo, aptGet, ["update"], logger);

  console.log("Installing required Wine packages...");
  await runSystemCommand(sudo, aptGet, ["install", "-y", ...REQUIRED_PACKAGES], logger);

  console.log("Installing recommended compatibility packages...");
  const recommendedResult = await runSystemCommand(sudo, aptGet, ["install", "-y", ...RECOMMENDED_PACKAGES], logger, {
    allowFailure: true
  });
  if (!recommendedResult) {
    console.log("Some recommended packages could not be installed. Core Wine packages were installed first.");
  }

  console.log("");
  console.log("Re-running WinNest doctor...");
  await runDoctor({ verbose: true });
  await logger.info("wine setup finished", { exitCode: process.exitCode ?? 0 });
}

async function hasForeignArchitecture(dpkg: string, architecture: string): Promise<boolean> {
  const result = await runCommand(dpkg, ["--print-foreign-architectures"], { timeoutMs: 10000 });
  return result.exitCode === 0 && result.stdout.split(/\s+/).includes(architecture);
}

async function getSudoCommand(): Promise<string | undefined> {
  if (typeof process.getuid === "function" && process.getuid() === 0) {
    return undefined;
  }

  const sudo = await findExecutable("sudo");
  if (!sudo) {
    throw new WinNestError("SUDO_NOT_FOUND", "sudo is required to install Wine packages from a non-root shell.");
  }

  return sudo;
}

async function runSystemCommand(
  sudo: string | undefined,
  command: string,
  args: readonly string[],
  logger: Logger,
  options: { allowFailure?: boolean } = {}
): Promise<boolean> {
  const actualCommand = sudo ?? command;
  const actualArgs = sudo ? [command, ...args] : [...args];
  await logger.info("setup command started", { command: actualCommand, args: actualArgs });
  const result = await runCommand(actualCommand, actualArgs, {
    logger,
    stdin: "inherit",
    stdio: "inherit"
  });

  await logger.info("setup command exited", {
    command: actualCommand,
    args: actualArgs,
    exitCode: result.exitCode
  });

  if (result.exitCode !== 0) {
    if (options.allowFailure) {
      return false;
    }

    throw new WinNestError("SETUP_WINE_COMMAND_FAILED", "A Wine setup command failed.", {
      command: actualCommand,
      args: actualArgs,
      exitCode: result.exitCode
    });
  }

  return true;
}
