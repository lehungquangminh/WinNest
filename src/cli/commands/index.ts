import type { CliCommand } from "@/cli/command.js";
import { createDesktopIconCommand, removeDesktopIconCommand } from "@/cli/commands/desktop-icon.js";
import { doctorCommand } from "@/cli/commands/doctor.js";
import { infoCommand } from "@/cli/commands/info.js";
import { installCommand } from "@/cli/commands/install.js";
import { listCommand } from "@/cli/commands/list.js";
import { mimeCommand } from "@/cli/commands/mime.js";
import { repairCommand } from "@/cli/commands/repair.js";
import { resetCommand } from "@/cli/commands/reset.js";
import { rescanCommand } from "@/cli/commands/rescan.js";
import { runCommand } from "@/cli/commands/run.js";
import { setupCommand } from "@/cli/commands/setup.js";
import { systemDepsCommand } from "@/cli/commands/system-deps.js";
import { systemRepairCommand } from "@/cli/commands/system-repair.js";
import { uninstallCommand } from "@/cli/commands/uninstall.js";

export const COMMANDS: readonly CliCommand[] = [
  {
    name: "doctor",
    usage: "doctor [--verbose] [--fix-hints] [--json]",
    description: "Diagnose Wine, desktop integration, and WinNest paths.",
    run: async ({ args }) => doctorCommand(args)
  },
  {
    name: "install",
    usage: "install <installer-path> [--desktop-icon]",
    description: "Install a Windows .exe or .msi into a managed Wine prefix.",
    run: async ({ command, args }) => installCommand(command, args)
  },
  {
    name: "open",
    usage: "open <file-path>",
    description: "File-manager entry point for opening a Windows installer.",
    run: async ({ command, args }) => installCommand(command, args)
  },
  {
    name: "run",
    usage: "run <app-id>",
    description: "Launch an installed Windows app.",
    run: async ({ command, args }) => runCommand(command, args[0])
  },
  {
    name: "list",
    usage: "list",
    description: "List installed Windows apps.",
    aliases: ["ls"],
    run: async () => listCommand()
  },
  {
    name: "info",
    usage: "info <app-id>",
    description: "Print app metadata, logs, launcher path, and main executable status.",
    aliases: ["show"],
    run: async ({ args }) => infoCommand(args[0])
  },
  {
    name: "repair",
    usage: "repair <app-id>",
    description: "Run app repair diagnostics and prefix boot checks.",
    run: async ({ command, args }) => repairCommand(command, args[0])
  },
  {
    name: "repair-system",
    usage: "repair-system [--json]",
    description: "Print missing system dependencies and distro-specific fix hints.",
    run: async ({ args }) => systemRepairCommand(args)
  },
  {
    name: "install-system-deps",
    usage: "install-system-deps",
    description: "Run real Debian/Ubuntu Wine dependency package commands.",
    aliases: ["setup-system"],
    run: async () => systemDepsCommand()
  },
  {
    name: "reset",
    usage: "reset <app-id>",
    description: "Reset only the app Wine prefix while keeping metadata, logs, and installers.",
    run: async ({ command, args }) => resetCommand(command, args[0])
  },
  {
    name: "create-desktop-icon",
    usage: "create-desktop-icon <app-id>",
    description: "Create a desktop icon for an installed app.",
    run: async ({ command, args }) => createDesktopIconCommand(command, args[0])
  },
  {
    name: "remove-desktop-icon",
    usage: "remove-desktop-icon <app-id>",
    description: "Remove a desktop icon for an installed app.",
    run: async ({ command, args }) => removeDesktopIconCommand(command, args[0])
  },
  {
    name: "rescan",
    usage: "rescan <app-id>",
    description: "Scan an app prefix again and choose a new launcher executable.",
    run: async ({ command, args }) => rescanCommand(command, args[0])
  },
  {
    name: "uninstall",
    usage: "uninstall <app-id>",
    description: "Remove an app launcher and managed app folder safely.",
    aliases: ["remove", "rm"],
    run: async ({ command, args }) => uninstallCommand(command, args[0])
  },
  {
    name: "register-mime",
    usage: "register-mime",
    description: "Register WinNest as a handler for Windows installers.",
    run: async () => mimeCommand()
  },
  {
    name: "setup-wine",
    usage: "setup-wine",
    description: "Compatibility alias for install-system-deps.",
    run: async () => setupCommand()
  }
];
