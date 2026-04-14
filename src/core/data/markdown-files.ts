/**
 * Data Layer helpers for writing and copying markdown files.
 * Used by the RPC layer to write per-learning .md files and copy them during rollup.
 * Preserves the architectural boundary: all filesystem I/O flows through the Data Layer.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { debug } from "../../util/debug.js";
import { GoodplanError } from "../../util/errors.js";

export interface MarkdownFile {
	/** Relative path within .goodplan/ (e.g., "epics/e1/slices/s1/learnings/my-slug.md") */
	path: string;
	content: string;
}

export interface MarkdownCopy {
	/** Source path relative to .goodplan/ */
	from: string;
	/** Destination path relative to .goodplan/ */
	to: string;
}

/**
 * Write markdown files to the filesystem. Creates directories on-demand.
 * @param projectDir - Absolute path to .goodplan/
 * @param files - Array of {path, content} where path is relative to projectDir
 */
export function writeMarkdownFiles(projectDir: string, files: ReadonlyArray<MarkdownFile>): void {
	for (const file of files) {
		const absPath = path.join(projectDir, file.path);
		const dir = path.dirname(absPath);
		fs.mkdirSync(dir, { recursive: true });

		const tmpPath = `${absPath}.tmp.${process.pid}`;
		try {
			fs.writeFileSync(tmpPath, file.content, "utf-8");
			fs.renameSync(tmpPath, absPath);
			debug(`write markdown: ${file.path}`);
		} catch (err) {
			try {
				fs.unlinkSync(tmpPath);
			} catch (cleanupErr) {
				debug(`cleanup failed for ${tmpPath}: ${String(cleanupErr)}`);
			}
			throw new GoodplanError(
				"DATA_WRITE_ERROR",
				`Failed to write markdown file ${file.path}`,
				{ file: file.path },
				err,
			);
		}
	}
}

/**
 * Copy markdown files within .goodplan/. Creates destination directories on-demand.
 * @param projectDir - Absolute path to .goodplan/
 * @param copies - Array of {from, to} where paths are relative to projectDir
 */
export function copyMarkdownFiles(projectDir: string, copies: ReadonlyArray<MarkdownCopy>): void {
	for (const copy of copies) {
		const srcAbs = path.join(projectDir, copy.from);
		const destAbs = path.join(projectDir, copy.to);

		if (!fs.existsSync(srcAbs)) {
			debug(`skip copy (source missing): ${copy.from} -> ${copy.to}`);
			continue;
		}

		const destDir = path.dirname(destAbs);
		fs.mkdirSync(destDir, { recursive: true });

		try {
			fs.copyFileSync(srcAbs, destAbs);
			debug(`copy markdown: ${copy.from} -> ${copy.to}`);
		} catch (err) {
			throw new GoodplanError(
				"DATA_WRITE_ERROR",
				`Failed to copy markdown file ${copy.from} -> ${copy.to}`,
				{ from: copy.from, to: copy.to },
				err,
			);
		}
	}
}
