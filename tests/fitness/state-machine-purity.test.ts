/**
 * Fitness function: INV-003 — State machine purity.
 * Verifies no I/O modules are value-imported in src/core/state/.
 * `import type` declarations are safe (erased at runtime) and are skipped.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { collectTsFiles } from "./helpers.js";

const STATE_DIR = path.resolve(import.meta.dirname, "../../src/core/state");

/** I/O modules that must not be value-imported in the state machine. */
const FORBIDDEN_MODULES = new Set([
	"fs",
	"node:fs",
	"node:fs/promises",
	"fs/promises",
	"path",
	"node:path",
	"node:child_process",
	"http",
	"node:http",
	"https",
	"node:https",
	"net",
	"node:net",
]);

/**
 * Parse value imports from a TypeScript source file.
 * Skips `import type` declarations which produce no runtime code.
 * Returns an array of {module, line} for any forbidden I/O imports.
 */
function findForbiddenImports(
	source: string,
): Array<{ module: string; line: number }> {
	const results: Array<{ module: string; line: number }> = [];
	const lines = source.split("\n");

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]!;
		const trimmed = line.trim();

		// Skip import type declarations (no runtime I/O)
		if (trimmed.startsWith("import type ")) continue;

		// Match: import ... from "module"
		const fromMatch = /from\s+["']([^"']+)["']/.exec(trimmed);
		if (fromMatch !== null && trimmed.startsWith("import")) {
			const mod = fromMatch[1]!;
			if (FORBIDDEN_MODULES.has(mod)) {
				results.push({ module: mod, line: i + 1 });
			}
		}

		// Match: require("module")
		const requireMatch = /require\(["']([^"']+)["']\)/.exec(trimmed);
		if (requireMatch !== null) {
			const mod = requireMatch[1]!;
			if (FORBIDDEN_MODULES.has(mod)) {
				results.push({ module: mod, line: i + 1 });
			}
		}
	}

	return results;
}

describe("INV-003: State machine purity — no I/O imports", () => {
	const files = collectTsFiles(STATE_DIR);

	it("should find TypeScript files in src/core/state/", () => {
		expect(files.length).toBeGreaterThan(0);
	});

	for (const file of files) {
		const relativePath = path.relative(
			path.resolve(import.meta.dirname, "../.."),
			file,
		);

		it(`${relativePath} has no I/O value imports`, () => {
			const source = fs.readFileSync(file, "utf-8");
			const forbidden = findForbiddenImports(source);

			if (forbidden.length > 0) {
				const details = forbidden
					.map((f) => `  line ${f.line}: ${f.module}`)
					.join("\n");
				expect.fail(
					`Found forbidden I/O imports in ${relativePath}:\n${details}`,
				);
			}
		});
	}
});
