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
> `winnest-open <file-path>` is the MIME handler that runs **transparently by default** — it launches the actual Windows installer directly through Wine without opening the WinNest GUI first. Use `--gui` to see the WinNest install screen.

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

## How WinNest Opens Installers

When you **right-click a `.exe` or `.msi` file → Open With → WinNest**, here is what happens:

```
Open With WinNest
  → WinNest silently creates a managed app folder and isolated Wine prefix
  → WinNest launches the actual Windows installer through Wine
  → You see the original installer UI, exactly as on Windows
  → Click Next / Install inside the Windows installer
  → After it exits, WinNest scans the prefix
  → WinNest creates a Linux start-menu launcher
  → Optional desktop icon if configured
```

WinNest acts as a **transparent system layer**, not an app you open first.

### winnest-open Modes

| Flag | Behavior |
|:---|:---|
| *(none)* | **Transparent mode** (default) — launches Wine installer directly |
| `--transparent` | Explicit transparent mode, same as no flag |
| `--gui` | Opens WinNest Electron install window first |
| `--cli` | Runs install in current terminal |

Examples:

```bash
# Default: transparent — Windows installer appears immediately
winnest-open /path/to/setup.exe

# Explicit transparent
winnest-open /path/to/setup.exe --transparent

# Open WinNest GUI install window
winnest-open /path/to/setup.exe --gui

# Install via current terminal
winnest-open /path/to/setup.exe --cli
```

## Desktop Integration

Register file-manager MIME handling for Windows installers:

```bash
winnest register-mime
```

### Executable Discovery & Development Link

If a file manager invocation fails with **`Could not find the program 'winnest-open'`**, the `winnest-open` wrapper is missing from your `PATH`.

* **During Development**:
  ```bash
  # Create wrapper scripts in ~/.local/bin pointing at the built project
  winnest dev-install

  # Verify it is discoverable
  command -v winnest-open
  ```
* **In Production**: The `.deb` package places binaries in `/usr/bin` automatically.

### Verifying Handoff Readiness

```bash
winnest doctor --verbose
```

This reports `Desktop handoff: ready: yes/no` and identifies any missing commands. `winnest register-mime` also validates `winnest-open` is in `PATH` before writing desktop files:

```bash
# Validate then register
winnest register-mime

# Force registration even if winnest-open is not yet in PATH
winnest register-mime --force
```

### KDE / Desktop Security Policy Blocking

Some desktop environments (especially KDE Dolphin) block double-clicking `.exe` files with:

```
For security reasons, launching executables is not allowed in this context.
```

This is a **desktop security policy**, not a WinNest failure. WinNest itself works fine. The correct workflow is:

1. **Right-click** the `.exe` file
2. Select **Open With**
3. Choose **WinNest**
4. Optionally set WinNest as the default handler

If the desktop allows double-click handler associations, that works too. Not all file managers permit executable double-click by policy.

### Testing Transparent Open

```bash
# Transparent (default): Windows installer opens directly
winnest-open /path/to/setup.exe

# Explicit transparent
winnest-open /path/to/setup.exe --transparent

# GUI mode: WinNest install window opens first
winnest-open /path/to/setup.exe --gui

# Simulate file manager handoff (tests path/unicode/spaces survival)
winnest simulate-open "/path/to/Bộ cài/Test App (2026)/setup.exe"
```

### Inspecting Logs

```bash
# Global open log
cat ~/.local/share/winnest/logs/open.log

# Per-app install log
cat ~/.local/share/winnest/apps/<app-id>/logs/install.log

# Diagnose full system
winnest doctor --verbose
```

### Desktop Environment Caveats

* **KDE Dolphin / Nautilus / Thunar / Caja**: If double-click is blocked by desktop security policy, use **Right-click → Open With → WinNest**.
* **MIME handler conflicts**: Wine may register its own `.exe` handler. If WinNest gets overridden, re-run `winnest register-mime` and set WinNest as default via your file manager settings.
* **Single instance**: If WinNest GUI is already open, a second file launch focuses the existing window and routes the new path to the install screen.

Desktop icons are opt-in:

```bash
winnest install ~/Downloads/setup.exe --desktop-icon
winnest create-desktop-icon <app-id>
winnest remove-desktop-icon <app-id>
```

Build and start the Electron GUI for app management:

```bash
npm run build:gui
npm run start:gui
```

---

## 📦 Installation (Debian / Ubuntu / nonlaOS)

### Recommended: install from the WinNest APT repository

Enable i386 first so APT can install `wine32` correctly:

```bash
sudo dpkg --add-architecture i386
sudo apt update
```

Add the WinNest repository and install:

```bash
sudo install -d -m 0755 /etc/apt/keyrings
curl -fsSL https://repo.winnest.app/winnest.gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/winnest.gpg

echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/winnest.gpg] https://repo.winnest.app/debian stable main" \
  | sudo tee /etc/apt/sources.list.d/winnest.list >/dev/null

sudo apt update
sudo apt install winnest
```

This lets APT install WinNest with required Wine, 32-bit Wine, MIME, desktop, and Electron runtime dependencies.

### Standalone .deb fallback

```bash
sudo dpkg --add-architecture i386
sudo apt update
sudo apt install ./release/winnest_0.1.0_amd64.deb
```

The standalone `.deb` is mainly for local testing and early releases. The APT repository is the preferred user-facing install path.

### Verify installation

```bash
# Commands must be on PATH
command -v winnest
command -v winnest-open

# Installed at
ls /usr/bin/winnest /usr/bin/winnest-open

# Application files
ls /opt/winnest/

# Run diagnostics
winnest doctor --verbose

# Check MIME handler
xdg-mime query default application/x-ms-dos-executable
xdg-mime query default application/x-msi
xdg-mime query default application/vnd.microsoft.portable-executable
```

### Using Open With WinNest after install

After installing the package:

1. Right-click any `.exe` or `.msi` file in your file manager
2. Select **Open With → WinNest Windows Installer Handler**
3. The actual Windows installer appears through Wine immediately
4. After the installer finishes, WinNest creates a Linux start-menu entry

No `dev-install`, `npm link`, or manual `PATH` edits are needed after package installation.

### Uninstalling

```bash
sudo apt remove winnest
```

Your installed Windows apps in `~/.local/share/winnest/` are **never deleted** by package removal. Only the `/usr/bin/winnest`, `/usr/bin/winnest-open`, and `/opt/winnest/` package files are removed.

To also remove all your installed Windows apps and WinNest data:

```bash
rm -rf ~/.local/share/winnest
```

### Building the package yourself

```bash
git clone git@github.com:lehungquangminh/WinNest.git
cd WinNest
npm install
npm run build:deb
# Output: release/winnest_0.1.0_amd64.deb
```

To generate a local static APT repository:

```bash
npm run build:apt-repo
# Output: release/apt/
```

To rebuild after source changes:

```bash
npm run build:deb -- --build
```

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

Validated on Debian 13 with wine-10.0 (wine32:i386, winbind, cabextract installed):

*   Wine 32-bit and 64-bit prefix support: OK.
*   Notepad++ `8.9.6.4` x64: transparent install → `notepad++.exe` auto-selected → launcher created → `winnest run` works.
*   WinSCP `6.5.6`: transparent install → `WinSCP.exe` auto-selected → launcher created → `winnest run` works.
*   7-Zip `26.02` x64: transparent install → **`7zFM.exe` auto-selected without user prompt** (primary recipe match, score 155 vs 135) → launcher created → `winnest run` works.
*   Scanner auto-selection: recipe primary executable selected in `automatic-primary-recipe` mode for known apps.
*   `winnest-open setup.exe` (no flags): Windows installer appears directly, no WinNest GUI.
*   `winnest-open setup.exe --gui`: WinNest Electron install window appears first.
*   No-TTY file manager handoff: transparent mode runs without requiring terminal input.
