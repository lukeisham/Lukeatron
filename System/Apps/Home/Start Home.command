#!/bin/bash
# Start Home by hand (for a Mac without the launchd agent), then open it in the default browser.
cd "$(dirname "$0")" || exit 1

PORT="$(python3 -c "import json; print(json.load(open('settings.json'))['port'])")" || exit 1
URL="http://localhost:$PORT/"

if ! (exec 3<>"/dev/tcp/127.0.0.1/$PORT") 2>/dev/null; then
    nohup python3 server.py >> serve.log 2>&1 < /dev/null &
    disown 2>/dev/null || true
    for _ in $(seq 1 30); do
        (exec 3<>"/dev/tcp/127.0.0.1/$PORT") 2>/dev/null && break
        sleep 0.2
    done
fi
open "$URL"
