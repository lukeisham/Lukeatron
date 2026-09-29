#!/bin/bash
# Remove Home's launchd agent from THIS Mac. Home's files, passkeys and settings are untouched.
set -euo pipefail

LABEL="com.lukeatron.home"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

launchctl bootout "gui/$UID/$LABEL" 2>/dev/null || true
rm -f "$PLIST"
echo "Home's launchd agent is removed from this Mac."
