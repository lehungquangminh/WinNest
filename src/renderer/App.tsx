import { useState } from "react";
import Home from "@/renderer/pages/Home.js";
import Install from "@/renderer/pages/Install.js";
import Detail from "@/renderer/pages/Detail.js";
import Settings from "@/renderer/pages/Settings.js";

export type Page = "home" | "install" | "detail" | "settings";

export default function App(): React.JSX.Element {
  const [page, setPage] = useState<Page>("home");
  const [selectedAppId, setSelectedAppId] = useState<string | undefined>();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">WinNest</div>
        <button className={page === "home" ? "active" : ""} onClick={() => setPage("home")}>Home</button>
        <button className={page === "install" ? "active" : ""} onClick={() => setPage("install")}>Install</button>
        <button className={page === "settings" ? "active" : ""} onClick={() => setPage("settings")}>Settings</button>
      </aside>
      <main className="content">
        {page === "home" && (
          <Home
            onInstall={() => setPage("install")}
            onSettings={() => setPage("settings")}
            onSelectApp={(appId) => {
              setSelectedAppId(appId);
              setPage("detail");
            }}
          />
        )}
        {page === "install" && <Install onInstalled={(appId) => {
          setSelectedAppId(appId);
          setPage("detail");
        }} />}
        {page === "detail" && selectedAppId && <Detail appId={selectedAppId} onBack={() => setPage("home")} />}
        {page === "settings" && <Settings />}
      </main>
    </div>
  );
}
