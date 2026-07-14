#!/bin/zsh
# Lukeatron — review-monday
# Runs !Review every Monday at 08:00 AEST (after project-sweep at 07:30).
# Invoked by crontab; CLAUDE.md auto-loads from the working directory.

LUKEATRON="/Users/lukeishammacbookair/Library/CloudStorage/Dropbox/_Lukeatron"
CLAUDE="/Users/lukeishammacbookair/.local/bin/claude"
LOG="$LUKEATRON/Memory/Long-Term/Logs/cron-review-monday.log"
export HOME="/Users/lukeishammacbookair"
export PATH="/Users/lukeishammacbookair/.local/bin:/usr/local/bin:/usr/bin:/bin"

echo "=== review-monday START $(date) ===" >> "$LOG"
cd "$LUKEATRON" && "$CLAUDE" -p \
  "Run !Review now. It is Monday morning. Drain each context's To-Do scratchpad into projects (promoting new ones, clearing those already tracked), then distil upcoming events, open tasks and decisions across all active projects and email Luke a digest. Lead with Personal Productivity and Personal Research contexts." \
  --dangerously-skip-permissions \
  >> "$LOG" 2>&1
echo "=== review-monday END $(date) ===" >> "$LOG"
