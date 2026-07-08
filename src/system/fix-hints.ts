import type { DistroInfo, LinuxDistro } from "@/system/distro.js";

export type SystemDependencyCode =
  | "wine"
  | "wineboot"
  | "wineserver"
  | "wine32"
  | "winbind"
  | "cabextract"
  | "p7zip"
  | "vulkaninfo";

export type FixHint = {
  title: string;
  commands: string[];
  notes: string[];
};

export function createSystemFixHints(
  distro: DistroInfo | undefined,
  missingDeps: readonly SystemDependencyCode[]
): FixHint[] {
  const uniqueDeps = [...new Set(missingDeps)];
  if (uniqueDeps.length === 0) {
    return [];
  }

  const family = distro?.family ?? "unknown";
  return [createPackageHint(family, uniqueDeps, distro)];
}

export function dependencyDisplayName(dep: SystemDependencyCode): string {
  switch (dep) {
    case "wine32":
      return "32-bit Wine support";
    case "p7zip":
      return "7-Zip command-line tools";
    case "vulkaninfo":
      return "Vulkan diagnostic tools";
    default:
      return dep;
  }
}

function createPackageHint(
  family: LinuxDistro,
  missingDeps: readonly SystemDependencyCode[],
  distro: DistroInfo | undefined
): FixHint {
  const title = createHintTitle(family, distro);
  const packageDeps = missingDeps.filter((dep) => dep !== "vulkaninfo");
  const includeWine32 = packageDeps.includes("wine32");
  const commands = commandsForFamily(family, packageDeps);
  const notes: string[] = [];

  if (includeWine32) {
    notes.push("32-bit Wine support is required by many installers even when the app itself is 64-bit.");
  }
  if (missingDeps.includes("vulkaninfo")) {
    notes.push("vulkaninfo is optional and only helps diagnose Vulkan/DXVK support.");
  }
  if (family === "unknown") {
    notes.push("Distro was not recognized. Package names may differ; use your distro package manager.");
  }

  return { title, commands, notes };
}

function createHintTitle(family: LinuxDistro, distro: DistroInfo | undefined): string {
  if (family === "ubuntu") {
    return "Ubuntu/nonlaOS";
  }
  if (family === "debian") {
    return "Debian/nonlaOS/Ubuntu-like";
  }
  if (family === "fedora") {
    return "Fedora-like";
  }
  if (family === "opensuse") {
    return "openSUSE-like";
  }
  if (family === "arch") {
    return "Arch-like";
  }

  return distro?.prettyName ?? "Unknown Linux distro";
}

function commandsForFamily(family: LinuxDistro, missingDeps: readonly SystemDependencyCode[]): string[] {
  switch (family) {
    case "debian":
    case "ubuntu":
      return debianCommands(missingDeps);
    case "fedora":
      return fedoraCommands(missingDeps);
    case "opensuse":
      return openSuseCommands(missingDeps);
    case "arch":
      return archCommands(missingDeps);
    case "unknown":
      return ["Install the missing packages with your distro package manager."];
  }
}

function debianCommands(missingDeps: readonly SystemDependencyCode[]): string[] {
  const packages = mapPackages(missingDeps, {
    wine: "wine",
    wineboot: "wine",
    wineserver: "wine",
    wine32: "wine32:i386",
    winbind: "winbind",
    cabextract: "cabextract",
    p7zip: "p7zip-full"
  });
  const commands: string[] = [];

  if (missingDeps.includes("wine32")) {
    commands.push("sudo dpkg --add-architecture i386");
  }
  commands.push("sudo apt update");
  if (packages.length > 0) {
    commands.push(`sudo apt install ${packages.join(" ")}`);
  }

  return commands;
}

function fedoraCommands(missingDeps: readonly SystemDependencyCode[]): string[] {
  const packages = mapPackages(missingDeps, {
    wine: "wine",
    wineboot: "wine-core",
    wineserver: "wine-core",
    wine32: "wine-wow64",
    winbind: "samba-winbind",
    cabextract: "cabextract",
    p7zip: "p7zip p7zip-plugins"
  });

  return packages.length > 0 ? [`sudo dnf install ${packages.join(" ")}`] : [];
}

function openSuseCommands(missingDeps: readonly SystemDependencyCode[]): string[] {
  const packages = mapPackages(missingDeps, {
    wine: "wine",
    wineboot: "wine",
    wineserver: "wine",
    wine32: "wine-32bit",
    winbind: "samba-winbind",
    cabextract: "cabextract",
    p7zip: "p7zip"
  });

  return packages.length > 0 ? [`sudo zypper install ${packages.join(" ")}`] : [];
}

function archCommands(missingDeps: readonly SystemDependencyCode[]): string[] {
  const packages = mapPackages(missingDeps, {
    wine: "wine",
    wineboot: "wine",
    wineserver: "wine",
    wine32: "wine",
    winbind: "samba",
    cabextract: "cabextract",
    p7zip: "p7zip"
  });

  return packages.length > 0 ? [`sudo pacman -S ${packages.join(" ")}`] : [];
}

function mapPackages(
  deps: readonly SystemDependencyCode[],
  packagesByDep: Record<Exclude<SystemDependencyCode, "vulkaninfo">, string>
): string[] {
  const packages = new Set<string>();
  for (const dep of deps) {
    if (dep === "vulkaninfo") {
      continue;
    }

    for (const name of packagesByDep[dep].split(/\s+/)) {
      if (name) {
        packages.add(name);
      }
    }
  }

  return [...packages];
}
