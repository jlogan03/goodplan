#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

PLUGIN_NAME="gp"
SOURCE_PLUGIN_DIR="$REPO_ROOT/plugins/$PLUGIN_NAME"
TARGET_PLUGIN_PARENT="${GOODPLAN_CODEX_PLUGIN_PARENT:-$HOME/plugins}"
TARGET_PLUGIN_DIR="$TARGET_PLUGIN_PARENT/$PLUGIN_NAME"
MARKETPLACE_PATH="${GOODPLAN_CODEX_MARKETPLACE_PATH:-$HOME/.agents/plugins/marketplace.json}"
CODEX_CONFIG_PATH="${GOODPLAN_CODEX_CONFIG_PATH:-$HOME/.codex/config.toml}"

MODE="symlink"
BUILD_FIRST=0

usage() {
	cat <<'EOF'
Usage: bash scripts/install-codex-plugin-home.sh [--build] [--copy|--symlink]

Installs the built goodplan Codex plugin into the home-local Codex plugin layout:
  ~/plugins/gp
  ~/.agents/plugins/marketplace.json

Options:
  --build     Run the Codex build before installing
  --copy      Copy the built plugin into ~/plugins/gp
  --symlink   Symlink ~/plugins/gp to the repo build output (default)
  --help      Show this help

Environment overrides:
  GOODPLAN_CODEX_PLUGIN_PARENT
  GOODPLAN_CODEX_MARKETPLACE_PATH
  GOODPLAN_CODEX_CONFIG_PATH
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
mkdir -p "$(dirname "$CODEX_CONFIG_PATH")"

case "$MODE" in
	symlink)
		rm -rf "$TARGET_PLUGIN_DIR"
		ln -s "$SOURCE_PLUGIN_DIR" "$TARGET_PLUGIN_DIR"
		echo "Installed Codex plugin via symlink:"
		echo "  $TARGET_PLUGIN_DIR -> $SOURCE_PLUGIN_DIR"
		;;
	copy)
		rm -rf "$TARGET_PLUGIN_DIR"
		if command -v rsync >/dev/null 2>&1; then
			mkdir -p "$TARGET_PLUGIN_DIR"
			rsync -a --delete "$SOURCE_PLUGIN_DIR/" "$TARGET_PLUGIN_DIR/"
		else
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

MARKETPLACE_PATH="$MARKETPLACE_PATH" TARGET_PLUGIN_DIR="$TARGET_PLUGIN_DIR" CODEX_CONFIG_PATH="$CODEX_CONFIG_PATH" node <<'NODE'
const fs = require("node:fs");
const path = require("node:path");

const marketplacePath = process.env.MARKETPLACE_PATH;
const targetPluginDir = process.env.TARGET_PLUGIN_DIR;
const codexConfigPath = process.env.CODEX_CONFIG_PATH;
if (!marketplacePath) {
	console.error("MARKETPLACE_PATH is not set");
	process.exit(1);
}
if (!targetPluginDir) {
	console.error("TARGET_PLUGIN_DIR is not set");
	process.exit(1);
}
if (!codexConfigPath) {
	console.error("CODEX_CONFIG_PATH is not set");
	process.exit(1);
}

function inferMarketplaceRoot(marketplaceFile) {
	const marketplaceDir = path.dirname(marketplaceFile);
	const maybeAgentsDir = path.dirname(marketplaceDir);
	if (path.basename(marketplaceDir) === "plugins" && path.basename(maybeAgentsDir) === ".agents") {
		return path.dirname(maybeAgentsDir);
	}
	return marketplaceDir;
}

const marketplaceRoot = inferMarketplaceRoot(path.resolve(marketplacePath));
let sourcePath = path.relative(marketplaceRoot, path.resolve(targetPluginDir)).split(path.sep).join("/");
if (!sourcePath) {
	sourcePath = ".";
}
if (!sourcePath.startsWith(".")) {
	sourcePath = `./${sourcePath}`;
}

const pluginEntry = {
	name: "gp",
	source: {
		source: "local",
		path: sourcePath,
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

const matchingIndexes = marketplace.plugins
	.map((plugin, index) => (plugin && (plugin.name === "gp" || plugin.name === "goodplan") ? index : -1))
	.filter((index) => index >= 0);
if (matchingIndexes.length > 0) {
	const [primaryIndex, ...duplicateIndexes] = matchingIndexes;
	marketplace.plugins[primaryIndex] = {
		...marketplace.plugins[primaryIndex],
		...pluginEntry,
		source: pluginEntry.source,
		policy: pluginEntry.policy,
		category: pluginEntry.category,
	};
	if (duplicateIndexes.length > 0) {
		marketplace.plugins = marketplace.plugins.filter((_, index) => !duplicateIndexes.includes(index));
	}
} else {
	marketplace.plugins.push(pluginEntry);
}

fs.mkdirSync(path.dirname(marketplacePath), { recursive: true });
fs.writeFileSync(marketplacePath, `${JSON.stringify(marketplace, null, 2)}\n`);

const marketplaceName =
	typeof marketplace.name === "string" && marketplace.name.trim() ? marketplace.name.trim() : "local-plugins";
const pluginSection = `plugins."gp@${marketplaceName}"`;
const legacyPluginSection = `plugins."goodplan@${marketplaceName}"`;
const configPath = path.resolve(codexConfigPath);
let configText = fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf8") : "";

function stripSection(text, sectionName) {
	const lines = text.split("\n");
	const kept = [];
	let skipping = false;
	for (const line of lines) {
		const sectionMatch = line.match(/^\[([^\]]+)\]\s*$/);
		if (sectionMatch) {
			skipping = sectionMatch[1] === sectionName;
			if (skipping) continue;
		}
		if (!skipping) {
			kept.push(line);
		}
	}
	while (kept.length > 0 && kept[kept.length - 1] === "") {
		kept.pop();
	}
	return kept.join("\n");
}

configText = stripSection(configText, pluginSection);
configText = stripSection(configText, legacyPluginSection);
const pluginBlock = [`[${pluginSection}]`, "enabled = true"].join("\n");
configText = configText ? `${configText}\n\n${pluginBlock}\n` : `${pluginBlock}\n`;

fs.mkdirSync(path.dirname(configPath), { recursive: true });
fs.writeFileSync(configPath, configText);
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
	echo "The Codex goodplan skills may fail until the build produces that binary."
fi

echo ""
echo "Updated Codex marketplace file:"
echo "  $MARKETPLACE_PATH"
echo "Updated Codex config file:"
echo "  $CODEX_CONFIG_PATH"
echo ""
echo "Next steps:"
echo "  1. Start a fresh Codex session in any repo."
echo '  2. Use a goodplan skill from the skills UI or in your prompt, e.g. "$gp:status" or "$gp:init".'
