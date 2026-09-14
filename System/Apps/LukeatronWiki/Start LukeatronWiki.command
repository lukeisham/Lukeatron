#!/bin/bash
# Double-click launcher for LukeatronWiki.
#
# Reads Memory/Long-Term stores live and opens the wiki in a browser.
# Closing this Terminal window (or Ctrl-C) stops the server. Nothing is
# written unless you click a button — ⊕ on a slot to start an enrichment,
# or the capture button on the backlog.

cd "$(dirname "$0")" || exit 1

echo "LukeatronWiki"
echo "-------------"

PORT="${LUKEATRONWIKI_PORT:-8787}"
URL="http://127.0.0.1:$PORT"

SERVER_PID=""
cleanup() { [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null; }
trap cleanup EXIT INT TERM

LUKEATRONWIKI_PORT="$PORT" python3 server.py &
SERVER_PID=$!

# Wait until it actually accepts connections — opening too early gives a
# connection-refused page that the browser then caches.
for _ in $(seq 1 40); do
  if curl -s -o /dev/null --max-time 1 "$URL"; then break; fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then break; fi
  sleep 0.25
done

if ! kill -0 "$SERVER_PID" 2>/dev/null; then
  echo
  echo "The server stopped during startup. Check the message above for why —"
  echo "most likely port $PORT is already in use by a SessionStart-managed instance."
  echo "Press Return to close, or just open $URL in a browser instead."
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
