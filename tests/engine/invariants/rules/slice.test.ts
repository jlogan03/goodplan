import { describe, expect, it } from "vitest";
import {
	sliceChunksAllDecidedBeforeCodeRefine,
	sliceCodeRefinementConvergedBeforeLand,
	sliceDepsLandedBeforeStart,
	slicePlanChunksDecidable,
	slicePlanConvergedBeforeImplement,
	slicePlanShapeApprovalRequired,
	sliceSingleActivePerBranch,
} from "../../../../src/engine/invariants/rules/slice.js";
import { buildCheckContext } from "../../../../src/engine/invariants/types.js";
import { makeEnvelope } from "./_test-helpers.js";

describe("slice.single-active-per-branch", () => {
	it("passes for first implementation on a branch", () => {
		const event = makeEnvelope({ type: "slice-implementation-started", branch: "main" });
		const ctx = buildCheckContext([]);
		expect(sliceSingleActivePerBranch.check(event, ctx)).toBeNull();
	});

	it("fails when a slice is already in implementation", () => {
		const prior = makeEnvelope({ type: "slice-implementation-started", branch: "main" });
		const event = makeEnvelope({ type: "slice-implementation-started", branch: "main" });
		const ctx = buildCheckContext([prior]);
		const result = sliceSingleActivePerBranch.check(event, ctx);
		expect(result).not.toBeNull();
		expect(result?.message).toContain("already has a slice");
	});

	it("passes when prior slice was landed", () => {
		const started = makeEnvelope({ type: "slice-implementation-started", branch: "main" });
		const landed = makeEnvelope({ type: "slice-landed", branch: "main" });
		const event = makeEnvelope({ type: "slice-implementation-started", branch: "main" });
		const ctx = buildCheckContext([started, landed]);
		expect(sliceSingleActivePerBranch.check(event, ctx)).toBeNull();
	});

	it("passes for different branches", () => {
		const prior = makeEnvelope({ type: "slice-implementation-started", branch: "feat-a" });
		const event = makeEnvelope({ type: "slice-implementation-started", branch: "feat-b" });
		const ctx = buildCheckContext([prior]);
		expect(sliceSingleActivePerBranch.check(event, ctx)).toBeNull();
	});

	it("ignores non-implementation events", () => {
		const event = makeEnvelope({ type: "slice-created" });
		const ctx = buildCheckContext([]);
		expect(sliceSingleActivePerBranch.check(event, ctx)).toBeNull();
	});
});

describe("slice.plan-shape-approval-required", () => {
	it("passes when plan shape approved", () => {
		const approval = makeEnvelope({ type: "slice-plan-shape-approved" });
		const event = makeEnvelope({ type: "slice-plan-refinement-started", domain: "refinement" });
		const ctx = buildCheckContext([approval]);
		expect(slicePlanShapeApprovalRequired.check(event, ctx)).toBeNull();
	});

	it("fails without plan shape approval", () => {
		const event = makeEnvelope({ type: "slice-plan-refinement-started", domain: "refinement" });
		const ctx = buildCheckContext([]);
		const result = slicePlanShapeApprovalRequired.check(event, ctx);
		expect(result).not.toBeNull();
		expect(result?.message).toContain("plan shape approval");
	});
});

describe("slice.plan-converged-before-implement", () => {
	it("passes with slice-plan-committed", () => {
		const committed = makeEnvelope({ type: "slice-plan-committed" });
		const event = makeEnvelope({ type: "slice-implementation-started" });
		const ctx = buildCheckContext([committed]);
		expect(slicePlanConvergedBeforeImplement.check(event, ctx)).toBeNull();
	});

	it("passes with refinement-converged", () => {
		const converged = makeEnvelope({ type: "refinement-converged", domain: "refinement" });
		const event = makeEnvelope({ type: "slice-implementation-started" });
		const ctx = buildCheckContext([converged]);
		expect(slicePlanConvergedBeforeImplement.check(event, ctx)).toBeNull();
	});

	it("fails without either convergence event", () => {
		const event = makeEnvelope({ type: "slice-implementation-started" });
		const ctx = buildCheckContext([]);
		const result = slicePlanConvergedBeforeImplement.check(event, ctx);
		expect(result).not.toBeNull();
		expect(result?.message).toContain("committed or converged plan");
	});
});

describe("slice.plan-chunks-decidable", () => {
	it("passes when all chunks have verificationType", () => {
		const event = makeEnvelope({
			type: "slice-plan-committed",
			payload: {
				chunks: [
					{ id: "c1", verificationType: "test" },
					{ id: "c2", verificationType: "manual" },
				],
			},
		});
		const ctx = buildCheckContext([]);
		expect(slicePlanChunksDecidable.check(event, ctx)).toBeNull();
	});

	it("fails when a chunk is missing verificationType", () => {
		const event = makeEnvelope({
			type: "slice-plan-committed",
			payload: {
				chunks: [{ id: "c1", verificationType: "test" }, { id: "c2" }],
			},
		});
		const ctx = buildCheckContext([]);
		const result = slicePlanChunksDecidable.check(event, ctx);
		expect(result).not.toBeNull();
		expect(result?.message).toContain("c2");
		expect(result?.context?.missingChunks).toEqual(["c2"]);
	});

	it("passes when payload does not match schema", () => {
		const event = makeEnvelope({
			type: "slice-plan-committed",
			payload: { unrelated: true },
		});
		const ctx = buildCheckContext([]);
		expect(slicePlanChunksDecidable.check(event, ctx)).toBeNull();
	});
});

describe("slice.chunks-all-decided-before-code-refine", () => {
	it("passes when all chunks decided", () => {
		const plan = makeEnvelope({
			type: "slice-plan-committed",
			payload: { chunks: [{ id: "c1", verificationType: "test" }] },
		});
		const decided = makeEnvelope({
			type: "chunk-verified",
			payload: { chunkId: "c1" },
		});
		const event = makeEnvelope({ type: "slice-code-refinement-started" });
		const ctx = buildCheckContext([plan, decided]);
		expect(sliceChunksAllDecidedBeforeCodeRefine.check(event, ctx)).toBeNull();
	});

	it("fails when a chunk is undecided", () => {
		const plan = makeEnvelope({
			type: "slice-plan-committed",
			payload: {
				chunks: [
					{ id: "c1", verificationType: "test" },
					{ id: "c2", verificationType: "manual" },
				],
			},
		});
		const decided = makeEnvelope({
			type: "chunk-verified",
			payload: { chunkId: "c1" },
		});
		const event = makeEnvelope({ type: "slice-code-refinement-started" });
		const ctx = buildCheckContext([plan, decided]);
		const result = sliceChunksAllDecidedBeforeCodeRefine.check(event, ctx);
		expect(result).not.toBeNull();
		expect(result?.message).toContain("c2");
	});

	it("counts chunk-started and chunk-skipped as decided", () => {
		const plan = makeEnvelope({
			type: "slice-plan-committed",
			payload: {
				chunks: [
					{ id: "c1", verificationType: "test" },
					{ id: "c2", verificationType: "manual" },
					{ id: "c3", verificationType: "test" },
				],
			},
		});
		const d1 = makeEnvelope({ type: "chunk-started", payload: { chunkId: "c1" } });
		const d2 = makeEnvelope({ type: "chunk-skipped", payload: { chunkId: "c2" } });
		const d3 = makeEnvelope({ type: "chunk-verified", payload: { chunkId: "c3" } });
		const event = makeEnvelope({ type: "slice-code-refinement-started" });
		const ctx = buildCheckContext([plan, d1, d2, d3]);
		expect(sliceChunksAllDecidedBeforeCodeRefine.check(event, ctx)).toBeNull();
	});

	it("passes when no plan committed (no chunks to check)", () => {
		const event = makeEnvelope({ type: "slice-code-refinement-started" });
		const ctx = buildCheckContext([]);
		expect(sliceChunksAllDecidedBeforeCodeRefine.check(event, ctx)).toBeNull();
	});
});

describe("slice.code-refinement-converged-before-land", () => {
	it("passes when code refinement converged", () => {
		const converged = makeEnvelope({ type: "code-refinement-converged" });
		const event = makeEnvelope({ type: "slice-landed" });
		const ctx = buildCheckContext([converged]);
		expect(sliceCodeRefinementConvergedBeforeLand.check(event, ctx)).toBeNull();
	});

	it("fails without code refinement convergence", () => {
		const event = makeEnvelope({ type: "slice-landed" });
		const ctx = buildCheckContext([]);
		const result = sliceCodeRefinementConvergedBeforeLand.check(event, ctx);
		expect(result).not.toBeNull();
		expect(result?.message).toContain("code refinement convergence");
	});
});

describe("slice.deps-landed-before-start", () => {
	it("passes when no deps specified", () => {
		const event = makeEnvelope({
			type: "slice-implementation-started",
			payload: {},
		});
		const ctx = buildCheckContext([]);
		expect(sliceDepsLandedBeforeStart.check(event, ctx)).toBeNull();
	});

	it("passes when all deps landed", () => {
		const landed = makeEnvelope({ type: "slice-landed", scopeRef: "dep-1" });
		const event = makeEnvelope({
			type: "slice-implementation-started",
			payload: { deps: ["dep-1"] },
		});
		const ctx = buildCheckContext([landed]);
		expect(sliceDepsLandedBeforeStart.check(event, ctx)).toBeNull();
	});

	it("fails when a dep is not landed", () => {
		const event = makeEnvelope({
			type: "slice-implementation-started",
			payload: { deps: ["dep-1", "dep-2"] },
		});
		const ctx = buildCheckContext([]);
		const result = sliceDepsLandedBeforeStart.check(event, ctx);
		expect(result).not.toBeNull();
		expect(result?.message).toContain("2 dependency");
		expect(result?.context?.unlandedDeps).toEqual(["dep-1", "dep-2"]);
	});

	it("passes when deps is empty array", () => {
		const event = makeEnvelope({
			type: "slice-implementation-started",
			payload: { deps: [] },
		});
		const ctx = buildCheckContext([]);
		expect(sliceDepsLandedBeforeStart.check(event, ctx)).toBeNull();
	});
});
