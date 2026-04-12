import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { begin } from "../../../src/core/rpc/begin.js";
import { complete } from "../../../src/core/rpc/complete.js";
import { rpcInit } from "../../../src/core/rpc/init.js";
import { submit } from "../../../src/core/rpc/submit.js";
import type { Verification, VerificationResult } from "../../../src/schemas/entities/epic.js";
import { GoodplanError } from "../../../src/util/errors.js";

let tmpDir: string;
let projectDir: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-rpc-complete-"));
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

function setupActivatedEpic() {
	rpcInit(projectDir, "test");
	begin(projectDir, "create", { type: "epic", name: "e1" }, { name: "e1", goal: "G" });
	begin(projectDir, "explore", { type: "epic", name: "e1" }, {});
	submit(projectDir, "explore", { type: "epic", name: "e1" }, { phase: "explore" });
	begin(projectDir, "define-architecture", { type: "epic", name: "e1" }, {});
	submit(projectDir, "architecture", { type: "epic", name: "e1" }, { phase: "architecture" });
	begin(projectDir, "refine-architecture", { type: "epic", name: "e1" }, {});
	submit(
		projectDir,
		"refine-architecture",
		{ type: "epic", name: "e1" },
		{
			phase: "refine-architecture",
			scores: { q: 10 },
		},
	);
	begin(projectDir, "define-slices", { type: "epic", name: "e1" }, {});
	submit(projectDir, "slices", { type: "epic", name: "e1" }, { phase: "slices" });
	begin(projectDir, "refine-slices", { type: "epic", name: "e1" }, {});
	submit(
		projectDir,
		"refine-slices",
		{ type: "epic", name: "e1" },
		{
			phase: "refine-slices",
			scores: { q: 10 },
		},
	);
	begin(projectDir, "add-verification", { type: "epic", name: "e1" }, { verification });
	begin(projectDir, "activate", { type: "epic", name: "e1" }, {});
}

describe("complete — COMPLETE_EPIC", () => {
	it("completes epic with all verifications passing", () => {
		setupActivatedEpic();

		const verificationResults: VerificationResult[] = [
			{ index: 0, passed: true, notes: "All good" },
		];

		const result = complete(
			projectDir,
			{ type: "epic", name: "e1" },
			{ type: "epic", verificationResults },
		);

		expect(result.entity).toBe("e1");
		expect(result.previousStatus).toBe("activated");
		expect(result.newStatus).toBe("completed");
	});

	it("rejects completion when verification fails", () => {
		setupActivatedEpic();

		const verificationResults: VerificationResult[] = [
			{ index: 0, passed: false, notes: "Not working" },
		];

		expect(() =>
			complete(projectDir, { type: "epic", name: "e1" }, { type: "epic", verificationResults }),
		).toThrow(GoodplanError);

		try {
			complete(projectDir, { type: "epic", name: "e1" }, { type: "epic", verificationResults });
		} catch (err) {
			expect((err as GoodplanError).code).toBe("STATE_VERIFICATION_FAILED");
		}
	});
});

/** Remove the state cache so that the next loadState does a fresh assembleState.
 *  Necessary when writing files directly to disk (simulating sub-agent writes)
 *  because directory mtime granularity can cause stale cache hits. */
function invalidateCache() {
	const cachePath = path.join(projectDir, ".state-cache.json");
	if (fs.existsSync(cachePath)) {
		fs.unlinkSync(cachePath);
	}
}

function setupSliceInImplementationComplete(sliceName = "s1", epicName = "e1") {
	setupActivatedEpic();
	begin(
		projectDir,
		"create",
		{ type: "slice", name: sliceName, epic: epicName },
		{
			name: sliceName,
			goal: "First slice goal",
			epic: epicName,
		},
	);
	begin(projectDir, "plan", { type: "slice", name: sliceName, epic: epicName }, {});
	// Write plan.md (required by COMPLETE_PLAN guard) — simulates sub-agent write
	const sliceDir = path.join(projectDir, "epics", epicName, "slices", sliceName);
	fs.writeFileSync(path.join(sliceDir, "plan.md"), "# Plan\nDo stuff");
	invalidateCache();
	submit(projectDir, "plan", { type: "slice", name: sliceName, epic: epicName }, { phase: "plan" });
	// Skip refinement via high scores (advances to plan-refined)
	submit(
		projectDir,
		"refinement",
		{ type: "slice", name: sliceName, epic: epicName },
		{
			phase: "refinement",
			scores: { q: 10 },
		},
	);
	// Write plan-refined.md (required by BEGIN_IMPLEMENTATION guard) — simulates sub-agent write
	fs.writeFileSync(path.join(sliceDir, "plan-refined.md"), "# Refined Plan\nDo stuff better");
	invalidateCache();
	begin(projectDir, "implement", { type: "slice", name: sliceName, epic: epicName }, {});
	submit(
		projectDir,
		"implementation",
		{ type: "slice", name: sliceName, epic: epicName },
		{ phase: "implementation" },
	);
}

describe("complete — COMPLETE_SLICE", () => {
	it("completes slice with verification passed", () => {
		setupSliceInImplementationComplete();

		const result = complete(
			projectDir,
			{ type: "slice", name: "s1", epic: "e1" },
			{ type: "slice", verificationPassed: true },
		);

		expect(result.entity).toBe("s1");
		expect(result.previousStatus).toBe("implementation-complete");
		expect(result.newStatus).toBe("completed");
	});

	it("rejects completion when verificationPassed is false", () => {
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

	it("completes slice with full payload (deferred, learnings, architectureDelta)", () => {
		setupSliceInImplementationComplete("s1");
		// Create second slice for deferred routing
		begin(
			projectDir,
			"create",
			{ type: "slice", name: "s2", epic: "e1" },
			{
				name: "s2",
				goal: "Second slice",
				epic: "e1",
			},
		);

		const result = complete(
			projectDir,
			{ type: "slice", name: "s1", epic: "e1" },
			{
				type: "slice",
				verificationPassed: true,
				deferred: [{ description: "Handle edge case", targetSlice: "s2" }],
				learnings: [
					{
						category: "domain",
						summary: "Caching is needed",
						detail: "Disk I/O too slow",
						tags: ["perf"],
						rollupTo: ["epic", "project"],
					},
				],
				architectureDelta: [
					{
						subsystem: "data-layer",
						type: "modify",
						description: "Added caching layer",
					},
				],
			},
		);

		expect(result.entity).toBe("s1");
		expect(result.newStatus).toBe("completed");

		// deferredRouted should contain the routed item
		expect(result.deferredRouted).toHaveLength(1);
		expect(result.deferredRouted?.[0]?.targetSlice).toBe("s2");

		// learningsRolledUp should show counts
		expect(result.learningsRolledUp).toEqual({ epic: 1, project: 1 });

		// architecturePaths should be present since we provided deltas
		expect(result.architecturePaths).toBeDefined();
		expect(result.architecturePaths?.currentArchitecture).toBe("epics/e1/architecture");

		// Verify deferred item was actually routed to s2 on disk
		const s2Json = JSON.parse(
			fs.readFileSync(path.join(projectDir, "epics", "e1", "slices", "s2", "slice.json"), "utf-8"),
		);
		expect(s2Json.deferred).toHaveLength(1);
		expect(s2Json.deferred[0].description).toBe("Handle edge case");
	});

	it("detects epicComplete when all slices are done", () => {
		setupSliceInImplementationComplete("s1");

		const result = complete(
			projectDir,
			{ type: "slice", name: "s1", epic: "e1" },
			{ type: "slice", verificationPassed: true },
		);

		// Only one slice in epic, and it's now completed
		expect(result.epicComplete).toBe(true);
	});

	it("epicComplete is false when sibling slices remain", () => {
		setupSliceInImplementationComplete("s1");
		// Create second slice that is still in created status
		begin(
			projectDir,
			"create",
			{ type: "slice", name: "s2", epic: "e1" },
			{
				name: "s2",
				goal: "Second slice",
				epic: "e1",
			},
		);

		const result = complete(
			projectDir,
			{ type: "slice", name: "s1", epic: "e1" },
			{ type: "slice", verificationPassed: true },
		);

		expect(result.epicComplete).toBe(false);
	});

	it("handles deferred items with non-existent target slices (skipped)", () => {
		setupSliceInImplementationComplete("s1");

		const result = complete(
			projectDir,
			{ type: "slice", name: "s1", epic: "e1" },
			{
				type: "slice",
				verificationPassed: true,
				deferred: [{ description: "Future work", targetSlice: "nonexistent" }],
			},
		);

		expect(result.newStatus).toBe("completed");
		expect(result.deferredSkipped).toBe(1);
		expect(result.deferredRouted).toBeUndefined();
	});

	it("coerces undefined arrays to empty", () => {
		setupSliceInImplementationComplete();

		// Passing no optional arrays — should not throw
		const result = complete(
			projectDir,
			{ type: "slice", name: "s1", epic: "e1" },
			{ type: "slice", verificationPassed: true },
		);

		expect(result.newStatus).toBe("completed");
	});
});

describe("complete — paths field", () => {
	it("includes empty paths for complete (no specific artifact paths)", () => {
		setupSliceInImplementationComplete();

		const result = complete(
			projectDir,
			{ type: "slice", name: "s1", epic: "e1" },
			{ type: "slice", verificationPassed: true },
		);

		expect(result.paths).toBeDefined();
		expect(result.paths).toEqual({});
	});

	it("includes empty paths for epic complete", () => {
		setupActivatedEpic();

		const verificationResults: VerificationResult[] = [{ index: 0, passed: true, notes: "OK" }];

		const result = complete(
			projectDir,
			{ type: "epic", name: "e1" },
			{ type: "epic", verificationResults },
		);

		expect(result.paths).toEqual({});
	});
});

describe("complete — error cases", () => {
	it("throws state error for slice when slice does not exist", () => {
		rpcInit(projectDir, "test");

		expect(() =>
			complete(
				projectDir,
				{ type: "slice", name: "s1", epic: "e1" },
				{ type: "slice", verificationPassed: true },
			),
		).toThrow(GoodplanError);
	});

	it("throws for quest completion when quest not found", () => {
		rpcInit(projectDir, "test");

		expect(() =>
			complete(
				projectDir,
				{ type: "quest", name: "q1" },
				{ type: "quest", verificationPassed: true },
			),
		).toThrow("not found");
	});
});
