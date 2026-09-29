#!/bin/bash
# Install Home as a per-user launchd agent on THIS Mac, so http://localhost:8780 is always up.
# Run once per Mac (the MacBook and the Mac mini each need it). Re-running replaces the old agent.
# Writes one file outside the Lukeatron folder: ~/Library/LaunchAgents/com.lukeatron.home.plist
set -euo pipefail

LABEL="com.lukeatron.home"
DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER="$DIR/server.py"
LOG="$DIR/serve.log"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
PORT="$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['port'])" "$DIR/settings.json")"
PYTHON="$(command -v python3)"

if [ -z "$PYTHON" ]; then
    echo "python3 was not found. Install Python 3.10 or newer (e.g. Homebrew) and run this again."
    exit 1
fi

xml_escape() { sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g' <<<"$1"; }

mkdir -p "$HOME/Library/LaunchAgents"
cat >"$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key><string>$LABEL</string>
    <key>ProgramArguments</key>
    <array>
        <string>$(xml_escape "$PYTHON")</string>
        <string>$(xml_escape "$SERVER")</string>
    </array>
    <key>WorkingDirectory</key><string>$(xml_escape "$DIR")</string>
    <key>RunAtLoad</key><true/>
    <key>KeepAlive</key><true/>
    <key>ThrottleInterval</key><integer>10</integer>
    <key>StandardOutPath</key><string>$(xml_escape "$LOG")</string>
    <key>StandardErrorPath</key><string>$(xml_escape "$LOG")</string>
</dict>
</plist>
EOF

launchctl bootout "gui/$UID/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$UID" "$PLIST"

for _ in $(seq 1 50); do
    if (exec 3<>"/dev/tcp/127.0.0.1/$PORT") 2>/dev/null; then
        exec 3>&- 3<&-
        echo "Home is live at http://localhost:$PORT (python: $PYTHON)"
        exit 0
    fi
    sleep 0.2
done

echo "Home did not come up on port $PORT. Last lines of $LOG:"
tail -n 20 "$LOG" 2>/dev/null || echo "(no log yet)"
exit 1
