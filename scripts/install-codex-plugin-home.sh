#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

PLUGIN_NAME="goodplan"
SOURCE_PLUGIN_DIR="$REPO_ROOT/plugins/$PLUGIN_NAME"
TARGET_PLUGIN_PARENT="${GOODPLAN_CODEX_PLUGIN_PARENT:-$HOME/plugins}"
TARGET_PLUGIN_DIR="$TARGET_PLUGIN_PARENT/$PLUGIN_NAME"
MARKETPLACE_PATH="${GOODPLAN_CODEX_MARKETPLACE_PATH:-$HOME/.agents/plugins/marketplace.json}"

MODE="symlink"
BUILD_FIRST=0

usage() {
	cat <<'EOF'
Usage: bash scripts/install-codex-plugin-home.sh [--build] [--copy|--symlink]

Installs the built goodplan Codex plugin into the home-local Codex plugin layout:
  ~/plugins/goodplan
  ~/.agents/plugins/marketplace.json

Options:
  --build     Run the Codex build before installing
  --copy      Copy the built plugin into ~/plugins/goodplan
  --symlink   Symlink ~/plugins/goodplan to the repo build output (default)
  --help      Show this help

Environment overrides:
  GOODPLAN_CODEX_PLUGIN_PARENT
  GOODPLAN_CODEX_MARKETPLACE_PATH
EOF
}

while [ "$#" -gt 0 ]; do
	case "$1" in
		--build)
			BUILD_FIRST=1
			;;
		--copy)
			MODE="copy"
			;;
		--symlink)
			MODE="symlink"
			;;
		--help|-h)
			usage
			exit 0
			;;
		*)
			echo "Unknown argument: $1" >&2
			usage >&2
			exit 1
			;;
	esac
	shift
done

if [ "$BUILD_FIRST" -eq 1 ]; then
	echo "Building Codex plugin..."
	bash "$SCRIPT_DIR/build-codex-plugin.sh"
fi

if [ ! -f "$SOURCE_PLUGIN_DIR/.codex-plugin/plugin.json" ]; then
	echo "Missing built Codex plugin at $SOURCE_PLUGIN_DIR/.codex-plugin/plugin.json" >&2
	echo "Run: bash scripts/build-codex-plugin.sh" >&2
	exit 1
fi

mkdir -p "$TARGET_PLUGIN_PARENT"
mkdir -p "$(dirname "$MARKETPLACE_PATH")"

case "$MODE" in
	symlink)
		rm -rf "$TARGET_PLUGIN_DIR"
		ln -s "$SOURCE_PLUGIN_DIR" "$TARGET_PLUGIN_DIR"
		echo "Installed Codex plugin via symlink:"
		echo "  $TARGET_PLUGIN_DIR -> $SOURCE_PLUGIN_DIR"
		;;
	copy)
		if command -v rsync >/dev/null 2>&1; then
			mkdir -p "$TARGET_PLUGIN_DIR"
			rsync -a --delete "$SOURCE_PLUGIN_DIR/" "$TARGET_PLUGIN_DIR/"
		else
			rm -rf "$TARGET_PLUGIN_DIR"
			mkdir -p "$TARGET_PLUGIN_DIR"
			cp -R "$SOURCE_PLUGIN_DIR/." "$TARGET_PLUGIN_DIR/"
		fi
		echo "Installed Codex plugin via copy:"
		echo "  $TARGET_PLUGIN_DIR"
		;;
	*)
		echo "Unsupported mode: $MODE" >&2
		exit 1
		;;
esac

MARKETPLACE_PATH="$MARKETPLACE_PATH" node <<'NODE'
const fs = require("node:fs");
const path = require("node:path");

const marketplacePath = process.env.MARKETPLACE_PATH;
if (!marketplacePath) {
	console.error("MARKETPLACE_PATH is not set");
	process.exit(1);
}

const pluginEntry = {
	name: "goodplan",
	source: {
		source: "local",
		path: "./plugins/goodplan",
	},
	policy: {
		installation: "AVAILABLE",
		authentication: "ON_INSTALL",
	},
	category: "Coding",
};

let marketplace;
if (fs.existsSync(marketplacePath)) {
	marketplace = JSON.parse(fs.readFileSync(marketplacePath, "utf8"));
} else {
	marketplace = {
		name: "local-plugins",
		interface: {
			displayName: "Local Plugins",
		},
		plugins: [],
	};
}

if (!Array.isArray(marketplace.plugins)) {
	marketplace.plugins = [];
}
if (!marketplace.interface || typeof marketplace.interface !== "object") {
	marketplace.interface = {};
}

const existingIndex = marketplace.plugins.findIndex((plugin) => plugin && plugin.name === "goodplan");
if (existingIndex >= 0) {
	marketplace.plugins[existingIndex] = {
		...marketplace.plugins[existingIndex],
		...pluginEntry,
		source: pluginEntry.source,
		policy: pluginEntry.policy,
		category: pluginEntry.category,
	};
} else {
	marketplace.plugins.push(pluginEntry);
}

fs.mkdirSync(path.dirname(marketplacePath), { recursive: true });
fs.writeFileSync(marketplacePath, `${JSON.stringify(marketplace, null, 2)}\n`);
NODE

platform_binary_dir() {
	case "$(uname -s)-$(uname -m)" in
		Darwin-arm64) echo "macos-arm64" ;;
		Darwin-x86_64) echo "macos-x64" ;;
		Linux-aarch64) echo "linux-arm64" ;;
		Linux-x86_64) echo "linux-x64" ;;
		*) echo "" ;;
	esac
}

EXPECTED_BINARY_DIR="$(platform_binary_dir)"
if [ -n "$EXPECTED_BINARY_DIR" ] && [ ! -x "$SOURCE_PLUGIN_DIR/binaries/$EXPECTED_BINARY_DIR/gp" ]; then
	echo ""
	echo "WARNING: The plugin is installed, but the current build does not include a runnable binary for this platform:"
	echo "  expected: $SOURCE_PLUGIN_DIR/binaries/$EXPECTED_BINARY_DIR/gp"
	echo "The Codex command wrappers may fail until the build produces that binary."
fi

echo ""
echo "Updated Codex marketplace file:"
echo "  $MARKETPLACE_PATH"
echo ""
echo "Next steps:"
echo "  1. Start a fresh Codex session in any repo."
echo '  2. Use a goodplan skill from the skills UI or in your prompt, e.g. "$goodplan:status" or "$goodplan:init".'
