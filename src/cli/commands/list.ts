import { listApps } from "@/core/state.js";

export async function listCommand(): Promise<void> {
  const apps = await listApps();
  if (apps.length === 0) {
    console.log("No Windows apps installed yet.");
    return;
  }

  for (const app of apps) {
    console.log(`${app.id}\t${app.status}\t${app.name}`);
  }
}
