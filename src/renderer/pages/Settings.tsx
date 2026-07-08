import { useState } from "react";
import type { DoctorReport } from "@/core/doctor.js";
import { RefreshIcon, InfoIcon, CheckIcon, CopyIcon, XIcon, SettingsIcon } from "@/renderer/components/Icons.js";
import type { Language, Translation } from "@/renderer/i18n.js";

type SettingsProps = {
  report: DoctorReport | undefined;
  error: string | undefined;
  isLoading: boolean;
  language: Language;
  onLanguageChange: (language: Language) => void;
  text: Translation["settings"];
  onRefresh: () => Promise<void>;
};

export default function Settings(props: SettingsProps): React.JSX.Element {
  const { report, error, isLoading, language, onLanguageChange, text, onRefresh } = props;
  const [copiedField, setCopiedField] = useState<string | null>(null);

  function copyToClipboard(value: string | undefined, fieldName: string): void {
    if (!value) {
      return;
    }
    void navigator.clipboard.writeText(value);
    setCopiedField(fieldName);
    window.setTimeout(() => setCopiedField(null), 1600);
  }

  const mimeDefaultsReady = Object.values(report?.tools.mimeDefaults ?? {}).filter(
    (entry) => entry === "winnest-open.desktop"
  ).length;

  return (
    <section className="page animate-fade-in">
      <header className="page-header">
        <div>
          <h1 className="page-title">{text.title}</h1>
          <p className="page-subtitle">{text.subtitle}</p>
        </div>
        <button className="btn btn-secondary" onClick={() => void onRefresh()} disabled={isLoading}>
          <RefreshIcon size={14} className={isLoading ? "spin" : ""} />
          <span>{text.reload}</span>
        </button>
      </header>

      {error && (
        <div className="banner banner-error">
          <InfoIcon size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className={`banner ${report?.ok ? "banner-success" : "banner-warning"}`}>
        {report?.ok ? <CheckIcon size={16} /> : <InfoIcon size={16} />}
        <span>{report?.ok ? text.systemReady : text.systemAttention}</span>
      </div>

      <div className="settings-grid">
        <section className="panel settings-panel">
          <div className="settings-panel-header">
            <SettingsIcon size={16} />
            <h3 className="panel-title">{text.languageTitle}</h3>
          </div>
          <p className="settings-description">{text.languageDesc}</p>
          <div className="setting-row">
            <div>
              <span className="setting-label">{text.interfaceLanguage}</span>
              <span className="setting-hint">{language === "vi" ? "Tiếng Việt" : "English"}</span>
            </div>
            <div className="segmented-control">
              <button className={language === "vi" ? "active" : ""} onClick={() => onLanguageChange("vi")}>VN</button>
              <button className={language === "en" ? "active" : ""} onClick={() => onLanguageChange("en")}>EN</button>
            </div>
          </div>
        </section>

        <section className="panel settings-panel">
          <div className="settings-panel-header">
            {report?.ok ? <CheckIcon size={16} className="status-icon-success" /> : <InfoIcon size={16} className="status-icon-warning" />}
            <h3 className="panel-title">{text.systemOverview}</h3>
          </div>
          <div className="settings-status-grid">
            {statusTile(text.wineRuntime, report?.wine.version ?? text.missing, Boolean(report?.wine.version), text)}
            {statusTile(text.wine64, report?.wine.support64 ? text.enabled : text.disabled, Boolean(report?.wine.support64), text)}
            {statusTile(text.wine32, report?.wine.support32 ? text.enabled : text.disabled, Boolean(report?.wine.support32), text)}
            {statusTile(text.temporaryPrefix, report?.wine.prefixCreationOk ? text.ready : text.needsAttention, Boolean(report?.wine.prefixCreationOk), text)}
          </div>
        </section>

        <section className="panel settings-panel">
          <div className="settings-panel-header">
            <InfoIcon size={16} />
            <h3 className="panel-title">{text.storage}</h3>
          </div>
          <div className="properties-sheet">
            {pathRow(text.dataRoot, report?.system.paths.dataRoot, "data", copiedField, text, copyToClipboard)}
            {pathRow(text.appsRoot, report?.system.paths.appsRoot, "apps", copiedField, text, copyToClipboard)}
            {pathRow(text.applicationsDir, report?.system.paths.applicationsDir, "applications", copiedField, text, copyToClipboard)}
            {pathRow(text.mimePackagesDir, report?.system.paths.mimePackagesDir, "mime", copiedField, text, copyToClipboard)}
          </div>
        </section>

        <section className="panel settings-panel">
          <div className="settings-panel-header">
            <InfoIcon size={16} />
            <h3 className="panel-title">{text.desktopIntegration}</h3>
          </div>
          <div className="properties-sheet">
            {badgeRow(text.xdgMime, Boolean(report?.tools.xdgMime), report?.tools.xdgMime ? text.installed : text.missing)}
            {badgeRow(text.mimeHandler, Boolean(report?.tools.mimeHandlerDesktopEntry), report?.tools.mimeHandlerDesktopEntry ? text.installed : text.missing)}
            {badgeRow(text.mimeDefaults, mimeDefaultsReady === 3, `${mimeDefaultsReady}/3`)}
            {badgeRow(
              text.updateDesktopDatabase,
              Boolean(report?.tools.updateDesktopDatabase),
              report?.tools.updateDesktopDatabase ? text.installed : text.missing
            )}
          </div>
        </section>
      </div>
    </section>
  );
}

function statusTile(title: string, value: string, ok: boolean, text: Translation["settings"]): React.JSX.Element {
  return (
    <div className="settings-status-tile">
      <span className="setting-label">{title}</span>
      <span className={`badge badge-${ok ? "success" : "warning"}`}>
        {ok ? <CheckIcon size={11} /> : <InfoIcon size={11} />}
        <span>{value || text.missing}</span>
      </span>
    </div>
  );
}

function pathRow(
  label: string,
  value: string | undefined,
  field: string,
  copiedField: string | null,
  text: Translation["settings"],
  copyToClipboard: (value: string | undefined, fieldName: string) => void
): React.JSX.Element {
  return (
    <div className="property-row">
      <span className="property-key">{label}</span>
      <div className="property-value-wrapper">
        <code className="property-value" title={value}>{value ?? "checking"}</code>
        <button className="btn-icon-action" onClick={() => copyToClipboard(value, field)} disabled={!value}>
          {copiedField === field ? <span className="copy-tooltip">{text.copied}</span> : <CopyIcon size={12} />}
        </button>
      </div>
    </div>
  );
}

function badgeRow(label: string, ok: boolean, value: string): React.JSX.Element {
  return (
    <div className="setting-row compact">
      <span className="setting-label">{label}</span>
      <span className={`badge badge-${ok ? "success" : "danger"}`}>
        {ok ? <CheckIcon size={11} /> : <XIcon size={11} />}
        <span>{value}</span>
      </span>
    </div>
  );
}
