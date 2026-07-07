# WinNest 🍷📦

[![License](https://img.shields.io/badge/License-MPL_2.0-blue.svg)](LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](package.json)
[![Language](https://img.shields.io/badge/Language-TypeScript-blue.svg)](tsconfig.json)

**WinNest** is a TypeScript-only Linux desktop and CLI application manager for Windows software through Wine. It aims to provide a managed, container-like, Windows-friendly experience directly on your Linux desktop.

By isolation and structured metadata management, WinNest bridges the gap between running Windows applications and keeping a clean, predictable Linux environment.

---

## 🚀 Key Features

*   **Isolated Prefixes**: Every application is installed in its own dedicated, isolated Wine prefix (located under `~/.local/share/winnest/apps/<app-id>`). This prevents registry conflicts, dependency clashes, and DLL interference between different Windows apps.
*   **Shell-Safe Execution**: Security is paramount. WinNest completely avoids shell-string concatenation when invoking external tools (like Wine or system commands). It always executes commands with argument arrays to prevent shell injection vulnerabilities.
*   **TypeScript-First Architecture**: Built entirely in TypeScript for strong type safety and maintainable codebase. The CLI/core logic acts as the single source of truth, designed to seamlessly interface with a future Electron-based desktop GUI via main-process IPC.
*   **Desktop & MIME Integration**: WinNest supports standard desktop registration, allowing you to double-click and open Windows files using your native file manager (e.g., Nautilus, Dolphin) via the lightweight `winnest-open` entry point.
*   **Self-Contained Logs & Metadata**: View and manage application logs, installer backups, and configurations (`app.json`) directly within the app's isolated directory.

---

## 🛠️ Managed App Directory Structure

Installed applications live in structured, self-contained directories:

```txt
~/.local/share/winnest/apps/<app-id>/
├── prefix/           # Isolated Wine prefix (C: drive, registry, etc.)
├── installer/        # Copy of the original installer file (for repair/reinstall)
├── logs/             # App-specific runtime logs
├── launcher/         # Desktop shortcut and metadata launcher configs
└── app.json          # WinNest application metadata (ID, version, executables)
```

---

## 💻 CLI Commands Reference

WinNest exposes a clean CLI to manage your Windows software catalog.

| Command | Description |
| :--- | :--- |
| `winnest doctor` | Diagnose environment dependencies, Node.js version, and Wine configurations. |
| `winnest install <installer-path>` | Install a new Windows application from an executable installer. |
| `winnest open <file-path>` | Open a file with its registered/associated managed Windows application. |
| `winnest run <app-id>` | Launch the specified managed application. |
| `winnest list` | List all managed applications installed via WinNest. |
| `winnest info <app-id>` | Retrieve detailed metadata, path configurations, and log locations for an app. |
| `winnest repair <app-id>` | Repair broken prefix symlinks, desktop launchers, or configuration files. |
| `winnest reset <app-id>` | Reset the application prefix configuration and database entries to defaults. |
| `winnest uninstall <app-id>` | Completely remove the application, its Wine prefix, logs, and shortcuts. |
| `winnest register-mime` | Register file manager MIME-type associations for the desktop. |

> [!NOTE]
> `winnest-open <file-path>` is a dedicated fast-path helper program designed specifically for system file managers to open files using WinNest MIME types without loading the full CLI overhead.

---

## 🛠️ Development & Building

### Prerequisites
*   **Node.js**: `v20.x` (LTS) or higher
*   **npm**: Installed with Node
*   **Wine**: System-wide installation (e.g., `wine`, `wineserver`)

### Getting Started

1.  **Clone the Repository**:
    ```bash
    git clone git@github.com:lehungquangminh/WinNest.git
    cd WinNest
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Validate & Compile Code**:
    ```bash
    # Run TypeScript compilation checks (noEmit)
    npm run check

    # Compile TypeScript into JavaScript (dist/)
    npm run build
    ```

---

## 🔒 Security & Limits

*   **Untrusted Code**: Windows apps run in user space. While WinNest secures host commands against shell injection, Windows apps still run under Wine and can access your host filesystem if Wine configurations expose home directories. Use caution with untrusted binaries.
*   **No Emulation/VM**: WinNest is not a virtual machine. It relies entirely on your system's Wine installation. Software compatibility is subject to Wine's current implementation and available DLL overrides.
