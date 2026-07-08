import { detectDistro } from "@/system/distro.js";
import { globalLogPath } from "@/logging/paths.js";
import { Logger } from "@/logging/logger.js";
import { WinNestError } from "@/shared/errors.js";
import { runCommand } from "@/shared/spawn.js";
import { findExecutable } from "@/shared/which.js";

export async function installSystemDeps(): Promise<void> {
  if (process.platform !== "linux") {
    throw new WinNestError("UNSUPPORTED_OS", "System dependency installation is supported only on Linux.");
  }

  const distro = await detectDistro();
  if (distro.family !== "debian" && distro.family !== "ubuntu") {
    throw new WinNestError(
      "UNSUPPORTED_DISTRO",
      "Automatic system dependency installation currently supports Debian/Ubuntu/nonlaOS-like systems only.",
      { distro }
    );
  }

  const logger = new Logger(globalLogPath("install-system-deps.log"));
  const dpkg = await requireExecutable("dpkg");
  const apt = await requireExecutable("apt");
  const sudo = await getSudoCommand();

  await logger.info("system dependency install started", { distro, dpkg, apt, sudo });

  console.log("WinNest System Dependency Install");
  console.log("");
  console.log("This will run real system package commands.");
  console.log("If sudo asks for a password, type it in your terminal. WinNest never reads or stores it.");
  console.log("");

  if (await hasForeignArchitecture(dpkg, "i386")) {
    console.log("i386 architecture already enabled.");
  } else {
    await runSystemCommand(sudo, dpkg, ["--add-architecture", "i386"], logger);
  }

  await runSystemCommand(sudo, apt, ["update"], logger);
  await runSystemCommand(sudo, apt, ["install", "wine32:i386", "winbind", "cabextract"], logger);

  console.log("");
  console.log("System dependency install finished.");
  console.log("Run `winnest doctor --verbose` to verify Wine 32-bit support.");
  await logger.info("system dependency install finished");
}

async function requireExecutable(name: string): Promise<string> {
  const path = await findExecutable(name);
  if (!path) {
    throw new WinNestError("COMMAND_NOT_FOUND", `Required command was not found: ${name}`);
  }

  return path;
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
    throw new WinNestError("SUDO_NOT_FOUND", "sudo is required to install system packages from a non-root shell.");
  }

  return sudo;
}

async function runSystemCommand(
  sudo: string | undefined,
  command: string,
  args: readonly string[],
  logger: Logger
): Promise<void> {
  const actualCommand = sudo ?? command;
  const actualArgs = sudo ? [command, ...args] : [...args];

  console.log(`Running: ${actualCommand} ${actualArgs.join(" ")}`);
  await logger.info("system install command started", { command: actualCommand, args: actualArgs });

  const result = await runCommand(actualCommand, actualArgs, {
    logger,
    stdin: "inherit",
    stdio: "inherit"
  });

  await logger.info("system install command exited", {
    command: actualCommand,
    args: actualArgs,
    exitCode: result.exitCode
  });

  if (result.exitCode !== 0) {
    throw new WinNestError("SYSTEM_INSTALL_COMMAND_FAILED", "System dependency install command failed.", {
      command: actualCommand,
      args: actualArgs,
      exitCode: result.exitCode
    });
  }
}
