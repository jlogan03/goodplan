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
  --define "__GOODPLAN_VERSION__=\"$VERSION\"")

# Generate plugin manifest
# Paths must use ./ prefix to pass `claude plugin validate`
cat > "$PLUGIN_DIR/.claude-plugin/plugin.json" <<MANIFEST
{
  "name": "gp",
  "version": "$VERSION",
  "description": "goodplan workflow CLI — manages epics, slices, architecture, and project state",
  "author": {
    "name": "Ian White",
    "url": "https://github.com/ian97531"
  },
  "skills": "./skills",
  "hooks": "./hooks/hooks.json"
}
MANIFEST

# Copy plugin CLAUDE.md template
cp "$REPO_ROOT/plugin/CLAUDE.md" "$PLUGIN_DIR/CLAUDE.md"

# Validate plugin structure
if command -v claude &> /dev/null; then
  echo ""
  echo "Validating plugin..."
  claude plugin validate "$PLUGIN_DIR/"
else
  echo ""
  echo "claude CLI not available — running fallback assertions..."
  # Verify plugin.json is valid JSON
  jq . "$PLUGIN_DIR/.claude-plugin/plugin.json" > /dev/null
  echo "  plugin.json: valid JSON"
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
