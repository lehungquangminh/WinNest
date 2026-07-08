import { useEffect, useRef, useState } from "react";
import type { ManagedApp } from "@/core/app.js";
import type { DoctorReport } from "@/core/doctor.js";
import type { InstallCandidateList } from "@/core/install/candidate.js";
import type { InstallStateFile } from "@/core/install/state.js";
import type { AppRecipe } from "@/recipes/model.js";
import { InstallIcon, InfoIcon, TerminalIcon, CheckIcon, LoaderIcon, XIcon } from "@/renderer/components/Icons.js";

type InstallProps = {
  initialInstallerPath: string | undefined;
  initialAppId?: string | undefined;
  onClearInitialPath?: () => void;
  onInstalled: (appId: string) => void;
};

export default function Install(props: InstallProps): React.JSX.Element {
  const [installerPath, setInstallerPath] = useState("");
  const [desktopIcon, setDesktopIcon] = useState(false);
  const [status, setStatus] = useState("idle");
  const [log, setLog] = useState<string[]>([]);
  const [recipe, setRecipe] = useState<AppRecipe | undefined>();
  const [doctor, setDoctor] = useState<DoctorReport | undefined>();
  const [activeAppId, setActiveAppId] = useState<string | undefined>();
  const [installState, setInstallState] = useState<InstallStateFile | undefined>();
  const [candidates, setCandidates] = useState<InstallCandidateList | undefined>();
  const pollTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (props.initialAppId) {
      setActiveAppId(props.initialAppId);
      startPolling(props.initialAppId);
      props.onClearInitialPath?.();
    } else if (props.initialInstallerPath) {
      setInstallerPath(props.initialInstallerPath);
      props.onClearInitialPath?.();
    }
  }, [props.initialInstallerPath, props.initialAppId]);

  useEffect(() => {
    void refreshContext(installerPath);
  }, [installerPath]);

  useEffect(() => () => stopPolling(), []);

  async function refreshContext(path: string): Promise<void> {
    try {
      const report = await window.winnest.invoke<DoctorReport>("doctor");
      setDoctor(report);
      if (path.trim()) {
        setRecipe(await window.winnest.invoke<AppRecipe | undefined>("matchRecipe", { path: path.trim() }));
      } else {
        setRecipe(undefined);
      }
    } catch {
      setRecipe(undefined);
    }
  }

  async function install(): Promise<void> {
    if (!installerPath.trim()) {
      setStatus("missing installer path");
      return;
    }

    setStatus("installing");
    setActiveAppId(undefined);
    setInstallState(undefined);
    setCandidates(undefined);
    setLog((lines) => [...lines, `[INSTALLER] Spawning installation process: ${installerPath}`]);
    try {
      const started = await window.winnest.invoke<{ appId: string }>("startInstall", { path: installerPath.trim(), desktopIcon });
      setActiveAppId(started.appId);
      setLog((lines) => [...lines, `[APP] Reserved app id: ${started.appId}`]);
      startPolling(started.appId);
    } catch (err) {
      setStatus("failed");
      setLog((lines) => [...lines, `[ERROR] Installation failed: ${err instanceof Error ? err.message : String(err)}`]);
    }
  }

  function startPolling(appId: string): void {
    stopPolling();
    void pollInstall(appId);
    pollTimer.current = window.setInterval(() => {
      void pollInstall(appId);
    }, 1000);
  }

  function stopPolling(): void {
    if (pollTimer.current !== undefined) {
      window.clearInterval(pollTimer.current);
      pollTimer.current = undefined;
    }
  }

  async function pollInstall(appId: string): Promise<void> {
    try {
      const [state, latestLog] = await Promise.all([
        window.winnest.invoke<InstallStateFile>("getInstallState", appId),
        window.winnest.invoke<{ path: string; lines: string[] }>("getLatestLog", appId)
      ]);
      setInstallState(state);
      if (latestLog.lines.length > 0) {
        setLog(latestLog.lines);
      }

      if (state.status === "done") {
        stopPolling();
        const app = await window.winnest.invoke<ManagedApp>("getAppInfo", appId);
        setStatus("done");
        setLog((lines) => [
          ...lines,
          `[SUCCESS] Application installed successfully!`,
          `[METADATA] Name: ${app.name}`,
          `[METADATA] ID: ${app.id}`,
          `[METADATA] Main Exe: ${app.mainExe}`
        ]);
        props.onInstalled(app.id);
      }

      if (state.status === "failed") {
        stopPolling();
        if (state.error?.code === "LAUNCHER_SELECTION_REQUIRED") {
          setStatus("selecting-launcher");
          const nextCandidates = await window.winnest.invoke<InstallCandidateList>("getInstallCandidates", appId);
          setCandidates(nextCandidates);
        } else {
          setStatus("failed");
        }
      }
    } catch (err) {
      setLog((lines) => [...lines, `[POLL] ${err instanceof Error ? err.message : String(err)}`]);
    }
  }

  async function selectCandidate(candidatePath: string): Promise<void> {
    if (!activeAppId) {
      return;
    }

    setStatus("installing");
    setLog((lines) => [...lines, `[SELECTION] Selected launcher: ${candidatePath}`]);
    try {
      const app = await window.winnest.invoke<ManagedApp>("selectInstallCandidate", {
        appId: activeAppId,
        candidatePath
      });
      setCandidates(undefined);
      setStatus("done");
      setLog((lines) => [
        ...lines,
        `[SUCCESS] Launcher selected and metadata written.`,
        `[METADATA] Name: ${app.name}`,
        `[METADATA] ID: ${app.id}`,
        `[METADATA] Main Exe: ${app.mainExe}`
      ]);
      props.onInstalled(app.id);
    } catch (err) {
      setStatus("failed");
      setLog((lines) => [...lines, `[ERROR] Candidate selection failed: ${err instanceof Error ? err.message : String(err)}`]);
    }
  }

  function getStatusLabel() {
    switch (status) {
      case "idle": return "Ready to install";
      case "installing": return "Installing software...";
      case "selecting-launcher": return "Choose launch executable";
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

          <div className="install-info-box">
            <InfoIcon size={16} />
            <div className="info-text">
              <strong>Selected installer</strong>
              <span>{installerPath.trim() || "No installer selected yet."}</span>
            </div>
          </div>

          <div className="install-info-box">
            <InfoIcon size={16} />
            <div className="info-text">
              <strong>Matched recipe</strong>
              <span>{recipe ? recipe.name : "No recipe matched yet."}</span>
              {recipe && recipe.expectedExecutables.length > 0 && (
                <span>Expected executable: {recipe.expectedExecutables.join(", ")}</span>
              )}
              {recipe && recipe.notes.length > 0 && <span>{recipe.notes.join(" ")}</span>}
              {recipe?.permissions.microphone && <span>Permission hint: microphone may be needed.</span>}
              {recipe?.permissions.camera && <span>Permission hint: camera may be needed.</span>}
            </div>
          </div>

          <div className="install-info-box">
            <InfoIcon size={16} />
            <div className="info-text">
              <strong>System status</strong>
              <span>{doctor?.ok ? "Wine ready" : "Wine needs attention"}</span>
              {installState && <span>Step: {installState.currentStep} / {installState.status}</span>}
              {activeAppId && <span>App ID: {activeAppId}</span>}
            </div>
          </div>

          {installState?.error && (
            <div className="install-info-box install-warning-box">
              <XIcon size={16} />
              <div className="info-text">
                <strong>{installState.error.code}</strong>
                <span>{installState.error.message}</span>
                {installState.error.hints?.map((hint) => <span key={hint}>{hint}</span>)}
              </div>
            </div>
          )}

          {candidates && candidates.candidates.length > 0 && (
            <div className="candidate-list">
              <h3 className="panel-title">Choose Launch Target</h3>
              {candidates.candidates.map((candidate) => (
                <button
                  key={candidate.windowsPath}
                  className="candidate-button"
                  type="button"
                  onClick={() => void selectCandidate(candidate.windowsPath)}
                >
                  <span className="candidate-path">{candidate.windowsPath}</span>
                  <span className="candidate-meta">Score {candidate.score} · {candidate.reasons.join(", ")}</span>
                </button>
              ))}
            </div>
          )}

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
              {status !== "installing" && status !== "done" && status !== "failed" && status !== "selecting-launcher" && <InfoIcon size={12} className="status-icon-neutral" />}
              {status === "selecting-launcher" && <InfoIcon size={12} className="status-icon-warning" />}
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
