#!/usr/bin/env bash
# scripts/build-deb.sh
# Builds the WinNest Debian package.
#
# Usage:
#   bash scripts/build-deb.sh
#   npm run build:deb
#
# Output: release/winnest_<version>_amd64.deb
#
# Prerequisites:
#   - dpkg-deb
#   - npm run build and npm run build:gui must already be done OR pass --build flag
#
# Flags:
#   --build   Run npm build steps before packaging (default: skip if dist/ exists)
#   --force   Rebuild even if dist/ exists
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

# ── Helpers ──────────────────────────────────────────────────────────────────
info()  { echo "[INFO]  $*"; }
ok()    { echo "[OK]    $*"; }
fail()  { echo "[FAIL]  $*" >&2; exit 1; }
warn()  { echo "[WARN]  $*"; }

# ── Version from package.json ─────────────────────────────────────────────────
VERSION="$(node -e "process.stdout.write(require('./package.json').version)")"
info "Packaging WinNest ${VERSION}"

# ── Build flags ───────────────────────────────────────────────────────────────
DO_BUILD=false
for arg in "$@"; do
  case "$arg" in
    --build|--force) DO_BUILD=true ;;
  esac
done

if [[ ! -d dist/ || ! -f dist/cli/index.js ]]; then
  warn "dist/ missing or incomplete — forcing build"
  DO_BUILD=true
fi
if [[ ! -d dist-renderer/ || ! -f dist-renderer/index.html ]]; then
  warn "dist-renderer/ missing — forcing GUI build"
  DO_BUILD=true
fi

if [[ "$DO_BUILD" == "true" ]]; then
  info "Running npm run build:gui …"
  npm run build:gui
  ok "Build complete"
fi

# ── Staging paths ─────────────────────────────────────────────────────────────
STAGE="${PROJECT_ROOT}/packaging/deb/stage"
RELEASE="${PROJECT_ROOT}/release"
DEB_NAME="winnest_${VERSION}_amd64.deb"
INSTALL_ROOT="/opt/winnest"

rm -rf "${STAGE}"
mkdir -p \
  "${STAGE}/DEBIAN" \
  "${STAGE}${INSTALL_ROOT}" \
  "${STAGE}/usr/bin" \
  "${STAGE}/usr/share/applications" \
  "${STAGE}/usr/share/mime/packages" \
  "${STAGE}/usr/share/icons/hicolor/256x256/apps" \
  "${STAGE}/usr/share/icons/hicolor/512x512/apps" \
  "${RELEASE}"

# ── Copy application files ────────────────────────────────────────────────────
info "Copying dist/ …"
cp -r dist/ "${STAGE}${INSTALL_ROOT}/dist"

info "Copying dist-renderer/ …"
cp -r dist-renderer/ "${STAGE}${INSTALL_ROOT}/dist-renderer"

info "Copying recipes/ …"
cp -r recipes/ "${STAGE}${INSTALL_ROOT}/recipes"

info "Copying pages/ (web docs assets) …"
cp -r pages/ "${STAGE}${INSTALL_ROOT}/pages"

info "Copying node_modules/ (production only) …"
# Prune to production deps only to keep package smaller
npm prune --omit=dev --prefix="${PROJECT_ROOT}" 2>/dev/null || true
cp -r node_modules/ "${STAGE}${INSTALL_ROOT}/node_modules"
# Restore dev deps so the repo still works
npm install --prefix="${PROJECT_ROOT}" 2>/dev/null || true

info "Copying package.json …"
cp package.json "${STAGE}${INSTALL_ROOT}/"

# ── Wrapper scripts ───────────────────────────────────────────────────────────
info "Writing /usr/bin/winnest …"
cat > "${STAGE}/usr/bin/winnest" << 'WRAPPER'
#!/usr/bin/env bash
exec node /opt/winnest/dist/cli/index.js "$@"
WRAPPER
chmod 755 "${STAGE}/usr/bin/winnest"

info "Writing /usr/bin/winnest-open …"
cat > "${STAGE}/usr/bin/winnest-open" << 'WRAPPER'
#!/usr/bin/env bash
exec node /opt/winnest/dist/cli/open.js "$@"
WRAPPER
chmod 755 "${STAGE}/usr/bin/winnest-open"

# ── Desktop files ─────────────────────────────────────────────────────────────
info "Copying desktop entries …"
cp packaging/deb/usr/share/applications/winnest.desktop \
   "${STAGE}/usr/share/applications/winnest.desktop"
cp packaging/deb/usr/share/applications/winnest-open.desktop \
   "${STAGE}/usr/share/applications/winnest-open.desktop"
chmod 644 "${STAGE}/usr/share/applications/"*.desktop

# ── MIME XML ──────────────────────────────────────────────────────────────────
info "Copying MIME XML …"
cp packaging/deb/usr/share/mime/packages/winnest.xml \
   "${STAGE}/usr/share/mime/packages/winnest.xml"
chmod 644 "${STAGE}/usr/share/mime/packages/winnest.xml"

# ── Icon ──────────────────────────────────────────────────────────────────────
if [[ -f pages/icon.png ]]; then
  info "Installing icon …"
  cp pages/icon.png "${STAGE}/usr/share/icons/hicolor/512x512/apps/winnest.png"
  # Scale to 256x256 using Node if possible, else just copy
  if command -v convert >/dev/null 2>&1; then
    convert pages/icon.png -resize 256x256 \
      "${STAGE}/usr/share/icons/hicolor/256x256/apps/winnest.png"
  else
    cp pages/icon.png "${STAGE}/usr/share/icons/hicolor/256x256/apps/winnest.png"
    warn "ImageMagick not found — using 512px icon for 256px slot (cosmetic only)"
  fi
else
  warn "No icon found at pages/icon.png — package will have no icon"
fi

# ── DEBIAN control ────────────────────────────────────────────────────────────
info "Writing DEBIAN/control …"
# Inject the version dynamically
sed "s/^Version:.*/Version: ${VERSION}/" \
  packaging/deb/DEBIAN/control > "${STAGE}/DEBIAN/control"
chmod 644 "${STAGE}/DEBIAN/control"

info "Copying maintainer scripts …"
for script in postinst postrm prerm; do
  if [[ -f "packaging/deb/DEBIAN/${script}" ]]; then
    cp "packaging/deb/DEBIAN/${script}" "${STAGE}/DEBIAN/${script}"
    chmod 755 "${STAGE}/DEBIAN/${script}"
  fi
done

# ── File permissions ──────────────────────────────────────────────────────────
info "Setting permissions …"
find "${STAGE}${INSTALL_ROOT}" -type f -exec chmod 644 {} +
find "${STAGE}${INSTALL_ROOT}" -type d -exec chmod 755 {} +
# Make the JS CLI entrypoints executable
chmod 755 "${STAGE}${INSTALL_ROOT}/dist/cli/index.js" \
           "${STAGE}${INSTALL_ROOT}/dist/cli/open.js" || true

# ── Calculate installed size ──────────────────────────────────────────────────
INSTALLED_SIZE_KB="$(du -sk "${STAGE}" | cut -f1)"
echo "Installed-Size: ${INSTALLED_SIZE_KB}" >> "${STAGE}/DEBIAN/control"

# ── Build .deb ────────────────────────────────────────────────────────────────
info "Building ${DEB_NAME} …"
dpkg-deb --root-owner-group --build "${STAGE}" "${RELEASE}/${DEB_NAME}"

ok "Package built: release/${DEB_NAME}"
info "To install: sudo apt install ./release/${DEB_NAME}"
