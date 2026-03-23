import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { buildBinary, runCommand, withFixture } from "./helpers.js";

let bin: string;

beforeAll(() => {
	bin = buildBinary();
});

describe("smoke tests", () => {
	it("--version exits 0 and prints version", () => {
		const result = runCommand(bin, ["--version"]);
		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("goodplan");
	});

	it("--help exits 0 and prints usage", () => {
		const result = runCommand(bin, ["--help"]);
		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("init");
	});

	it("init creates .project/ directory with expected structure", () => {
		const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "goodplan-smoke-init-"));

		try {
			const result = runCommand(bin, ["init", "--json"], {
				cwd: tmpDir,
				env: { GOODPLAN_DIR: path.join(tmpDir, ".project") },
			});
			expect(result.exitCode).toBe(0);
			expect(result.json).toBeDefined();

			const projectDir = path.join(tmpDir, ".project");
			expect(fs.existsSync(projectDir)).toBe(true);
			expect(fs.existsSync(path.join(projectDir, "project.json"))).toBe(true);
			expect(fs.existsSync(path.join(projectDir, "activity-log.jsonl"))).toBe(true);
			expect(fs.existsSync(path.join(projectDir, "epics", "overview.json"))).toBe(true);
			expect(fs.existsSync(path.join(projectDir, "slices", "overview.json"))).toBe(true);
			expect(fs.existsSync(path.join(projectDir, "quests", "overview.json"))).toBe(true);
		} finally {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it("withFixture copies fixture and sets GOODPLAN_DIR", async () => {
		await withFixture("fresh-init", ({ env }) => {
			const goodplanDir = env.GOODPLAN_DIR;
			expect(goodplanDir).toBeDefined();
			expect(fs.existsSync(goodplanDir)).toBe(true);
			expect(fs.existsSync(path.join(goodplanDir, "project.json"))).toBe(true);
		});
	});
});
