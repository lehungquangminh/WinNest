# WinNest Release Checklist

Use this checklist before tagging `v0.1.0-alpha`.

Do not commit generated packages, Wine prefixes, downloaded installers, logs, or local app folders.

## Local QA

```bash
npm run check
npm run build
npm run build:gui
npm run test:path-torture
npm run build:deb
npm run qa:deb
npm run checksums
npm run build:apt-repo
```

Expected local artifacts:

```txt
release/winnest_0.1.0_amd64.deb
release/SHA256SUMS
release/apt/
```

These artifacts are ignored by Git and should be uploaded through the release process, not committed.

## Package Install Round Trip

```bash
sudo apt remove -y winnest || true
sudo apt install -y ./release/winnest_0.1.0_amd64.deb

command -v winnest
command -v winnest-open
winnest doctor --verbose
winnest repair-system
winnest list

sudo apt remove -y winnest
ls /usr/bin/winnest /usr/bin/winnest-open 2>&1
ls /opt/winnest 2>&1
ls ~/.local/share/winnest/apps/

sudo apt install -y ./release/winnest_0.1.0_amd64.deb
winnest doctor --verbose
```

Package removal must delete package files but preserve user apps under:

```txt
~/.local/share/winnest/apps/
```

## Transparent Installer QA

Use a small known installer:

```bash
winnest-open ~/Downloads/winnest-test-installers/7z*-x64.exe
```

Verify:

- the real Windows installer appears through Wine
- app folder is created under `~/.local/share/winnest/apps/`
- `app.json` and `install-state.json` exist
- scanner selects the expected executable
- `.desktop` launcher calls `winnest run <app-id>`
- `winnest run <app-id>` launches the app
- logs are written under the app `logs/` folder

## MIME QA

```bash
xdg-mime query default application/x-ms-dos-executable
xdg-mime query default application/x-msi
xdg-mime query default application/vnd.microsoft.portable-executable
grep -R "winnest-open" ~/.local/share/applications /usr/share/applications 2>/dev/null | head -20
```

Expected default:

```txt
winnest-open.desktop
```

If KDE blocks direct double-click, test with **Right-click -> Open With -> WinNest**.

## GitHub Actions

Push to a branch or open a pull request and wait for `.github/workflows/ci.yml` to pass.

The workflow runs:

- `npm run check`
- `npm run build`
- `npm run build:gui`
- `npm run test:path-torture`
- `npm run build:deb`
- `npm run qa:deb`
- `npm run checksums`
- `npm run build:apt-repo`

## Tag Readiness

Final checks:

```bash
git status --short
git log --oneline -10
cat release/SHA256SUMS
```

Only tag after local QA, package round trip, transparent installer QA, MIME QA, and CI all pass:

```bash
git tag v0.1.0-alpha
git push origin main
git push origin v0.1.0-alpha
```

Do not tag if package install, `winnest-open`, or MIME handoff is broken.
