/**
 * Fitness function: Tree accuracy.
 * Verifies assembleState() tree keys match actual filesystem directory listings.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { assembleState, SKIP_NAMES } from "../../src/core/data/assemble.js";
import type { DirectoryEntry, StateEntry } from "../../src/core/tree.js";

const FIXTURES_DIR = path.resolve(import.meta.dirname, "../fixtures");

/**
 * Recursively verify that directory entry keys match filesystem listings.
 * Only checks directory contents — file entries are compared by name.
 */
function verifyTreeMatchesFs(
	entry: DirectoryEntry,
	absDir: string,
	relativePath: string,
	mismatches: string[],
): void {
	const fsEntries = fs.readdirSync(absDir);

	// Filter out skipped names (e.g., .state-cache.json)
	const fsFiltered = fsEntries.filter((name) => !SKIP_NAMES.has(name));

	// Get tree keys
	const treeKeys = Object.keys(entry.contents).sort();

	// Get expected filesystem names — only those that would produce tree entries
	// (json, jsonl, md files and directories)
	const expectedKeys = fsFiltered
		.filter((name) => {
			const full = path.join(absDir, name);
			const stat = fs.statSync(full);
			if (stat.isDirectory()) return true;
			return (
				name.endsWith(".json") ||
				name.endsWith(".jsonl") ||
				name.endsWith(".md")
			);
		})
		.sort();

	// Some files may be skipped if they don't have a registered schema
	// So we check that tree keys are a subset of filesystem entries
	const extraInTree = treeKeys.filter((k) => !expectedKeys.includes(k));
	if (extraInTree.length > 0) {
		mismatches.push(
			`${relativePath}: tree has entries not on filesystem: ${extraInTree.join(", ")}`,
		);
	}

	// Check directories recursively
	for (const [name, child] of Object.entries(entry.contents)) {
		if (child.type === "directory") {
			const childAbs = path.join(absDir, name);
			const childRel = relativePath ? `${relativePath}/${name}` : name;
			verifyTreeMatchesFs(child, childAbs, childRel, mismatches);
		}
	}
}

const fixtures = ["fresh-init", "epic-created", "epic-activated", "slice-in-progress"];

describe("Tree accuracy — tree keys match filesystem listing", () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-tree-accuracy-"));
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	for (const fixture of fixtures) {
		it(`${fixture}: tree keys are consistent with filesystem`, () => {
			const fixtureDir = path.join(FIXTURES_DIR, fixture);
			expect(fs.existsSync(fixtureDir), `Fixture ${fixture} should exist`).toBe(true);

			fs.cpSync(fixtureDir, tmpDir, { recursive: true });
			const projectDir = path.join(tmpDir, ".goodplan");

			const state = assembleState(projectDir);
			const mismatches: string[] = [];
			verifyTreeMatchesFs(state, projectDir, "", mismatches);

			if (mismatches.length > 0) {
				expect.fail(
					`Tree/filesystem mismatches:\n${mismatches.join("\n")}`,
				);
			}
		});
	}
});
