#!/bin/bash
# ensure-kanban.sh — make ProjectKanban live on :8789 if it isn't already.
#
# Idempotent and non-blocking: safe to run on every Claude SessionStart. If the
# board is already up it does nothing; otherwise it launches server.py
# detached (headless — server.py never opens a browser itself) and returns
# immediately.
set -u

PORT=8789  # server.py's PORT constant is hardcoded to match — no env override
DIR="$(cd "$(dirname "$0")" && pwd)"
LOG="$DIR/serve.log"

# Already serving? Probe the TCP port (bash /dev/tcp — no lsof dependency).
if (exec 3<>"/dev/tcp/127.0.0.1/$PORT") 2>/dev/null; then
    exec 3>&- 3<&-
    exit 0            # already live — nothing to do
fi

# Not up: launch detached, pinned to the chosen port.
nohup python3 "$DIR/server.py" >> "$LOG" 2>&1 < /dev/null &
disown 2>/dev/null || true
exit 0
