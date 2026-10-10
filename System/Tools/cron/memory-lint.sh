#!/bin/zsh
# Lukeatron — memory-lint
# Weekly, Sunday 21:00 Melbourne. No Claude call: appends missing store-index entries, then
# refreshes the search index, and checks indexes, wiki refs, the port register, the Vibe Coding Core Rules and this Mac's crontab against schedule.json. A failure becomes one issues.log line.

LUKEATRON="${0:A:h:h:h:h}"
cd "$LUKEATRON" || exit 1
OUT=$(python3 System/Tools/memory-index/memory_index.py sync 2>&1; python3 System/Tools/memory-search/search.py --refresh 2>&1 || echo "✗ memory-search refresh failed"; python3 System/Tools/memory-index/memory_index.py lint 2>&1; python3 System/Tools/ports/ports.py check 2>&1; python3 System/Tools/comment-lint/comment_lint.py 2>&1 | tail -1; python3 System/Tools/cron/schedule.py check 2>&1 | sed "s/^/✗ /")
if print -r -- "$OUT" | grep -q "✗"; then
  FAULTS=$(print -r -- "$OUT" | grep "✗" | tr '\n' ' ')
  python3 System/Tools/logs/logs.py issue memory-lint "$FAULTS — System/Tools/cron/memory-lint.sh — run it by hand and fix each ✗" --severity Medium
fi
