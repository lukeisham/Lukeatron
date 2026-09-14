#!/bin/bash
# ensure-wiki.sh — make the LukeatronWiki app live on :8787 if it isn't already.
#
# Idempotent and non-blocking: safe to run on every Claude SessionStart. If the
# app is already up it does nothing; otherwise it launches server.py detached
# (headless — no browser pop) and returns immediately.
set -u

PORT="${LUKEATRONWIKI_PORT:-8787}"
DIR="$(cd "$(dirname "$0")" && pwd)"
LOG="$DIR/serve.log"

# Already serving? Probe the TCP port (bash /dev/tcp — no lsof dependency).
if (exec 3<>"/dev/tcp/127.0.0.1/$PORT") 2>/dev/null; then
    exec 3>&- 3<&-
    exit 0            # already live — nothing to do
fi

# Not up: launch detached, headless, pinned to the chosen port.
LUKEATRONWIKI_PORT="$PORT" LUKEATRONWIKI_NO_BROWSER=1 \
    nohup python3 "$DIR/server.py" >> "$LOG" 2>&1 < /dev/null &
disown 2>/dev/null || true
exit 0
