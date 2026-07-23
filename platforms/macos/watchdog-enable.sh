#!/bin/zsh
set -euo pipefail

LIBRARY="${CODEX_THEME_HOME:-$HOME/.codex/get-codex-theme}"
PORT=""
PERSISTENT=false
while (( $# > 0 )); do
  case "$1" in
    --library) LIBRARY="${2:?Missing path after --library}"; shift 2 ;;
    --port) PORT="${2:?Missing port after --port}"; shift 2 ;;
    --persistent) PERSISTENT=true; shift ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done
command -v node >/dev/null || { echo "Node.js is required." >&2; exit 1; }
NODE="$(command -v node)"
if [[ -z "$PORT" && -f "$LIBRARY/runtime-state.json" ]]; then
  PORT="$("$NODE" -e 'try { const value=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")); if(Number.isInteger(value.port)) process.stdout.write(String(value.port)); } catch {}' "$LIBRARY/runtime-state.json")"
fi
PORT="${PORT:-9341}"
[[ "$PORT" == <-> ]] && (( PORT >= 1024 && PORT <= 65535 )) || { echo "Invalid port: $PORT" >&2; exit 2; }

WATCHDOG="$LIBRARY/runtime/watchdog.mjs"
[[ -f "$WATCHDOG" ]] || { echo "Runtime not installed: $WATCHDOG" >&2; exit 1; }

LABEL="com.getcodextheme.watchdog"
AGENTS="$HOME/Library/LaunchAgents"
PLIST="$AGENTS/$LABEL.plist"
/bin/mkdir -p "$AGENTS" "$LIBRARY/logs"
"$NODE" "$LIBRARY/runtime/write-watchdog-plist.mjs" \
  --output "$PLIST" \
  --node "$NODE" \
  --watchdog "$WATCHDOG" \
  --library "$LIBRARY" \
  --port "$PORT" \
  --restart-mode "$([[ "$PERSISTENT" == true ]] && echo persistent || echo session)" \
  --launch-script "$LIBRARY/bin/start-macos.sh"
/usr/bin/plutil -lint "$PLIST" >/dev/null
/bin/launchctl bootout "gui/$(/usr/bin/id -u)/$LABEL" >/dev/null 2>&1 || true
/bin/launchctl bootstrap "gui/$(/usr/bin/id -u)" "$PLIST"
if [[ "$PERSISTENT" == true ]]; then
  echo "Persistent Watchdog enabled. It will not interrupt the current Codex instance; after that instance exits, future normal launches may be restarted once as an explicitly authorized themed session."
else
  echo "Session Watchdog enabled. It waits for a themed Codex session and never launches or restarts Codex."
fi
