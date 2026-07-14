#!/bin/zsh
# Lukeatron — project-sweep
# Runs !ProjectSweep every Monday at 07:30 AEST.
# Invoked by crontab; CLAUDE.md auto-loads from the working directory.

LUKEATRON="/Users/lukeishammacbookair/Library/CloudStorage/Dropbox/_Lukeatron"
CLAUDE="/Users/lukeishammacbookair/.local/bin/claude"
LOG="$LUKEATRON/Memory/Long-Term/Logs/cron-project-sweep.log"
export HOME="/Users/lukeishammacbookair"
export PATH="/Users/lukeishammacbookair/.local/bin:/usr/local/bin:/usr/bin:/bin"

echo "=== project-sweep START $(date) ===" >> "$LOG"
cd "$LUKEATRON" && "$CLAUDE" -p \
  "Run !ProjectSweep now. Walk every active project in Memory/Medium-Term/Projects/, triage each into 🟢/🔵/🟠/🔴/⚪, and advance the moveable ones — generate agent next actions, plans, draft emails, surface input Luke owes. Maintain state/waiting_on/wake in _tracking.yaml." \
  --dangerously-skip-permissions \
  >> "$LOG" 2>&1
echo "=== project-sweep END $(date) ===" >> "$LOG"
