#!/bin/bash
# Double-click launcher for the TEST copy of Project Dashboard.
#
# Opens the board in Chrome against this copy's OWN fake fixture — never Luke's
# real projects. Closing this Terminal window stops the server.
#
# Divergence allowlist: "launcher markers". The matching launcher in _template/
# runs the real board; if you double-click that one from in here, paths.py's
# TEST-COPY guard stops it rather than quietly showing real data.

cd "$(dirname "$0")" || exit 1

FIXTURE="fixtures/lukeatron_root"

echo "Project Dashboard — TEST DATA"
echo "-----------------------------"

# The fixture is generated, not stored. Rebuild it if it is missing so a fresh
# clone of this folder still runs on a double-click.
if [ ! -d "$FIXTURE" ]; then
  echo "No fixture found — generating fake data..."
  python3 seed_fixture.py || { echo "Could not generate the fixture."; read -r; exit 1; }
fi

export LUKEATRON_ROOT="$FIXTURE"

# Let the OS hand us a free port, so this never collides with the other
# dashboards (the wiki viewer, the old dashboard, the real board).
PORT=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()')
export PROJECT_DASHBOARD_PORT="$PORT"

# Stop the server when this window closes or Ctrl-C is pressed.
SERVER_PID=""
cleanup() { [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null; }
trap cleanup EXIT INT TERM

python3 server.py &
SERVER_PID=$!

URL="http://127.0.0.1:$PORT"

# Wait for it to actually accept connections before opening the browser —
# opening too early gives Chrome a connection-refused page that it caches.
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
echo "🧪 This is the TEST board — fabricated projects, not your real one."
echo "Close this window, or press Ctrl-C, to stop the server."
wait "$SERVER_PID"
