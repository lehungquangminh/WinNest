import { useEffect, useState } from "react";
import type { DoctorReport } from "@/core/doctor.js";
import { RefreshIcon, InfoIcon, CheckIcon, CopyIcon, XIcon } from "@/renderer/components/Icons.js";

type SettingsProps = {
  report: DoctorReport | undefined;
  error: string | undefined;
  isLoading: boolean;
  onRefresh: () => Promise<void>;
};

export default function Settings(props: SettingsProps): React.JSX.Element {
  const { report, error, isLoading, onRefresh } = props;
  const [copiedField, setCopiedField] = useState<string | null>(null);

  function copyToClipboard(text: string, fieldName: string) {
    void navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  }

  return (
    <section className="page animate-fade-in">
      <header className="page-header">
        <div>
          <h1 className="page-title">System Settings</h1>
          <p className="page-subtitle">Diagnostics, helper tools status, and Wine execution environments.</p>
        </div>
        <button className="btn btn-secondary" onClick={() => void onRefresh()} disabled={isLoading}>
          <RefreshIcon size={14} className={isLoading ? "spin" : ""} />
          <span>Reload</span>
        </button>
      </header>

      {error && (
        <div className="banner banner-error">
          <InfoIcon size={16} />
          <span>{error}</span>
        </div>
      )}

      {report && (
        <div className={`banner ${report.ok ? "banner-success" : "banner-warning"}`}>
          {report.ok ? <CheckIcon size={16} /> : <InfoIcon size={16} />}
          <span>{report.ok ? "System is fully operational. All dependencies met." : "Diagnostics require attention."}</span>
        </div>
      )}

      <div className="grid-one-two" style={{ gap: "24px" }}>
        {/* Left Panel: Directories */}
        <div className="panel">
          <h3 className="panel-title">Storage & Directories</h3>
          <div className="properties-sheet">
            <div className="property-row">
              <span className="property-key">Data Root Directory</span>
              <div className="property-value-wrapper">
                <code className="property-value" title={report?.system.paths.dataRoot}>{report?.system.paths.dataRoot ?? "checking"}</code>
                {report?.system.paths.dataRoot && (
                  <button 
                    className="btn-icon-action" 
                    onClick={() => copyToClipboard(report.system.paths.dataRoot, "data")}
                  >
                    {copiedField === "data" ? <span className="copy-tooltip">Copied!</span> : <CopyIcon size={12} />}
                  </button>
                )}
              </div>
            </div>

            <div className="property-row">
              <span className="property-key">Applications Desktop Folder</span>
              <div className="property-value-wrapper">
                <code className="property-value" title={report?.system.paths.applicationsDir}>{report?.system.paths.applicationsDir ?? "checking"}</code>
                {report?.system.paths.applicationsDir && (
                  <button 
                    className="btn-icon-action" 
                    onClick={() => copyToClipboard(report.system.paths.applicationsDir, "apps")}
                  >
                    {copiedField === "apps" ? <span className="copy-tooltip">Copied!</span> : <CopyIcon size={12} />}
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <div className="install-info-box" style={{ marginTop: "24px" }}>
            <InfoIcon size={16} />
            <div className="info-text">
              <span>Managed files reside in your user home directory to ensure unprivileged access and security.</span>
            </div>
          </div>
        </div>

        {/* Right Panel: Wine & OS Integrations */}
        <div className="panel">
          <h3 className="panel-title">Wine Environment & Integration Utilities</h3>
          <div className="properties-sheet">
            <div className="property-row">
              <span className="property-key">Wine Executable Version</span>
              <div className="property-value-wrapper">
                <span className={`badge badge-${report?.wine.version ? "success" : "danger"}`}>
                  {report?.wine.version ? <CheckIcon size={11} /> : <XIcon size={11} />}
                  <span>{report?.wine.version ?? "Not found"}</span>
                </span>
              </div>
            </div>

            <div className="property-row">
              <span className="property-key">32-bit Wine Support</span>
              <div className="property-value-wrapper">
                <span className={`badge badge-${report?.wine.support32 ? "success" : "neutral"}`}>
                  {report?.wine.support32 ? <CheckIcon size={11} /> : <InfoIcon size={11} />}
                  <span>{report?.wine.support32 ? "Enabled (Recommended)" : "Disabled / Unavailable"}</span>
                </span>
              </div>
            </div>

            <div className="property-row">
              <span className="property-key">XDG MIME Query Tool</span>
              <div className="property-value-wrapper">
                <span className={`badge badge-${report?.tools.xdgMime ? "success" : "danger"}`}>
                  {report?.tools.xdgMime ? <CheckIcon size={11} /> : <XIcon size={11} />}
                  <span>{report?.tools.xdgMime ? "Installed" : "Missing"}</span>
                </span>
              </div>
            </div>

            <div className="property-row">
              <span className="property-key">Desktop Database Utility</span>
              <div className="property-value-wrapper">
                <span className={`badge badge-${report?.tools.updateDesktopDatabase ? "success" : "danger"}`}>
                  {report?.tools.updateDesktopDatabase ? <CheckIcon size={11} /> : <XIcon size={11} />}
                  <span>{report?.tools.updateDesktopDatabase ? "Installed" : "Missing"}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

