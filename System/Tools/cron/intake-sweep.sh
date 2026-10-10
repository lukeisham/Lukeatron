#!/bin/zsh
# Lukeatron — intake-sweep
# Runs !Intake three times daily (08:00, 13:00, 18:00 AEST) — cron: 0 8,13,18 * * *.
# Uses a lock file to prevent overlapping runs.
# Invoked by crontab; CLAUDE.md auto-loads from the working directory.

LUKEATRON="${0:A:h:h:h:h}"
CLAUDE="$HOME/.local/bin/claude"
LOG="$LUKEATRON/System/Tools/cron/out/intake-sweep.log"; mkdir -p "${LOG:h}"
LOCK="/tmp/lukeatron-intake-sweep.lock"
export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin"

# Prevent overlapping runs
if [ -f "$LOCK" ]; then
  echo "=== intake-sweep SKIPPED (already running) $(date) ===" >> "$LOG"
  exit 0
fi
touch "$LOCK"
trap "rm -f '$LOCK'" EXIT

echo "=== intake-sweep START $(date) ===" >> "$LOG"
cd "$LUKEATRON" && "$CLAUDE" -p \
  "Run !Intake now. Check AgentMail inbox, the Inbox/ folder, and WhatsApp for new unprocessed items. For each item, run !DetermineContext then route to one or more of the four outcomes: ① Project (create/update), ② Long-Term memory (store a durable fact), ③ LukeatronWiki (read/watch/write fodder, ideas, links), ④ Action (one-off or !CreatePlan) — or ∅ Discard. Fail closed on any outgoing content." \
  --dangerously-skip-permissions \
  >> "$LOG" 2>&1
echo "=== intake-sweep END $(date) ===" >> "$LOG"
