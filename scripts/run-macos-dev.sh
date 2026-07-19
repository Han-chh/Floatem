#!/bin/zsh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$REPO_ROOT"

pnpm frontend:build

xcodebuild \
  -project apps/mac-host/StickIt.xcodeproj \
  -scheme StickIt \
  -configuration Debug \
  -derivedDataPath build/DerivedData \
  CODE_SIGNING_ALLOWED=NO \
  build

open "$REPO_ROOT/build/DerivedData/Build/Products/Debug/StickIt.app"
