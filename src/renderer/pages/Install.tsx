import { useState } from "react";
import type { ManagedApp } from "@/core/app.js";

type InstallProps = {
  onInstalled: (appId: string) => void;
};

export default function Install(props: InstallProps): React.JSX.Element {
  const [installerPath, setInstallerPath] = useState("");
  const [desktopIcon, setDesktopIcon] = useState(false);
  const [status, setStatus] = useState("idle");
  const [log, setLog] = useState<string[]>([]);

  async function install(): Promise<void> {
    if (!installerPath.trim()) {
      setStatus("missing installer path");
      return;
    }

    setStatus("installing");
    setLog((lines) => [...lines, `Installing ${installerPath}`]);
    try {
      const app = await window.winnest.invoke<ManagedApp>("installApp", { path: installerPath.trim(), desktopIcon });
      setStatus("done");
      setLog((lines) => [...lines, `Installed ${app.name}`, `Main executable: ${app.mainExe}`]);
      props.onInstalled(app.id);
    } catch (err) {
      setStatus("failed");
      setLog((lines) => [...lines, err instanceof Error ? err.message : String(err)]);
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>Install Windows App</h1>
          <p>{status}</p>
        </div>
        <button onClick={() => void install()} disabled={status === "installing"}>Install</button>
      </header>

      <label className="field">
        Installer path
        <input value={installerPath} onChange={(event) => setInstallerPath(event.target.value)} placeholder="/home/user/Downloads/setup.exe" />
      </label>

      <label className="check-row">
        <input type="checkbox" checked={desktopIcon} onChange={(event) => setDesktopIcon(event.target.checked)} />
        Create desktop icon
      </label>

      <pre className="log">{log.join("\n") || "No install log yet."}</pre>
    </section>
  );
}
