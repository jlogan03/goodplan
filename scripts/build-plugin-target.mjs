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
const pluginRoot = target === "claude" ? join(repoRoot, "dist", "gp-plugin") : join(repoRoot, "plugins", "goodplan");
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
	"gp-audit.md",
	"gp-complete-epic.md",
	"gp-create-epic.md",
	"gp-create-side-quest.md",
	"gp-explore.md",
	"gp-implement.md",
	"gp-init.md",
	"gp-plan-slice.md",
	"gp-start-epic.md",
	"gp-status.md",
	"gp-task.md",
	"gp-upgrade.md",
];
let buildPlatform;
try {
	buildPlatform = resolveBuildPlatform();
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

function supportedPlatformList() {
	return Object.keys(supportedBuildPlatforms).join(", ");
}

function hostPlatformKey() {
	return `${process.platform}-${process.arch}`;
}

function resolveBuildPlatform() {
	const requestedPlatform = process.env.GOODPLAN_BINARY_PLATFORM?.trim();
	if (requestedPlatform) {
		const requestedConfig = supportedBuildPlatforms[requestedPlatform];
		if (!requestedConfig) {
			throw new Error(
				`FAIL: unsupported GOODPLAN_BINARY_PLATFORM=${requestedPlatform}. Expected one of: ${supportedPlatformList()}`,
			);
		}
		return {
			binaryDir: requestedPlatform,
			...requestedConfig,
			source: `GOODPLAN_BINARY_PLATFORM=${requestedPlatform}`,
		};
	}

	const nativeHost = hostPlatformKey();
	for (const [binaryDir, config] of Object.entries(supportedBuildPlatforms)) {
		if (config.host === nativeHost) {
			return {
				binaryDir,
				...config,
				source: `native host ${nativeHost}`,
			};
		}
	}

	throw new Error(
		`FAIL: unsupported native platform ${nativeHost}. Set GOODPLAN_BINARY_PLATFORM to one of: ${supportedPlatformList()}`,
	);
}

function compiledBinaryPath() {
	return join(pluginRoot, "binaries", buildPlatform.binaryDir, "gp");
}

function writePlaceholderBinary() {
	const placeholder = compiledBinaryPath();
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

function compileBinary() {
	console.log(`Building ${target} plugin v${version}...`);
	console.log(`  binary target: ${buildPlatform.binaryDir} (${buildPlatform.bunTarget}; ${buildPlatform.source})`);
	ensureDir(join(pluginRoot, "binaries", buildPlatform.binaryDir));
	if (process.env.GOODPLAN_SKIP_COMPILE === "1") {
		writePlaceholderBinary();
		return;
	}
	run("bun", [
		"build",
		"--compile",
		"src/index.ts",
		"--outfile",
		compiledBinaryPath(),
		`--target=${buildPlatform.bunTarget}`,
		"--define",
		`__GOODPLAN_VERSION__="${version}"`,
		"--define",
		`__GP_HMAC_KEY__="${process.env.GP_HMAC_KEY ?? "goodplan-dev-hmac-key"}"`,
	]);
}

function copySharedAssets() {
	ensureDir(pluginRoot);
	copyDir(join(repoRoot, "plugin", "skills"), join(pluginRoot, "skills"));
	copyDir(join(repoRoot, "plugin", "agents"), join(pluginRoot, "agents"));
	copyDir(join(repoRoot, "plugin", "hooks"), join(pluginRoot, "hooks"));
	copyFile(join(repoRoot, "plugin", "bin", "gp"), join(pluginRoot, "bin", "gp"));
	chmodSync(join(pluginRoot, "bin", "gp"), 0o755);
	for (const hookScript of recursiveFiles(join(pluginRoot, "hooks")).filter((file) => file.endsWith(".sh"))) {
		chmodSync(hookScript, 0o755);
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
		name: "goodplan",
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
		hooks: "./hooks.json",
		interface: {
			displayName: "goodplan",
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

function writeCodexHooks() {
	copyFile(join(repoRoot, "plugin", "codex", "hooks.json"), join(pluginRoot, "hooks.json"));
}

function rewriteCodexSpecificFiles() {
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
	saveText(statusPath, status);

	const explorePath = join(pluginRoot, "skills", "explore", "SKILL.md");
	let explore = loadText(explorePath);
	explore = explore.replace(
		"- **If yes**: Follow the recording protocol from expertise-tracking.md (auto-included above), including the plugin data guard. Update `${CLAUDE_PLUGIN_DATA}/expertise.md` following the guard and format described there.",
		"- **If yes**: Expertise persistence is currently disabled in Codex builds, so skip this step silently.",
	);
	saveText(explorePath, explore);

	const reviewerPath = join(pluginRoot, "agents", "_references", "review-agent-skill.md");
	let reviewer = loadText(reviewerPath);
	reviewer = reviewer.replace(
		"   Consider: references must use `@${CLAUDE_PLUGIN_ROOT}/path` format (not bare paths or `@./` relative paths). Referenced files must exist at the specified path. Do NOT use `skills:` frontmatter for plugin-to-plugin injection (issue #25834). Each `@` reference file should start with a self-identifying header for spot-checking in logs.",
		"   Consider: references must use plugin-local `@...` paths that resolve inside the packaged plugin. Referenced files must exist at the specified path. Do NOT use `skills:` frontmatter for plugin-to-plugin injection (issue #25834). Each `@` reference file should start with a self-identifying header for spot-checking in logs.",
	);
	saveText(reviewerPath, reviewer);
}

function rewriteCodexMarkdown() {
	const files = markdownFiles(
		join(pluginRoot, "skills"),
		join(pluginRoot, "agents"),
		join(pluginRoot, "commands"),
	);
	for (const file of files) {
		let text = loadText(file);
		text = text.replaceAll("/gp:", "/gp-");
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
		const expectedPrefix = prefixedNames ? "name: gp:" : "name: ";
		if (!frontmatter.includes(expectedPrefix)) {
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
	statSync(compiledBinaryPath());
	statSync(join(pluginRoot, "bin", "gp"));
	console.log("  plugin.json: valid JSON");
	console.log("  hooks.json: valid JSON");
	console.log("  hook scripts: present");
	console.log(`  binary: present (${buildPlatform.binaryDir})`);
	console.log("  bin/gp launcher: present");
}

function validateCodexArtifacts() {
	console.log("\nValidating Codex plugin artifacts...");
	JSON.parse(loadText(join(pluginRoot, ".codex-plugin", "plugin.json")));
	JSON.parse(loadText(join(pluginRoot, "hooks.json")));
	statSync(compiledBinaryPath());
	const marketplace = JSON.parse(loadText(join(repoRoot, ".agents", "plugins", "marketplace.json")));
	const goodplanEntry = marketplace.plugins.find((entry) => entry.name === "goodplan");
	if (!goodplanEntry || goodplanEntry.source?.path !== "./plugins/goodplan") {
		throw new Error("FAIL: .agents/plugins/marketplace.json does not point goodplan at ./plugins/goodplan");
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
	console.log("  plugin.json: valid JSON");
	console.log("  hooks.json: valid JSON");
	console.log(`  binary: present (${buildPlatform.binaryDir})`);
	console.log("  marketplace.json: points to ./plugins/goodplan");
	console.log("  Claude-only placeholders: clean");
}

function printSummary() {
	console.log(`\nPlugin assembled at ${pluginRoot}/\n`);
	for (const file of recursiveFiles(pluginRoot).sort()) {
		console.log(`  ${normalizePath(relative(pluginRoot, file))}`);
	}
}

rmSync(pluginRoot, { recursive: true, force: true });
copySharedAssets();
compileBinary();

if (target === "claude") {
	writeClaudeManifest();
	prefixClaudeSkillNames();
	validateSkillPackaging({ prefixedNames: true });
	validateAgents();
	validateMarkdownReferences();
	validateClaudeArtifacts();
} else {
	rmSync(join(pluginRoot, "hooks", "hooks.json"), { force: true });
	writeCodexManifest();
	writeCodexHooks();
	writeCodexCommands();
	rewriteCodexSpecificFiles();
	rewriteCodexMarkdown();
	validateSkillPackaging({ prefixedNames: false });
	validateAgents();
	validateCodexCommands();
	validateMarkdownReferences();
	validateCodexArtifacts();
}

printSummary();
