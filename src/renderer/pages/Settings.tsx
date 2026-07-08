import { useEffect, useState } from "react";
import type { DoctorReport } from "@/core/doctor.js";

export default function Settings(): React.JSX.Element {
  const [report, setReport] = useState<DoctorReport | undefined>();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    void load();
  }, []);

  async function load(): Promise<void> {
    try {
      setReport(await window.winnest.invoke<DoctorReport>("doctor"));
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>Settings</h1>
          <p>{report?.ok ? "System ready" : "Diagnostics need attention"}</p>
        </div>
        <button onClick={() => void load()}>Refresh</button>
      </header>

      {error && <div className="notice error">{error}</div>}

      <div className="detail-grid">
        <span>Data path</span><strong>{report?.system.paths.dataRoot ?? "checking"}</strong>
        <span>Applications path</span><strong>{report?.system.paths.applicationsDir ?? "checking"}</strong>
        <span>Wine</span><strong>{report?.wine.version ?? "missing"}</strong>
        <span>32-bit Wine</span><strong>{report?.wine.support32 ? "yes" : "no"}</strong>
        <span>MIME tool</span><strong>{report?.tools.xdgMime ?? "missing"}</strong>
        <span>Desktop database</span><strong>{report?.tools.updateDesktopDatabase ?? "missing"}</strong>
      </div>
    </section>
  );
}
