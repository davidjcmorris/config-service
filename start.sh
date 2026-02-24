#!/usr/bin/env bash
# start.sh — Start the config-service API and admin UI in separate Terminal tabs.
# Usage: ./start.sh
# Requires: macOS Terminal

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

open_tab() {
  local title="$1"
  local cmd="$2"
  osascript \
    -e 'tell application "Terminal"' \
    -e '  tell application "System Events" to keystroke "t" using {command down}' \
    -e "  do script \"printf '\\\\033]0;${title}\\\\007'; ${cmd}\" in front window" \
    -e 'end tell'
}

# Open the API tab
open_tab "config-service" "cd '${PROJECT_DIR}/config-service' && make run"

# Small delay so the tabs open in order
sleep 0.3

# Open the UI tab
open_tab "admin-ui" "cd '${PROJECT_DIR}/ui' && pnpm dev"
