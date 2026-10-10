#!/bin/bash
# Double-click launcher for Grammar.
#
# Serves the Grammar library and opens it in Chrome. Closing this Terminal window
# (or Ctrl-C) stops the server. It writes only Luke's labels, their tables and placements in grammar.db, and a new link's empty section in app/about.html.
# The port is fixed at 8802; a collision fails loudly rather than rebinding.

cd "$(dirname "$0")" || exit 1

echo "Grammar"
echo "-------------"

URL="http://127.0.0.1:8802"

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
  echo "most likely port 8802 is already in use by an earlier Grammar."
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
