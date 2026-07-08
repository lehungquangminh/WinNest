import type { ManagedApp } from "@/core/app.js";
import type { DoctorReport } from "@/core/doctor.js";
import { RefreshIcon, InstallIcon, AppIcon, WineIcon, InfoIcon, CheckIcon, LoaderIcon, XIcon } from "@/renderer/components/Icons.js";

type HomeProps = {
  apps: ManagedApp[];
  doctor: DoctorReport | undefined;
  error: string | undefined;
  isRefreshing: boolean;
  onRefresh: () => Promise<void>;
  onInstall: () => void;
  onSettings: () => void;
  onSelectApp: (appId: string) => void;
};

export default function Home(props: HomeProps): React.JSX.Element {
  const { apps, doctor, error, isRefreshing, onRefresh } = props;

  return (
    <section className="page animate-fade-in">
      <header className="page-header">
        <div>
          <h1 className="page-title">Workspace</h1>
          <p className="page-subtitle">Manage, run and isolate your Windows applications via Wine prefixes.</p>
        </div>
        <div className="actions">
          <button className="btn btn-secondary" onClick={() => void onRefresh()} disabled={isRefreshing}>
            <RefreshIcon size={14} className={isRefreshing ? "spin" : ""} />
            <span>Refresh</span>
          </button>
          <button className="btn btn-primary" onClick={props.onInstall}>
            <InstallIcon size={14} />
            <span>Install App</span>
          </button>
        </div>
      </header>

      {error && (
        <div className="banner banner-error">
          <InfoIcon size={16} />
          <span>{error}</span>
        </div>
      )}

      {doctor && !doctor.ok && (
        <div className="banner banner-warning">
          <InfoIcon size={16} />
          <span>System configuration requires attention. Go to Settings for diagnostics.</span>
        </div>
      )}

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Wine Environment</span>
            <WineIcon size={16} className="metric-icon" />
          </div>
          <div className="metric-value">{doctor?.wine.version ?? "Checking..."}</div>
          <div className="metric-footer">
            {doctor?.ok ? (
              <CheckIcon size={12} className="status-icon-success" />
            ) : (
              <InfoIcon size={12} className="status-icon-warning" />
            )}
            <span className="metric-status">{doctor?.ok ? "Wine is operational" : "Needs attention"}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Prefix Diagnostics</span>
            <AppIcon size={16} className="metric-icon" />
          </div>
          <div className="metric-value-row">
            <div className="metric-value-col">
              <span className="metric-col-title">Architecture</span>
              <div className="metric-col-value">
                {doctor ? (doctor.wine.support32 ? "64/32-bit" : "64-bit") : "Checking..."}
              </div>
            </div>
            <div className="metric-col-divider"></div>
            <div className="metric-value-col">
              <span className="metric-col-title">Active Prefixes</span>
              <div className="metric-col-value">{apps.length} {apps.length === 1 ? "App" : "Apps"}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="section-container">
        <h2 className="section-title">Applications</h2>
        <div className="app-list">
          {apps.length === 0 ? (
            <div className="empty-state">
              <AppIcon size={32} className="empty-icon" />
              <h3>No Applications Managed</h3>
              <p>Get started by running the installer of your favorite Windows program.</p>
              <button className="btn btn-primary" onClick={props.onInstall}>
                <InstallIcon size={14} />
                <span>Install Windows App</span>
              </button>
            </div>
          ) : (
            apps.map((app) => (
              <div className="app-card" key={app.id} onClick={() => props.onSelectApp(app.id)}>
                <div className="app-card-left">
                  <div className="app-card-icon">
                    <AppIcon size={20} />
                  </div>
                  <div className="app-card-meta">
                    <strong className="app-name">{app.name}</strong>
                    <span className="app-id">{app.id}</span>
                  </div>
                </div>
                <div className="app-card-right">
                  <span className={`badge badge-${app.status === "installed" ? "success" : app.status === "installing" ? "warning" : "danger"}`}>
                    {app.status === "installed" && <CheckIcon size={11} />}
                    {app.status === "installing" && <LoaderIcon size={11} className="spin" />}
                    {app.status === "failed" && <XIcon size={11} />}
                    <span>{app.status}</span>
                  </span>
                  <svg className="chevron-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

