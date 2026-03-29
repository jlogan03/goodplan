/**
 * Fitness function: Concurrent modification detection.
 * Verifies that commitState() detects external file modifications.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { assembleState } from "../../src/core/data/assemble.js";
import { commitState } from "../../src/core/data/commit.js";
import { GoodplanError } from "../../src/util/errors.js";
import { reduce } from "../../src/core/state/reduce.js";
import type { StateEvent } from "../../src/schemas/state-events.js";

const FIXTURE_DIR = path.resolve(import.meta.dirname, "../fixtures/fresh-init");

describe("Concurrent modification detection", () => {
	let tmpDir: string;
	let projectDir: string;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-concurrent-"));
		fs.cpSync(FIXTURE_DIR, tmpDir, { recursive: true });
		projectDir = path.join(tmpDir, ".goodplan");
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	it("allows commit with --force when file is externally modified", () => {
		const oldState = assembleState(projectDir);

		const event: StateEvent = {
			type: "CREATE_EPIC",
			name: "force-test",
			goal: "Test force flag",
			ts: "2026-01-02T00:00:00.000Z",
		};
		const newState = reduce(oldState, event);
		if ("code" in newState && "message" in newState) {
			expect.fail(`reduce() returned error: ${newState.message}`);
			return;
		}

		// Externally modify the epics/overview.json on disk
		const overviewPath = path.join(projectDir, "epics", "overview.json");
		const original = fs.readFileSync(overviewPath, "utf-8");
		const modified = JSON.parse(original) as Record<string, unknown>;
		modified["tampered"] = true;
		fs.writeFileSync(overviewPath, JSON.stringify(modified, null, 2));

		// Without --force, should throw
		expect(() => commitState(projectDir, oldState, newState)).toThrow(GoodplanError);

		// With --force, should succeed and write a warning to stderr
		const stderrChunks: string[] = [];
		const originalWrite = process.stderr.write.bind(process.stderr);
		const mockWrite = (chunk: string | Uint8Array) => {
			stderrChunks.push(String(chunk));
			return true;
		};
		process.stderr.write = mockWrite as typeof process.stderr.write;

		try {
			commitState(projectDir, oldState, newState, { force: true });
		} finally {
			process.stderr.write = originalWrite;
		}

		// Verify warning was emitted
		const stderrOutput = stderrChunks.join("");
		expect(stderrOutput).toContain("--force: overwriting externally modified file");
		expect(stderrOutput).toContain("epics/overview.json");
	});

	it("detects external modification of project.json between read and write", () => {
		// Assemble initial state
		const oldState = assembleState(projectDir);

		// Create a new state by applying an event that modifies project.json
		// We'll create an epic which modifies epics/overview.json
		const event: StateEvent = {
			type: "CREATE_EPIC",
			name: "concurrent-test",
			goal: "Test concurrent modification",
			ts: "2026-01-02T00:00:00.000Z",
		};
		const newState = reduce(oldState, event);
		if ("code" in newState && "message" in newState) {
			expect.fail(`reduce() returned error: ${newState.message}`);
			return;
		}

		// Externally modify the epics/overview.json on disk
		const overviewPath = path.join(projectDir, "epics", "overview.json");
		const original = fs.readFileSync(overviewPath, "utf-8");
		const modified = JSON.parse(original) as Record<string, unknown>;
		modified["tampered"] = true;
		fs.writeFileSync(overviewPath, JSON.stringify(modified, null, 2));

		// Attempt to commit — should detect the concurrent modification
		expect(() => commitState(projectDir, oldState, newState)).toThrow(GoodplanError);

		try {
			commitState(projectDir, oldState, newState);
		} catch (err) {
			const ge = err as GoodplanError;
			expect(ge.code).toBe("DATA_CONCURRENT_MODIFICATION");
			expect(ge.message).toContain("externally modified");
		}
	});
});
