# Real Wine Integration Testing

This guide verifies WinNest against real Windows installers under Wine. Do not commit installers to this repository.

## System Packages

Required:

```bash
sudo apt update
sudo apt install wine wine64 wine32:i386 xdg-utils desktop-file-utils shared-mime-info
```

Recommended for broader Wine compatibility:

```bash
sudo dpkg --add-architecture i386
sudo apt update
sudo apt install winetricks cabextract p7zip-full mesa-vulkan-drivers mesa-vulkan-drivers:i386
```

Use the diagnostics below to print distro-specific commands:

```bash
winnest doctor --fix-hints
winnest repair-system
```

On Debian/Ubuntu/nonlaOS-like systems, WinNest can also run the real package commands:

```bash
winnest install-system-deps
```

If sudo asks for a password, type it in the terminal. WinNest never reads or stores it.

On Debian, Ubuntu, and Ubuntu-compatible nonlaOS systems, start with the distro packages above. If the distro Wine is too old, follow the official WineHQ download instructions for Debian/Ubuntu: https://gitlab.winehq.org/wine/wine/-/wikis/Download

## Dependency Categories

System dependencies are installed on Linux outside Wine. Examples: `wine`, `wineboot`, `wineserver`, `wine32:i386`, `winbind`, `cabextract`, and `p7zip-full`.

Wine/app dependencies are applied inside one app prefix. Examples: `corefonts`, `vcrun2019`, `vcrun2022`, `.NET`, DXVK, vkd3d, registry tweaks, and DLL overrides. Phase 3.5 models these as recipe hints; it does not implement a full winetricks replacement.

## Why wine32:i386 Matters

Some x64 installers still load 32-bit bootstrapper code or WoW64 components. On Debian-like systems, missing 32-bit Wine support often shows up in logs as:

```txt
wine32 is missing
syswow64\\ntdll.dll
```

Fix on Debian/Ubuntu/nonlaOS-like systems:

```bash
sudo dpkg --add-architecture i386
sudo apt update
sudo apt install wine32:i386 winbind cabextract p7zip-full
```

## Build WinNest

```bash
npm install
npm run check
npm run build
```

For local CLI testing, use:

```bash
node dist/cli/index.js doctor
node dist/cli/index.js doctor --verbose
node dist/cli/index.js doctor --fix-hints
node dist/cli/index.js doctor --json
```

If WinNest is installed globally or packaged, use `winnest` instead of `node dist/cli/index.js`.

## Installer Location

Place test installers here:

```txt
~/Downloads/winnest-test-installers/
```

Suggested files:

```txt
npp-installer.exe
7zip-installer.exe
irfanview-installer.exe
winscp-installer.exe
```

Use official vendor downloads. Do not bundle installers in this repo.

## Test Flow

Run the same flow for Notepad++, 7-Zip, IrfanView, and WinSCP:

```bash
winnest doctor --verbose
winnest doctor --fix-hints
winnest install ~/Downloads/winnest-test-installers/npp-installer.exe
winnest list
winnest info notepad-plus-plus
winnest run notepad-plus-plus
winnest rescan notepad-plus-plus
```

For the development helper:

```bash
npm run test:real-install -- ~/Downloads/winnest-test-installers/npp-installer.exe
```

If install fails from a known Wine dependency issue, inspect:

```bash
winnest info <app-id>
winnest repair <app-id>
winnest repair-system
```

After installing missing system packages manually:

```bash
winnest doctor
winnest repair <app-id>
winnest rescan <app-id>
winnest run <app-id>
```

## Inspect App Folders And Logs

Installed apps live in:

```txt
~/.local/share/winnest/apps/<app-id>/
```

Useful files:

```txt
app.json
install-state.json
logs/install.log
logs/run.log
```

Use `winnest info <app-id>` to print metadata, latest install state, latest log path, and whether `mainExe` resolves inside the prefix.

## Desktop And MIME Tests

Launchers are generated under:

```txt
~/.local/share/applications/winnest-<app-id>.desktop
```

Test from the Linux application menu after install. The launcher must call `winnest run <app-id>`, not raw Wine.

Register MIME integration:

```bash
winnest register-mime
```

Then click a `.exe` or `.msi` from the file manager and confirm `winnest-open %f` opens WinNest.

Installer-like files are routed into the install flow. Portable `.exe` capsules are not supported yet; WinNest reports that limitation instead of silently treating every executable as an installer.

Create optional desktop icons:

```bash
winnest install ~/Downloads/winnest-test-installers/npp-installer.exe --desktop-icon
winnest create-desktop-icon <app-id>
winnest remove-desktop-icon <app-id>
```

App menu and desktop launchers must call:

```ini
Exec=winnest run <app-id>
```

They must not call raw Wine directly.

## Electron Shell

The Electron shell is a small management surface over the same CLI/core logic:

```bash
npm run build:gui
npm run start:gui
```

Renderer code talks to Electron main process IPC. It must not call Wine, filesystem APIs, or core modules directly.

Current shell scope:

```txt
Home: app list and Wine status
Install: installer path entry and basic status
Detail: run, rescan, repair, reset, uninstall, desktop icon actions, files/logs
Settings: doctor summary and paths
```

Known limitation: file-manager handoff to a GUI install window is not fully implemented yet. `winnest-open` keeps the CLI fallback and logs clear errors.

## Post-Dependency Validation Result

After installing the previously missing Debian packages:

```txt
wine32:i386
winbind
cabextract
```

Validation result:

```txt
Wine version: wine-10.0 (Debian 10.0~repack-6)
64-bit Wine support: OK
32-bit Wine support: OK
Notepad++ 8.9.6.4 x64: installed and launched
WinSCP 6.5.6: installed and launched
Notepad++ mainExe: C:/Program Files/Notepad++/notepad++.exe
WinSCP mainExe: C:/Program Files (x86)/WinSCP/WinSCP.exe
```

## Cleanup

For a clean uninstall:

```bash
winnest uninstall <app-id>
```

For failed installs, inspect logs first, then remove the app folder only if it is under:

```txt
~/.local/share/winnest/apps/
```

Never recursively delete arbitrary paths.

Known MVP limitation: automatic system dependency installation currently supports Debian/Ubuntu/nonlaOS-like systems only.
