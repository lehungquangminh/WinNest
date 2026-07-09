# WinNest v0.1.0-alpha

## Summary

WinNest `v0.1.0-alpha` is the first usable Debian/Ubuntu/nonlaOS alpha for installing Windows applications through Wine with a managed Linux desktop workflow.

The intended flow is:

```txt
Open With WinNest on a .exe or .msi installer
-> the real Windows installer opens through Wine
-> WinNest creates an isolated prefix, logs, metadata, and launchers
-> the installed app appears in the Linux application menu
```

This release is alpha software. Test with disposable installers first and keep backups of important files.

## What works

- TypeScript-only CLI/core and Electron shell.
- Debian `.deb` package with `/usr/bin/winnest` and `/usr/bin/winnest-open`.
- Transparent installer handoff through `winnest-open`.
- Isolated Wine prefix per managed app.
- Install state tracking, app locks, logs, and `app.json`.
- Recipe-aware scanner for known applications.
- Linux `.desktop` launchers that call `winnest run <app-id>`.
- MIME/Open With handler for `.exe` and `.msi`.
- `doctor`, `repair-system`, `rescan`, reset, uninstall, and desktop icon commands.

## Tested Apps

- 7-Zip
- Notepad++
- IrfanView
- WinSCP

Zalo has a starter recipe, but Zalo install/runtime behavior is not validated in this alpha.

## Install

Local alpha package:

```bash
sudo apt install ./winnest_0.1.0_amd64.deb
winnest doctor --verbose
```

Recommended repository flow for users once the APT repository is published:

```bash
sudo dpkg --add-architecture i386
sudo apt update
sudo install -d -m 0755 /etc/apt/keyrings
curl -fsSL https://repo.winnest.app/winnest.gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/winnest.gpg
echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/winnest.gpg] https://repo.winnest.app/debian stable main" \
  | sudo tee /etc/apt/sources.list.d/winnest.list >/dev/null
sudo apt update
sudo apt install winnest
```

## Usage

Right-click a Windows installer and choose **Open With -> WinNest**.

If your desktop blocks executable double-clicks, especially KDE Dolphin, use **Right-click -> Open With -> WinNest**. That is a desktop security policy, not a WinNest package failure.

Useful commands:

```bash
winnest doctor --verbose
winnest repair-system
winnest list
winnest info <app-id>
winnest run <app-id>
winnest rescan <app-id>
```

## Known Limitations

- Not every Windows app works under Wine.
- Portable `.exe` capsules are not supported yet.
- Low-confidence no-TTY scanner candidate selection is still limited.
- Some installers may hang or require manual clicks inside Wine dialogs.
- Some apps need app-specific runtimes such as fonts, vcrun, .NET, Mono, Gecko, DXVK, or DLL overrides.
- WinNest does not provide strong sandboxing yet; Windows apps may access files exposed by the Wine prefix.
- Registry and `.lnk` discovery are best-effort hints.
- Zalo calling, audio, video, camera, and tray behavior are not guaranteed.
- The APT repository metadata must be signed before public release use.

## Troubleshooting

General diagnostics:

```bash
winnest doctor --verbose --fix-hints
winnest repair-system
```

If `winnest-open` is not found after installing the package:

```bash
command -v winnest
command -v winnest-open
sudo apt install ./winnest_0.1.0_amd64.deb
hash -r
```

If Wine reports missing 32-bit support or `syswow64\\ntdll.dll`:

```bash
sudo dpkg --add-architecture i386
sudo apt update
sudo apt install wine32:i386 winbind cabextract p7zip-full
winnest doctor --verbose
```

If file manager handoff is not available:

```bash
winnest register-mime
xdg-mime query default application/x-ms-dos-executable
xdg-mime query default application/x-msi
xdg-mime query default application/vnd.microsoft.portable-executable
```

Expected MIME default:

```txt
winnest-open.desktop
```

If the main executable is wrong or missing:

```bash
winnest rescan <app-id>
```

Logs live under:

```txt
~/.local/share/winnest/logs/
~/.local/share/winnest/apps/<app-id>/logs/
```

Package removal preserves user apps:

```bash
sudo apt remove winnest
```

Managed apps remain under:

```txt
~/.local/share/winnest/apps/
```

## Checksums

Generate checksums after building the release package:

```bash
npm run checksums
cat release/SHA256SUMS
```

Publish the generated `SHA256SUMS` beside the `.deb` artifact.
