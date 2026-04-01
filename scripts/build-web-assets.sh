#!/bin/zsh

set -euo pipefail

REPO_ROOT="${SRCROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
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

if [ ! -f "$REPO_ROOT/dist/index.html" ]; then
  needs_frontend_build=1
elif find \
  "$REPO_ROOT/src" \
  "$REPO_ROOT/index.html" \
  "$REPO_ROOT/package.json" \
  "$REPO_ROOT/pnpm-lock.yaml" \
  "$REPO_ROOT/tsconfig.json" \
  "$REPO_ROOT/tsconfig.node.json" \
  "$REPO_ROOT/vite.config.ts" \
  -newer "$REPO_ROOT/dist/index.html" \
  -print -quit 2>/dev/null | grep -q .
then
  needs_frontend_build=1
fi

if [ "$needs_frontend_build" -eq 1 ]; then
  echo "info: rebuilding frontend bundle before copying web assets"
  "$PNPM_BIN" build
fi

NATIVE_WEB_DIR="$REPO_ROOT/build/native-web"

echo "info: preparing WKWebView-safe frontend bundle"
"$NODE_BIN" "$REPO_ROOT/scripts/prepare-native-web-assets.mjs" "$REPO_ROOT/dist" "$NATIVE_WEB_DIR"

if [ -z "${TARGET_BUILD_DIR:-}" ] || [ -z "${UNLOCALIZED_RESOURCES_FOLDER_PATH:-}" ]; then
  exit 0
fi

WEB_OUTPUT_DIR="$TARGET_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH/web"
rm -rf "$WEB_OUTPUT_DIR"
mkdir -p "$WEB_OUTPUT_DIR"
cp -R "$NATIVE_WEB_DIR/." "$WEB_OUTPUT_DIR/"
