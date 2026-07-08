# APT Repository Release Flow

WinNest should be installed from an APT repository for normal Debian, Ubuntu, and nonlaOS users. A standalone `.deb` is still useful for local testing, but the repo flow lets APT resolve Wine, desktop, MIME, and Electron runtime dependencies cleanly.

## User Install Flow

Enable i386 first. APT must know this architecture before it can resolve `wine32:i386`.

```bash
sudo dpkg --add-architecture i386
sudo apt update
```

Add the WinNest signing key and repository:

```bash
sudo install -d -m 0755 /etc/apt/keyrings
curl -fsSL https://repo.winnest.app/winnest.gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/winnest.gpg

echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/winnest.gpg] https://repo.winnest.app/debian stable main" \
  | sudo tee /etc/apt/sources.list.d/winnest.list >/dev/null

sudo apt update
sudo apt install winnest
```

After install:

```bash
winnest doctor --verbose
winnest register-mime
```

## Local Repo Build

Build the package, then generate a static APT repository under `release/apt/`:

```bash
npm run build:deb -- --build
npm run build:apt-repo
```

The generated layout is:

```txt
release/apt/
├── dists/stable/Release
├── dists/stable/main/binary-amd64/Packages
├── dists/stable/main/binary-amd64/Packages.gz
└── pool/main/w/winnest/winnest_<version>_amd64.deb
```

To sign metadata locally:

```bash
WINNEST_APT_GPG_KEY="maintainer@example.com" npm run build:apt-repo
```

This writes `Release.gpg` and `InRelease` beside `Release`.

## Publishing

Upload the contents of `release/apt/` to the repository host so that this URL exists:

```txt
https://repo.winnest.app/debian/dists/stable/Release
```

The public signing key should be downloadable as:

```txt
https://repo.winnest.app/winnest.gpg
```

Do not publish unsigned repository metadata for normal users.

## Why Not Only A Standalone .deb?

APT resolves package dependencies before running package maintainer scripts. That means WinNest cannot reliably enable i386 architecture from inside the `.deb` and satisfy `wine32:i386` in the same install transaction. The repository install flow makes the required `dpkg --add-architecture i386` step explicit, then lets APT install all required packages in one normal `apt install winnest`.
