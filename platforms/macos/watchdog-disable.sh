#!/bin/zsh
set -euo pipefail

LABEL="com.getcodextheme.watchdog"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
/bin/launchctl bootout "gui/$(/usr/bin/id -u)/$LABEL" >/dev/null 2>&1 || true
/bin/rm -f "$PLIST"
echo "GetCodexTheme watchdog disabled and removed."
