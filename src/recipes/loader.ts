import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isAppRecipe, type AppRecipe } from "@/recipes/model.js";

const RECIPES_DIR = fileURLToPath(new URL("../../recipes/", import.meta.url));

export async function loadRecipes(): Promise<AppRecipe[]> {
  let entries;
  try {
    entries = await readdir(RECIPES_DIR, { withFileTypes: true });
  } catch {
    return [];
  }

  const recipes: AppRecipe[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) {
      continue;
    }

    const path = join(RECIPES_DIR, entry.name);
    const recipe = await loadRecipe(path);
    if (recipe) {
      recipes.push(recipe);
    }
  }

  return recipes.sort((left, right) => left.name.localeCompare(right.name));
}

export async function matchRecipeForInstaller(installerPath: string): Promise<AppRecipe | undefined> {
  const installerName = normalizeName(basename(installerPath));
  const recipes = await loadRecipes();

  return recipes.find((recipe) =>
    recipe.match.installerNames.some((name) => {
      const normalized = normalizeName(name);
      return installerName.includes(normalized) || normalized.includes(installerName);
    })
  );
}

export async function findRecipeForApp(appId: string, appName: string, installerPath: string): Promise<AppRecipe | undefined> {
  const recipes = await loadRecipes();
  const normalizedAppId = normalizeName(appId);
  const normalizedAppName = normalizeName(appName);
  const normalizedInstaller = normalizeName(basename(installerPath));

  return recipes.find((recipe) => {
    if (recipe.id === appId || normalizeName(recipe.id) === normalizedAppId) {
      return true;
    }

    const recipeName = normalizeName(recipe.name);
    if (recipeName === normalizedAppName) {
      return true;
    }

    return recipe.match.installerNames.some((name) => {
      const normalized = normalizeName(name);
      return normalizedInstaller.includes(normalized) || normalized.includes(normalizedInstaller);
    });
  });
}

async function loadRecipe(path: string): Promise<AppRecipe | undefined> {
  const raw = await readFile(path, "utf8");
  const parsed: unknown = JSON.parse(raw);
  return isAppRecipe(parsed) ? parsed : undefined;
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
