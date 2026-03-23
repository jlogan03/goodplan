import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { withFixture } from "./helpers.js";

describe("smoke tests", () => {
	it("withFixture copies fixture and sets GOODPLAN_DIR", async () => {
		await withFixture("fresh-init", ({ env }) => {
			const goodplanDir = env.GOODPLAN_DIR;
			expect(goodplanDir).toBeDefined();
			expect(fs.existsSync(goodplanDir)).toBe(true);
			expect(fs.existsSync(path.join(goodplanDir, "project.json"))).toBe(true);
		});
	});
});
