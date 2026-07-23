#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd -P)"
SOURCE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd -P)"
LIBRARY="${CODEX_THEME_HOME:-$HOME/.codex/get-codex-theme}"
while (( $# > 0 )); do
  case "$1" in
    --library) LIBRARY="${2:?Missing path after --library}"; shift 2 ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done

command -v node >/dev/null || { echo "Node.js 22 or later is required." >&2; exit 1; }
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
(( NODE_MAJOR >= 22 )) || { echo "Node.js 22 or later is required; found $(node --version)." >&2; exit 1; }

INSTALLER="$SCRIPT_DIR/install-runtime.mjs"
[[ -f "$INSTALLER" ]] || { echo "Transactional runtime installer is missing: $INSTALLER" >&2; exit 1; }
node "$INSTALLER" --source-root "$SOURCE_ROOT" --library "$LIBRARY"
mkdir -p "$LIBRARY/themes" "$LIBRARY/backups" "$LIBRARY/apps"

echo "GetCodexTheme runtime installed at $LIBRARY"
echo "Validate: node '$LIBRARY/runtime/injector.mjs' --validate --library '$LIBRARY'"
echo "Start:    '$LIBRARY/bin/start-macos.sh'"
echo "Restore:  '$LIBRARY/bin/restore-macos.sh'"
echo "Menu bar: '$LIBRARY/menu-bar/build.sh'"
echo "Watchdog remains disabled until '$LIBRARY/bin/enable-watchdog-macos.sh' is run explicitly."
echo "Unofficial: visual themes use loopback DevTools/CDP and do not appear in Codex Appearance."
