/**
 * assembleState — reads the `.goodplan/` filesystem into a ProjectState tree.
 * Validates all JSON/JSONL against the schema registry.
 * Returns ZERO_STATE if `.goodplan/` doesn't exist.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { debug } from "../../util/debug.js";
import { GoodplanError } from "../../util/errors.js";
import { findSchema } from "./schema-registry.js";
import { ZERO_STATE } from "./tree.js";
import type {
	DirectoryEntry,
	JsonEntry,
	JsonlEntry,
	MarkdownEntry,
	ProjectState,
	StateEntry,
} from "./tree.js";

/** Files/directories to skip during assembly and incremental cache updates. */
export const SKIP_NAMES = new Set([".state-cache.json", "node_modules"]);

interface ValidationError {
	file: string;
	message: string;
}

export function assembleState(projectDir?: string): ProjectState {
	if (projectDir === undefined) {
		return ZERO_STATE;
	}

	if (!fs.existsSync(projectDir) || !fs.statSync(projectDir).isDirectory()) {
		debug(`projectDir does not exist: ${projectDir}`);
		return ZERO_STATE;
	}

	const errors: ValidationError[] = [];
	const tree = walkDirectory(projectDir, "", errors);

	if (errors.length > 0) {
		const detail: Record<string, unknown> = {
			errors: errors.map((e) => ({ file: e.file, message: e.message })),
		};
		throw new GoodplanError(
			"DATA_VALIDATION_ERROR",
			`Validation failed for ${errors.length} file(s): ${errors.map((e) => e.file).join(", ")}`,
			detail,
		);
	}

	debug(`assembleState complete: assembled tree from ${projectDir}`);
	return tree;
}

function walkDirectory(
	rootDir: string,
	relativePath: string,
	errors: ValidationError[],
): DirectoryEntry {
	const absDir = relativePath ? path.join(rootDir, relativePath) : rootDir;
	const entries = fs.readdirSync(absDir);
	const contents: Record<string, StateEntry> = {};

	for (const name of entries) {
		if (SKIP_NAMES.has(name)) {
			debug(`skip: ${relativePath ? `${relativePath}/${name}` : name}`);
			continue;
		}

		const childRelative = relativePath ? `${relativePath}/${name}` : name;
		const childAbs = path.join(absDir, name);
		const stat = fs.statSync(childAbs);

		if (stat.isDirectory()) {
			debug(`read dir: ${childRelative}/`);
			contents[name] = walkDirectory(rootDir, childRelative, errors);
		} else if (stat.isFile()) {
			const entry = readFile(rootDir, childRelative, childAbs, name, errors);
			if (entry !== undefined) {
				contents[name] = entry;
			}
		}
		// Symlinks and other types are silently skipped
	}

	return { type: "directory", contents };
}

function readFile(
	_rootDir: string,
	relativePath: string,
	absPath: string,
	name: string,
	errors: ValidationError[],
): StateEntry | undefined {
	if (name.endsWith(".json")) {
		return readJsonFile(relativePath, absPath, errors);
	}
	if (name.endsWith(".jsonl")) {
		return readJsonlFile(relativePath, absPath, errors);
	}
	if (name.endsWith(".md")) {
		return readMarkdownFile(relativePath, absPath);
	}
	// Unknown file type — silently skip
	debug(`skip unknown type: ${relativePath}`);
	return undefined;
}

function readJsonFile(
	relativePath: string,
	absPath: string,
	errors: ValidationError[],
): JsonEntry<unknown> | undefined {
	const schema = findSchema(relativePath);
	if (schema === undefined) {
		debug(`skip unregistered json: ${relativePath}`);
		return undefined;
	}

	debug(`read json: ${relativePath}`);
	const raw = fs.readFileSync(absPath, "utf-8");

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		errors.push({ file: relativePath, message: "Invalid JSON" });
		return undefined;
	}

	const result = schema.safeParse(parsed);
	if (!result.success) {
		errors.push({
			file: relativePath,
			message: result.error.message,
		});
		return undefined;
	}

	debug(`validated json: ${relativePath}`);
	return { type: "json", content: result.data };
}

function readJsonlFile(
	relativePath: string,
	absPath: string,
	errors: ValidationError[],
): JsonlEntry<unknown> | undefined {
	const schema = findSchema(relativePath);
	if (schema === undefined) {
		debug(`skip unregistered jsonl: ${relativePath}`);
		return undefined;
	}

	debug(`read jsonl: ${relativePath}`);
	const raw = fs.readFileSync(absPath, "utf-8");
	const lines = raw.split("\n").filter((line) => line.trim().length > 0);
	const items: unknown[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]!;
		let parsed: unknown;
		try {
			parsed = JSON.parse(line);
		} catch {
			errors.push({
				file: relativePath,
				message: `Invalid JSON on line ${i + 1}`,
			});
			continue;
		}

		const result = schema.safeParse(parsed);
		if (!result.success) {
			errors.push({
				file: relativePath,
				message: `Validation failed on line ${i + 1}: ${result.error.message}`,
			});
			continue;
		}

		items.push(result.data);
	}

	debug(`validated jsonl: ${relativePath} (${items.length} entries)`);
	return { type: "jsonl", content: items };
}

function readMarkdownFile(relativePath: string, absPath: string): MarkdownEntry {
	debug(`read markdown: ${relativePath}`);
	const content = fs.readFileSync(absPath, "utf-8");
	return { type: "markdown", content };
}
