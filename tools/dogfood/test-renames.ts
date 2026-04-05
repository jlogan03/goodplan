/**
 * Rename smoke tests — verifies that the three renamed skills (task, upgrade,
 * status) load via plugin discovery and have correct frontmatter.
 *
 * Usage: bun tools/dogfood/test-renames.ts [--model <model>]
 *
 * Tests:
 * 1. Each skill directory exists with a valid SKILL.md
 * 2. Frontmatter has correct name, user-invocable, and requires fields
 * 3. Each skill loads via plugin discovery (appears as /gp:task, /gp:upgrade, /gp:status)
 * 4. Trigger phrases are present in the description
 * 5. Reference files are copied to the correct locations
 * 6. All 12 target skills have user-invocable: true
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { createLogger, parseModel, platformBinaryDir, tierDefault } from "./utils";

// ─── CLI Arg Parsing ────────────────────────────────────────

const MODEL = parseModel(tierDefault("structural"));

// ─── Environment ────────────────────────────────────────────

const GOODPLAN_DIR = join(import.meta.dir, "../..");
const SKILLS_DIR = resolve(GOODPLAN_DIR, "skills");
const LOG_FILE = join(GOODPLAN_DIR, "tools/dogfood/renames-test.log");

const logger = createLogger(LOG_FILE);
let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail?: string): void {
	if (condition) {
		logger.log(`  PASS: ${label}`);
		passed++;
	} else {
		logger.log(`  FAIL: ${label}${detail ? ` — ${detail}` : ""}`);
		failed++;
	}
}

// ─── Frontmatter Parser ────────────────────────────────────

interface Frontmatter {
	name?: string;
	description?: string;
	"user-invocable"?: string;
	requires?: string;
}

function parseFrontmatter(content: string): Frontmatter {
	const match = content.match(/^---\n([\s\S]*?)\n---/);
	if (!match?.[1]) return {};

	const fm: Record<string, string> = {};
	let currentKey = "";
	let currentValue = "";

	for (const line of match[1].split("\n")) {
		// Continuation line (starts with whitespace)
		if (/^\s+/.test(line) && currentKey) {
			currentValue += ` ${line.trim()}`;
			fm[currentKey] = currentValue;
			continue;
		}

		const kvMatch = line.match(/^(\S+?):\s*(.*)$/);
		if (kvMatch?.[1]) {
			currentKey = kvMatch[1];
			// Handle multi-line values starting with >
			const rawValue = kvMatch[2] ?? "";
			currentValue = rawValue === ">" ? "" : rawValue;
			if (rawValue !== ">") {
				fm[currentKey] = currentValue;
			}
		}
	}

	return fm as Frontmatter;
}

// ─── Test 1: Renamed Skill Directories & Frontmatter ────────

logger.log("\n[test-renames] Test 1: Renamed skill directories and frontmatter\n");

const RENAMED_SKILLS: Array<{
	name: string;
	source: string;
	triggers: string[];
	references: string[];
}> = [
	{
		name: "task",
		source: "capture",
		triggers: ["capture", "quick note", "todo", "task"],
		references: [],
	},
	{
		name: "upgrade",
		source: "migrate",
		triggers: ["upgrade", "migrate", "convert project"],
		references: ["references/migration-heuristics.md"],
	},
	{
		name: "status",
		source: "project-status",
		triggers: ["status", "where am I", "what's next"],
		references: ["references/status-logic.md"],
	},
];

for (const skill of RENAMED_SKILLS) {
	logger.log(`\n  --- ${skill.name} (from ${skill.source}) ---`);

	const skillDir = join(SKILLS_DIR, skill.name);
	const skillMd = join(skillDir, "SKILL.md");

	// Directory exists
	assert(`${skill.name}/SKILL.md exists`, existsSync(skillMd));

	if (!existsSync(skillMd)) continue;

	const content = readFileSync(skillMd, "utf-8");
	const fm = parseFrontmatter(content);

	// Frontmatter fields
	assert(`${skill.name}: name field is "${skill.name}"`, fm.name === skill.name, `got "${fm.name}"`);
	assert(
		`${skill.name}: user-invocable is true`,
		fm["user-invocable"] === "true",
		`got "${fm["user-invocable"]}"`,
	);
	assert(
		`${skill.name}: requires gp >= 1.0.0`,
		fm.requires?.includes("gp >= 1.0.0") ?? false,
		`got "${fm.requires}"`,
	);

	// Trigger phrases in description
	const desc = fm.description ?? "";
	for (const trigger of skill.triggers) {
		assert(
			`${skill.name}: description contains trigger "${trigger}"`,
			desc.toLowerCase().includes(trigger.toLowerCase()),
		);
	}

	// Reference files
	for (const ref of skill.references) {
		const refPath = join(skillDir, ref);
		assert(`${skill.name}: ${ref} exists`, existsSync(refPath));
	}
}

// ─── Test 2: init/references copied from onboard-repo ──────

logger.log("\n[test-renames] Test 2: init/references copied from onboard-repo\n");

const INIT_REFS = [
	"architecture-extraction.md",
	"convention-heuristics.md",
	"expertise-profiling.md",
	"migration-detection.md",
	"repo-scanning.md",
];

for (const ref of INIT_REFS) {
	const refPath = join(SKILLS_DIR, "init", "references", ref);
	assert(`init/references/${ref} exists`, existsSync(refPath));
}

// ─── Test 3: All 12 target skills have user-invocable ──────

logger.log("\n[test-renames] Test 3: All 12 target skills have user-invocable: true\n");

const TARGET_SKILLS = [
	"audit",
	"complete-epic",
	"create-epic",
	"create-side-quest",
	"explore",
	"implement",
	"init",
	"plan-slice",
	"start-epic",
	"status",
	"task",
	"upgrade",
];

for (const name of TARGET_SKILLS) {
	const skillMd = join(SKILLS_DIR, name, "SKILL.md");
	if (!existsSync(skillMd)) {
		assert(`${name}: SKILL.md exists`, false, "file not found");
		continue;
	}
	const content = readFileSync(skillMd, "utf-8");
	const fm = parseFrontmatter(content);
	assert(`${name}: user-invocable is true`, fm["user-invocable"] === "true", `got "${fm["user-invocable"]}"`);
}

// ─── Test 4: No stale name references in renamed skills ────

logger.log("\n[test-renames] Test 4: No stale name references in renamed skills\n");

// task/SKILL.md should not reference "/capture" as a skill invocation (triggers are fine)
const taskContent = readFileSync(join(SKILLS_DIR, "task", "SKILL.md"), "utf-8");
assert(
	"task: no '/capture' invocation reference",
	!taskContent.includes("name: capture"),
	"found 'name: capture'",
);

// status/SKILL.md should not reference "project-status" as a skill name
const statusContent = readFileSync(join(SKILLS_DIR, "status", "SKILL.md"), "utf-8");
assert(
	"status: no 'name: project-status' reference",
	!statusContent.includes("name: project-status"),
);

// upgrade/SKILL.md should not reference "name: migrate"
const upgradeContent = readFileSync(join(SKILLS_DIR, "upgrade", "SKILL.md"), "utf-8");
assert(
	"upgrade: no 'name: migrate' reference",
	!upgradeContent.includes("name: migrate"),
);

// ─── Test 5: Plugin build includes renamed skills ──────────

logger.log("\n[test-renames] Test 5: Plugin build includes renamed skills\n");

try {
	execFileSync("bun", ["run", "build"], {
		cwd: GOODPLAN_DIR,
		stdio: "pipe",
		encoding: "utf-8",
	});
	logger.log("  Plugin build succeeded");

	const pluginDir = resolve(GOODPLAN_DIR, "dist/gp-plugin");
	const skillsJson = join(pluginDir, "skills.json");

	if (existsSync(skillsJson)) {
		const skills = JSON.parse(readFileSync(skillsJson, "utf-8")) as Array<{ name: string }>;
		const skillNames = new Set(skills.map((s) => s.name));

		for (const name of ["task", "upgrade", "status"]) {
			assert(`plugin includes "${name}" skill`, skillNames.has(name), `skills: ${[...skillNames].join(", ")}`);
		}
	} else {
		// Check the skill directories in the plugin output instead
		const pluginSkillsDir = join(pluginDir, "skills");
		if (existsSync(pluginSkillsDir)) {
			const builtSkills = readdirSync(pluginSkillsDir);
			for (const name of ["task", "upgrade", "status"]) {
				assert(`plugin includes "${name}" skill dir`, builtSkills.includes(name));
			}
		} else {
			logger.log("  SKIP: Cannot verify plugin skill inclusion (no skills.json or skills/ dir)");
		}
	}
} catch (e) {
	logger.log(`  FAIL: Plugin build failed — ${e instanceof Error ? e.message : String(e)}`);
	failed++;
}

// ─── Summary ───────────────────────────────────────────────

logger.log(`\n[test-renames] Results: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
	process.exit(1);
}
