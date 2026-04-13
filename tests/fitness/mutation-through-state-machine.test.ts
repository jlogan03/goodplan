/**
 * Fitness function: INV-001 — All .goodplan/ mutations go through the state machine.
 * Verifies that fs.writeFileSync/writeFile for .json/.jsonl files only appears
 * in src/core/data/commit.ts (and documented exception: migrate.ts).
 * Commands and RPC modules do not import fs write functions directly.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { collectTsFiles } from "./helpers.js";

const SRC_DIR = path.resolve(import.meta.dirname, "../../src");

/** Allowed files that may contain fs.writeFileSync for .json/.jsonl writes. */
const ALLOWED_JSON_WRITE_FILES = new Set([
	"src/core/data/commit.ts",
	// Formal INV-001 exception: migrate constructs ProjectState directly
	"src/core/rpc/migrate.ts",
	// Formal INV-001 exception: v2 event generation writes events.jsonl during migration
	"src/core/rpc/migrate-events.ts",
]);

/** Files that write .md files through the data layer (out of scope for INV-001). */
const MARKDOWN_WRITE_FILES = new Set(["src/core/data/markdown-files.ts"]);

/**
 * Check if a source file contains fs.writeFileSync or fs.writeFile calls.
 * Returns matching lines with line numbers.
 */
function findWriteCalls(source: string): Array<{ line: number; text: string }> {
	const results: Array<{ line: number; text: string }> = [];
	const lines = source.split("\n");
	let inBlockComment = false;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (line === undefined) continue;
		const trimmed = line.trim();

		// Track block comment state (handles /* ... */ spanning multiple lines)
		if (inBlockComment) {
			if (trimmed.includes("*/")) {
				inBlockComment = false;
			}
			continue;
		}
		if (trimmed.startsWith("/*")) {
			if (!trimmed.includes("*/")) {
				inBlockComment = true;
			}
			continue;
		}

		// Skip single-line comments
		if (trimmed.startsWith("//")) continue;

		// Match fs.writeFileSync or fs.writeFile (but not type imports)
		if (
			/\bfs\.writeFileSync\b/.test(trimmed) ||
			/\bfs\.writeFile\b/.test(trimmed) ||
			/\bwriteFileSync\b/.test(trimmed)
		) {
			results.push({ line: i + 1, text: trimmed });
		}
	}

	return results;
}

describe("INV-001: All .goodplan/ JSON/JSONL mutations go through the state machine", () => {
	const allFiles = collectTsFiles(SRC_DIR);
	const rootDir = path.resolve(import.meta.dirname, "../..");

	it("should find TypeScript files in src/", () => {
		expect(allFiles.length).toBeGreaterThan(0);
	});

	describe("fs.writeFileSync only appears in allowed files", () => {
		for (const file of allFiles) {
			const relativePath = path.relative(rootDir, file);

			// Skip allowed files and markdown-write files
			if (ALLOWED_JSON_WRITE_FILES.has(relativePath)) continue;
			if (MARKDOWN_WRITE_FILES.has(relativePath)) continue;

			it(`${relativePath} has no fs.writeFileSync calls`, () => {
				const source = fs.readFileSync(file, "utf-8");
				const writes = findWriteCalls(source);

				if (writes.length > 0) {
					const details = writes.map((w) => `  line ${w.line}: ${w.text}`).join("\n");
					expect.fail(`Found fs write calls in ${relativePath} (not in allowed list):\n${details}`);
				}
			});
		}
	});

	describe("command handlers do not import fs write functions directly", () => {
		const commandFiles = allFiles.filter((f) =>
			path.relative(rootDir, f).startsWith("src/commands/"),
		);

		it("should find command handler files", () => {
			expect(commandFiles.length).toBeGreaterThan(0);
		});

		for (const file of commandFiles) {
			const relativePath = path.relative(rootDir, file);

			it(`${relativePath} does not write to filesystem`, () => {
				const source = fs.readFileSync(file, "utf-8");
				const writes = findWriteCalls(source);

				if (writes.length > 0) {
					const details = writes.map((w) => `  line ${w.line}: ${w.text}`).join("\n");
					expect.fail(`Command handler ${relativePath} directly writes to filesystem:\n${details}`);
				}
			});
		}
	});

	describe("RPC modules (except migrate.ts) do not import fs for writing", () => {
		const rpcFiles = allFiles.filter((f) => {
			const rel = path.relative(rootDir, f);
			return rel.startsWith("src/core/rpc/") && !ALLOWED_JSON_WRITE_FILES.has(rel);
		});

		it("should find RPC module files", () => {
			expect(rpcFiles.length).toBeGreaterThan(0);
		});

		for (const file of rpcFiles) {
			const relativePath = path.relative(rootDir, file);

			it(`${relativePath} does not write to filesystem`, () => {
				const source = fs.readFileSync(file, "utf-8");
				const writes = findWriteCalls(source);

				if (writes.length > 0) {
					const details = writes.map((w) => `  line ${w.line}: ${w.text}`).join("\n");
					expect.fail(`RPC module ${relativePath} directly writes to filesystem:\n${details}`);
				}
			});
		}
	});

	describe("allowed files are verified to exist", () => {
		for (const allowed of ALLOWED_JSON_WRITE_FILES) {
			it(`${allowed} exists (formal exception)`, () => {
				const absPath = path.resolve(rootDir, allowed);
				expect(fs.existsSync(absPath), `Allowed write file ${allowed} should exist`).toBe(true);
			});
		}
	});
});
