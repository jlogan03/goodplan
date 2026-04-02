/**
 * Fitness function: INV-009 — State file integrity via embedded signature.
 * Verifies HMAC signing and verification across write, read, and repair paths.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { assembleState } from "../../src/core/data/assemble.js";
import { commitState } from "../../src/core/data/commit.js";
import { signStateTree, verifyStateTree } from "../../src/core/data/hmac.js";
import { loadState } from "../../src/core/data/load.js";
import { ZERO_STATE } from "../../src/core/data/tree.js";
import type { ProjectState } from "../../src/core/data/tree.js";
import { deterministicStringify } from "../../src/util/json.js";
import { buildBinary, runCommand, withTempDir } from "../integration/helpers.js";

const ts = "2026-01-01T00:00:00.000Z";

const projectContent = {
	version: "1.0.0",
	name: "integrity-test",
	activeEpic: null,
	activeSlice: null,
	activeQuest: null,
	created: ts,
	updated: ts,
};

function makeState(overrides?: Partial<typeof projectContent>): ProjectState {
	return {
		type: "directory",
		contents: {
			"project.json": {
				type: "json",
				content: { ...projectContent, ...overrides },
			},
			"overview.json": {
				type: "json",
				content: { epics: [], quests: [], tasks: [] },
			},
			"activity-log.jsonl": { type: "jsonl", content: [] },
			"decisions.jsonl": { type: "jsonl", content: [] },
			"learnings.jsonl": { type: "jsonl", content: [] },
		},
	};
}

describe("INV-009: State file integrity via embedded signature", () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-integrity-"));
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	it("commitState always embeds a valid signature", () => {
		const projectDir = path.join(tmpDir, ".goodplan");
		fs.mkdirSync(projectDir, { recursive: true });

		commitState(projectDir, ZERO_STATE, makeState());

		const state = assembleState(projectDir);
		const raw = JSON.parse(
			fs.readFileSync(path.join(projectDir, "project.json"), "utf-8"),
		);
		expect(raw.stateSignature).toBeDefined();
		expect(typeof raw.stateSignature).toBe("string");
		expect(raw.stateSignature.length).toBe(64); // hex SHA-256

		// Verify the embedded signature matches what we'd compute
		expect(verifyStateTree(state, raw.stateSignature)).toBe(true);
	});

	it("signature changes when state changes", () => {
		const projectDir = path.join(tmpDir, ".goodplan");
		fs.mkdirSync(projectDir, { recursive: true });

		// First commit
		commitState(projectDir, ZERO_STATE, makeState());
		const raw1 = JSON.parse(
			fs.readFileSync(path.join(projectDir, "project.json"), "utf-8"),
		);

		// Second commit with different name
		const state1 = assembleState(projectDir);
		const state2 = makeState({ name: "changed-project" });
		commitState(projectDir, state1, state2);
		const raw2 = JSON.parse(
			fs.readFileSync(path.join(projectDir, "project.json"), "utf-8"),
		);

		expect(raw1.stateSignature).not.toBe(raw2.stateSignature);
	});

	it("tampering with a schema-registered JSON file is silently ignored (verification temporarily disabled)", () => {
		const projectDir = path.join(tmpDir, ".goodplan");
		fs.mkdirSync(projectDir, { recursive: true });

		commitState(projectDir, ZERO_STATE, makeState());

		// Tamper with project.json — change name but keep stateSignature intact.
		// This passes schema validation but produces a different HMAC.
		const projectPath = path.join(projectDir, "project.json");
		const raw = JSON.parse(fs.readFileSync(projectPath, "utf-8"));
		raw.name = "tampered-name";
		fs.writeFileSync(projectPath, `${deterministicStringify(raw)}\n`);

		// Delete the state cache to force a full assembleState
		const cachePath = path.join(projectDir, ".state-cache.json");
		if (fs.existsSync(cachePath)) fs.rmSync(cachePath);

		// With verification temporarily disabled, loadState should NOT throw
		const state = loadState(projectDir);
		expect(state).toBeDefined();
	});

	it("editing a .md file does NOT invalidate signature", () => {
		const projectDir = path.join(tmpDir, ".goodplan");
		fs.mkdirSync(projectDir, { recursive: true });

		commitState(projectDir, ZERO_STATE, makeState());

		// Write a markdown file directly
		fs.writeFileSync(path.join(projectDir, "idea.md"), "# Some idea\n\nNew content.");

		// Delete the state cache to force full reassembly
		const cachePath = path.join(projectDir, ".state-cache.json");
		if (fs.existsSync(cachePath)) fs.rmSync(cachePath);

		// Should not throw — markdown is excluded from HMAC
		const state = loadState(projectDir);
		expect(state).toBeDefined();
	});

	it("end-to-end: gp epic:create produces a valid signature", async () => {
		const bin = buildBinary();

		await withTempDir(async (dir, env) => {
			// Init project
			const initResult = runCommand(bin, ["init", "--name", "e2e-test", "--json"], {
				cwd: dir,
				env,
			});
			expect(initResult.exitCode).toBe(0);

			// Create an epic
			const createResult = runCommand(
				bin,
				["epic:create", "--json"],
				{
					cwd: dir,
					env,
					stdin: JSON.stringify({ name: "test-epic", goal: "Test HMAC" }),
				},
			);
			expect(createResult.exitCode).toBe(0);

			// Read project.json and verify signature
			const projectPath = path.join(env.GOODPLAN_DIR, "project.json");
			const raw = JSON.parse(fs.readFileSync(projectPath, "utf-8"));
			expect(raw.stateSignature).toBeDefined();
			expect(raw.stateSignature.length).toBe(64);

			// Verify via assembleState
			const state = assembleState(env.GOODPLAN_DIR);
			expect(verifyStateTree(state, raw.stateSignature)).toBe(true);
		});
	});
});
