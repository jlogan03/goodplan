/**
 * Full-stack integration test: createMinimalFixture + runSkillSession + simulatedUser.
 *
 * Runs a real skill session with an LLM-simulated user answering AskUserQuestion,
 * violation detection, transcript writing, and cost tracking.
 *
 * Uses /gp:status as the target skill — it's fast and always available.
 *
 * Uses Claude subscription via Agent SDK — no ANTHROPIC_API_KEY needed.
 *
 * Usage: bun tools/dogfood/test-integration.ts
 */

import { existsSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import {
	createMinimalFixture,
	createSimulatedUser,
	isSuccess,
	parseModel,
	platformBinaryDir,
	runSkillSession,
	tierDefault,
} from "./utils";

// ─── Preflight ──────────────────────────────────────────────

// ─── Helpers ────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string): void {
	if (condition) {
		console.log(`  PASS: ${msg}`);
		passed++;
	} else {
		console.error(`  FAIL: ${msg}`);
		failed++;
	}
}

// ─── Environment ────────────────────────────────────────────

const HOME = process.env.HOME;
if (!HOME) {
	console.error("FATAL: HOME environment variable is not set");
	process.exit(1);
}

const GOODPLAN_DIR = join(import.meta.dir, "../..");
const PLUGIN_DIR = resolve(GOODPLAN_DIR, "dist/gp-plugin");

if (!existsSync(PLUGIN_DIR)) {
	console.error("FATAL: Plugin not built. Run `bun run build:plugin` first.");
	process.exit(1);
}

const MODEL = parseModel(tierDefault("structural"));

// ─── Main ───────────────────────────────────────────────────

async function main(): Promise<void> {
	console.log("\n[test-integration] Starting full-stack integration test...\n");
	console.log(`Model: ${MODEL}`);
	const startTime = Date.now();

	let tmpDir: string | undefined;
	let simulatedUser: ReturnType<typeof createSimulatedUser> | undefined;

	try {
		// ─── Step 1: Create fixture ─────────────────────────
		console.log("--- Step 1: Create minimal fixture ---");
		tmpDir = await createMinimalFixture();
		assert(existsSync(tmpDir), "fixture directory created");
		assert(existsSync(join(tmpDir, ".goodplan")), "fixture has .goodplan/");
		console.log(`  Fixture: ${tmpDir}`);

		// ─── Step 2: Create simulated user ──────────────────
		console.log("\n--- Step 2: Create simulated user ---");
		const transcriptFile = join(tmpDir, "transcript.jsonl");

		simulatedUser = createSimulatedUser({
			cwd: tmpDir,
			systemPrompt: [
				"You are a simulated user testing the goodplan CLI tool.",
				"The project is a test fixture with a single epic and slice.",
				"When asked questions, choose the option that seems most reasonable.",
				"Prefer options that advance the workflow over canceling or skipping.",
			].join(" "),
			transcriptFile,
			model: MODEL,
		});
		assert(typeof simulatedUser.ask === "function", "simulatedUser created with ask()");

		// ─── Step 3: Run skill session ──────────────────────
		console.log("\n--- Step 3: Run /gp:status skill session ---");

		const sessionResult = await runSkillSession({
			prompt: "/gp:status",
			options: {
				cwd: tmpDir,
				permissionMode: "bypassPermissions",
				allowDangerouslySkipPermissions: true,
				maxTurns: 50,
				maxBudgetUsd: 2,
				model: MODEL,
				settingSources: [],
				plugins: [{ type: "local", path: PLUGIN_DIR }],
				env: {
					...process.env,
					PATH: `${join(PLUGIN_DIR, "binaries", platformBinaryDir())}:${HOME}/.local/bin:${process.env.PATH ?? ""}`,
				},
				systemPrompt: {
					type: "preset",
					preset: "claude_code",
					append: "You are in an automated test. Execute the skill and report results concisely.",
				},
			},
			transcriptFile,
			simulatedUser,
			checkViolations: true,
		});

		// ─── Step 4: Verify results ─────────────────────────
		console.log("\n--- Step 4: Verify results ---");

		if (isSuccess(sessionResult.result)) {
			assert(true, `skill session completed successfully (subtype: ${sessionResult.result.subtype})`);
			const resultText = sessionResult.result.result;
			console.log(`  Result preview: ${resultText.slice(0, 300)}...`);
			assert(resultText.length > 0, "result has content");
		} else {
			assert(false, `skill session completed successfully (subtype: ${sessionResult.result.subtype})`);
		}

		assert(sessionResult.totalCost > 0, `cost tracked: $${sessionResult.totalCost.toFixed(4)}`);
		assert(
			sessionResult.violations.length === 0,
			`no violations (found ${sessionResult.violations.length})`,
		);

		if (sessionResult.violations.length > 0) {
			for (const v of sessionResult.violations) {
				console.error(`  VIOLATION: ${v}`);
			}
		}

		// ─── Step 5: Verify transcript ──────────────────────
		console.log("\n--- Step 5: Verify transcript ---");
		assert(existsSync(transcriptFile), "transcript file exists");

		if (existsSync(transcriptFile)) {
			const content = readFileSync(transcriptFile, "utf-8").trim();
			const lines = content.split("\n").filter(Boolean);
			assert(lines.length > 0, `transcript has ${lines.length} entries`);

			// Verify each line is valid JSON
			let allValid = true;
			for (const line of lines) {
				try {
					JSON.parse(line);
				} catch {
					allValid = false;
					break;
				}
			}
			assert(allValid, "all transcript entries are valid JSON");
		}
	} finally {
		simulatedUser?.close();
		if (tmpDir) {
			rmSync(tmpDir, { recursive: true, force: true });
			console.log(`\n  Cleaned up: ${tmpDir}`);
		}
	}

	const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

	console.log("\n--- SUMMARY ---");
	console.log(`Passed: ${passed}`);
	console.log(`Failed: ${failed}`);
	console.log(`Elapsed: ${elapsed}s`);
	console.log(`Model: ${MODEL}`);

	if (failed > 0) {
		process.exit(1);
	}
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
