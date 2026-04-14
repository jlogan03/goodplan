/**
 * Fitness function: INV-007 — Atomic writes.
 * Verifies that commitState's write functions use the
 * temp-file-then-rename pattern for crash safety.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

const COMMIT_SOURCE_PATH = path.resolve(import.meta.dirname, "../../src/core/data/commit.ts");

describe("INV-007: Atomic writes — temp-file-then-rename pattern", () => {
	const source = fs.readFileSync(COMMIT_SOURCE_PATH, "utf-8");

	it("atomicWrite function uses writeFileSync to a .tmp file", () => {
		// Verify the atomicWrite function writes to a temp file first
		expect(source).toContain(".tmp.");
		expect(source).toContain("writeFileSync(tmpPath");
	});

	it("atomicWrite function uses renameSync after writing", () => {
		// Verify rename is used (atomic move)
		expect(source).toContain("renameSync(tmpPath");
	});

	it("atomicWrite function cleans up temp file on error", () => {
		// Verify cleanup in catch block
		expect(source).toContain("unlinkSync(tmpPath)");
	});

	it("atomicAppend function also uses temp-file-then-rename", () => {
		// The atomicAppend function should follow the same pattern
		// Find the atomicAppend function and verify it has the pattern
		const appendMatch = /function atomicAppend[\s\S]*?^}/m.exec(source);
		expect(appendMatch).not.toBeNull();

		const appendBody = appendMatch?.[0];
		expect(appendBody).toContain("writeFileSync(tmpPath");
		expect(appendBody).toContain("renameSync(tmpPath");
	});

	it("no direct writeFileSync calls to final paths outside atomic functions", () => {
		// Split source into functions and verify that non-atomic functions
		// don't do direct writes to entity files.
		// The atomicWrite and atomicAppend functions are the only ones that should
		// call writeFileSync — other functions should only build PendingWrite arrays.

		const lines = source.split("\n");
		const writeFileCalls: Array<{ line: number; text: string }> = [];

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i]!;
			if (line.includes("writeFileSync") && !line.trim().startsWith("//")) {
				writeFileCalls.push({ line: i + 1, text: line.trim() });
			}
		}

		// All writeFileSync calls should write to tmpPath, not absPath directly
		// (except the state cache which is a special case)
		for (const call of writeFileCalls) {
			const writesToTmp = call.text.includes("tmpPath") || call.text.includes("tmp");
			const isCacheOrComment =
				call.text.includes("cache") || call.text.startsWith("//") || call.text.startsWith("*");

			expect(
				writesToTmp || isCacheOrComment,
				`Line ${call.line}: writeFileSync should target tmpPath, not final path: ${call.text}`,
			).toBe(true);
		}
	});
});
