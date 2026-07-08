import { chmod, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";
import { delimiter } from "node:path";

export async function devInstallCommand(): Promise<void> {
  console.log("Starting developer local installation...");
  console.log("This command is for DEVELOPMENT purposes only.\n");

  const currentDir = dirname(fileURLToPath(import.meta.url));
  const cliDir = dirname(currentDir);
  const indexJsPath = join(cliDir, "index.js");
  const openJsPath = join(cliDir, "open.js");

  const localBinDir = join(os.homedir(), ".local", "bin");
  await mkdir(localBinDir, { recursive: true });

  const winnestWrapperPath = join(localBinDir, "winnest");
  const winnestOpenWrapperPath = join(localBinDir, "winnest-open");

  const winnestWrapperContent = `#!/usr/bin/env bash
node "${indexJsPath}" "$@"
`;

  const winnestOpenWrapperContent = `#!/usr/bin/env bash
node "${openJsPath}" "$@"
`;

  await writeFile(winnestWrapperPath, winnestWrapperContent, "utf8");
  await chmod(winnestWrapperPath, 0o755);
  console.log(`[OK] Created wrapper: ${winnestWrapperPath}`);

  await writeFile(winnestOpenWrapperPath, winnestOpenWrapperContent, "utf8");
  await chmod(winnestOpenWrapperPath, 0o755);
  console.log(`[OK] Created wrapper: ${winnestOpenWrapperPath}`);

  // Check if localBinDir is in PATH
  const pathEnv = process.env.PATH || "";
  const pathDirs = pathEnv.split(delimiter).map((d) => join(d));
  const isLocalBinInPath = pathDirs.includes(join(localBinDir));

  if (!isLocalBinInPath) {
    console.warn(`\n[WARNING] ${localBinDir} is not in your PATH environment variable.`);
    console.warn("To resolve this, add the following line to your shell profile (~/.bashrc or ~/.zshrc):");
    console.warn(`  export PATH="$HOME/.local/bin:$PATH"`);
    console.warn("Then restart your terminal or run `source ~/.bashrc`.");
  } else {
    console.log("\n[OK] ~/.local/bin is present in your PATH.");
  }

  console.log("\nDevelopment environment link completed successfully.");
}
