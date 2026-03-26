import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { validateSourcePath } from "../../../../src/commands/global/migrate/validate-source-path.js";

describe("validateSourcePath", () => {
	const testDir = join(tmpdir(), `goodplan-test-${Date.now()}`);
	const existingDir = join(testDir, "epics", "my-epic");

	beforeAll(() => {
		mkdirSync(existingDir, { recursive: true });
	});

	afterAll(() => {
		rmSync(testDir, { recursive: true, force: true });
	});

	it("returns resolved path for existing directory", () => {
		const result = validateSourcePath("epics/my-epic", testDir);
		expect(result).toBe(existingDir);
	});

	it("returns null for non-existent path", () => {
		const result = validateSourcePath("epics/does-not-exist", testDir);
		expect(result).toBeNull();
	});

	it("returns null for non-existent base directory", () => {
		const result = validateSourcePath("anything", "/tmp/nonexistent-base-dir-xyz");
		expect(result).toBeNull();
	});
});
