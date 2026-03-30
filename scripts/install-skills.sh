#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

# --- Build and install CLI binary ---
INSTALL_DIR="$HOME/.local/bin"
mkdir -p "$INSTALL_DIR"

echo "Building gp CLI..."
VERSION=$(cd "$REPO_ROOT" && node -p 'require("./package.json").version')
(cd "$REPO_ROOT" && bun build --compile src/index.ts --outfile gp --define "__GOODPLAN_VERSION__=\"$VERSION\"")

cp "$REPO_ROOT/gp" "$INSTALL_DIR/gp"
echo "Installed gp binary to $INSTALL_DIR/gp"

# Clean up old binary name
if [ -f "$INSTALL_DIR/goodplan" ]; then
  rm -f "$INSTALL_DIR/goodplan"
  echo "Removed old 'goodplan' binary. Update any shell aliases or completions to use 'gp'."
fi

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
  onboard-repo
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
