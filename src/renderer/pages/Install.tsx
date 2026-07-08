import { useState } from "react";
import type { ManagedApp } from "@/core/app.js";
import { InstallIcon, InfoIcon, TerminalIcon, CheckIcon, LoaderIcon, XIcon } from "@/renderer/components/Icons.js";

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
    setLog((lines) => [...lines, `[INSTALLER] Spawning installation process: ${installerPath}`]);
    try {
      const app = await window.winnest.invoke<ManagedApp>("installApp", { path: installerPath.trim(), desktopIcon });
      setStatus("done");
      setLog((lines) => [
        ...lines, 
        `[SUCCESS] Application installed successfully!`,
        `[METADATA] Name: ${app.name}`,
        `[METADATA] ID: ${app.id}`,
        `[METADATA] Main Exe: ${app.mainExe}`
      ]);
      props.onInstalled(app.id);
    } catch (err) {
      setStatus("failed");
      setLog((lines) => [...lines, `[ERROR] Installation failed: ${err instanceof Error ? err.message : String(err)}`]);
    }
  }

  function getStatusLabel() {
    switch (status) {
      case "idle": return "Ready to install";
      case "installing": return "Installing software...";
      case "done": return "Installation complete";
      case "failed": return "Installation failed";
      case "missing installer path": return "Path is required";
      default: return status;
    }
  }

  return (
    <section className="page animate-fade-in">
      <header className="page-header">
        <div>
          <h1 className="page-title">Install Application</h1>
          <p className="page-subtitle">Deploy a new Windows program inside an isolated Wine prefix sandbox.</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => void install()} 
          disabled={status === "installing" || !installerPath.trim()}
        >
          <InstallIcon size={14} />
          <span>{status === "installing" ? "Installing..." : "Install Now"}</span>
        </button>
      </header>

      <div className="grid-one-two">
        <div className="panel install-config-panel">
          <h3 className="panel-title">Installer Configuration</h3>
          
          <div className="form-group">
            <label className="field-label" htmlFor="installer-input">
              Installer Path
            </label>
            <div className="input-wrapper">
              <input 
                id="installer-input"
                className="text-input"
                value={installerPath} 
                onChange={(event) => setInstallerPath(event.target.value)} 
                placeholder="/absolute/path/to/installer.exe" 
                disabled={status === "installing"}
              />
            </div>
            <span className="field-help">Specify the absolute Linux path to the setup `.exe` or `.msi` file.</span>
          </div>

          <div className="form-group">
            <label className="checkbox-container">
              <input 
                type="checkbox" 
                checked={desktopIcon} 
                onChange={(event) => setDesktopIcon(event.target.checked)}
                disabled={status === "installing"} 
              />
              <span className="checkbox-custom"></span>
              <span className="checkbox-label">Create desktop shortcut launcher</span>
            </label>
          </div>

          <div className="install-info-box">
            <InfoIcon size={16} />
            <div className="info-text">
              <strong>Isolated Wine Prefix</strong>
              <span>WinNest generates a clean, dedicated prefix sandbox for each application to prevent DLL conflicts.</span>
            </div>
          </div>
        </div>

        <div className="panel console-panel">
          <div className="console-header">
            <div className="console-title-group">
              <TerminalIcon size={14} className="console-icon" />
              <span className="console-title">Installation Console Logs</span>
            </div>
            <div className="console-status-group">
              {status === "installing" && <LoaderIcon size={12} className="spin status-icon-warning" />}
              {status === "done" && <CheckIcon size={12} className="status-icon-success" />}
              {status === "failed" && <XIcon size={12} className="status-icon-danger" />}
              {status !== "installing" && status !== "done" && status !== "failed" && <InfoIcon size={12} className="status-icon-neutral" />}
              <span className="console-status-text">{getStatusLabel()}</span>
            </div>
          </div>
          <div className="console-body">
            <pre className="log">{log.join("\n") || "Console idle. Awaiting installer launch..."}</pre>
          </div>
        </div>
      </div>
    </section>
  );
}

