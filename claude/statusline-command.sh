#!/usr/bin/env bash

input=$(cat)

cwd=$(echo "$input" | jq -r '.workspace.current_dir // .cwd')
model=$(echo "$input" | jq -r '.model.display_name // empty')
remaining=$(echo "$input" | jq -r '.context_window.remaining_percentage // empty')

# Shorten home directory to ~, then truncate to last 2 path components
home="$HOME"
short_cwd="${cwd/#$home/~}"
IFS='/' read -ra parts <<< "$short_cwd"
n=${#parts[@]}
if [ "$n" -gt 2 ]; then
  short_cwd="…/${parts[$((n-2))]}/${parts[$((n-1))]}"
fi

# Git branch + status
git_branch=""
if git_dir=$(git -C "$cwd" rev-parse --git-dir 2>/dev/null); then
  branch=$(git -C "$cwd" symbolic-ref --short HEAD 2>/dev/null || git -C "$cwd" rev-parse --short HEAD 2>/dev/null)
  if [ -n "$branch" ]; then
    indicators=""
    # Dirty working tree
    if [ -n "$(git -C "$cwd" status --porcelain 2>/dev/null)" ]; then
      indicators+=$'\e[33m*\e[0m'
    fi
    # Ahead/behind remote
    upstream=$(git -C "$cwd" rev-parse --abbrev-ref '@{upstream}' 2>/dev/null)
    if [ -n "$upstream" ]; then
      ahead=$(git -C "$cwd" rev-list --count '@{upstream}..HEAD' 2>/dev/null)
      behind=$(git -C "$cwd" rev-list --count 'HEAD..@{upstream}' 2>/dev/null)
      [ "$ahead" -gt 0 ] 2>/dev/null && indicators+=$'\e[32m↑'"$ahead"$'\e[0m'
      [ "$behind" -gt 0 ] 2>/dev/null && indicators+=$'\e[31m↓'"$behind"$'\e[0m'
    fi
    git_branch=$' \e[35m('"$branch"$')\e[0m'"$indicators"
  fi
fi

# Context progress bar (shows usage)
ctx_info=""
if [ -n "$remaining" ]; then
  remaining_int=${remaining%.*}
  used_int=$(( 100 - remaining_int ))
  used=$(awk "BEGIN {printf \"%.0f\", 100 - $remaining}")
  bar_width=10
  filled=$(( used_int * bar_width / 100 ))
  empty=$(( bar_width - filled ))
  bar=$(printf '%0.s█' $(seq 1 $filled 2>/dev/null))
  bar+=$(printf '%0.s░' $(seq 1 $empty 2>/dev/null))
  if [ "$used_int" -ge 90 ]; then
    ctx_info=$' \e[31m'"${bar} ${used}"$'%\e[0m'
  elif [ "$used_int" -ge 75 ]; then
    ctx_info=$' \e[33m'"${bar} ${used}"$'%\e[0m'
  else
    ctx_info=$' \e[38;5;99m'"${bar} ${used}"$'%\e[0m'
  fi
fi

# Model info
model_info=""
if [ -n "$model" ]; then
  model_info=$' \e[36m['"$model"$']\e[0m'
fi

printf '%s%s%s%s' $'\e[34m'"${short_cwd}"$'\e[0m' "$git_branch" "$model_info" "$ctx_info"
