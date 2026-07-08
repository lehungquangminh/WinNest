import { useEffect, useState } from "react";
import type { ManagedApp } from "@/core/app.js";
import { 
  BackIcon, PlayIcon, RefreshIcon, HammerIcon, FolderIcon, 
  TerminalIcon, TrashIcon, AppIcon, InfoIcon, CopyIcon,
  CheckIcon, LoaderIcon, XIcon
} from "@/renderer/components/Icons.js";

type DetailProps = {
  appId: string;
  onBack: () => void;
  onRefreshParent: () => void;
};

export default function Detail(props: DetailProps): React.JSX.Element {
  const [app, setApp] = useState<ManagedApp | undefined>();
  const [status, setStatus] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);

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
      setStatus(`${label} completed successfully.`);
      await refresh();
      props.onRefreshParent();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    }
  }

  function copyToClipboard(text: string, fieldName: string) {
    void navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  }

  if (!app) {
    return (
      <section className="page flex-center">
        <div className="spinner"></div>
        <p style={{ marginTop: "12px", color: "var(--text-secondary)" }}>Loading application details...</p>
      </section>
    );
  }

  return (
    <section className="page animate-fade-in">
      <header className="page-header">
        <div className="header-nav-left">
          <button className="btn btn-secondary btn-icon-only" onClick={props.onBack} aria-label="Go back">
            <BackIcon size={16} />
            <span>Back</span>
          </button>
          <div className="title-area">
            <div className="title-row">
              <h1 className="page-title">{app.name}</h1>
              <span className={`badge badge-${app.status === "installed" ? "success" : app.status === "installing" ? "warning" : "danger"}`}>
                {app.status === "installed" && <CheckIcon size={11} />}
                {app.status === "installing" && <LoaderIcon size={11} className="spin" />}
                {app.status === "failed" && <XIcon size={11} />}
                <span>{app.status}</span>
              </span>
            </div>
            <p className="page-subtitle">Application control panel & virtual sandbox environment configuration.</p>
          </div>
        </div>
      </header>

      {status && (
        <div className={`banner ${status.includes("failed") || status.includes("error") ? "banner-error" : "banner-info"} animate-fade-in`}>
          <InfoIcon size={16} />
          <span>{status}</span>
        </div>
      )}

      <div className="detail-layout">
        {/* Left Column: Specs sheet */}
        <div className="panel detail-panel">
          <h3 className="panel-title">System Properties</h3>
          <div className="properties-sheet">
            <div className="property-row">
              <span className="property-key">Application ID</span>
              <div className="property-value-wrapper">
                <code className="property-value">{app.id}</code>
                <button 
                  className="btn-icon-action" 
                  onClick={() => copyToClipboard(app.id, "id")}
                  title="Copy ID"
                >
                  {copiedField === "id" ? <span className="copy-tooltip">Copied!</span> : <CopyIcon size={12} />}
                </button>
              </div>
            </div>

            <div className="property-row">
              <span className="property-key">Main Executable</span>
              <div className="property-value-wrapper">
                <code className="property-value" title={app.mainExe}>{app.mainExe}</code>
                <button 
                  className="btn-icon-action" 
                  onClick={() => copyToClipboard(app.mainExe, "exe")}
                  title="Copy Executable Path"
                >
                  {copiedField === "exe" ? <span className="copy-tooltip">Copied!</span> : <CopyIcon size={12} />}
                </button>
              </div>
            </div>

            <div className="property-row">
              <span className="property-key">Wine Prefix Path</span>
              <div className="property-value-wrapper">
                <code className="property-value" title={app.prefixPath}>{app.prefixPath}</code>
                <button 
                  className="btn-icon-action" 
                  onClick={() => copyToClipboard(app.prefixPath, "prefix")}
                  title="Copy Prefix Path"
                >
                  {copiedField === "prefix" ? <span className="copy-tooltip">Copied!</span> : <CopyIcon size={12} />}
                </button>
              </div>
            </div>

            <div className="property-row">
              <span className="property-key">Desktop Launcher</span>
              <div className="property-value-wrapper">
                <code className="property-value" title={app.desktopEntryPath ?? "None"}>
                  {app.desktopEntryPath ?? "No launcher created"}
                </code>
                {app.desktopEntryPath && (
                  <button 
                    className="btn-icon-action" 
                    onClick={() => copyToClipboard(app.desktopEntryPath!, "launcher")}
                    title="Copy Launcher Path"
                  >
                    {copiedField === "launcher" ? <span className="copy-tooltip">Copied!</span> : <CopyIcon size={12} />}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Actions Grouped */}
        <div className="panel actions-panel">
          <h3 className="panel-title">Execution Controls</h3>
          <div className="action-grid-buttons">
            <button className="btn btn-primary btn-large" onClick={() => void runAction("Open", () => window.winnest.invoke("runApp", app.id))}>
              <PlayIcon size={16} />
              <span>Launch Application</span>
            </button>
            <button className="btn btn-secondary" onClick={() => void runAction("Show files", () => window.winnest.invoke("showAppFolder", app.id))}>
              <FolderIcon size={15} />
              <span>Browse Files</span>
            </button>
            <button className="btn btn-secondary" onClick={() => void runAction("View logs", () => window.winnest.invoke("openLogs", app.id))}>
              <TerminalIcon size={15} />
              <span>Inspect Logs</span>
            </button>
          </div>

          <h3 className="panel-title" style={{ marginTop: "24px" }}>System Tools</h3>
          <div className="action-grid-buttons">
            <button className="btn btn-secondary" onClick={() => void runAction("Rescan", () => window.winnest.invoke("rescanApp", app.id))}>
              <RefreshIcon size={14} />
              <span>Rescan Binary</span>
            </button>
            <button className="btn btn-secondary" onClick={() => void runAction("Repair", () => window.winnest.invoke("repairApp", app.id))}>
              <HammerIcon size={14} />
              <span>Repair Environment</span>
            </button>
            <button className="btn btn-secondary" onClick={() => void runAction("Reset", () => window.winnest.invoke("resetApp", app.id))}>
              <RefreshIcon size={14} />
              <span>Reset Sandbox</span>
            </button>
            <button className="btn btn-secondary" onClick={() => void runAction("Create desktop icon", () => window.winnest.invoke("createDesktopIcon", app.id))}>
              <AppIcon size={14} />
              <span>Add Desktop Icon</span>
            </button>
            <button className="btn btn-secondary" onClick={() => void runAction("Remove desktop icon", () => window.winnest.invoke("removeDesktopIcon", app.id))}>
              <TrashIcon size={14} />
              <span>Remove Desktop Icon</span>
            </button>
          </div>

          <h3 className="panel-title danger-zone-title" style={{ marginTop: "24px" }}>Danger Zone</h3>
          <div className="danger-zone-group">
            <div className="danger-zone-desc">
              <strong>Uninstall app and prefix</strong>
              <span style={{ display: "block", marginTop: "4px" }}>This permanently deletes the Wine prefix, files, saved data and shortcuts.</span>
            </div>
            <button className="btn btn-danger btn-large" onClick={() => void runAction("Uninstall", () => window.winnest.invoke("uninstallApp", app.id))}>
              <TrashIcon size={14} />
              <span>Uninstall App</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

