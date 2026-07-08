import { useEffect, useState } from "react";
import type { ManagedApp } from "@/core/app.js";

type DetailProps = {
  appId: string;
  onBack: () => void;
};

export default function Detail(props: DetailProps): React.JSX.Element {
  const [app, setApp] = useState<ManagedApp | undefined>();
  const [status, setStatus] = useState("");

  useEffect(() => {
    void refresh();
  }, [props.appId]);

  async function refresh(): Promise<void> {
    const nextApp = await window.winnest.invoke<ManagedApp>("getAppInfo", props.appId);
    setApp(nextApp);
  }

  async function runAction(label: string, action: () => Promise<unknown>): Promise<void> {
    setStatus(`${label}...`);
    try {
      await action();
      setStatus(`${label} done`);
      await refresh();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    }
  }

  if (!app) {
    return <section className="page">Loading...</section>;
  }

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>{app.name}</h1>
          <p>{app.status}</p>
        </div>
        <button onClick={props.onBack}>Back</button>
      </header>

      <div className="detail-grid">
        <span>App ID</span><strong>{app.id}</strong>
        <span>Main executable</span><strong>{app.mainExe}</strong>
        <span>Prefix</span><strong>{app.prefixPath}</strong>
        <span>Launcher</span><strong>{app.desktopEntryPath ?? "none"}</strong>
      </div>

      <div className="actions wrap">
        <button onClick={() => void runAction("Open", () => window.winnest.invoke("runApp", app.id))}>Open</button>
        <button onClick={() => void runAction("Rescan", () => window.winnest.invoke("rescanApp", app.id))}>Rescan</button>
        <button onClick={() => void runAction("Repair", () => window.winnest.invoke("repairApp", app.id))}>Repair</button>
        <button onClick={() => void runAction("Reset", () => window.winnest.invoke("resetApp", app.id))}>Reset</button>
        <button onClick={() => void runAction("Create desktop icon", () => window.winnest.invoke("createDesktopIcon", app.id))}>Create desktop icon</button>
        <button onClick={() => void runAction("Remove desktop icon", () => window.winnest.invoke("removeDesktopIcon", app.id))}>Remove desktop icon</button>
        <button onClick={() => void runAction("Show files", () => window.winnest.invoke("showAppFolder", app.id))}>Show files</button>
        <button onClick={() => void runAction("View logs", () => window.winnest.invoke("openLogs", app.id))}>View logs</button>
        <button className="danger" onClick={() => void runAction("Uninstall", () => window.winnest.invoke("uninstallApp", app.id))}>Uninstall</button>
      </div>

      {status && <div className="notice">{status}</div>}
    </section>
  );
}
