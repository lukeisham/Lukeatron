#!/bin/zsh
# Lukeatron — review-friday
# Runs !Review every Friday at 17:00 AEST.
# Invoked by crontab; CLAUDE.md auto-loads from the working directory.

LUKEATRON="${0:A:h:h:h:h}"
CLAUDE="$HOME/.local/bin/claude"
LOG="$LUKEATRON/System/Tools/cron/out/review-friday.log"; mkdir -p "${LOG:h}"
export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin"

echo "=== review-friday START $(date) ===" >> "$LOG"
cd "$LUKEATRON" && "$CLAUDE" -p \
  "Run !Review now. It is Friday afternoon. Drain each context's To-Do scratchpad into projects (promoting new ones, clearing those already tracked), then distil upcoming events, open tasks and decisions across all active projects and email Luke a digest. Lead with Church context." \
  --dangerously-skip-permissions \
  >> "$LOG" 2>&1
echo "=== review-friday END $(date) ===" >> "$LOG"
