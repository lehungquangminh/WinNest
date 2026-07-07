# Repository Guidelines

## Project Structure & Module Organization

WinNest is a TypeScript-only Linux CLI and future Electron desktop app for managing Windows software through Wine. Source code lives in `src/`:

- `src/cli/`: CLI entry points, including `winnest` and `winnest-open`.
- `src/core/`: app metadata, install/run/reset/uninstall flows, locks, paths, and safety checks.
- `src/wine/`: Wine runner detection, prefix creation, process execution, path conversion, and wineserver control.
- `src/desktop/`: Linux `.desktop` launchers and MIME integration.
- `src/scanner/`: installed executable and shortcut detection.
- `src/shared/`: typed errors, result objects, safe spawning, and shared utilities.
- `src/logging/`: log path helpers and JSON-line logger.
- `src/dev/`: development-only helpers such as path torture tests.

Build output goes to `dist/`. Do not edit generated files.

## Build, Test, and Development Commands

- `npm install`: install TypeScript and Node type dependencies.
- `npm run check`: run strict TypeScript type checking without emitting files.
- `npm run build`: compile `src/` to `dist/`.
- `npm run dev:cli -- doctor`: run the built CLI with source maps after building.
- `npm run test:path-torture`: verifies safe spawning and logging for paths with spaces, Unicode, brackets, parentheses, apostrophes, and long names.

## Coding Style & Naming Conventions

Use TypeScript only. Do not add Rust, Python, Go, C++, Tauri, or another backend language. Keep code explicit and boring. Use strict types, typed errors, and `Result<T>` where recovery is useful. Never build shell command strings; always call external tools with `spawn(command, args)`.

Folder names provide context, so filenames should be short: `src/wine/runner.ts`, not `wine-runner.ts`.

## Testing Guidelines

There is no full test framework yet. For now, every change should pass `npm run check`, `npm run build`, and relevant smoke tests. Use `npm run test:path-torture` when touching process spawning, path handling, install flow, or logging.

## Commit & Pull Request Guidelines

History uses clear imperative messages, for example `Add install state tracking` and `fix: update contact email for reporting unacceptable behavior and security vulnerabilities`. Keep commits small and focused. Pull requests should include a concise summary, commands tested, known limitations, and screenshots only when UI work is introduced.

## Security & Architecture Notes

Treat Windows installers as untrusted. Do not ship proprietary Windows DLLs or claim universal compatibility. The CLI/core is the real product; future GUI code must call core logic through Electron IPC and must not call Wine directly.
