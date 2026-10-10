#!/bin/zsh
# Lukeatron — project-sweep
# Runs !ProjectSweep every Monday at 07:30 AEST.
# Invoked by crontab; CLAUDE.md auto-loads from the working directory.

LUKEATRON="${0:A:h:h:h:h}"
CLAUDE="$HOME/.local/bin/claude"
LOG="$LUKEATRON/System/Tools/cron/out/project-sweep.log"; mkdir -p "${LOG:h}"
export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin"

echo "=== project-sweep START $(date) ===" >> "$LOG"
cd "$LUKEATRON" && "$CLAUDE" -p \
  "Run !ProjectSweep now. Walk every active project in Memory/Medium-Term/Projects/, triage each into 🟢/🔵/🟠/🔴/⚪, and advance the moveable ones — generate agent next actions, plans, draft emails, surface input Luke owes. Maintain state/waiting_on/wake in _tracking.yaml." \
  --dangerously-skip-permissions \
  >> "$LOG" 2>&1
echo "=== project-sweep END $(date) ===" >> "$LOG"
