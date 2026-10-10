#!/bin/zsh
# Lukeatron — usage
# Weekly, Sunday 21:10 Melbourne, on each Mac. No Claude call: rewrites this Mac's recent week sections of
# Memory/Long-Term/Logs/usage.md from Claude Code transcripts. A crash becomes one issues.log line.

LUKEATRON="${0:A:h:h:h:h}"
cd "$LUKEATRON" || exit 1
OUT=$(PYTHONDONTWRITEBYTECODE=1 python3 System/Tools/usage/usage.py --days 14 2>&1) || \
  python3 System/Tools/logs/logs.py issue usage "usage.py failed: ${OUT[1,200]} — System/Tools/cron/usage.sh — run it by hand to reproduce" --severity Medium
