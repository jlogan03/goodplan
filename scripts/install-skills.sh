#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

SKILLS_SRC="$REPO_ROOT/skills"
SKILLS_DST="$HOME/.claude/skills"

mkdir -p "$SKILLS_DST"

SKILL_DIRS=(
  _shared
  audit-architecture
  complete
  create-architecture
  create-epic
  create-plan
  create-slices
  explore
  implement-plan
  migrate
  project-status
  refine-architecture
  refine-plan
  refine-slices
  start-epic
)

count=0
for dir in "${SKILL_DIRS[@]}"; do
  if [ ! -d "$SKILLS_SRC/$dir" ]; then
    echo "  WARN: $dir not found in $SKILLS_SRC, skipping" >&2
    continue
  fi
  rm -rf "$SKILLS_DST/$dir"
  rsync -a --exclude='.DS_Store' "$SKILLS_SRC/$dir/" "$SKILLS_DST/$dir/"
  echo "  $dir"
  count=$((count + 1))
done

echo "Installed $count skills to ~/.claude/skills/"
