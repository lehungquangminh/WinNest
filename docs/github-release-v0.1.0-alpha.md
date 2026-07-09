# WinNest v0.1.0-alpha

WinNest is a Wine-based Windows app manager for Linux. It lets you open a Windows installer with WinNest, shows the original Windows installer through Wine, then creates a managed app folder, isolated Wine prefix, logs, metadata, and Linux launcher.

This is alpha software. Test with disposable installers first.

## Download

- `winnest_0.1.0_amd64.deb`
- `SHA256SUMS`

The Debian package version is `0.1.0`; the Git tag/release name is `v0.1.0-alpha` to mark this as an alpha release.

## Install

```bash
sudo apt install ./winnest_0.1.0_amd64.deb
winnest doctor --verbose
```

## Usage

Right click a Windows `.exe` or `.msi` installer -> **Open With -> WinNest**.

The original Windows installer should open through Wine. After it exits, WinNest scans the prefix and creates a Linux application-menu launcher.

## Tested Apps

- 7-Zip
- Notepad++
- IrfanView
- WinSCP

## Known Limitations

- Alpha software.
- Not every Windows app works.
- Zalo recipe exists, but Zalo itself is not validated yet.
- Some desktops, especially KDE, may block direct double-click on `.exe`; use **Open With -> WinNest**.
- Portable `.exe` apps are not supported yet.
- Low-confidence candidate selection without a terminal is still limited.
- No strong sandbox yet.
- Wine and system dependencies are required.
- The APT repository metadata is not part of this release artifact unless separately published and signed.

## Verify Checksum

Download `SHA256SUMS` beside the `.deb`, then run:

```bash
sha256sum -c SHA256SUMS
```

## Troubleshooting

```bash
winnest doctor --verbose --fix-hints
winnest repair-system
winnest register-mime
```

If KDE or another file manager blocks direct double-click on `.exe`, use **Right click -> Open With -> WinNest**.
