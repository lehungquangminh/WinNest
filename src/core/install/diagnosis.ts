import type { FixHint } from "@/system/fix-hints.js";

export type DiagnosisCode =
  | "MISSING_WINE32"
  | "MISSING_DOTNET"
  | "MISSING_VCRUNTIME"
  | "MISSING_WINE_MONO"
  | "MISSING_WINE_GECKO"
  | "UNKNOWN_WINE_FAILURE";

export type FailureDiagnosis = {
  code: DiagnosisCode;
  message: string;
  hints: string[];
};

export function diagnoseWineFailure(text: string, fixHints: readonly FixHint[] = []): FailureDiagnosis {
  if (/wine32 is missing/i.test(text) || /syswow64[\\/]+ntdll\.dll/i.test(text)) {
    return {
      code: "MISSING_WINE32",
      message: "This installer appears to need 32-bit Wine support.",
      hints: flattenHintCommands(fixHints, ["sudo dpkg --add-architecture i386", "sudo apt update", "sudo apt install wine32:i386"])
    };
  }

  if (/mscoree\.dll/i.test(text) || /dotnet/i.test(text) || /\.net/i.test(text)) {
    return {
      code: "MISSING_DOTNET",
      message: "This installer appears to need a Microsoft .NET runtime inside the Wine prefix.",
      hints: ["Future WinNest recipe support should install dotnet for this app prefix."]
    };
  }

  if (/vcruntime/i.test(text) || /msvcp/i.test(text)) {
    return {
      code: "MISSING_VCRUNTIME",
      message: "This app appears to need Microsoft Visual C++ runtime files inside the Wine prefix.",
      hints: ["Future WinNest recipe support should install the matching vcrun package for this app prefix."]
    };
  }

  if (/mono/i.test(text)) {
    return {
      code: "MISSING_WINE_MONO",
      message: "Wine Mono appears to be missing or incomplete.",
      hints: ["Install wine-mono from your distro packages, then retry or repair the app."]
    };
  }

  if (/gecko/i.test(text)) {
    return {
      code: "MISSING_WINE_GECKO",
      message: "Wine Gecko appears to be missing or incomplete.",
      hints: ["Install wine-gecko from your distro packages, then retry or repair the app."]
    };
  }

  if (/could not load kernel32\.dll/i.test(text)) {
    return {
      code: "MISSING_WINE32",
      message: "Wine could not load core Windows DLLs. 32-bit Wine support may be missing or broken.",
      hints: flattenHintCommands(fixHints, ["sudo dpkg --add-architecture i386", "sudo apt update", "sudo apt install wine32:i386"])
    };
  }

  return {
    code: "UNKNOWN_WINE_FAILURE",
    message: "Wine failed, but WinNest could not identify a known dependency issue.",
    hints: ["Run winnest doctor --fix-hints and inspect the app install log."]
  };
}

export function collectErrorText(error: unknown): string {
  if (!error || typeof error !== "object") {
    return String(error);
  }

  const record = error as Record<string, unknown>;
  const parts = [record["message"], record["stack"], collectDetails(record["details"])].filter(
    (part): part is string => typeof part === "string" && part.length > 0
  );
  return parts.join("\n");
}

function collectDetails(details: unknown): string | undefined {
  if (!details || typeof details !== "object") {
    return typeof details === "string" ? details : undefined;
  }

  const record = details as Record<string, unknown>;
  const fields = ["stderr", "stdout", "message"];
  const parts = fields
    .map((field) => record[field])
    .filter((value): value is string => typeof value === "string" && value.length > 0);
  return parts.join("\n");
}

function flattenHintCommands(hints: readonly FixHint[], fallback: readonly string[]): string[] {
  const commands = hints.flatMap((hint) => hint.commands);
  return commands.length > 0 ? commands : [...fallback];
}
