#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

# --- Build and install CLI binary ---
INSTALL_DIR="$HOME/.local/bin"
mkdir -p "$INSTALL_DIR"

echo "Building goodplan CLI..."
VERSION=$(cd "$REPO_ROOT" && node -p 'require("./package.json").version')
(cd "$REPO_ROOT" && bun build --compile src/index.ts --outfile goodplan --define "__GOODPLAN_VERSION__=\"$VERSION\"")

cp "$REPO_ROOT/goodplan" "$INSTALL_DIR/goodplan"
echo "Installed goodplan binary to $INSTALL_DIR/goodplan"

# Ensure ~/.local/bin is on PATH
if ! echo "$PATH" | tr ':' '\n' | grep -qx "$INSTALL_DIR"; then
  echo ""
  echo "  NOTE: $INSTALL_DIR is not on your PATH."
  echo "  Add this to your shell profile (~/.zshrc or ~/.bashrc):"
  echo "    export PATH=\"\$HOME/.local/bin:\$PATH\""
  echo ""
fi

# --- Install skills ---
SKILLS_SRC="$REPO_ROOT/skills"
SKILLS_DST="$HOME/.claude/skills"

mkdir -p "$SKILLS_DST"

SKILL_DIRS=(
  _shared
  audit-architecture
  audit-docs
  audit-tests
  capture
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
