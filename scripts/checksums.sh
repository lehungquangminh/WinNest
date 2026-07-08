#!/usr/bin/env bash
# scripts/checksums.sh
# Generates SHA256 checksums for release .deb packages.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

fail() { echo "[FAIL]  $*" >&2; exit 1; }
ok()   { echo "[OK]    $*"; }

command -v sha256sum >/dev/null 2>&1 || fail "sha256sum was not found."

shopt -s nullglob
packages=(release/*.deb)
shopt -u nullglob

if [[ "${#packages[@]}" -eq 0 ]]; then
  fail "No .deb files found under release/. Run npm run build:deb first."
fi

mkdir -p release
sha256sum "${packages[@]}" > release/SHA256SUMS
ok "Wrote release/SHA256SUMS"
