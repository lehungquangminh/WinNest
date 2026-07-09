#!/usr/bin/env bash
# scripts/publish-apt-pages.sh
# Stages the generated APT repository into pages/ for GitHub Pages hosting.
#
# GitHub Pages URL mapping:
#   pages/debian/     -> https://winnest.dismon.me/debian/
#   pages/winnest.gpg -> https://winnest.dismon.me/winnest.gpg
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

info() { echo "[INFO]  $*"; }
ok()   { echo "[OK]    $*"; }
warn() { echo "[WARN]  $*"; }
fail() { echo "[FAIL]  $*" >&2; exit 1; }

REQUIRE_SIGNED=false
for arg in "$@"; do
  case "$arg" in
    --require-signed) REQUIRE_SIGNED=true ;;
    *) fail "Unknown argument: ${arg}" ;;
  esac
done

APT_ROOT="${PROJECT_ROOT}/release/apt"
PAGES_APT_ROOT="${PROJECT_ROOT}/pages/debian"
PAGES_KEY_PATH="${PROJECT_ROOT}/pages/winnest.gpg"

[[ -d "${APT_ROOT}/dists" ]] || fail "Missing release/apt/dists. Run npm run build:apt-repo first."
[[ -d "${APT_ROOT}/pool" ]] || fail "Missing release/apt/pool. Run npm run build:apt-repo first."

if [[ "${REQUIRE_SIGNED}" == "true" ]]; then
  [[ -f "${APT_ROOT}/dists/stable/InRelease" ]] || fail "Missing signed InRelease. Set WINNEST_APT_GPG_KEY when building the APT repo."
  [[ -f "${APT_ROOT}/dists/stable/Release.gpg" ]] || fail "Missing Release.gpg. Set WINNEST_APT_GPG_KEY when building the APT repo."
fi

info "Publishing APT repository into pages/debian"
rm -rf "${PAGES_APT_ROOT}"
mkdir -p "${PAGES_APT_ROOT}"
cp -r "${APT_ROOT}/dists" "${PAGES_APT_ROOT}/dists"
cp -r "${APT_ROOT}/pool" "${PAGES_APT_ROOT}/pool"

if [[ -n "${WINNEST_APT_PUBLIC_KEY_FILE:-}" ]]; then
  [[ -f "${WINNEST_APT_PUBLIC_KEY_FILE}" ]] || fail "WINNEST_APT_PUBLIC_KEY_FILE does not exist: ${WINNEST_APT_PUBLIC_KEY_FILE}"
  cp "${WINNEST_APT_PUBLIC_KEY_FILE}" "${PAGES_KEY_PATH}"
  ok "Copied public key to pages/winnest.gpg"
elif [[ -n "${WINNEST_APT_GPG_KEY:-}" ]]; then
  command -v gpg >/dev/null 2>&1 || fail "gpg was not found."
  gpg --batch --yes --armor --export "${WINNEST_APT_GPG_KEY}" > "${PAGES_KEY_PATH}"
  ok "Exported public key to pages/winnest.gpg"
else
  warn "No APT public key configured. Set WINNEST_APT_GPG_KEY or WINNEST_APT_PUBLIC_KEY_FILE."
  rm -f "${PAGES_KEY_PATH}"
fi

if [[ "${REQUIRE_SIGNED}" == "true" && ! -s "${PAGES_KEY_PATH}" ]]; then
  fail "Signed Pages APT publishing requires pages/winnest.gpg."
fi

ok "GitHub Pages APT repository staged at pages/debian"
info "Repository URL: https://winnest.dismon.me/debian"
info "Signing key URL: https://winnest.dismon.me/winnest.gpg"
