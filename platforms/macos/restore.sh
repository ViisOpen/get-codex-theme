#!/bin/zsh
set -euo pipefail

LIBRARY="${CODEX_THEME_HOME:-$HOME/.codex/get-codex-theme}"
PORT=""
while (( $# > 0 )); do
  case "$1" in
    --library) LIBRARY="${2:?Missing path after --library}"; shift 2 ;;
    --port) PORT="${2:?Missing port after --port}"; shift 2 ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done
INJECTOR="$LIBRARY/runtime/injector.mjs"
STATE="$LIBRARY/runtime-state.json"

if [[ -z "$PORT" && -f "$STATE" ]]; then
  PORT="$(node -e 'try{const value=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));if(Number.isInteger(value.port))process.stdout.write(String(value.port))}catch{}' "$STATE")"
fi
PORT="${PORT:-9341}"
[[ "$PORT" == <-> ]] && (( PORT >= 1024 && PORT <= 65535 )) || { echo "Invalid port: $PORT" >&2; exit 2; }

if [[ -f "$INJECTOR" ]]; then
  node "$INJECTOR" --remove --port "$PORT" --timeout-ms 1800 >/dev/null 2>&1 || true
fi
if [[ -f "$STATE" ]]; then
  PID="$(node -e 'try{process.stdout.write(String(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).injectorPid||""))}catch{}' "$STATE")"
  if [[ "$PID" == <-> ]] && /bin/kill -0 "$PID" 2>/dev/null; then
    COMMAND="$(/bin/ps -p "$PID" -o command= 2>/dev/null || true)"
    [[ "$COMMAND" == *"runtime/injector.mjs"* ]] && /bin/kill -TERM "$PID" 2>/dev/null || true
  fi
  /bin/rm -f "$STATE"
fi
echo "GetCodexTheme injection removed. Quit and reopen Codex normally to close the debug port."
