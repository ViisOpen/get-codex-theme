#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd -P)"
LIBRARY="${CODEX_THEME_HOME:-$HOME/.codex/get-codex-theme}"
OUTPUT="${1:-$LIBRARY/apps/GetCodexThemeMenu.app}"
OUTPUT_DIR="$(dirname "$OUTPUT")"
/bin/mkdir -p "$OUTPUT_DIR"
OUTPUT_DIR="$(cd "$OUTPUT_DIR" && pwd -P)"
OUTPUT="$OUTPUT_DIR/$(basename "$OUTPUT")"
STAGING="$OUTPUT_DIR/.$(basename "$OUTPUT").staging.$$"
BACKUP="$OUTPUT_DIR/.$(basename "$OUTPUT").previous.$$"
trap '/bin/rm -rf "$STAGING"' EXIT
/bin/rm -rf "$STAGING" "$BACKUP"
CONTENTS="$STAGING/Contents"
MACOS="$CONTENTS/MacOS"

command -v xcrun >/dev/null || { echo "Xcode Command Line Tools are required to build the menu bar app." >&2; exit 1; }
NODE_PATH="${GCT_NODE_PATH:-$(command -v node || true)}"
[[ -x "$NODE_PATH" ]] || { echo "Node.js 22 or later is required to build the menu bar app." >&2; exit 1; }
/bin/mkdir -p "$MACOS"
xcrun swiftc \
  -framework AppKit \
  "$SCRIPT_DIR/Sources/GetCodexThemeMenu/main.swift" \
  -o "$MACOS/GetCodexThemeMenu"

/usr/bin/plutil -create xml1 "$CONTENTS/Info.plist"
/usr/bin/plutil -insert CFBundleIdentifier -string "com.getcodextheme.menubar" "$CONTENTS/Info.plist"
/usr/bin/plutil -insert CFBundleName -string "Get Codex Theme" "$CONTENTS/Info.plist"
/usr/bin/plutil -insert CFBundleExecutable -string "GetCodexThemeMenu" "$CONTENTS/Info.plist"
/usr/bin/plutil -insert CFBundlePackageType -string "APPL" "$CONTENTS/Info.plist"
/usr/bin/plutil -insert CFBundleShortVersionString -string "0.4.0" "$CONTENTS/Info.plist"
/usr/bin/plutil -insert LSUIElement -bool true "$CONTENTS/Info.plist"
/usr/bin/plutil -insert LSEnvironment -dictionary "$CONTENTS/Info.plist"
/usr/bin/plutil -insert LSEnvironment.GCT_NODE_PATH -string "$NODE_PATH" "$CONTENTS/Info.plist"
/bin/chmod +x "$MACOS/GetCodexThemeMenu"

if [[ -n "${GCT_CODESIGN_IDENTITY:-}" ]]; then
  /usr/bin/codesign \
    --force \
    --options runtime \
    --timestamp \
    --sign "$GCT_CODESIGN_IDENTITY" \
    "$STAGING"
  /usr/bin/codesign --verify --deep --strict --verbose=2 "$STAGING"
fi

if [[ -e "$OUTPUT" ]]; then
  /bin/mv "$OUTPUT" "$BACKUP"
fi
if ! /bin/mv "$STAGING" "$OUTPUT"; then
  [[ -e "$BACKUP" ]] && /bin/mv "$BACKUP" "$OUTPUT"
  exit 1
fi
/bin/rm -rf "$BACKUP"
echo "Built $OUTPUT"
