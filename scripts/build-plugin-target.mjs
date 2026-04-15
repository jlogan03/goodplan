#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
	chmodSync,
	cpSync,
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = dirname(__dirname);
const target = process.argv[2];

if (!["claude", "codex"].includes(target)) {
	console.error("Usage: node scripts/build-plugin-target.mjs <claude|codex>");
	process.exit(1);
}

const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
const version = pkg.version;
const repositoryUrl =
	typeof pkg.repository === "string" ? pkg.repository : pkg.repository?.url ?? pkg.homepage;
const codexPluginName = "gp";
const codexPluginDisplayName = "goodplan";
const codexLegacyPluginName = "goodplan";
const codexPluginRoot = join(repoRoot, "plugins", codexPluginName);
const codexLegacyPluginRoot = join(repoRoot, "plugins", codexLegacyPluginName);
const codexMarketplaceSourcePath = `./plugins/${codexPluginName}`;
const pluginRoot = target === "claude" ? join(repoRoot, "dist", "gp-plugin") : codexPluginRoot;
const supportedBuildPlatforms = {
	"macos-arm64": {
		host: "darwin-arm64",
		bunTarget: "bun-darwin-arm64",
	},
	"macos-x64": {
		host: "darwin-x64",
		bunTarget: "bun-darwin-x64",
	},
	"linux-arm64": {
		host: "linux-arm64",
		bunTarget: "bun-linux-arm64",
	},
	"linux-x64": {
		host: "linux-x64",
		bunTarget: "bun-linux-x64",
	},
};
const deletedSkills = [
	"create-architecture",
	"refine-architecture",
	"create-plan",
	"refine-plan",
	"create-slices",
	"refine-slices",
	"implement-plan",
	"complete",
	"audit-architecture",
	"audit-docs",
	"audit-tests",
	"capture",
	"onboard-repo",
	"migrate",
	"project-status",
];
const expectedSkillCount = 13;
const expectedCodexCommands = [
	"audit.md",
	"complete-epic.md",
	"create-epic.md",
	"create-side-quest.md",
	"explore.md",
	"implement.md",
	"init.md",
	"plan-slice.md",
	"start-epic.md",
	"status.md",
	"task.md",
	"upgrade.md",
];
let buildPlatforms;
try {
	buildPlatforms = resolveBuildPlatforms();
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
}

function run(command, args, options = {}) {
	const result = spawnSync(command, args, {
		cwd: repoRoot,
		stdio: "inherit",
		...options,
	});
	if (result.error) {
		console.error(`FAIL: unable to run ${command}: ${result.error.message}`);
		process.exit(1);
	}
	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

function ensureDir(path) {
	mkdirSync(path, { recursive: true });
}

function copyDir(src, dest) {
	cpSync(src, dest, { recursive: true });
}

function copyFile(src, dest) {
	ensureDir(dirname(dest));
	cpSync(src, dest);
}

function recursiveFiles(root) {
	if (!existsSync(root)) return [];
	const results = [];
	for (const entry of readdirSync(root, { withFileTypes: true })) {
		const fullPath = join(root, entry.name);
		if (entry.isDirectory()) {
			results.push(...recursiveFiles(fullPath));
		} else if (entry.isFile()) {
			results.push(fullPath);
		}
	}
	return results;
}

function markdownFiles(...roots) {
	return roots.flatMap((root) => recursiveFiles(root).filter((file) => file.endsWith(".md")));
}

function normalizePath(path) {
	return path.split(sep).join("/");
}

function ensureRelativeMarkdownPath(fromFile, targetFile) {
	let rel = normalizePath(relative(dirname(fromFile), targetFile));
	if (!rel.startsWith(".")) {
		rel = `./${rel}`;
	}
	return rel;
}

function stripFrontmatter(text) {
	if (!text.startsWith("---\n")) return text;
	const end = text.indexOf("\n---\n", 4);
	if (end === -1) return text;
	return text.slice(end + 5);
}

function loadText(path) {
	return readFileSync(path, "utf8");
}

function saveText(path, text) {
	writeFileSync(path, text);
}

function stripYamlQuotes(value) {
	if (
		(value.startsWith('"') && value.endsWith('"')) ||
		(value.startsWith("'") && value.endsWith("'"))
	) {
		return value.slice(1, -1);
	}
	return value;
}

function normalizeFrontmatterScalar({ key, value }) {
	const trimmed = value.trim();
	if (
		trimmed === "" ||
		trimmed === ">" ||
		trimmed === "|"
	) {
		return trimmed;
	}
	if (["true", "false"].includes(trimmed) && key === "user-invocable") {
		return trimmed;
	}
	if (
		(trimmed.startsWith('"') && trimmed.endsWith('"')) ||
		(trimmed.startsWith("'") && trimmed.endsWith("'"))
	) {
		return trimmed;
	}
	if (
		(trimmed.startsWith("[") && trimmed.endsWith("]")) ||
		(trimmed.startsWith("{") && trimmed.endsWith("}"))
	) {
		return trimmed;
	}
	return JSON.stringify(trimmed);
}

function normalizeMarkdownFrontmatter(path) {
	const text = loadText(path);
	const match = text.match(/^---\n([\s\S]*?)\n---(\n?)/);
	if (!match) return;
	const [, frontmatter, trailingNewline] = match;
	const normalizedFrontmatter = frontmatter
		.split("\n")
		.map((line) => {
			const fieldMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
			if (!fieldMatch) return line;
			const [, key, value] = fieldMatch;
			return `${key}: ${normalizeFrontmatterScalar({ key, value })}`;
		})
		.join("\n");
	const body = text.slice(match[0].length);
	saveText(path, `---\n${normalizedFrontmatter}\n---${trailingNewline}${body}`);
}

function normalizePackagedFrontmatter(...roots) {
	for (const file of markdownFiles(...roots)) {
		normalizeMarkdownFrontmatter(file);
	}
}

function supportedPlatformList() {
	return Object.keys(supportedBuildPlatforms).join(", ");
}

function hostPlatformKey() {
	return `${process.platform}-${process.arch}`;
}

function normalizeRequestedPlatforms(requestedValue, envName) {
	const requestedPlatforms = requestedValue
		.split(",")
		.map((value) => value.trim())
		.filter(Boolean);
	if (requestedPlatforms.length === 0) {
		throw new Error(`FAIL: ${envName} is set but empty. Expected one or more of: ${supportedPlatformList()}`);
	}
	const seen = new Set();
	return requestedPlatforms.flatMap((requestedPlatform) => {
		const requestedConfig = supportedBuildPlatforms[requestedPlatform];
		if (!requestedConfig) {
			throw new Error(
				`FAIL: unsupported ${envName} entry ${requestedPlatform}. Expected one of: ${supportedPlatformList()}`,
			);
		}
		if (seen.has(requestedPlatform)) {
			return [];
		}
		seen.add(requestedPlatform);
		return [
			{
				binaryDir: requestedPlatform,
				...requestedConfig,
			},
		];
	});
}

function resolveBuildPlatforms() {
	const requestedPlatforms = process.env.GOODPLAN_BINARY_PLATFORMS?.trim();
	const requestedPlatform = process.env.GOODPLAN_BINARY_PLATFORM?.trim();
	if (requestedPlatforms && requestedPlatform) {
		throw new Error("FAIL: set only one of GOODPLAN_BINARY_PLATFORM or GOODPLAN_BINARY_PLATFORMS");
	}
	if (requestedPlatforms) {
		return normalizeRequestedPlatforms(requestedPlatforms, "GOODPLAN_BINARY_PLATFORMS").map((platform) => ({
			...platform,
			source: `GOODPLAN_BINARY_PLATFORMS=${requestedPlatforms}`,
		}));
	}
	if (requestedPlatform) {
		return normalizeRequestedPlatforms(requestedPlatform, "GOODPLAN_BINARY_PLATFORM").map((platform) => ({
			...platform,
			source: `GOODPLAN_BINARY_PLATFORM=${requestedPlatform}`,
		}));
	}

	const nativeHost = hostPlatformKey();
	for (const [binaryDir, config] of Object.entries(supportedBuildPlatforms)) {
		if (config.host === nativeHost) {
			return [
				{
					binaryDir,
					...config,
					source: `native host ${nativeHost}`,
				},
			];
		}
	}

	throw new Error(
		`FAIL: unsupported native platform ${nativeHost}. Set GOODPLAN_BINARY_PLATFORM or GOODPLAN_BINARY_PLATFORMS to one of: ${supportedPlatformList()}`,
	);
}

function compiledBinaryPath(buildPlatform) {
	return join(pluginRoot, "binaries", buildPlatform.binaryDir, "gp");
}

function compiledBinaryPaths() {
	return buildPlatforms.map((buildPlatform) => compiledBinaryPath(buildPlatform));
}

function writePlaceholderBinary(buildPlatform) {
	const placeholder = compiledBinaryPath(buildPlatform);
	saveText(
		placeholder,
		[
			"#!/usr/bin/env bash",
			"echo 'goodplan placeholder binary: rebuild with bun available to produce a runnable plugin.' >&2",
			"exit 1",
			"",
		].join("\n"),
	);
	chmodSync(placeholder, 0o755);
	console.log(`  GOODPLAN_SKIP_COMPILE=1 set: wrote placeholder gp binary for ${buildPlatform.binaryDir}`);
}

function compileBinaries() {
	console.log(`Building ${target} plugin v${version}...`);
	console.log(
		`  binary targets: ${buildPlatforms.map((buildPlatform) => buildPlatform.binaryDir).join(", ")}`,
	);
	if (process.env.GOODPLAN_SKIP_COMPILE === "1") {
		for (const buildPlatform of buildPlatforms) {
			ensureDir(join(pluginRoot, "binaries", buildPlatform.binaryDir));
			writePlaceholderBinary(buildPlatform);
		}
		return;
	}
	for (const buildPlatform of buildPlatforms) {
		console.log(`  compiling ${buildPlatform.binaryDir} (${buildPlatform.bunTarget}; ${buildPlatform.source})`);
		ensureDir(join(pluginRoot, "binaries", buildPlatform.binaryDir));
		run("bun", [
			"build",
			"--compile",
			"src/index.ts",
			"--outfile",
			compiledBinaryPath(buildPlatform),
			`--target=${buildPlatform.bunTarget}`,
			"--define",
			`__GOODPLAN_VERSION__="${version}"`,
			"--define",
			`__GP_HMAC_KEY__="${process.env.GP_HMAC_KEY ?? "goodplan-dev-hmac-key"}"`,
		]);
	}
}

function validateCompiledBinaries() {
	for (const binaryPath of compiledBinaryPaths()) {
		statSync(binaryPath);
	}
}

function copySharedAssets() {
	ensureDir(pluginRoot);
	copyDir(join(repoRoot, "plugin", "skills"), join(pluginRoot, "skills"));
	copyDir(join(repoRoot, "plugin", "agents"), join(pluginRoot, "agents"));
	if (target === "claude") {
		copyDir(join(repoRoot, "plugin", "hooks"), join(pluginRoot, "hooks"));
	}
	copyFile(join(repoRoot, "plugin", "bin", "gp"), join(pluginRoot, "bin", "gp"));
	chmodSync(join(pluginRoot, "bin", "gp"), 0o755);
	if (target === "claude") {
		for (const hookScript of recursiveFiles(join(pluginRoot, "hooks")).filter((file) => file.endsWith(".sh"))) {
			chmodSync(hookScript, 0o755);
		}
	}
}

function writeClaudeManifest() {
	ensureDir(join(pluginRoot, ".claude-plugin"));
	const manifest = {
		name: "goodplan",
		version,
		description: "goodplan workflow CLI — manages epics, slices, architecture, and project state",
		author: {
			name: "Ian White",
			url: "https://github.com/ian97531",
		},
		skills: "./skills",
	};
	saveText(join(pluginRoot, ".claude-plugin", "plugin.json"), `${JSON.stringify(manifest, null, 2)}\n`);
}

function writeCodexManifest() {
	ensureDir(join(pluginRoot, ".codex-plugin"));
	const manifest = {
		name: codexPluginName,
		version,
		description: "Structured development workflow for long-lived coding projects",
		author: {
			name: "Ian White",
			url: "https://github.com/ian97531",
		},
		homepage: pkg.homepage,
		repository: repositoryUrl,
		license: pkg.license,
		keywords: ["goodplan", "workflow", "planning", "epics", "coding"],
		skills: "./skills/",
		interface: {
			displayName: codexPluginDisplayName,
			shortDescription: "Plan, track, and execute long-running coding work",
			longDescription:
				"Use goodplan in Codex to manage project state, architecture, epics, slices, quests, and implementation workflows across sessions.",
			developerName: "Ian White",
			category: "Coding",
			capabilities: ["Interactive", "Read", "Write"],
			websiteURL: pkg.homepage,
			defaultPrompt: [
				"Initialize goodplan in this repo and show me what to do next",
				"Create an epic and plan the first slice",
				"Audit this project against its intended architecture",
			],
			brandColor: "#22543D",
		},
	};
	saveText(join(pluginRoot, ".codex-plugin", "plugin.json"), `${JSON.stringify(manifest, null, 2)}\n`);
}

function prefixClaudeSkillNames() {
	console.log("\nApplying gp: namespace prefix to skills...");
	for (const entry of readdirSync(join(pluginRoot, "skills"), { withFileTypes: true })) {
		if (!entry.isDirectory() || entry.name.startsWith("_")) continue;
		const skillFile = join(pluginRoot, "skills", entry.name, "SKILL.md");
		if (!existsSync(skillFile)) continue;
		const original = loadText(skillFile);
		const updated = original.replace(/^name:\s+(.+)$/m, (_, currentName) => {
			return currentName.startsWith("gp:") ? `name: ${currentName}` : `name: gp:${currentName}`;
		});
		saveText(skillFile, updated);
	}
	console.log("  namespace prefixing: done");
}

function writeCodexCommands() {
	copyDir(join(repoRoot, "plugin", "codex", "commands"), join(pluginRoot, "commands"));
}

function rewriteCodexCliExamples(text) {
	return text
		.replace(/\bgp \.\.\./g, "$GP ...")
		.replace(/\bgp </g, "$GP <")
		.replace(/\bgp (?=(?:--[a-z][a-z-]*|[a-z][a-z-]*(?::[a-z][a-z-]*)?))/g, "$GP ");
}

function rewriteCodexSpecificFiles() {
	const codexCliSearchSnippet = [
		'version_gt() {',
		"  awk -v a=\"$1\" -v b=\"$2\" 'BEGIN {",
		'    na = split(a, aa, ".");',
		'    nb = split(b, bb, ".");',
		'    n = (na > nb ? na : nb);',
		'    for (i = 1; i <= n; i++) {',
		'      va = (i in aa ? aa[i] + 0 : 0);',
		'      vb = (i in bb ? bb[i] + 0 : 0);',
		'      if (va > vb) exit 0;',
		'      if (va < vb) exit 1;',
		"    }",
		"    exit 1;",
		"  }'",
		"}",
		'candidate_works() {',
		'  [ -n "$1" ] && [ -x "$1" ] && "$1" --version --json >/dev/null 2>&1',
		"}",
		'GP=""',
		'if candidate_works "./plugins/gp/bin/gp"; then',
		'  GP="./plugins/gp/bin/gp"',
		"fi",
		'if [ -z "$GP" ] && candidate_works "$HOME/plugins/gp/bin/gp"; then',
		'  GP="$HOME/plugins/gp/bin/gp"',
		"fi",
		'if [ -z "$GP" ] && [ -d "$HOME/.codex/plugins/cache" ]; then',
		'  BEST_GP=""',
		'  BEST_VERSION=""',
		'  while IFS= read -r candidate; do',
		'    candidate_works "$candidate" || continue',
		'    version=$(printf "%s\\n" "$candidate" | sed -n "s|.*/gp/\\([0-9][0-9.]*\\)/bin/gp$|\\1|p")',
		'    [ -n "$version" ] || continue',
		'    if [ -z "$BEST_VERSION" ] || version_gt "$version" "$BEST_VERSION"; then',
		'      BEST_GP="$candidate"',
		'      BEST_VERSION="$version"',
		"    fi",
		'  done <<EOF',
		'$(find "$HOME/.codex/plugins/cache" -path "*/gp/*/bin/gp" -type f -perm -111 2>/dev/null)',
		"EOF",
		'  GP="$BEST_GP"',
		"fi",
		'if [ -z "$GP" ]; then',
		'  PATH_GP="$(command -v gp || true)"',
		'  if candidate_works "$PATH_GP"; then',
		'    GP="$PATH_GP"',
		"  fi",
		"fi",
	].join("\n");
	const codexCliResolutionBlock = [
		"Resolve the bundled CLI and store it as `$GP`.",
		"",
		"In Codex, do not assume `gp` is on PATH. Use this detection snippet:",
		"",
		"```bash",
		codexCliSearchSnippet,
		'if [ -z "$GP" ]; then',
		'  echo "gp: command not found" >&2',
		"  exit 127",
		"fi",
		'"$GP" --version --json',
		"```",
		"",
		"If the binary is not found or version < 1.0.0, stop with the appropriate message per cli-interaction.md.",
	].join("\n");

	const expertisePath = join(pluginRoot, "skills", "_references", "expertise-tracking.md");
	saveText(
		expertisePath,
		[
			"# Expertise Tracking",
			"",
			"Codex builds currently do not persist plugin-level expertise data for goodplan.",
			"",
			"## Current behavior",
			"",
			"- Skip expertise tracking silently.",
			"- Do not read or write a plugin-managed expertise file.",
			"- Omit expertise summaries from status output.",
			"- Continue the rest of the workflow unchanged.",
			"",
			"## Interactive skills",
			"",
			"Whenever a Claude-oriented workflow would normally create or update expertise data, treat that step as a no-op in Codex and continue.",
			"",
		].join("\n"),
	);

	const statusPath = join(pluginRoot, "skills", "status", "SKILL.md");
	let status = loadText(statusPath);
	status = status.replace(
		/## Step 7b — Load Expertise Summary[\s\S]*?## Step 8 — Present Status Summary/,
		[
			"## Step 7b — Load Expertise Summary",
			"",
			"Codex builds currently do not persist plugin-level expertise data. Skip expertise loading and omit the **Expertise** line in the status report.",
			"",
			"## Step 8 — Present Status Summary",
		].join("\n"),
	);
	status = status.replaceAll(
		"Omit the **Expertise** line if `${CLAUDE_PLUGIN_DATA}/expertise.md` does not exist or the plugin data guard fails.",
		"Omit the **Expertise** line.",
	);
	status = status.replaceAll(
		"Omit **Expertise** if `${CLAUDE_PLUGIN_DATA}/expertise.md` does not exist or the plugin data guard fails.",
		"Omit **Expertise**.",
	);
	status = status.replace(/\n\*\*Expertise\*\*:.*\n(?:\n)?/g, "\n");
	saveText(statusPath, status);

	const explorePath = join(pluginRoot, "skills", "explore", "SKILL.md");
	let explore = loadText(explorePath);
	explore = explore.replace(
		"- **If yes**: Follow the recording protocol from expertise-tracking.md (auto-included above), including the plugin data guard. Update `${CLAUDE_PLUGIN_DATA}/expertise.md` following the guard and format described there.",
		"- **If yes**: Expertise persistence is currently disabled in Codex builds, so skip this step silently.",
	);
	saveText(explorePath, explore);

	const cliInteractionPath = join(pluginRoot, "skills", "_references", "cli-interaction.md");
	let cliInteraction = loadText(cliInteractionPath);
	cliInteraction = cliInteraction.replace(
		/The `gp` binary is bundled with the goodplan plugin\.[\s\S]*?Skills conventionally store the binary name as `\$GP` in their Step 0 — shared references use bare `gp` since they don't define the variable\./,
		[
			"The `gp` binary is bundled with the goodplan plugin, but Codex does not currently add the plugin's `bin/` directory to PATH.",
			"",
			"At the start of any skill that uses the CLI, resolve the executable and store it as `$GP`, then verify it is available and compatible:",
			"",
			"```bash",
			codexCliSearchSnippet,
			'if [ -z "$GP" ]; then',
			'  echo "gp: command not found" >&2',
			"  exit 127",
			"fi",
			'"$GP" --version --json',
			"# Returns: { \"version\": \"1.0.0\" }",
			"```",
			"",
			"Use `$GP` for all subsequent invocations within that skill.",
		].join("\n"),
	);
	cliInteraction = cliInteraction.replace(
		"> The `gp` CLI binary was not found at the expected plugin location. Ensure the goodplan plugin is installed and enabled. Run `/plugin` to check plugin status.",
		"> The `gp` CLI binary was not found in PATH or the Codex plugin cache. Rebuild or reinstall the goodplan plugin, restart Codex, and try again.",
	);
	saveText(cliInteractionPath, cliInteraction);

	const workflowGuidePath = join(pluginRoot, "skills", "workflow-guide", "SKILL.md");
	let workflowGuide = loadText(workflowGuidePath);
	workflowGuide = workflowGuide.replace(
		"The `gp` binary is on PATH (added by the plugin's `bin/` directory). All skill invocations use `gp` directly.",
		"In Codex, do not assume `gp` is on PATH. Resolve the bundled CLI first, store it as `$GP`, and use `$GP` for skill invocations.",
	);
	workflowGuide = workflowGuide.replace(
		[
			"```bash",
			"gp status --json              # project state, active entities",
			"gp --help                     # discover available commands",
			"gp schema --json              # full command tree with schemas",
			"```",
		].join("\n"),
		[
			"```bash",
			codexCliSearchSnippet,
			'if [ -z "$GP" ]; then',
			'  echo "gp: command not found" >&2',
			"  exit 127",
			"fi",
			'"$GP" status --json           # project state, active entities',
			'"$GP" --help                  # discover available commands',
			'"$GP" schema --json           # full command tree with schemas',
			"```",
		].join("\n"),
	);
	saveText(workflowGuidePath, workflowGuide);

	for (const skillDir of readdirSync(join(pluginRoot, "skills"), { withFileTypes: true })) {
		if (!skillDir.isDirectory() || skillDir.name.startsWith("_")) continue;
		const skillPath = join(pluginRoot, "skills", skillDir.name, "SKILL.md");
		if (!existsSync(skillPath)) continue;
		let skill = loadText(skillPath);
		skill = skill.replace(
			"Verify CLI availability: run `gp --version --json`. If not found or version < 1.0.0, stop with the appropriate message per cli-interaction.md. Store as `$GP`.",
			codexCliResolutionBlock,
		);
		skill = skill.replace(
			"Verify CLI availability: run `gp --version --json`. If not found or version < 1.0.0, stop with the appropriate message per cli-interaction.md.",
			codexCliResolutionBlock,
		);
		saveText(skillPath, skill);
	}

	const reviewerPath = join(pluginRoot, "agents", "_references", "review-agent-skill.md");
	let reviewer = loadText(reviewerPath);
	reviewer = reviewer.replace(
		"   Consider: references must use `@${CLAUDE_PLUGIN_ROOT}/path` format (not bare paths or `@./` relative paths). Referenced files must exist at the specified path. Do NOT use `skills:` frontmatter for plugin-to-plugin injection (issue #25834). Each `@` reference file should start with a self-identifying header for spot-checking in logs.",
		"   Consider: references must use plugin-local `@...` paths that resolve inside the packaged plugin. Referenced files must exist at the specified path. Do NOT use `skills:` frontmatter for plugin-to-plugin injection (issue #25834). Each `@` reference file should start with a self-identifying header for spot-checking in logs.",
	);
	saveText(reviewerPath, reviewer);
}

function rewriteCodexMarkdown() {
	const skillsRoot = join(pluginRoot, "skills");
	const files = markdownFiles(
		skillsRoot,
		join(pluginRoot, "agents"),
		join(pluginRoot, "commands"),
	);
	for (const file of files) {
		let text = loadText(file);
		text = text.replaceAll("$goodplan:", "$gp:");
		text = text.replaceAll("/gp:", "$gp:");
		if (file.startsWith(`${skillsRoot}${sep}`)) {
			text = rewriteCodexCliExamples(text);
		}
		text = text.replace(/@\$\{CLAUDE_PLUGIN_ROOT\}\/([^ )`>\n]+)/g, (_, pluginRelativePath) => {
			const targetFile = join(pluginRoot, pluginRelativePath);
			return `@${ensureRelativeMarkdownPath(file, targetFile)}`;
		});
		saveText(file, text);
	}
}

function extractFrontmatter(path) {
	const text = loadText(path);
	const match = text.match(/^---\n([\s\S]*?)\n---\n/);
	return match?.[1] ?? "";
}

function validateSkillPackaging({ prefixedNames }) {
	console.log("\nVerifying skills...");
	const skillsRoot = join(pluginRoot, "skills");
	const skillReference = join(skillsRoot, "_references", "cli-interaction.md");
	if (!existsSync(skillReference)) {
		throw new Error("FAIL: skills/_references/cli-interaction.md missing");
	}
	console.log("  skills/_references/cli-interaction.md: present");

	let skillCount = 0;
	for (const entry of readdirSync(skillsRoot, { withFileTypes: true })) {
		if (!entry.isDirectory() || entry.name.startsWith("_")) continue;
		const skillFile = join(skillsRoot, entry.name, "SKILL.md");
		if (!existsSync(skillFile)) {
			throw new Error(`FAIL: ${normalizePath(relative(pluginRoot, skillFile))} missing`);
		}
		const frontmatter = extractFrontmatter(skillFile);
		if (!frontmatter) {
			throw new Error(`FAIL: ${normalizePath(relative(pluginRoot, skillFile))} has no valid YAML frontmatter`);
		}
		const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
		const nameValue = stripYamlQuotes(nameMatch?.[1]?.trim() ?? "");
		if (!nameValue) {
			throw new Error(`FAIL: ${normalizePath(relative(pluginRoot, skillFile))} missing name field`);
		}
		if (prefixedNames && !nameValue.startsWith("gp:")) {
			throw new Error(`FAIL: ${normalizePath(relative(pluginRoot, skillFile))} has incorrect name field`);
		}
		if (!frontmatter.includes("description:")) {
			throw new Error(`FAIL: ${normalizePath(relative(pluginRoot, skillFile))} missing description field`);
		}
		skillCount += 1;
	}
	console.log("  frontmatter validation: all skills pass");

	const staleCliPattern =
		/goodplan (init|status|epic:|slice:|quest:|learning:|decision:|task:|schema|version|subagent:)/;
	for (const file of markdownFiles(skillsRoot)) {
		if (staleCliPattern.test(loadText(file))) {
			throw new Error(`FAIL: found old 'goodplan' CLI invocation in ${normalizePath(relative(pluginRoot, file))}`);
		}
	}
	console.log("  old CLI name check: clean");

	const dsStores = recursiveFiles(skillsRoot).filter((file) => basename(file) === ".DS_Store");
	if (dsStores.length > 0) {
		throw new Error(`FAIL: found ${dsStores.length} .DS_Store files in skills`);
	}
	console.log("  .DS_Store check: clean");

	if (skillCount !== expectedSkillCount) {
		throw new Error(`FAIL: expected ${expectedSkillCount} skills, got ${skillCount}`);
	}
	for (const deletedSkill of deletedSkills) {
		if (existsSync(join(skillsRoot, deletedSkill))) {
			throw new Error(`FAIL: deleted skill '${deletedSkill}' still exists`);
		}
	}
	console.log("  deleted skill guard: clean");
	console.log(`  Packaged ${skillCount} skills`);
}

function validateAgents() {
	console.log("\nVerifying agents...");
	const agentsRoot = join(pluginRoot, "agents");
	const agentReference = join(agentsRoot, "_references", "review-preamble.md");
	if (!existsSync(agentReference)) {
		throw new Error("FAIL: agents/_references/review-preamble.md missing");
	}
	console.log("  agents/_references/review-preamble.md: present");

	let count = 0;
	for (const file of readdirSync(agentsRoot)) {
		const fullPath = join(agentsRoot, file);
		if (!file.endsWith(".md") || !statSync(fullPath).isFile()) continue;
		const frontmatter = extractFrontmatter(fullPath);
		if (!frontmatter.includes("name:") || !frontmatter.includes("description:")) {
			throw new Error(`FAIL: agents/${file} missing required frontmatter`);
		}
		count += 1;
	}
	if (count > 0) {
		console.log("  frontmatter validation: all agents pass");
	}
	console.log(`  Packaged ${count} agents`);
}

function validateCodexCommands() {
	const commandsRoot = join(pluginRoot, "commands");
	console.log("\nVerifying Codex commands...");
	for (const commandFile of expectedCodexCommands) {
		if (!existsSync(join(commandsRoot, commandFile))) {
			throw new Error(`FAIL: commands/${commandFile} missing`);
		}
	}
	console.log(`  Packaged ${expectedCodexCommands.length} commands`);
}

function validateMarkdownReferences() {
	console.log("\nValidating @ references across packaged markdown...");
	const mdRoots = [join(pluginRoot, "skills"), join(pluginRoot, "agents")];
	if (target === "codex") {
		mdRoots.push(join(pluginRoot, "commands"));
	}
	const files = markdownFiles(...mdRoots);
	const refPattern =
		target === "claude"
			? /(?<!`)@\$\{CLAUDE_PLUGIN_ROOT\}\/([^ )`>\n]+)/g
			: /(?<!`)@((?:\.\.?\/)[^ )`>\n]+)/g;
	let refCount = 0;
	for (const file of files) {
		const body = stripFrontmatter(loadText(file));
		const matches = [...body.matchAll(refPattern)];
		for (const match of matches) {
			const resolved =
				target === "claude"
					? join(pluginRoot, match[1])
					: resolve(dirname(file), match[1]);
			if (!existsSync(resolved)) {
				throw new Error(
					`FAIL: ${normalizePath(relative(pluginRoot, file))} references @${match[1]} but it does not exist`,
				);
			}
			refCount += 1;
		}
	}
	console.log(`  @ reference validation: ${refCount} references resolve`);
}

function validateClaudeArtifacts() {
	console.log("\nValidating Claude plugin artifacts...");
	JSON.parse(loadText(join(pluginRoot, ".claude-plugin", "plugin.json")));
	JSON.parse(loadText(join(pluginRoot, "hooks", "hooks.json")));
	statSync(join(pluginRoot, "hooks", "protect-state.sh"));
	statSync(join(pluginRoot, "hooks", "warn-bash-state.sh"));
	validateCompiledBinaries();
	statSync(join(pluginRoot, "bin", "gp"));
	console.log("  plugin.json: valid JSON");
	console.log("  hooks.json: valid JSON");
	console.log("  hook scripts: present");
	console.log(`  binaries: present (${buildPlatforms.map((buildPlatform) => buildPlatform.binaryDir).join(", ")})`);
	console.log("  bin/gp launcher: present");
}

function validateCodexArtifacts() {
	console.log("\nValidating Codex plugin artifacts...");
	const manifest = JSON.parse(loadText(join(pluginRoot, ".codex-plugin", "plugin.json")));
	validateCompiledBinaries();
	if (manifest.name !== codexPluginName) {
		throw new Error(`FAIL: Codex plugin manifest name must be ${codexPluginName}`);
	}
	if (manifest.interface?.displayName !== codexPluginDisplayName) {
		throw new Error(`FAIL: Codex plugin displayName must be ${codexPluginDisplayName}`);
	}
	const marketplace = JSON.parse(loadText(join(repoRoot, ".agents", "plugins", "marketplace.json")));
	const codexEntry = marketplace.plugins.find((entry) => entry.name === codexPluginName);
	if (!codexEntry || codexEntry.source?.path !== codexMarketplaceSourcePath) {
		throw new Error(
			`FAIL: .agents/plugins/marketplace.json does not point ${codexPluginName} at ${codexMarketplaceSourcePath}`,
		);
	}
	if (marketplace.plugins.some((entry) => entry.name === codexLegacyPluginName)) {
		throw new Error(`FAIL: .agents/plugins/marketplace.json still contains legacy ${codexLegacyPluginName} entry`);
	}
	const leftovers = recursiveFiles(pluginRoot).filter((file) => {
		const textExtensions = [".json", ".md", ".sh"];
		return textExtensions.some((ext) => file.endsWith(ext));
	});
	for (const file of leftovers) {
		const text = loadText(file);
		if (text.includes("CLAUDE_PLUGIN_ROOT")) {
			throw new Error(`FAIL: leftover CLAUDE_PLUGIN_ROOT in ${normalizePath(relative(repoRoot, file))}`);
		}
		if (text.includes("CLAUDE_PLUGIN_DATA")) {
			throw new Error(`FAIL: leftover CLAUDE_PLUGIN_DATA in ${normalizePath(relative(repoRoot, file))}`);
		}
	}
	const bareGpSkillPattern = /\bgp (?=(?:--[a-z][a-z-]*|[a-z][a-z-]*(?::[a-z][a-z-]*)?))/;
	for (const file of markdownFiles(join(pluginRoot, "skills"))) {
		const text = loadText(file);
		if (bareGpSkillPattern.test(text) || text.includes("gp ...") || text.includes("gp <")) {
			throw new Error(`FAIL: found bare gp command example in ${normalizePath(relative(pluginRoot, file))}`);
		}
	}
	const statusSkill = loadText(join(pluginRoot, "skills", "status", "SKILL.md"));
	if (statusSkill.includes("**Expertise**:")) {
		throw new Error("FAIL: Codex status skill still contains Expertise output templates");
	}
	console.log("  plugin.json: valid JSON");
	console.log(`  binaries: present (${buildPlatforms.map((buildPlatform) => buildPlatform.binaryDir).join(", ")})`);
	console.log(`  marketplace.json: points to ${codexMarketplaceSourcePath}`);
	console.log("  Claude-only placeholders: clean");
}

function printSummary() {
	console.log(`\nPlugin assembled at ${pluginRoot}/\n`);
	for (const file of recursiveFiles(pluginRoot).sort()) {
		console.log(`  ${normalizePath(relative(pluginRoot, file))}`);
	}
}

rmSync(pluginRoot, { recursive: true, force: true });
if (target === "codex" && codexLegacyPluginRoot !== pluginRoot) {
	rmSync(codexLegacyPluginRoot, { recursive: true, force: true });
}
copySharedAssets();
compileBinaries();

if (target === "claude") {
	writeClaudeManifest();
	prefixClaudeSkillNames();
	normalizePackagedFrontmatter(join(pluginRoot, "skills"), join(pluginRoot, "agents"));
	validateSkillPackaging({ prefixedNames: true });
	validateAgents();
	validateMarkdownReferences();
	validateClaudeArtifacts();
	} else {
		rmSync(join(pluginRoot, "hooks"), { recursive: true, force: true });
		writeCodexManifest();
		writeCodexCommands();
		rewriteCodexSpecificFiles();
		rewriteCodexMarkdown();
	normalizePackagedFrontmatter(join(pluginRoot, "skills"), join(pluginRoot, "agents"), join(pluginRoot, "commands"));
	validateSkillPackaging({ prefixedNames: false });
	validateAgents();
	validateCodexCommands();
	validateMarkdownReferences();
	validateCodexArtifacts();
}

printSummary();
