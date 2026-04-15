/**
 * Fitness function: V2 Layer Boundary Enforcement.
 *
 * Scans imports in v2 subsystem directories to enforce dependency direction:
 * - src/engine/ must NOT import from src/context/, src/trust/, or src/commands/
 * - src/context/ must NOT import from src/trust/ or src/commands/
 * - src/trust/ must NOT import from src/commands/
 *
 * All layers may import from src/schemas/ and src/util/ (shared leaf modules).
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { collectTsFiles } from "./helpers.js";

const SRC_DIR = path.resolve(import.meta.dirname, "../../src");

interface LayerRule {
	/** Directory to scan (relative to src/) */
	layer: string;
	/** Directories that must NOT appear in imports (relative to src/) */
	forbidden: string[];
}

const LAYER_RULES: LayerRule[] = [
	{
		layer: "engine",
		forbidden: ["context", "trust", "commands"],
	},
	{
		layer: "context",
		forbidden: ["trust", "commands"],
	},
	{
		layer: "trust",
		forbidden: ["commands"],
	},
];

/**
 * Extract import paths from a TypeScript source file.
 * Matches both `import ... from "..."` and `import("...")` patterns.
 */
function extractImportPaths(source: string): string[] {
	const paths: string[] = [];
	// Static imports: import ... from "path"
	const staticPattern = /from\s+["']([^"']+)["']/g;
	let match: RegExpExecArray | null;
	match = staticPattern.exec(source);
	while (match !== null) {
		const importPath = match[1];
		if (importPath !== undefined) {
			paths.push(importPath);
		}
		match = staticPattern.exec(source);
	}
	// Dynamic imports: import("path")
	const dynamicPattern = /import\(\s*["']([^"']+)["']\s*\)/g;
	match = dynamicPattern.exec(source);
	while (match !== null) {
		const importPath = match[1];
		if (importPath !== undefined) {
			paths.push(importPath);
		}
		match = dynamicPattern.exec(source);
	}
	return paths;
}

/**
 * Check if an import path references a forbidden layer.
 * Import paths are relative (e.g., "../context/bundler.js" or "../../trust/convergence.js").
 */
function importReferencesForbiddenLayer(
	importPath: string,
	forbidden: string[],
): string | undefined {
	for (const layer of forbidden) {
		// Check relative paths containing the layer directory
		if (
			importPath.includes(`/${layer}/`) ||
			importPath.startsWith(`../${layer}`) ||
			importPath.startsWith(`./${layer}`) ||
			importPath === `../${layer}` ||
			importPath === `./${layer}`
		) {
			return layer;
		}
	}
	return undefined;
}

describe("V2 layer boundary enforcement", () => {
	for (const rule of LAYER_RULES) {
		const layerDir = path.join(SRC_DIR, rule.layer);

		it(`src/${rule.layer}/ must not import from ${rule.forbidden.join(", ")}`, () => {
			if (!fs.existsSync(layerDir)) {
				// Layer directory doesn't exist yet — nothing to check
				return;
			}

			const files = collectTsFiles(layerDir);
			const violations: string[] = [];

			for (const filePath of files) {
				const source = fs.readFileSync(filePath, "utf-8");
				const imports = extractImportPaths(source);
				const relFile = path.relative(SRC_DIR, filePath);

				for (const imp of imports) {
					const violatedLayer = importReferencesForbiddenLayer(imp, rule.forbidden);
					if (violatedLayer !== undefined) {
						violations.push(
							`${relFile} imports "${imp}" (references forbidden layer: ${violatedLayer})`,
						);
					}
				}
			}

			expect(violations, `Layer boundary violations in src/${rule.layer}/`).toEqual([]);
		});
	}
});
