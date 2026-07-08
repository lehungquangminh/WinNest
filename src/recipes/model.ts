export type RecipeMatch = {
  installerNames: string[];
  publisherNames: string[];
};

export type RecipePermissions = {
  microphone?: boolean;
  camera?: boolean;
  downloads?: boolean;
};

export type AppRecipe = {
  schemaVersion: 1;
  id: string;
  name: string;
  match: RecipeMatch;
  systemDeps: string[];
  wineDeps: string[];
  permissions: RecipePermissions;
  notes: string[];
  expectedExecutables: string[];
};

export function isAppRecipe(value: unknown): value is AppRecipe {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    record["schemaVersion"] === 1 &&
    typeof record["id"] === "string" &&
    typeof record["name"] === "string" &&
    isRecipeMatch(record["match"]) &&
    isStringArray(record["systemDeps"]) &&
    isStringArray(record["wineDeps"]) &&
    isRecipePermissions(record["permissions"]) &&
    isStringArray(record["notes"]) &&
    isStringArray(record["expectedExecutables"])
  );
}

function isRecipeMatch(value: unknown): value is RecipeMatch {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return isStringArray(record["installerNames"]) && isStringArray(record["publisherNames"]);
}

function isRecipePermissions(value: unknown): value is RecipePermissions {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    isBooleanOrUndefined(record["microphone"]) &&
    isBooleanOrUndefined(record["camera"]) &&
    isBooleanOrUndefined(record["downloads"])
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isBooleanOrUndefined(value: unknown): value is boolean | undefined {
  return typeof value === "boolean" || value === undefined;
}
