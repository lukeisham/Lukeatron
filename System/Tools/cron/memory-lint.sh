#!/bin/zsh
# Lukeatron — memory-lint
# Weekly, Sunday 21:00 Melbourne. No Claude call: appends missing store-index entries, then
# refreshes the search index, and checks indexes, wiki refs and the port register. One line per run to workers.log.

LUKEATRON="${0:A:h:h:h:h}"
cd "$LUKEATRON" || exit 1
OUT=$(python3 System/Tools/memory-index/memory_index.py sync 2>&1; python3 System/Tools/memory-search/search.py --refresh 2>&1 || echo "✗ memory-search refresh failed"; python3 System/Tools/memory-index/memory_index.py lint 2>&1; python3 System/Tools/ports/ports.py check 2>&1)
if print -r -- "$OUT" | grep -q "✗"; then STATUS=FAIL; else STATUS=SUCCESS; fi
SUMMARY=$(print -r -- "$OUT" | grep -E "entries added|indexed or updated|✗|✓" | tr '\n' ' ')
python3 System/Tools/skilllog/skilllog.py worker memory-lint "$STATUS" "$SUMMARY"
