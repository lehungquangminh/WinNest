# WinNest

WinNest is a TypeScript-only Linux desktop and CLI application for installing and running Windows software through Wine with a managed, Windows-like experience.

The CLI/core is the product foundation. The Electron GUI should call the same core logic later through Electron main-process IPC and must not call Wine directly.

## MVP Commands

```bash
winnest doctor
winnest install <installer-path>
winnest open <file-path>
winnest run <app-id>
winnest list
winnest info <app-id>
winnest repair <app-id>
winnest reset <app-id>
winnest uninstall <app-id>
winnest register-mime
```

`winnest-open <file-path>` is the small entry point intended for file-manager MIME integration.

## Managed App Layout

Installed apps live under:

```txt
~/.local/share/winnest/apps/<app-id>/
```

Each app gets its own Wine prefix, installer copy, logs, launcher metadata, and `app.json`.

## Development

```bash
npm install
npm run check
npm run build
```

This repository requires Node.js LTS and npm for local verification.

## Security And Limits

Windows installers are untrusted code. WinNest avoids shell-string execution and always starts external tools with argument arrays, but Windows apps can still access files exposed to their Wine prefix.

WinNest is not a VM, not a Windows emulator, and does not ship proprietary Windows DLLs or pirated Windows components. Compatibility depends on Wine and the individual Windows application.
