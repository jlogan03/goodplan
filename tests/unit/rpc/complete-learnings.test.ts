import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { begin } from "../../../src/core/rpc/begin.js";
import { complete } from "../../../src/core/rpc/complete.js";
import { rpcInit } from "../../../src/core/rpc/init.js";
import { submit } from "../../../src/core/rpc/submit.js";
import type { Verification } from "../../../src/schemas/entities/epic.js";
import { GoodplanError } from "../../../src/util/errors.js";

let tmpDir: string;
let projectDir: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-learnings-"));
	projectDir = path.join(tmpDir, ".goodplan");
});

afterEach(() => {
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

const verification: Verification = {
	description: "CLI works",
	status: "pending",
	addedDuring: "defining-slices",
	modifiedDuring: null,
};

function invalidateCache() {
	const cachePath = path.join(projectDir, ".state-cache.json");
	if (fs.existsSync(cachePath)) {
		fs.unlinkSync(cachePath);
	}
}

function setupActivatedEpic() {
	rpcInit(projectDir, "test");
	begin(projectDir, "create", { type: "epic", name: "e1" }, { name: "e1", goal: "G" });
	begin(projectDir, "explore", { type: "epic", name: "e1" }, {});
	submit(projectDir, "explore", { type: "epic", name: "e1" }, { phase: "explore" });
	begin(projectDir, "define-architecture", { type: "epic", name: "e1" }, {});
	submit(projectDir, "architecture", { type: "epic", name: "e1" }, { phase: "architecture" });
	begin(projectDir, "refine-architecture", { type: "epic", name: "e1" }, {});
	submit(projectDir, "refine-architecture", { type: "epic", name: "e1" }, { phase: "refine-architecture", scores: { q: 10 } });
	begin(projectDir, "define-slices", { type: "epic", name: "e1" }, {});
	submit(projectDir, "slices", { type: "epic", name: "e1" }, { phase: "slices" });
	begin(projectDir, "refine-slices", { type: "epic", name: "e1" }, {});
	submit(projectDir, "refine-slices", { type: "epic", name: "e1" }, { phase: "refine-slices", scores: { q: 10 } });
	begin(projectDir, "add-verification", { type: "epic", name: "e1" }, { verification });
	begin(projectDir, "activate", { type: "epic", name: "e1" }, {});
}

function setupSliceInImplementationComplete(sliceName = "s1", epicName = "e1") {
	setupActivatedEpic();
	begin(projectDir, "create", { type: "slice", name: sliceName, epic: epicName }, { name: sliceName, goal: "First slice goal", epic: epicName });
	begin(projectDir, "plan", { type: "slice", name: sliceName, epic: epicName }, {});
	const sliceDir = path.join(projectDir, "epics", epicName, "slices", sliceName);
	fs.writeFileSync(path.join(sliceDir, "plan.md"), "# Plan\nDo stuff");
	invalidateCache();
	submit(projectDir, "plan", { type: "slice", name: sliceName, epic: epicName }, { phase: "plan" });
	submit(projectDir, "refinement", { type: "slice", name: sliceName, epic: epicName }, { phase: "refinement", scores: { q: 10 } });
	fs.writeFileSync(path.join(sliceDir, "plan-refined.md"), "# Refined Plan\nDo stuff better");
	invalidateCache();
	begin(projectDir, "implement", { type: "slice", name: sliceName, epic: epicName }, {});
	submit(projectDir, "implementation", { type: "slice", name: sliceName, epic: epicName }, { phase: "implementation" });
}

describe("complete — learnings directory pattern", () => {
	it("creates .md files and JSONL entries with file field on slice completion", () => {
		setupSliceInImplementationComplete();

		const result = complete(
			projectDir,
			{ type: "slice", name: "s1", epic: "e1" },
			{
				type: "slice",
				verificationPassed: true,
				learnings: [
					{
						category: "domain",
						summary: "Data layer needs caching",
						detail: "Disk I/O is too slow without caching and we need a proper caching strategy",
						tags: ["perf"],
						rollupTo: ["epic", "project"],
					},
				],
			},
		);

		expect(result.newStatus).toBe("completed");

		// Verify .md file was created
		const mdPath = path.join(
			projectDir,
			"epics",
			"e1",
			"slices",
			"s1",
			"learnings",
			"data-layer-needs-caching.md",
		);
		expect(fs.existsSync(mdPath)).toBe(true);
		const mdContent = fs.readFileSync(mdPath, "utf-8");
		expect(mdContent).toBe("Disk I/O is too slow without caching and we need a proper caching strategy");

		// Verify JSONL entry has file field
		const jsonlPath = path.join(projectDir, "epics", "e1", "slices", "s1", "learnings.jsonl");
		const jsonlContent = fs.readFileSync(jsonlPath, "utf-8");
		const entries = jsonlContent.trim().split("\n").map((line) => JSON.parse(line));
		const lastEntry = entries[entries.length - 1];
		expect(lastEntry.file).toBe("learnings/data-layer-needs-caching.md");
		expect(lastEntry.source).toBe("epics/e1/slices/s1");
		expect(lastEntry.detail).toBeUndefined();
	});

	it("handles multiple learnings with correct slug derivation", () => {
		setupSliceInImplementationComplete();

		complete(
			projectDir,
			{ type: "slice", name: "s1", epic: "e1" },
			{
				type: "slice",
				verificationPassed: true,
				learnings: [
					{ category: "domain", summary: "First learning", detail: "Detail 1", tags: [], rollupTo: [] },
					{ category: "worked", summary: "Second learning", detail: "Detail 2", tags: [], rollupTo: [] },
					{ category: "didnt-work", summary: "Third learning", detail: "Detail 3", tags: [], rollupTo: [] },
				],
			},
		);

		const learningsDir = path.join(projectDir, "epics", "e1", "slices", "s1", "learnings");
		expect(fs.existsSync(path.join(learningsDir, "first-learning.md"))).toBe(true);
		expect(fs.existsSync(path.join(learningsDir, "second-learning.md"))).toBe(true);
		expect(fs.existsSync(path.join(learningsDir, "third-learning.md"))).toBe(true);
	});

	it("handles slug collisions within a single completion", () => {
		setupSliceInImplementationComplete();

		complete(
			projectDir,
			{ type: "slice", name: "s1", epic: "e1" },
			{
				type: "slice",
				verificationPassed: true,
				learnings: [
					{ category: "domain", summary: "Same name", detail: "First", tags: [], rollupTo: [] },
					{ category: "worked", summary: "Same name", detail: "Second", tags: [], rollupTo: [] },
				],
			},
		);

		const learningsDir = path.join(projectDir, "epics", "e1", "slices", "s1", "learnings");
		expect(fs.existsSync(path.join(learningsDir, "same-name.md"))).toBe(true);
		expect(fs.existsSync(path.join(learningsDir, "same-name-2.md"))).toBe(true);
	});

	it("detail field in input is transformed to file in JSONL output", () => {
		setupSliceInImplementationComplete();

		complete(
			projectDir,
			{ type: "slice", name: "s1", epic: "e1" },
			{
				type: "slice",
				verificationPassed: true,
				learnings: [
					{
						category: "domain",
						summary: "Test",
						detail: "Detailed description here",
						tags: ["test"],
						rollupTo: ["project"],
					},
				],
			},
		);

		// Check the JSONL entries at slice, epic (not rolled to epic here), and project level
		const projectJsonl = path.join(projectDir, "learnings.jsonl");
		const content = fs.readFileSync(projectJsonl, "utf-8");
		const entries = content.trim().split("\n").map((line) => JSON.parse(line));
		const lastEntry = entries[entries.length - 1];
		expect(lastEntry.file).toBe("learnings/test.md");
		expect(lastEntry.detail).toBeUndefined();
	});

	it("error paths produce non-zero exit codes (verification failed)", () => {
		setupSliceInImplementationComplete();

		expect(() =>
			complete(
				projectDir,
				{ type: "slice", name: "s1", epic: "e1" },
				{ type: "slice", verificationPassed: false },
			),
		).toThrow(GoodplanError);

		try {
			complete(
				projectDir,
				{ type: "slice", name: "s1", epic: "e1" },
				{ type: "slice", verificationPassed: false },
			);
		} catch (err) {
			expect((err as GoodplanError).code).toBe("STATE_VERIFICATION_FAILED");
		}
	});

	it("rollup copies JSONL entries with file field to target scopes", () => {
		setupSliceInImplementationComplete();

		complete(
			projectDir,
			{ type: "slice", name: "s1", epic: "e1" },
			{
				type: "slice",
				verificationPassed: true,
				learnings: [
					{
						category: "domain",
						summary: "Rolled up learning",
						detail: "This gets rolled up",
						tags: [],
						rollupTo: ["epic", "project"],
					},
				],
			},
		);

		// Verify epic-level JSONL has file field
		const epicJsonl = path.join(projectDir, "epics", "e1", "learnings.jsonl");
		const epicContent = fs.readFileSync(epicJsonl, "utf-8");
		const epicEntries = epicContent.trim().split("\n").map((line) => JSON.parse(line));
		expect(epicEntries[epicEntries.length - 1].file).toBe("learnings/rolled-up-learning.md");

		// Verify project-level JSONL has file field
		const projectJsonl = path.join(projectDir, "learnings.jsonl");
		const projectContent = fs.readFileSync(projectJsonl, "utf-8");
		const projectEntries = projectContent.trim().split("\n").map((line) => JSON.parse(line));
		expect(projectEntries[projectEntries.length - 1].file).toBe("learnings/rolled-up-learning.md");
	});
});

describe("complete — quest learnings directory pattern", () => {
	function setupQuestInImplementationComplete() {
		rpcInit(projectDir, "test");
		begin(projectDir, "create", { type: "quest", name: "q1" }, { name: "q1", goal: "Fix stuff" });
		begin(projectDir, "plan", { type: "quest", name: "q1" }, {});
		const questDir = path.join(projectDir, "quests", "q1");
		fs.writeFileSync(path.join(questDir, "plan.md"), "# Plan\nFix stuff");
		invalidateCache();
		submit(projectDir, "plan", { type: "quest", name: "q1" }, { phase: "plan" });
		submit(projectDir, "refinement", { type: "quest", name: "q1" }, { phase: "refinement", scores: { q: 10 } });
		fs.writeFileSync(path.join(questDir, "plan-refined.md"), "# Refined\nFix stuff better");
		invalidateCache();
		begin(projectDir, "implement", { type: "quest", name: "q1" }, {});
		submit(projectDir, "implementation", { type: "quest", name: "q1" }, { phase: "implementation" });
	}

	it("creates .md files for quest completion", () => {
		setupQuestInImplementationComplete();

		const result = complete(
			projectDir,
			{ type: "quest", name: "q1" },
			{
				type: "quest",
				verificationPassed: true,
				learnings: [
					{
						category: "domain",
						summary: "Quest learning",
						detail: "Important quest finding",
						tags: ["quest"],
						rollupTo: ["project"],
					},
				],
			},
		);

		expect(result.newStatus).toBe("completed");

		// Verify .md file was created
		const mdPath = path.join(projectDir, "quests", "q1", "learnings", "quest-learning.md");
		expect(fs.existsSync(mdPath)).toBe(true);
		expect(fs.readFileSync(mdPath, "utf-8")).toBe("Important quest finding");

		// Verify JSONL has file field
		const jsonlPath = path.join(projectDir, "quests", "q1", "learnings.jsonl");
		const content = fs.readFileSync(jsonlPath, "utf-8");
		const entries = content.trim().split("\n").map((line) => JSON.parse(line));
		expect(entries[entries.length - 1].file).toBe("learnings/quest-learning.md");
	});
});
