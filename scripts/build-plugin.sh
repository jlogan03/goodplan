#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
PLUGIN_DIR="$REPO_ROOT/dist/gp-plugin"

# Read version from package.json (same pattern as install-skills.sh)
VERSION=$(cd "$REPO_ROOT" && node -p 'require("./package.json").version')

echo "Building gp plugin v$VERSION..."

# Clean and create plugin directory structure
rm -rf "$PLUGIN_DIR"
mkdir -p "$PLUGIN_DIR/.claude-plugin"
mkdir -p "$PLUGIN_DIR/binaries/macos-arm64"
mkdir -p "$PLUGIN_DIR/skills"
mkdir -p "$PLUGIN_DIR/hooks"

# Compile binary.
# --target is explicit because build:plugin always targets the v1 distribution
# platform (macOS arm64), unlike `bun run build` which builds for the host.
(cd "$REPO_ROOT" && bun build --compile src/index.ts \
  --outfile "$PLUGIN_DIR/binaries/macos-arm64/gp" \
  --target=bun-darwin-arm64 \
  --define "__GOODPLAN_VERSION__=\"$VERSION\"" \
  --define "__GP_HMAC_KEY__=\"${GP_HMAC_KEY:-goodplan-dev-hmac-key}\"")

# Generate plugin manifest
# Paths must use ./ prefix to pass `claude plugin validate`
cat > "$PLUGIN_DIR/.claude-plugin/plugin.json" <<MANIFEST
{
  "name": "goodplan",
  "version": "$VERSION",
  "description": "goodplan workflow CLI — manages epics, slices, architecture, and project state",
  "author": {
    "name": "Ian White",
    "url": "https://github.com/ian97531"
  },
  "skills": "./skills"
}
MANIFEST

# Copy skills (rsync matches install-skills.sh convention)
rsync -a --exclude '.DS_Store' "$REPO_ROOT/skills/" "$PLUGIN_DIR/skills/"

# Copy hook scripts and configuration
cp "$REPO_ROOT/plugin-hooks/"*.sh "$REPO_ROOT/plugin-hooks/"*.json "$PLUGIN_DIR/hooks/"
chmod +x "$PLUGIN_DIR/hooks/"*.sh

# Copy plugin CLAUDE.md template
cp "$REPO_ROOT/plugin/CLAUDE.md" "$PLUGIN_DIR/CLAUDE.md"

# Add gp: namespace prefix to dist skill names (source unchanged).
# Plugin name is "goodplan" (marketing name) but skills use "gp:" prefix (CLI shorthand).
echo ""
echo "Applying gp: namespace prefix to skills..."
for dir in "$PLUGIN_DIR/skills"/*/; do
  dirname=$(basename "$dir")
  if [[ "$dirname" == _* ]]; then
    continue
  fi
  SKILL_FILE="$dir/SKILL.md"
  if [[ ! -f "$SKILL_FILE" ]]; then
    continue
  fi
  # Extract current name from frontmatter
  CURRENT_NAME=$(awk 'NR==1 && /^---$/{found=1; next} found && /^---$/{exit} found && /^name:/{print $2}' "$SKILL_FILE")
  if [[ -z "$CURRENT_NAME" ]]; then
    echo "  WARN: $dirname has no name: field, inserting gp:$dirname"
    # Insert name: gp:<dirname> after opening ---
    awk 'NR==1 && /^---$/{print; print "name: gp:'"$dirname"'"; next} {print}' "$SKILL_FILE" > "$SKILL_FILE.tmp"
    mv "$SKILL_FILE.tmp" "$SKILL_FILE"
  elif [[ "$CURRENT_NAME" != gp:* ]]; then
    # Replace name: <current> with name: gp:<current>
    awk '/^name: /{sub(/^name: /, "name: gp:"); print; next} {print}' "$SKILL_FILE" > "$SKILL_FILE.tmp"
    mv "$SKILL_FILE.tmp" "$SKILL_FILE"
  fi
done
echo "  namespace prefixing: done"

# Verify skill packaging
echo ""
echo "Verifying skills..."

# Assert _shared directory exists with cli-interaction.md
test -d "$PLUGIN_DIR/skills/_shared/" || { echo "FAIL: skills/_shared/ directory missing"; exit 1; }
test -f "$PLUGIN_DIR/skills/_shared/references/cli-interaction.md" || { echo "FAIL: skills/_shared/references/cli-interaction.md missing"; exit 1; }
echo "  _shared/references/cli-interaction.md: present"

# Assert every non-underscore skill directory contains a SKILL.md
SKILL_COUNT=0
for dir in "$PLUGIN_DIR/skills"/*/; do
  dirname=$(basename "$dir")
  # Skip underscore-prefixed directories (internal/shared resources)
  if [[ "$dirname" == _* ]]; then
    continue
  fi
  if [[ ! -f "$dir/SKILL.md" ]]; then
    echo "FAIL: $dir is missing SKILL.md"
    exit 1
  fi

  # Validate SKILL.md frontmatter: must have opening/closing --- with name: and description: fields
  FRONTMATTER=$(awk 'NR==1 && /^---$/{found=1; next} found && /^---$/{exit} found{print}' "$dir/SKILL.md")
  if [[ -z "$FRONTMATTER" ]]; then
    echo "FAIL: $dir/SKILL.md has no valid YAML frontmatter (missing --- delimiters)"
    exit 1
  fi
  if ! echo "$FRONTMATTER" | grep -q '^name: gp:'; then
    echo "FAIL: $dir/SKILL.md frontmatter missing or incorrect name: field (expected name: gp:<skill-name>)"
    exit 1
  fi
  if ! echo "$FRONTMATTER" | grep -q '^description:'; then
    echo "FAIL: $dir/SKILL.md frontmatter missing description: field"
    exit 1
  fi

  SKILL_COUNT=$((SKILL_COUNT + 1))
done
echo "  frontmatter validation: all skills pass"

# Assert no old CLI name invocations (regression guard)
if grep -rE 'goodplan (init|status|epic:|slice:|quest:|learning:|decision:|task:|schema|version|subagent:)' "$PLUGIN_DIR/skills/" > /dev/null 2>&1; then
  echo "FAIL: found old 'goodplan' CLI invocations in skills:"
  grep -rE 'goodplan (init|status|epic:|slice:|quest:|learning:|decision:|task:|schema|version|subagent:)' "$PLUGIN_DIR/skills/"
  exit 1
fi
echo "  old CLI name check: clean"

# Assert no .DS_Store files
DS_COUNT=$(find "$PLUGIN_DIR/skills" -name '.DS_Store' | wc -l | tr -d ' ')
if [[ "$DS_COUNT" -ne 0 ]]; then
  echo "FAIL: found $DS_COUNT .DS_Store files in skills"
  exit 1
fi
echo "  .DS_Store check: clean"

echo "  Packaged $SKILL_COUNT skills"

# Validate plugin structure
if command -v claude &> /dev/null; then
  echo ""
  echo "Validating plugin..."
  claude plugin validate "$PLUGIN_DIR/"
else
  echo ""
  echo "claude CLI not available — running fallback assertions..."
  # jq validates plugin.json (dev machines have jq); python3 validates hooks.json (guaranteed on macOS)
  jq . "$PLUGIN_DIR/.claude-plugin/plugin.json" > /dev/null
  echo "  plugin.json: valid JSON"
  python3 -c "import json; json.load(open('$PLUGIN_DIR/hooks/hooks.json'))"
  echo "  hooks.json: valid JSON"
  test -x "$PLUGIN_DIR/hooks/protect-state.sh" && test -x "$PLUGIN_DIR/hooks/warn-bash-state.sh"
  echo "  hook scripts: executable"
  # Verify binary is executable and runs
  "$PLUGIN_DIR/binaries/macos-arm64/gp" --version
  echo "  binary: executable and runs"
fi

# Print success summary
echo ""
echo "Plugin assembled at $PLUGIN_DIR/"
echo ""
find "$PLUGIN_DIR" -type f -o -type d | sort | while read -r path; do
  echo "  ${path#$PLUGIN_DIR/}"
done
