#!/bin/zsh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$REPO_ROOT"

pnpm frontend:build

xcodebuild \
  -project apps/mac-host/QuickNote.xcodeproj \
  -scheme QuickNote \
  -configuration Debug \
  -derivedDataPath build/DerivedData \
  build

open "$REPO_ROOT/build/DerivedData/Build/Products/Debug/QuickNote.app"
