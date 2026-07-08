import { useState, useEffect, useCallback } from "react";
import Home from "@/renderer/pages/Home.js";
import Install from "@/renderer/pages/Install.js";
import Detail from "@/renderer/pages/Detail.js";
import Settings from "@/renderer/pages/Settings.js";
import { HomeIcon, InstallIcon, SettingsIcon, WineIcon, CheckIcon } from "@/renderer/components/Icons.js";
import { getInitialLanguage, translations, type Language } from "@/renderer/i18n.js";
import type { ManagedApp } from "@/core/app.js";
import type { DoctorReport } from "@/core/doctor.js";

export type Page = "home" | "install" | "detail" | "settings";

export default function App(): React.JSX.Element {
  const [page, setPage] = useState<Page>("home");
  const [language, setLanguageState] = useState<Language>(() => getInitialLanguage());
  const [selectedAppId, setSelectedAppId] = useState<string | undefined>();
  const [handoffInstallerPath, setHandoffInstallerPath] = useState<string | undefined>();
  const [handoffAppId, setHandoffAppId] = useState<string | undefined>();
  
  const [apps, setApps] = useState<ManagedApp[]>([]);
  const [doctor, setDoctor] = useState<DoctorReport | undefined>();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const t = translations[language];

  function setLanguage(nextLanguage: Language): void {
    setLanguageState(nextLanguage);
    window.localStorage.setItem("winnest-language", nextLanguage);
  }

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
    if (!window.winnest?.onHandoffState) {
      return undefined;
    }

    return window.winnest.onHandoffState((state) => {
      if (state.installerPath) {
        setHandoffInstallerPath(state.installerPath);
      }
      if (state.appId) {
        setHandoffAppId(state.appId);
      }
      if (state.page) {
        setPage(state.page as Page);
      } else {
        setPage("install");
      }
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
            <span>{t.nav.home}</span>
          </button>
          <button 
            className={`nav-item ${page === "install" ? "active" : ""}`} 
            onClick={() => setPage("install")}
          >
            <InstallIcon size={16} />
            <span>{t.nav.install}</span>
          </button>
          <button 
            className={`nav-item ${page === "settings" ? "active" : ""}`} 
            onClick={() => setPage("settings")}
          >
            <SettingsIcon size={16} />
            <span>{t.nav.settings}</span>
          </button>
        </nav>
        <div className="language-switch" aria-label="Language">
          <button className={language === "vi" ? "active" : ""} onClick={() => setLanguage("vi")}>VN</button>
          <button className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}>EN</button>
        </div>
        <div className="sidebar-footer">
          <CheckIcon size={12} className="status-icon-success" />
          <span className="footer-text">{t.nav.wineActive}</span>
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
            initialAppId={handoffAppId}
            text={t.install}
            onClearInitialPath={() => {
              setHandoffInstallerPath(undefined);
              setHandoffAppId(undefined);
            }}
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
            language={language}
            onLanguageChange={setLanguage}
            text={t.settings}
            onRefresh={refresh}
          />
        )}
      </main>
    </div>
  );
}
