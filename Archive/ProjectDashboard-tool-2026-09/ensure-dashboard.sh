#!/bin/bash
# ensure-dashboard.sh — make the Project Dashboard live on :8788 if it isn't already.
#
# Idempotent and non-blocking: safe to run on every Claude SessionStart. If the
# dashboard is already up it does nothing; otherwise it launches serve.py detached
# (headless — no browser pop) and returns immediately.
set -u

PORT="${LUKEATRON_DASHBOARD_PORT:-8788}"
DIR="$(cd "$(dirname "$0")" && pwd)"
LOG="$DIR/serve.log"

# Already serving? Probe the TCP port (bash /dev/tcp — no lsof dependency).
if (exec 3<>"/dev/tcp/127.0.0.1/$PORT") 2>/dev/null; then
    exec 3>&- 3<&-
    exit 0            # already live — nothing to do
fi

# Not up: launch detached, headless, pinned to the chosen port.
LUKEATRON_DASHBOARD_PORT="$PORT" LUKEATRON_DASHBOARD_NO_BROWSER=1 \
    nohup python3 "$DIR/serve.py" >> "$LOG" 2>&1 < /dev/null &
disown 2>/dev/null || true
exit 0
