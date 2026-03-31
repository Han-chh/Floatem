#!/bin/zsh

set -euo pipefail

REPO_ROOT="${SRCROOT:-$(cd "$(dirname "$0")/.." && pwd)}"

cd "$REPO_ROOT"

if [ ! -f "$REPO_ROOT/dist/index.html" ]; then
  echo "error: dist/index.html is missing. Run 'pnpm build' before building the macOS host." >&2
  exit 1
fi

if [ -z "${TARGET_BUILD_DIR:-}" ] || [ -z "${UNLOCALIZED_RESOURCES_FOLDER_PATH:-}" ]; then
  exit 0
fi

WEB_OUTPUT_DIR="$TARGET_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH/web"
rm -rf "$WEB_OUTPUT_DIR"
mkdir -p "$WEB_OUTPUT_DIR"
cp -R "$REPO_ROOT/dist/." "$WEB_OUTPUT_DIR/"
