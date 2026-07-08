import { findExecutable } from "@/shared/which.js";
import { runCommand } from "@/shared/spawn.js";
import { spawn } from "node:child_process";

export async function simulateOpenCommand(installerPath: string | undefined): Promise<void> {
  if (!installerPath) {
    console.error("Usage: winnest simulate-open <installer-path>");
    process.exitCode = 1;
    return;
  }

  console.log("Simulating file manager double-click handoff...");

  // 1. Check winnest-open is in PATH
  const winnestOpenPath = await findExecutable("winnest-open");
  if (!winnestOpenPath) {
    console.error("[ERROR] winnest-open was not found in PATH.");
    console.error("Please run `winnest dev-install` and ensure ~/.local/bin is in your PATH.");
    process.exitCode = 1;
    return;
  }
  console.log(`[OK] winnest-open found in PATH: ${winnestOpenPath}`);

  // 2. Check MIME registration
  const xdgMime = await findExecutable("xdg-mime");
  if (xdgMime) {
    try {
      const result = await runCommand(xdgMime, ["query", "default", "application/x-ms-dos-executable"]);
      const activeHandler = result.stdout.trim();
      if (activeHandler === "winnest-open.desktop") {
        console.log("[OK] MIME registration for application/x-ms-dos-executable points to WinNest.");
      } else {
        console.warn(`[WARNING] MIME registration points to: ${activeHandler || "none"} (expected: winnest-open.desktop).`);
        console.warn("Run `winnest register-mime` to correct this.");
      }
    } catch (error) {
      console.warn("[WARNING] Failed to query default MIME handler using xdg-mime:", error);
    }
  } else {
    console.warn("[WARNING] xdg-mime was not found; cannot verify default MIME handler.");
  }

  // 3. Spawn winnest-open from PATH to verify GUI handoff
  console.log(`[ACTION] Spawning winnest-open with path: "${installerPath}"`);
  
  // Use spawn to launch the process asynchronously detached
  const child = spawn(winnestOpenPath, [installerPath, "--gui"], {
    detached: true,
    stdio: "ignore"
  });
  child.unref();

  console.log("GUI handoff simulation spawned successfully.");
}
