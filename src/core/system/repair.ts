import { createDoctorReport, formatMissingDependencies, printFixHints } from "@/core/doctor.js";
import { globalLogPath } from "@/logging/paths.js";
import { Logger } from "@/logging/logger.js";

export type RepairSystemOptions = {
  json?: boolean;
};

export async function repairSystem(options: RepairSystemOptions = {}): Promise<void> {
  const logger = new Logger(globalLogPath("repair-system.log"));
  const report = await createDoctorReport(logger);
  await logger.info("repair-system report created", {
    ok: report.ok,
    missingSystemDeps: report.missingSystemDeps,
    hints: report.hints
  });

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) {
      process.exitCode = 1;
    }
    return;
  }

  console.log("WinNest System Repair");
  console.log("");
  console.log(`Distro: ${report.system.distro?.prettyName ?? report.system.distro?.id ?? "unknown"}`);
  console.log(`Wine: ${report.wine.version ?? "missing"}`);
  console.log(`32-bit Wine support: ${report.wine.support32 ? "yes" : "missing"}`);

  const missing = formatMissingDependencies(report.missingSystemDeps);
  console.log("");
  console.log("Missing:");
  if (missing.length === 0) {
    console.log("  none");
  } else {
    for (const dep of missing) {
      console.log(`  - ${dep}`);
    }
  }

  printFixHints(report.hints);

  console.log("");
  console.log("Note:");
  console.log("  WinNest does not install system packages automatically in this MVP.");
  console.log("  Run the commands above yourself, then retry winnest doctor.");

  if (!report.ok) {
    process.exitCode = 1;
  }
}
