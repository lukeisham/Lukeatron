#!/bin/bash
# Double-click launcher for Project Dashboard — the REAL board.
#
# Reads Memory/Medium-Term/Projects/ live and opens it in Chrome. Closing this
# Terminal window stops the server. Nothing is written unless you use a control
# on the page that says it writes.
#
# The matching launcher in _test/ runs the same app on fabricated data. If this
# file is ever copied into _test/, paths.py's TEST-COPY guard stops it rather
# than showing real projects under a TEST banner.

cd "$(dirname "$0")" || exit 1

echo "Project Dashboard"
echo "-----------------"

# Let the OS hand us a free port, so this never collides with the wiki viewer
# (:8787), the old dashboard, or a test board already running.
PORT=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()')
export PROJECT_DASHBOARD_PORT="$PORT"

SERVER_PID=""
cleanup() { [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null; }
trap cleanup EXIT INT TERM

python3 server.py &
SERVER_PID=$!

URL="http://127.0.0.1:$PORT"

# Wait until it actually accepts connections — opening too early gives Chrome a
# connection-refused page that it then caches.
for _ in $(seq 1 40); do
  if curl -s -o /dev/null --max-time 1 "$URL"; then break; fi
  sleep 0.25
done

if ! kill -0 "$SERVER_PID" 2>/dev/null; then
  echo
  echo "The server stopped during startup. The message above says why."
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
