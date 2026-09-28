#!/bin/bash
# Start Storytelling: run the local server on 127.0.0.1 and open the browser (distribution FR-X1).
# Needs only python3. Makes no network call beyond the loopback address.

cd "$(dirname "$0")" || exit 1

if ! command -v python3 >/dev/null 2>&1; then
    echo "Storytelling needs python3, which was not found."
    echo "Install the Xcode command line tools (xcode-select --install) and try again."
    read -r -p "Press Return to close." _
    exit 1
fi

# One source of truth for the port: server.py (importing it starts nothing).
HOST="127.0.0.1"
PORT=$(python3 -c "import server; print(server.PORT)") || exit 1
URL="http://$HOST:$PORT/"

# Prints "storytelling" if our server answers on the port, "other" if something else listens, "free" if nothing does.
port_state() {
    python3 - "$HOST" "$PORT" <<'PY'
import sys
import urllib.error
import urllib.request

host, port = sys.argv[1], sys.argv[2]
try:
    with urllib.request.urlopen(f"http://{host}:{port}/", timeout=2) as response:
        print("storytelling" if response.headers.get("Server", "").startswith("Storytelling/") else "other")
except urllib.error.HTTPError as error:
    # Our own server answers 404 when index.html is missing; the Server header still tells it apart.
    print("storytelling" if error.headers.get("Server", "").startswith("Storytelling/") else "other")
except OSError as error:
    # A refused connection means nothing is listening; anything else (timeout, HTTP error) means something is.
    print("free" if "refused" in str(error).lower() else "other")
PY
}

case "$(port_state)" in
    storytelling)
        # Already running from an earlier double-click: just open it.
        open "$URL"
        exit 0
        ;;
    other)
        echo "Port $PORT is already used by another program, so Storytelling cannot start."
        echo "It is held by:"
        lsof -nP -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || echo "  (could not find out which program)"
        read -r -p "Press Return to close." _
        exit 1
        ;;
esac

# Open the browser once the server answers (up to about 5 seconds), while the server runs in this window.
(
    for _ in $(seq 1 50); do
        if [ "$(port_state)" = "storytelling" ]; then
            open "$URL"
            exit 0
        fi
        sleep 0.1
    done
    echo "Storytelling did not answer in time; open $URL yourself."
) &

echo "Storytelling is running at $URL — close this window or press Ctrl-C to stop it."
# exec so Ctrl-C and closing the window stop the server itself, not an orphan.
exec python3 server.py
