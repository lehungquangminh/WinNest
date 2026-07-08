import { repairSystem } from "@/core/repair-system.js";

export async function setupWine(): Promise<void> {
  console.log("WinNest Wine Setup");
  console.log("");
  console.log("Automatic system package installation is disabled in this MVP.");
  console.log("WinNest will print distro-specific commands for you to run manually.");
  console.log("");
  await repairSystem();
}
