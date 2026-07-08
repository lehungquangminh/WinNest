import { useState, useEffect, useCallback } from "react";
import Home from "@/renderer/pages/Home.js";
import Install from "@/renderer/pages/Install.js";
import Detail from "@/renderer/pages/Detail.js";
import Settings from "@/renderer/pages/Settings.js";
import { HomeIcon, InstallIcon, SettingsIcon, WineIcon, CheckIcon } from "@/renderer/components/Icons.js";
import type { ManagedApp } from "@/core/app.js";
import type { DoctorReport } from "@/core/doctor.js";

export type Page = "home" | "install" | "detail" | "settings";

export default function App(): React.JSX.Element {
  const [page, setPage] = useState<Page>("home");
  const [selectedAppId, setSelectedAppId] = useState<string | undefined>();
  const [handoffInstallerPath, setHandoffInstallerPath] = useState<string | undefined>();
  
  const [apps, setApps] = useState<ManagedApp[]>([]);
  const [doctor, setDoctor] = useState<DoctorReport | undefined>();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(undefined);

    const loadApps = window.winnest.invoke<ManagedApp[]>("listApps")
      .then((nextApps) => {
        setApps(nextApps);
      });

    const loadDoctor = window.winnest.invoke<DoctorReport>("doctor")
      .then((report) => {
        setDoctor(report);
      });

    try {
      await Promise.all([loadApps, loadDoctor]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (window.winnest) {
      void refresh();
    }
  }, [refresh]);

  useEffect(() => {
    if (!window.winnest?.onInstallPath) {
      return undefined;
    }

    return window.winnest.onInstallPath((installerPath) => {
      setHandoffInstallerPath(installerPath);
      setPage("install");
    });
  }, []);

  if (typeof window === "undefined" || !window.winnest) {
    return (
      <div className="flex-center" style={{ height: "100vh", padding: "40px", background: "var(--bg-primary)" }}>
        <div className="panel" style={{ maxWidth: "480px", textAlign: "center", border: "1px solid var(--danger-border)" }}>
          <h2 style={{ marginBottom: "16px", color: "var(--danger-text)", fontSize: "18px" }}>Kết nối thất bại</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px", lineHeight: "1.6" }}>
            Không thể phát hiện cầu nối tích hợp hệ thống của WinNest. Vui lòng khởi động bằng phần mềm WinNest hoặc khởi động lại.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <WineIcon size={22} className="brand-icon" />
          <span>WinNest</span>
          <span className="version">v0.1.0</span>
        </div>
        <nav className="nav-group">
          <button 
            className={`nav-item ${page === "home" ? "active" : ""}`} 
            onClick={() => setPage("home")}
          >
            <HomeIcon size={16} />
            <span>Home</span>
          </button>
          <button 
            className={`nav-item ${page === "install" ? "active" : ""}`} 
            onClick={() => setPage("install")}
          >
            <InstallIcon size={16} />
            <span>Install App</span>
          </button>
          <button 
            className={`nav-item ${page === "settings" ? "active" : ""}`} 
            onClick={() => setPage("settings")}
          >
            <SettingsIcon size={16} />
            <span>Settings</span>
          </button>
        </nav>
        <div className="sidebar-footer">
          <CheckIcon size={12} className="status-icon-success" />
          <span className="footer-text">Wine Runner Active</span>
        </div>
      </aside>
      <main className="content">
        {page === "home" && (
          <Home
            apps={apps}
            doctor={doctor}
            error={error}
            isRefreshing={isRefreshing}
            onRefresh={refresh}
            onInstall={() => setPage("install")}
            onSettings={() => setPage("settings")}
            onSelectApp={(appId) => {
              setSelectedAppId(appId);
              setPage("detail");
            }}
          />
        )}
        {page === "install" && (
          <Install 
            initialInstallerPath={handoffInstallerPath}
            onInstalled={async (appId) => {
              await refresh();
              setSelectedAppId(appId);
              setPage("detail");
            }} 
          />
        )}
        {page === "detail" && selectedAppId && (
          <Detail 
            appId={selectedAppId} 
            onBack={() => setPage("home")} 
            onRefreshParent={refresh}
          />
        )}
        {page === "settings" && (
          <Settings 
            report={doctor} 
            error={error} 
            isLoading={isRefreshing} 
            onRefresh={refresh}
          />
        )}
      </main>
    </div>
  );
}
