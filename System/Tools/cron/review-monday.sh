#!/bin/zsh
# Lukeatron — review-monday
# Runs !Review every Monday at 08:00 AEST (after project-sweep at 07:30).
# Invoked by crontab; CLAUDE.md auto-loads from the working directory.

LUKEATRON="${0:A:h:h:h:h}"
CLAUDE="$HOME/.local/bin/claude"
LOG="$LUKEATRON/System/Tools/cron/out/review-monday.log"; mkdir -p "${LOG:h}"
export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin"

echo "=== review-monday START $(date) ===" >> "$LOG"
cd "$LUKEATRON" && "$CLAUDE" -p \
  "Run !Review now. It is Monday morning. Drain each context's To-Do scratchpad into projects (promoting new ones, clearing those already tracked), then distil upcoming events, open tasks and decisions across all active projects and email Luke a digest. Lead with Personal Productivity and Personal Research contexts." \
  --dangerously-skip-permissions \
  >> "$LOG" 2>&1
echo "=== review-monday END $(date) ===" >> "$LOG"
