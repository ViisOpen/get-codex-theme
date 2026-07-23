#!/bin/zsh
set -euo pipefail

LIBRARY="${CODEX_THEME_HOME:-$HOME/.codex/get-codex-theme}"
SCRIPT_ARGS=()
while (( $# > 0 )); do
  case "$1" in
    --library) LIBRARY="${2:?Missing path after --library}"; shift 2 ;;
    --port) SCRIPT_ARGS+=(--port "${2:?Missing path after --port}"); shift 2 ;;
    --restart) SCRIPT_ARGS+=(--restart); shift ;;
    --help|-h) SCRIPT_ARGS+=(--help); shift ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done

command -v node >/dev/null || { echo "Node.js 22 or later is required." >&2; exit 1; }
LIFECYCLE="$LIBRARY/runtime/macos-lifecycle.mjs"
[[ -f "$LIFECYCLE" ]] || { echo "Runtime lifecycle controller is missing: $LIFECYCLE" >&2; exit 1; }

exec node "$LIFECYCLE" --library "$LIBRARY" "${SCRIPT_ARGS[@]}"
