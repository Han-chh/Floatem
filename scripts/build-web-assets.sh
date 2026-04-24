#!/bin/zsh

set -euo pipefail

if [ -n "${SRCROOT:-}" ]; then
  REPO_ROOT="$(cd "$SRCROOT/../.." && pwd)"
else
  REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
fi
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

cd "$REPO_ROOT"

PNPM_BIN="${PNPM_BIN:-$(command -v pnpm || true)}"
NODE_BIN="${NODE_BIN:-$(command -v node || true)}"

if [ -z "$PNPM_BIN" ]; then
  echo "error: pnpm is not available in PATH. Install pnpm or set PNPM_BIN before building the macOS host." >&2
  exit 1
fi

if [ -z "$NODE_BIN" ]; then
  echo "error: node is not available in PATH. Install Node.js before building the macOS host." >&2
  exit 1
fi

needs_frontend_build=0

FRONTEND_DIR="$REPO_ROOT/apps/frontend"
FRONTEND_DIST_DIR="$FRONTEND_DIR/dist"

if [ ! -f "$FRONTEND_DIST_DIR/index.html" ]; then
  needs_frontend_build=1
elif find \
  "$FRONTEND_DIR/src" \
  "$FRONTEND_DIR/index.html" \
  "$FRONTEND_DIR/vite.config.ts" \
  "$FRONTEND_DIR/tsconfig.json" \
  "$FRONTEND_DIR/tsconfig.node.json" \
  "$REPO_ROOT/packages" \
  "$REPO_ROOT/package.json" \
  "$REPO_ROOT/pnpm-lock.yaml" \
  -newer "$FRONTEND_DIST_DIR/index.html" \
  -print -quit 2>/dev/null | grep -q .
then
  needs_frontend_build=1
fi

if [ "$needs_frontend_build" -eq 1 ]; then
  echo "info: rebuilding frontend bundle before copying web assets"
  "$PNPM_BIN" frontend:build
fi

NATIVE_WEB_DIR="$REPO_ROOT/build/native-web"

echo "info: preparing WKWebView-safe frontend bundle"
"$NODE_BIN" "$REPO_ROOT/scripts/prepare-native-web-assets.mjs" "$FRONTEND_DIST_DIR" "$NATIVE_WEB_DIR"

if [ -z "${TARGET_BUILD_DIR:-}" ] || [ -z "${UNLOCALIZED_RESOURCES_FOLDER_PATH:-}" ]; then
  exit 0
fi

WEB_OUTPUT_DIR="$TARGET_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH/web"
rm -rf "$WEB_OUTPUT_DIR"
mkdir -p "$WEB_OUTPUT_DIR"
cp -R "$NATIVE_WEB_DIR/." "$WEB_OUTPUT_DIR/"
