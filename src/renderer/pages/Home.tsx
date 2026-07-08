import { useEffect, useState } from "react";
import type { ManagedApp } from "@/core/app.js";
import type { DoctorReport } from "@/core/doctor.js";

type HomeProps = {
  onInstall: () => void;
  onSettings: () => void;
  onSelectApp: (appId: string) => void;
};

export default function Home(props: HomeProps): React.JSX.Element {
  const [apps, setApps] = useState<ManagedApp[]>([]);
  const [doctor, setDoctor] = useState<DoctorReport | undefined>();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh(): Promise<void> {
    try {
      const [nextApps, report] = await Promise.all([
        window.winnest.invoke<ManagedApp[]>("listApps"),
        window.winnest.invoke<DoctorReport>("doctor")
      ]);
      setApps(nextApps);
      setDoctor(report);
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>Installed Windows Apps</h1>
          <p>{doctor?.ok ? "Wine is ready." : "Wine needs attention."}</p>
        </div>
        <div className="actions">
          <button onClick={props.onInstall}>Install Windows App</button>
          <button onClick={props.onSettings}>Settings</button>
          <button onClick={() => void refresh()}>Refresh</button>
        </div>
      </header>

      {error && <div className="notice error">{error}</div>}

      <div className="status-row">
        <span>Wine: {doctor?.wine.version ?? "checking"}</span>
        <span>32-bit: {doctor?.wine.support32 ? "yes" : "unknown"}</span>
        <span>Apps: {apps.length}</span>
      </div>

      <div className="app-list">
        {apps.length === 0 && <div className="empty">No managed Windows apps yet.</div>}
        {apps.map((app) => (
          <button className="app-row" key={app.id} onClick={() => props.onSelectApp(app.id)}>
            <span>
              <strong>{app.name}</strong>
              <small>{app.id}</small>
            </span>
            <span>{app.status}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
