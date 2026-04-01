/**
 * Integration test for the simulated user (stateless LLM calls via @anthropic-ai/sdk).
 *
 * Tests:
 * 1. simulatedUser.ask() returns a contextual answer from the provided options
 * 2. createAskUserHandler() returns correct updatedInput shape
 *
 * Requires ANTHROPIC_API_KEY — exits 0 gracefully if absent.
 *
 * Usage: bun tools/dogfood/test-simulated-user.ts
 */

import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { createAskUserHandler, createSimulatedUser, tierDefault } from "./utils";

// ─── Preflight ──────────────────────────────────────────────

if (!process.env.ANTHROPIC_API_KEY) {
	console.log("ANTHROPIC_API_KEY not set — skipping simulated user tests");
	process.exit(0);
}

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

// ─── Fixture ────────────────────────────────────────────────

const TEST_DIR = `/tmp/gp-simuser-test-${Date.now()}`;
const TRANSCRIPT_FILE = join(TEST_DIR, "transcript.jsonl");

mkdirSync(TEST_DIR, { recursive: true });

// ─── Main ───────────────────────────────────────────────────

async function main(): Promise<void> {
	console.log("\n[test-simulated-user] Starting...\n");
	const startTime = Date.now();

	try {
		// ─── Test 1: simulatedUser.ask() ────────────────────
		console.log("--- Test 1: simulatedUser.ask() ---");

		const simulatedUser = createSimulatedUser({
			systemPrompt: [
				"You are a simulated user testing a project management CLI tool.",
				"The project is a TypeScript CLI called 'goodplan' that manages development workflows.",
				"When asked to choose, pick the option that best advances testing of the project.",
				"Always prefer options that involve creating or exploring over skipping or canceling.",
			].join(" "),
			transcriptFile: TRANSCRIPT_FILE,
			model: tierDefault("structural"),
		});

		const options = [
			{ label: "Create a new epic", description: "Start a new development epic for the project" },
			{ label: "Skip this step", description: "Skip and do nothing" },
			{ label: "Cancel", description: "Cancel the current operation" },
		];

		const answer = await simulatedUser.ask(
			"What would you like to do with the goodplan project?",
			options,
		);

		console.log(`  Answer received: "${answer}"`);
		const validLabels = options.map((o) => o.label);
		assert(validLabels.includes(answer), `answer is a valid option label (got: "${answer}")`);

		// ─── Test 2: createAskUserHandler() shape ───────────
		console.log("\n--- Test 2: createAskUserHandler() shape ---");

		const handler = createAskUserHandler(simulatedUser);

		const mockInput = {
			questions: [
				{
					question: "Which approach do you prefer?",
					options: [
						{ label: "Approach A", description: "Use the existing pattern" },
						{ label: "Approach B", description: "Refactor to a new pattern" },
					],
				},
			],
		};

		const result = await handler("AskUserQuestion", mockInput, {
			signal: AbortSignal.timeout(30_000),
			toolUseID: "test-ask-user",
		});
		assert(result.behavior === "allow", "handler returns behavior: allow");
		if (result.behavior === "allow") {
			assert(
				typeof result.updatedInput === "object" && result.updatedInput !== null,
				"handler returns updatedInput object",
			);

			const updated = result.updatedInput;
			assert(
				updated !== null && typeof updated === "object" && "questions" in updated && "answers" in updated,
				"updatedInput has questions and answers properties",
			);
			const { questions, answers } = updated as { questions: unknown; answers: unknown };
			assert(Array.isArray(questions), "updatedInput has questions array");
			assert(
				typeof answers === "object" && answers !== null,
				"updatedInput has answers object",
			);
			const answersRecord = answers as Record<string, string>;
			assert(
				typeof answersRecord["Which approach do you prefer?"] === "string",
				"answers contains the question key with a string answer",
			);
			console.log(
				`  Answer for approach question: "${answersRecord["Which approach do you prefer?"]}"`,
			);
		}

		// ─── Test 3: non-AskUserQuestion passthrough ────────
		console.log("\n--- Test 3: non-AskUserQuestion passthrough ---");

		const passthroughResult = await handler("Read", { file_path: "/tmp/test.txt" }, {
			signal: AbortSignal.timeout(5_000),
			toolUseID: "test-passthrough",
		});
		assert(passthroughResult.behavior === "allow", "passthrough returns behavior: allow");
		if (passthroughResult.behavior === "allow") {
			assert(
				passthroughResult.updatedInput === undefined,
				"passthrough omits updatedInput (no modification needed)",
			);
		}

		// ─── Test 4: model override via tierDefault ─────────
		console.log("\n--- Test 4: tierDefault used for model ---");
		assert(tierDefault("structural") === "claude-haiku-4-5", "structural tier defaults to haiku");
	} finally {
		rmSync(TEST_DIR, { recursive: true, force: true });
	}

	const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

	console.log("\n--- SUMMARY ---");
	console.log(`Passed: ${passed}`);
	console.log(`Failed: ${failed}`);
	console.log(`Elapsed: ${elapsed}s`);

	if (failed > 0) {
		process.exit(1);
	}
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
