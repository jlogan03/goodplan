import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveProjectDir } from "../../../src/core/data/project.js";

let tmpDir: string;
const originalEnv = process.env.GOODPLAN_DIR;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "goodplan-project-test-"));
	// biome-ignore lint/performance/noDelete: process.env.X = undefined sets the string "undefined"
	delete process.env.GOODPLAN_DIR;
});

afterEach(() => {
	fs.rmSync(tmpDir, { recursive: true, force: true });
	if (originalEnv !== undefined) {
		process.env.GOODPLAN_DIR = originalEnv;
	} else {
		// biome-ignore lint/performance/noDelete: process.env.X = undefined sets the string "undefined"
		delete process.env.GOODPLAN_DIR;
	}
});

describe("resolveProjectDir", () => {
	it("uses GOODPLAN_DIR env var when set, even when walk-up would find .project/", () => {
		// Create a .project/ that walk-up would find
		const walkUpProject = path.join(tmpDir, ".project");
		fs.mkdirSync(walkUpProject);

		// Create a separate directory for GOODPLAN_DIR to point to
		const customDir = path.join(tmpDir, "custom-project");
		fs.mkdirSync(customDir);
		process.env.GOODPLAN_DIR = customDir;

		// GOODPLAN_DIR should take priority over walk-up
		expect(resolveProjectDir(tmpDir)).toBe(customDir);
	});

	it("throws when GOODPLAN_DIR points to a non-existent path", () => {
		process.env.GOODPLAN_DIR = path.join(tmpDir, "does-not-exist");
		expect(() => resolveProjectDir()).toThrow("GOODPLAN_DIR points to a path");
	});

	it("finds .project/ in the given cwd", () => {
		const projectDir = path.join(tmpDir, ".project");
		fs.mkdirSync(projectDir);

		expect(resolveProjectDir(tmpDir)).toBe(projectDir);
	});

	it("walks up to find .project/ from a nested subdirectory", () => {
		// Create .project/ at root
		const projectDir = path.join(tmpDir, ".project");
		fs.mkdirSync(projectDir);

		// Create nested subdirectory two levels deep
		const nestedDir = path.join(tmpDir, "a", "b");
		fs.mkdirSync(nestedDir, { recursive: true });

		expect(resolveProjectDir(nestedDir)).toBe(projectDir);
	});

	it("throws when no .project/ directory exists", () => {
		const isolatedDir = path.join(tmpDir, "isolated");
		fs.mkdirSync(isolatedDir);

		// Walk-up goes past tmpDir to /tmp and parents which won't have .project/
		expect(() => resolveProjectDir(isolatedDir)).toThrow("No .project/ directory found");
	});
});
