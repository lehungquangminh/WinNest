import { readFile } from "node:fs/promises";

export type LinuxDistro = "debian" | "ubuntu" | "fedora" | "opensuse" | "arch" | "unknown";

export type DistroInfo = {
  id: string;
  idLike: string[];
  prettyName?: string;
  family: LinuxDistro;
};

export async function detectDistro(): Promise<DistroInfo> {
  let raw = "";
  try {
    raw = await readFile("/etc/os-release", "utf8");
  } catch {
    return { id: "unknown", idLike: [], family: "unknown" };
  }

  const fields = parseOsRelease(raw);
  const id = fields.get("ID")?.toLowerCase() ?? "unknown";
  const idLike = (fields.get("ID_LIKE") ?? "")
    .toLowerCase()
    .split(/\s+/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  const prettyName = fields.get("PRETTY_NAME");
  const family = resolveDistroFamily(id, idLike);

  return prettyName === undefined ? { id, idLike, family } : { id, idLike, prettyName, family };
}

function parseOsRelease(raw: string): Map<string, string> {
  const fields = new Map<string, string>();

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex);
    const value = unquoteValue(trimmed.slice(separatorIndex + 1));
    fields.set(key, value);
  }

  return fields;
}

function unquoteValue(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'");
  }

  return trimmed;
}

function resolveDistroFamily(id: string, idLike: readonly string[]): LinuxDistro {
  const values = new Set([id, ...idLike]);

  if (values.has("ubuntu")) {
    return "ubuntu";
  }
  if (values.has("debian") || values.has("nonlaos") || values.has("nonla")) {
    return "debian";
  }
  if (values.has("fedora") || values.has("rhel") || values.has("centos")) {
    return "fedora";
  }
  if (values.has("opensuse") || values.has("suse")) {
    return "opensuse";
  }
  if (values.has("arch") || values.has("manjaro")) {
    return "arch";
  }

  return "unknown";
}
