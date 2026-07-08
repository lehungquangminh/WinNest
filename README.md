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
| `winnest repair-system` | Print system dependency issues and distro-specific repair commands. |
| `winnest install-system-deps` | Run real system package commands for Wine 32-bit support on Debian/Ubuntu-like systems. |
| `winnest reset <app-id>` | Reset the application prefix configuration and database entries to defaults. |
| `winnest uninstall <app-id>` | Completely remove the application, its Wine prefix, logs, and shortcuts. |
| `winnest register-mime` | Register file manager MIME-type associations for the desktop. |
| `winnest create-desktop-icon <app-id>` | Create a desktop launcher icon under `~/Desktop` if the desktop folder exists. |
| `winnest remove-desktop-icon <app-id>` | Remove a WinNest desktop launcher icon. |
| `winnest gui --install <installer-path>` | Open the Electron shell directly on the install screen. |
| `winnest setup-wine` | Compatibility alias for `winnest install-system-deps`. |

> [!NOTE]
> `winnest-open <file-path>` is a dedicated fast-path helper program designed specifically for system file managers to open files using WinNest MIME types without loading the full CLI overhead.

> [!IMPORTANT]
> `winnest install-system-deps` and `winnest setup-wine` run real package commands on Debian/Ubuntu-like systems. If sudo asks for a password, type it in the terminal. WinNest never reads or stores sudo passwords.

## Dependency Repair Flow

WinNest tracks two dependency categories:

*   **System dependencies** live on Linux outside Wine, such as `wine`, `wineboot`, `wineserver`, `wine32:i386`, `winbind`, `cabextract`, and `p7zip-full`.
*   **Wine/app dependencies** live inside a specific Wine prefix, such as `corefonts`, `vcrun2022`, `.NET`, DXVK, registry tweaks, and DLL overrides. These are modeled as recipe hints first.

Many Windows installers still need 32-bit Wine/ WoW64 support even when the app installer is marked x64. On Debian, Ubuntu, and nonlaOS-like systems, a missing `wine32:i386` package commonly appears as `syswow64\\ntdll.dll` or `wine32 is missing` in Wine logs.

Useful commands:

```bash
winnest doctor --fix-hints
winnest doctor --json
winnest repair-system
winnest install-system-deps
winnest repair <app-id>
```

Typical Debian/Ubuntu/nonlaOS fix:

```bash
sudo dpkg --add-architecture i386
sudo apt update
sudo apt install wine32:i386 winbind cabextract p7zip-full
```

After fixing system packages, retry with:

```bash
winnest doctor
winnest repair <app-id>
winnest rescan <app-id>
winnest run <app-id>
```

## Desktop Integration

Register file-manager handling for Windows installers:

```bash
winnest register-mime
```

After registration, clicking an installer-like `.exe` or `.msi` should route through `winnest-open %f`. From a file manager without a terminal, WinNest opens the Electron install screen with the installer path already selected. From a terminal, you can force either mode:

```bash
winnest-open ~/Downloads/setup.exe --gui
winnest-open ~/Downloads/setup.exe --cli
```

WinNest installs into an isolated app folder, writes `app.json`, creates an app-menu launcher, and keeps the launcher command stable:

```ini
Exec=winnest run <app-id>
```

Desktop icons are opt-in:

```bash
winnest install ~/Downloads/setup.exe --desktop-icon
winnest create-desktop-icon <app-id>
winnest remove-desktop-icon <app-id>
```

The minimal Electron shell can be built and started for app list, install entry, settings, and app actions:

```bash
npm run build:gui
npm run start:gui
```

To test install handoff directly:

```bash
winnest gui --install ~/Downloads/setup.exe
```

The GUI is a shell over the same core logic. It does not call Wine directly from the renderer. The install screen polls existing install state and log files through Electron IPC, and uses the same scanner candidate data when manual launcher selection is needed.

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

## Known MVP limitations

*   Not every Windows app works under Wine.
*   Wine must be installed separately for now.
*   Automatic system dependency installation currently supports Debian/Ubuntu/nonlaOS-like systems only.
*   Some installers may hang or require manual clicks inside Wine dialogs.
*   Some apps need extra dependencies, fonts, runtimes, or DLL overrides that WinNest does not install yet.
*   The executable scanner can still choose the wrong `.exe`; use `winnest rescan <app-id>` to correct it.
*   Start Menu `.lnk` discovery is logged, but target parsing is still limited/TODO.
*   Registry uninstall detection is best-effort and only used as a scanner hint.
*   Portable `.exe` app capsules are not implemented yet.
*   File manager behavior can vary by desktop environment; use "Open With -> WinNest" after `winnest register-mime` if double-click defaults to another app.
*   WinNest does not strongly sandbox Windows apps yet.
*   Windows apps may access files exposed through the Wine prefix.

## Real Validation Snapshot

After installing `wine32:i386`, `winbind`, and `cabextract` on Debian 13, WinNest validated:

*   Wine 32-bit and 64-bit prefix support: OK.
*   Notepad++ `8.9.6.4` x64 installer: installed and launched.
*   WinSCP `6.5.6` installer: installed and launched.
*   Scanner selected `C:/Program Files/Notepad++/notepad++.exe`.
*   Scanner selected `C:/Program Files (x86)/WinSCP/WinSCP.exe`.
