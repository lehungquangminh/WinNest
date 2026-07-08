#!/usr/bin/env bash
# scripts/build-apt-repo.sh
# Builds a static APT repository layout from the generated WinNest .deb.
#
# Output:
#   release/apt/
#
# Optional signing:
#   WINNEST_APT_GPG_KEY="<key-id-or-email>" npm run build:apt-repo
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

info()  { echo "[INFO]  $*"; }
ok()    { echo "[OK]    $*"; }
fail()  { echo "[FAIL]  $*" >&2; exit 1; }
warn()  { echo "[WARN]  $*"; }

VERSION="$(node -e "process.stdout.write(require('./package.json').version)")"
DEB_NAME="winnest_${VERSION}_amd64.deb"
DEB_PATH="${PROJECT_ROOT}/release/${DEB_NAME}"
APT_ROOT="${PROJECT_ROOT}/release/apt"
CODENAME="stable"
COMPONENT="main"
ARCH="amd64"
POOL_DIR="${APT_ROOT}/pool/${COMPONENT}/w/winnest"
BINARY_DIR="${APT_ROOT}/dists/${CODENAME}/${COMPONENT}/binary-${ARCH}"
DIST_DIR="${APT_ROOT}/dists/${CODENAME}"

if [[ ! -f "${DEB_PATH}" ]]; then
  fail "Missing ${DEB_PATH}. Run npm run build:deb first."
fi

command -v dpkg-scanpackages >/dev/null 2>&1 || fail "dpkg-scanpackages was not found."
command -v apt-ftparchive >/dev/null 2>&1 || fail "apt-ftparchive was not found. Install apt-utils."
command -v gzip >/dev/null 2>&1 || fail "gzip was not found."

info "Creating APT repository layout for WinNest ${VERSION}"
rm -rf "${APT_ROOT}"
mkdir -p "${POOL_DIR}" "${BINARY_DIR}"
cp "${DEB_PATH}" "${POOL_DIR}/${DEB_NAME}"

info "Generating Packages index"
(
  cd "${APT_ROOT}"
  dpkg-scanpackages --arch "${ARCH}" "pool/${COMPONENT}" /dev/null > "${BINARY_DIR}/Packages"
)
gzip -kf "${BINARY_DIR}/Packages"

info "Generating Release metadata"
(
  cd "${APT_ROOT}"
  apt-ftparchive \
    -o APT::FTPArchive::Release::Origin="WinNest" \
    -o APT::FTPArchive::Release::Label="WinNest" \
    -o APT::FTPArchive::Release::Suite="${CODENAME}" \
    -o APT::FTPArchive::Release::Codename="${CODENAME}" \
    -o APT::FTPArchive::Release::Architectures="${ARCH}" \
    -o APT::FTPArchive::Release::Components="${COMPONENT}" \
    -o APT::FTPArchive::Release::Description="WinNest APT repository" \
    release "dists/${CODENAME}" > "${DIST_DIR}/Release"
)

if [[ -n "${WINNEST_APT_GPG_KEY:-}" ]]; then
  command -v gpg >/dev/null 2>&1 || fail "gpg was not found."
  info "Signing repository metadata with ${WINNEST_APT_GPG_KEY}"
  gpg --batch --yes --default-key "${WINNEST_APT_GPG_KEY}" \
    --detach-sign --armor -o "${DIST_DIR}/Release.gpg" "${DIST_DIR}/Release"
  gpg --batch --yes --default-key "${WINNEST_APT_GPG_KEY}" \
    --clearsign -o "${DIST_DIR}/InRelease" "${DIST_DIR}/Release"
  ok "Signed APT repository built at release/apt"
else
  warn "Repository metadata is unsigned. Set WINNEST_APT_GPG_KEY to produce Release.gpg and InRelease."
  ok "Unsigned APT repository built at release/apt"
fi
