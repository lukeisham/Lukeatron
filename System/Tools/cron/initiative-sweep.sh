#!/bin/zsh
# Lukeatron — initiative-sweep
# Runs !Initiative daily (proposed: 07:45 AEST) — cron: 45 7 * * * (pending Luke confirmation).
# Uses a lock file to prevent overlapping runs.
# Invoked by crontab; CLAUDE.md auto-loads from the working directory.
# Scope: MinorTasks/ queue only — never touches Projects/, registries, or _tracking.yaml.
# Fails closed on any outgoing / High-impact item (held for Luke via digest).

LUKEATRON="/Users/lukeishammacbookair/Library/CloudStorage/Dropbox/_Lukeatron"
CLAUDE="/Users/lukeishammacbookair/.local/bin/claude"
LOG="$LUKEATRON/Memory/Long-Term/Logs/cron-initiative-sweep.log"
LOCK="/tmp/lukeatron-initiative-sweep.lock"
export HOME="/Users/lukeishammacbookair"
export PATH="/Users/lukeishammacbookair/.local/bin:/usr/local/bin:/usr/bin:/bin"

# Prevent overlapping runs
if [ -f "$LOCK" ]; then
  echo "=== initiative-sweep SKIPPED (already running) $(date) ===" >> "$LOG"
  exit 0
fi
touch "$LOCK"
trap "rm -f '$LOCK'" EXIT

echo "=== initiative-sweep START $(date) ===" >> "$LOG"
cd "$LUKEATRON" && "$CLAUDE" -p \
  "Run !Initiative now. Read Memory/Medium-Term/MinorTasks/queue.md and process the open queue: auto-action every Low-impact row (execute in-system, mark done); propose an implementation sketch in Sandbox/ for every High-impact row (mark 🟠 your move, never execute); email Luke a digest of what was done and what needs his call. Scope is MinorTasks/ only — do NOT touch Projects/, registries, or _tracking.yaml. Fail closed on any outgoing content or High-impact item." \
  --model claude-haiku-4-5-20251001 \
  --dangerously-skip-permissions \
  >> "$LOG" 2>&1
echo "=== initiative-sweep END $(date) ===" >> "$LOG"
