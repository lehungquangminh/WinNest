export function buildWineEnv(prefixPath: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    WINEPREFIX: prefixPath,
    WINEARCH: "win64"
  };
}
