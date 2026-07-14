#!/bin/sh
# Lukeatron Claude Code status line
input=$(cat)
cwd=$(echo "$input" | jq -r '.cwd // .workspace.current_dir // empty')
model=$(echo "$input" | jq -r '.model.display_name // empty')
remaining=$(echo "$input" | jq -r '.context_window.remaining_percentage // empty')
[ -n "$remaining" ] && used=$(echo "$remaining" | awk '{printf "%.0f", 100 - $1}')
five_pct=$(echo "$input" | jq -r '.rate_limits.five_hour.used_percentage // empty')
week_pct=$(echo "$input" | jq -r '.rate_limits.seven_day.used_percentage // empty')

# Build directory display
if [ -n "$cwd" ]; then
  dir=$(printf '%s' "$cwd" | sed "s|$HOME|~|")
else
  dir="$(pwd | sed "s|$HOME|~|")"
fi

# Compose output
line=""
[ -n "$dir" ] && line="$dir"
[ -n "$model" ] && line="$line  $model"
[ -n "$used" ] && line="$line  ctx:${used}%"
[ -n "$five_pct" ] && line="$line  5h:$(printf '%.0f' "$five_pct")%"
[ -n "$week_pct" ] && line="$line  7d:$(printf '%.0f' "$week_pct")%"

printf '%s' "$line"
