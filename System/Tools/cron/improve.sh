#!/bin/zsh
# Lukeatron — improve
# Monthly, 1st at 09:00 Melbourne. Runs !Improve, which only writes System/Suggestions/improve-<YYYY-MM>.md.

LUKEATRON="${0:A:h:h:h:h}"
CLAUDE="$HOME/.local/bin/claude"
LOG="$LUKEATRON/System/Tools/cron/out/improve.log"; mkdir -p "${LOG:h}"
export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin"

echo "=== improve START $(date) ===" >> "$LOG"
cd "$LUKEATRON" && "$CLAUDE" -p \
  "Run !Improve now (System/Skillbank/GeneralPurposeSkills/!Improve/SKILL.md). Write only System/Suggestions/improve-$(date +%Y-%m).md; change nothing else." \
  --dangerously-skip-permissions >> "$LOG" 2>&1 || \
  python3 System/Tools/logs/logs.py issue '!Improve' "monthly run exited non-zero — System/Tools/cron/out/improve.log — read the log and rerun" --severity Medium
echo "=== improve END $(date) ===" >> "$LOG"
