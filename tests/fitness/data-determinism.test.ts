/**
 * Fitness function: INV-002 — Data determinism.
 * Verifies assembleState() -> commitState() on unchanged state
 * produces byte-identical files (deterministic key ordering).
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { assembleState } from "../../src/core/data/assemble.js";
import { commitState } from "../../src/core/data/commit.js";
import { collectFiles } from "./helpers.js";

const FIXTURES_DIR = path.resolve(import.meta.dirname, "../fixtures");

/** Read all files in a directory into a map of relativePath -> content. */
function snapshotFiles(dir: string): Map<string, string> {
	const files = collectFiles(dir);
	const snapshot = new Map<string, string>();
	for (const rel of files) {
		// Skip state cache — it contains a writtenAt timestamp that changes
		if (rel.endsWith(".state-cache.json")) continue;
		snapshot.set(rel, fs.readFileSync(path.join(dir, rel), "utf-8"));
	}
	return snapshot;
}

const fixtures = ["fresh-init", "epic-created", "epic-activated", "slice-in-progress"];

describe("INV-002: Data determinism — round-trip produces identical files", () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "goodplan-determinism-"));
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	for (const fixture of fixtures) {
		it(`${fixture}: assembleState -> commitState produces byte-identical files`, () => {
			const fixtureDir = path.join(FIXTURES_DIR, fixture);
			expect(fs.existsSync(fixtureDir), `Fixture ${fixture} should exist`).toBe(true);

			// Copy fixture to temp dir
			fs.cpSync(fixtureDir, tmpDir, { recursive: true });
			const projectDir = path.join(tmpDir, ".project");

			// Snapshot before
			const before = snapshotFiles(projectDir);

			// Round-trip: assemble then commit unchanged state
			const state = assembleState(projectDir);
			commitState(projectDir, state, state);

			// Snapshot after
			const after = snapshotFiles(projectDir);

			// Verify byte-identical
			expect(after.size).toBe(before.size);
			for (const [rel, content] of before) {
				const afterContent = after.get(rel);
				expect(afterContent, `File ${rel} should exist after round-trip`).toBeDefined();
				expect(afterContent, `File ${rel} should be byte-identical`).toBe(content);
			}
		});
	}
});
