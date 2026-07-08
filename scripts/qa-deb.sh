#!/usr/bin/env bash
# scripts/qa-deb.sh
# Inspects a WinNest .deb package without installing it.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

info() { echo "[INFO]  $*"; }
ok()   { echo "[OK]    $*"; }
fail() { echo "[FAIL]  $*" >&2; exit 1; }

command -v dpkg-deb >/dev/null 2>&1 || fail "dpkg-deb was not found."

VERSION="$(node -e "process.stdout.write(require('./package.json').version)")"
DEB_PATH="${1:-release/winnest_${VERSION}_amd64.deb}"

[[ -f "${DEB_PATH}" ]] || fail "Missing package: ${DEB_PATH}. Run npm run build:deb first."

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

CONTENTS="${TMP_DIR}/contents.txt"
PATHS="${TMP_DIR}/paths.txt"

info "Inspecting package metadata: ${DEB_PATH}"
dpkg-deb --info "${DEB_PATH}"

info "Reading package contents"
dpkg-deb --contents "${DEB_PATH}" > "${CONTENTS}"
awk '{ print $NF }' "${CONTENTS}" | sort > "${PATHS}"

required_paths=(
  "./opt/winnest/dist/"
  "./opt/winnest/recipes/"
  "./opt/winnest/pages/"
  "./usr/bin/winnest"
  "./usr/bin/winnest-open"
  "./usr/share/applications/winnest.desktop"
  "./usr/share/applications/winnest-open.desktop"
  "./usr/share/mime/packages/winnest.xml"
  "./usr/share/icons/hicolor/512x512/apps/winnest.png"
)

for path in "${required_paths[@]}"; do
  if grep -Fxq "${path}" "${PATHS}"; then
    ok "Found ${path}"
  else
    fail "Required package path is missing: ${path}"
  fi
done

forbidden_patterns=(
  '(^|/)node_modules(/|$)'
  '(^|/)\.git(/|$)'
  '^./src(/|$)'
  '^./tests(/|$)'
  'winnest-test-installers'
  'drive_c/'
  '/prefix/'
  '/logs/'
  '\.exe$'
  '\.msi$'
)

for pattern in "${forbidden_patterns[@]}"; do
  if grep -Eq "${pattern}" "${PATHS}"; then
    echo "[INFO]  Matching forbidden entries:" >&2
    grep -E "${pattern}" "${PATHS}" >&2
    fail "Forbidden package content matched pattern: ${pattern}"
  fi
done

ok "Package contents are clean"
