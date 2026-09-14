#!/bin/bash
# Double-click launcher for ProjectKanban.
#
# Reads Memory/Medium-Term/Projects/ live and opens the board in Chrome.
# Closing this Terminal window (or Ctrl-C) stops the server. Nothing is
# written unless you make one of the six edits on a project page.
#
# server.spec.md FR-2/FR-8: the port is FIXED at 8789 (8787 is the wiki
# viewer) and the server never silently rebinds to a different one on a
# collision — it fails loudly instead, which is why this launcher reports
# the server's own stderr rather than guessing a free port the way
# ProjectDashboard's launcher did. Since :8789 is normally already held by
# the SessionStart-hook-managed instance (ensure-kanban.sh), double-clicking
# this while Claude is running will usually fail loudly for exactly that
# reason — that's expected, not a bug; just open the URL below instead.

cd "$(dirname "$0")" || exit 1

echo "ProjectKanban"
echo "-------------"

URL="http://127.0.0.1:8789"

SERVER_PID=""
cleanup() { [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null; }
trap cleanup EXIT INT TERM

python3 server.py &
SERVER_PID=$!

# Wait until it actually accepts connections — opening too early gives Chrome
# a connection-refused page that it then caches.
for _ in $(seq 1 40); do
  if curl -s -o /dev/null --max-time 1 "$URL"; then break; fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then break; fi
  sleep 0.25
done

if ! kill -0 "$SERVER_PID" 2>/dev/null; then
  echo
  echo "The server stopped during startup. The message above says why —"
  echo "most likely port 8789 is already in use by an earlier ProjectKanban."
  echo "Press Return to close."
  read -r
  exit 1
fi

echo "Opening $URL"
if open -a "Google Chrome" "$URL" 2>/dev/null; then
  :
else
  echo "(Chrome not found — opening in your default browser instead.)"
  open "$URL"
fi

echo
echo "Close this window, or press Ctrl-C, to stop the server."
wait "$SERVER_PID"
