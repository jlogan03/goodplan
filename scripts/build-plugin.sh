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
mkdir -p "$PLUGIN_DIR/bin"

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
  "skills": "./skills",
  "agents": "./agents"
}
MANIFEST

# Copy skills (rsync matches install-skills.sh convention)
rsync -a --exclude '.DS_Store' "$REPO_ROOT/skills/" "$PLUGIN_DIR/skills/"

# Copy agent definitions
if [ -d "$REPO_ROOT/agents/" ]; then
  mkdir -p "$PLUGIN_DIR/agents"
  rsync -a --exclude '.DS_Store' "$REPO_ROOT/agents/" "$PLUGIN_DIR/agents/"
fi

# Copy hook scripts and configuration
cp "$REPO_ROOT/plugin-hooks/"*.sh "$REPO_ROOT/plugin-hooks/"*.json "$PLUGIN_DIR/hooks/"
chmod +x "$PLUGIN_DIR/hooks/"*.sh

# Copy cross-platform bin/gp launcher
cp "$REPO_ROOT/plugin/bin/gp" "$PLUGIN_DIR/bin/gp"
chmod +x "$PLUGIN_DIR/bin/gp"

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

# Assert exact skill count
test "$SKILL_COUNT" -eq 12 || { echo "FAIL: expected 12 skills, got $SKILL_COUNT"; exit 1; }

# Assert none of the 15 deleted skill names exist
DELETED_SKILLS="create-architecture refine-architecture create-plan refine-plan create-slices refine-slices implement-plan complete audit-architecture audit-docs audit-tests capture onboard-repo migrate project-status"
for deleted in $DELETED_SKILLS; do
  if [[ -d "$PLUGIN_DIR/skills/$deleted" ]]; then
    echo "FAIL: deleted skill '$deleted' still exists in plugin dist"
    exit 1
  fi
done
echo "  deleted skill guard: clean"

echo "  Packaged $SKILL_COUNT skills"

# Verify agent packaging
echo ""
echo "Verifying agents..."

AGENT_COUNT=0
if [ -d "$PLUGIN_DIR/agents/" ]; then
  for agent_file in "$PLUGIN_DIR/agents/"*.md; do
    [ -f "$agent_file" ] || continue
    agent_basename=$(basename "$agent_file")

    # Extract frontmatter (between first pair of --- delimiters)
    FRONTMATTER=$(awk 'NR==1 && /^---$/{found=1; next} found && /^---$/{exit} found{print}' "$agent_file")
    if [[ -z "$FRONTMATTER" ]]; then
      echo "FAIL: agents/$agent_basename has no valid YAML frontmatter (missing --- delimiters)"
      exit 1
    fi
    if ! echo "$FRONTMATTER" | grep -q '^name:'; then
      echo "FAIL: agents/$agent_basename missing or incorrect name: field"
      exit 1
    fi
    if ! echo "$FRONTMATTER" | grep -q '^description:'; then
      echo "FAIL: agents/$agent_basename missing description: field"
      exit 1
    fi

    # Validate @ reference paths: extract @${CLAUDE_PLUGIN_ROOT}/... references from body
    BODY=$(awk 'NR==1 && /^---$/{found=1; next} found && /^---$/{found=0; next} !found{print}' "$agent_file")

    # Check for bare @ references that don't use ${CLAUDE_PLUGIN_ROOT} prefix
    BARE_REFS=$(echo "$BODY" | grep -oE '@\./[^ )]+|@[a-zA-Z][^ )]*' | grep -v '@\$' || true)
    if [[ -n "$BARE_REFS" ]]; then
      echo "  WARN: agents/$agent_basename has bare @ references (won't resolve at runtime):"
      echo "$BARE_REFS" | while read -r ref; do echo "    $ref"; done
    fi

    # Extract @${CLAUDE_PLUGIN_ROOT}/... references and verify targets exist
    PLUGIN_REFS=$(echo "$BODY" | grep -oE '@\$\{CLAUDE_PLUGIN_ROOT\}/[^ )]+' || true)
    if [[ -n "$PLUGIN_REFS" ]]; then
      while IFS= read -r ref; do
        # Strip the @${CLAUDE_PLUGIN_ROOT}/ prefix to get relative path
        rel_path="${ref#@\$\{CLAUDE_PLUGIN_ROOT\}/}"
        target="$PLUGIN_DIR/$rel_path"
        if [[ ! -f "$target" ]]; then
          echo "FAIL: agents/$agent_basename references $ref but $rel_path does not exist in plugin dist"
          exit 1
        fi
      done <<< "$PLUGIN_REFS"
    fi

    AGENT_COUNT=$((AGENT_COUNT + 1))
  done
fi

if [[ "$AGENT_COUNT" -gt 0 ]]; then
  echo "  frontmatter validation: all agents pass"
  echo "  @ reference validation: all references resolve"
fi
echo "  Packaged $AGENT_COUNT agents"

# Validate plugin structure
if command -v claude &> /dev/null; then
  echo ""
  echo "Validating plugin..."
  VALIDATION_OUTPUT=$(claude plugin validate "$PLUGIN_DIR/" 2>&1) || {
    # The "agents" manifest field is not yet recognized by the claude CLI validator.
    # Check if that's the only error — if so, warn and continue with fallback assertions.
    AGENT_ERRORS=$(echo "$VALIDATION_OUTPUT" | grep -c 'agents:' || true)
    TOTAL_ERRORS=$(echo "$VALIDATION_OUTPUT" | grep -c '❯' || true)
    if [[ "$AGENT_ERRORS" -eq "$TOTAL_ERRORS" && "$TOTAL_ERRORS" -gt 0 ]]; then
      echo "  WARN: claude plugin validate does not recognize 'agents' field yet — expected, continuing"
    else
      echo "FAIL: plugin validation failed with unexpected errors"
      echo "$VALIDATION_OUTPUT"
      exit 1
    fi
  }
  if [[ -z "${VALIDATION_OUTPUT##*✓*}" ]]; then
    echo "$VALIDATION_OUTPUT"
  fi
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
  # Verify bin/gp launcher is executable
  test -x "$PLUGIN_DIR/bin/gp"
  echo "  bin/gp launcher: executable"
fi

# Print success summary
echo ""
echo "Plugin assembled at $PLUGIN_DIR/"
echo ""
find "$PLUGIN_DIR" -type f -o -type d | sort | while read -r path; do
  echo "  ${path#$PLUGIN_DIR/}"
done
