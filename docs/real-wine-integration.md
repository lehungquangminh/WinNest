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

On Debian, Ubuntu, and Ubuntu-compatible nonlaOS systems, start with the distro packages above. If the distro Wine is too old, follow the official WineHQ download instructions for Debian/Ubuntu: https://gitlab.winehq.org/wine/wine/-/wikis/Download

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
