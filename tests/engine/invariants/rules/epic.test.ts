import { describe, expect, it } from "vitest";
import {
	epicAllSlicesLandedBeforeComplete,
	epicArchitectureShapeApprovalRequired,
	epicArchitectureTargetRequiredBeforeSliceSet,
	epicDirUnique,
	epicGoalCommittedBeforeExplore,
	epicPressureTestRequiredBeforeSliceSet,
	epicSingleActivePerBranch,
	epicSliceShapeApprovalRequired,
} from "../../../../src/engine/invariants/rules/epic.js";
import { buildCheckContext } from "../../../../src/engine/invariants/types.js";
import { makeEnvelope } from "./_test-helpers.js";

describe("epic.single-active-per-branch", () => {
	it("passes for first epic on a branch", () => {
		const event = makeEnvelope({ type: "epic-created", branch: "main" });
		const ctx = buildCheckContext([]);
		expect(epicSingleActivePerBranch.check(event, ctx)).toBeNull();
	});

	it("fails when active epic exists on same branch", () => {
		const prior = makeEnvelope({ type: "epic-created", branch: "main" });
		const event = makeEnvelope({ type: "epic-created", branch: "main" });
		const ctx = buildCheckContext([prior]);
		const result = epicSingleActivePerBranch.check(event, ctx);
		expect(result).not.toBeNull();
		expect(result?.message).toContain("active epic");
	});

	it("passes when prior epic was completed", () => {
		const created = makeEnvelope({ type: "epic-created", branch: "main" });
		const completed = makeEnvelope({ type: "epic-completed", branch: "main" });
		const event = makeEnvelope({ type: "epic-created", branch: "main" });
		const ctx = buildCheckContext([created, completed]);
		expect(epicSingleActivePerBranch.check(event, ctx)).toBeNull();
	});

	it("passes for different branches", () => {
		const prior = makeEnvelope({ type: "epic-created", branch: "feat-a" });
		const event = makeEnvelope({ type: "epic-created", branch: "feat-b" });
		const ctx = buildCheckContext([prior]);
		expect(epicSingleActivePerBranch.check(event, ctx)).toBeNull();
	});

	it("ignores non-epic-created events", () => {
		const event = makeEnvelope({ type: "epic-completed", branch: "main" });
		const ctx = buildCheckContext([]);
		expect(epicSingleActivePerBranch.check(event, ctx)).toBeNull();
	});
});

describe("epic.dir.unique", () => {
	it("passes for first epic with a directory", () => {
		const event = makeEnvelope({
			type: "epic-created",
			payload: { directory: "epics/my-epic" },
		});
		const ctx = buildCheckContext([]);
		expect(epicDirUnique.check(event, ctx)).toBeNull();
	});

	it("fails when directory already used", () => {
		const prior = makeEnvelope({
			type: "epic-created",
			payload: { directory: "epics/my-epic" },
		});
		const event = makeEnvelope({
			type: "epic-created",
			payload: { directory: "epics/my-epic" },
		});
		const ctx = buildCheckContext([prior]);
		const result = epicDirUnique.check(event, ctx);
		expect(result).not.toBeNull();
		expect(result?.message).toContain("epics/my-epic");
	});

	it("passes for different directories", () => {
		const prior = makeEnvelope({
			type: "epic-created",
			payload: { directory: "epics/epic-a" },
		});
		const event = makeEnvelope({
			type: "epic-created",
			payload: { directory: "epics/epic-b" },
		});
		const ctx = buildCheckContext([prior]);
		expect(epicDirUnique.check(event, ctx)).toBeNull();
	});

	it("passes when payload has no directory (narrowPayload returns null)", () => {
		const event = makeEnvelope({
			type: "epic-created",
			payload: { name: "no-dir" },
		});
		const ctx = buildCheckContext([]);
		expect(epicDirUnique.check(event, ctx)).toBeNull();
	});
});

describe("epic.goal.committed-before-explore", () => {
	it("passes when goal is committed", () => {
		const goal = makeEnvelope({ type: "epic-goal-committed" });
		const event = makeEnvelope({ type: "exploration-cycle-started", domain: "exploration" });
		const ctx = buildCheckContext([goal]);
		expect(epicGoalCommittedBeforeExplore.check(event, ctx)).toBeNull();
	});

	it("fails without committed goal", () => {
		const event = makeEnvelope({ type: "exploration-cycle-started", domain: "exploration" });
		const ctx = buildCheckContext([]);
		const result = epicGoalCommittedBeforeExplore.check(event, ctx);
		expect(result).not.toBeNull();
		expect(result?.message).toContain("epic goal");
	});

	it("ignores non-exploration events", () => {
		const event = makeEnvelope({ type: "epic-created" });
		const ctx = buildCheckContext([]);
		expect(epicGoalCommittedBeforeExplore.check(event, ctx)).toBeNull();
	});
});

describe("epic.architecture-target-required-before-slice-set", () => {
	it("passes when architecture target committed", () => {
		const arch = makeEnvelope({ type: "architecture-target-committed" });
		const event = makeEnvelope({ type: "slice-set-committed" });
		const ctx = buildCheckContext([arch]);
		expect(epicArchitectureTargetRequiredBeforeSliceSet.check(event, ctx)).toBeNull();
	});

	it("fails without architecture target", () => {
		const event = makeEnvelope({ type: "slice-set-committed" });
		const ctx = buildCheckContext([]);
		const result = epicArchitectureTargetRequiredBeforeSliceSet.check(event, ctx);
		expect(result).not.toBeNull();
		expect(result?.message).toContain("architecture target");
	});
});

describe("epic.pressure-test-required-before-slice-set", () => {
	it("passes when pressure test committed", () => {
		const pt = makeEnvelope({ type: "pressure-test-committed", domain: "pressure-test" });
		const event = makeEnvelope({ type: "slice-set-committed" });
		const ctx = buildCheckContext([pt]);
		expect(epicPressureTestRequiredBeforeSliceSet.check(event, ctx)).toBeNull();
	});

	it("fails without pressure test", () => {
		const event = makeEnvelope({ type: "slice-set-committed" });
		const ctx = buildCheckContext([]);
		const result = epicPressureTestRequiredBeforeSliceSet.check(event, ctx);
		expect(result).not.toBeNull();
		expect(result?.message).toContain("pressure test");
	});

	it("includes pressure-test in appliesTo", () => {
		expect(epicPressureTestRequiredBeforeSliceSet.appliesTo).toContain("pressure-test");
		expect(epicPressureTestRequiredBeforeSliceSet.appliesTo).toContain("entity-lifecycle");
	});
});

describe("epic.architecture-shape-approval-required", () => {
	it("passes when architecture shape approved", () => {
		const approval = makeEnvelope({ type: "architecture-shape-approved" });
		const event = makeEnvelope({ type: "pressure-test-drafted", domain: "pressure-test" });
		const ctx = buildCheckContext([approval]);
		expect(epicArchitectureShapeApprovalRequired.check(event, ctx)).toBeNull();
	});

	it("fails without architecture shape approval", () => {
		const event = makeEnvelope({ type: "pressure-test-drafted", domain: "pressure-test" });
		const ctx = buildCheckContext([]);
		const result = epicArchitectureShapeApprovalRequired.check(event, ctx);
		expect(result).not.toBeNull();
		expect(result?.message).toContain("architecture shape approval");
	});
});

describe("epic.slice-shape-approval-required", () => {
	it("passes when slice set shape approved", () => {
		const approval = makeEnvelope({ type: "slice-set-shape-approved" });
		const event = makeEnvelope({ type: "slice-refinement-started", domain: "refinement" });
		const ctx = buildCheckContext([approval]);
		expect(epicSliceShapeApprovalRequired.check(event, ctx)).toBeNull();
	});

	it("fails without slice set shape approval", () => {
		const event = makeEnvelope({ type: "slice-refinement-started", domain: "refinement" });
		const ctx = buildCheckContext([]);
		const result = epicSliceShapeApprovalRequired.check(event, ctx);
		expect(result).not.toBeNull();
		expect(result?.message).toContain("slice set shape approval");
	});
});

describe("epic.all-slices-landed-before-complete", () => {
	it("passes when no slices exist", () => {
		const event = makeEnvelope({ type: "epic-completed" });
		const ctx = buildCheckContext([]);
		expect(epicAllSlicesLandedBeforeComplete.check(event, ctx)).toBeNull();
	});

	it("passes when all slices are landed", () => {
		const created = makeEnvelope({ type: "slice-created", scopeRef: "slice-1" });
		const landed = makeEnvelope({ type: "slice-landed", scopeRef: "slice-1" });
		const event = makeEnvelope({ type: "epic-completed" });
		const ctx = buildCheckContext([created, landed]);
		expect(epicAllSlicesLandedBeforeComplete.check(event, ctx)).toBeNull();
	});

	it("passes when all slices are landed or abandoned", () => {
		const c1 = makeEnvelope({ type: "slice-created", scopeRef: "slice-1" });
		const c2 = makeEnvelope({ type: "slice-created", scopeRef: "slice-2" });
		const l1 = makeEnvelope({ type: "slice-landed", scopeRef: "slice-1" });
		const a2 = makeEnvelope({ type: "slice-abandoned", scopeRef: "slice-2" });
		const event = makeEnvelope({ type: "epic-completed" });
		const ctx = buildCheckContext([c1, c2, l1, a2]);
		expect(epicAllSlicesLandedBeforeComplete.check(event, ctx)).toBeNull();
	});

	it("fails when a slice is unresolved", () => {
		const c1 = makeEnvelope({ type: "slice-created", scopeRef: "slice-1" });
		const c2 = makeEnvelope({ type: "slice-created", scopeRef: "slice-2" });
		const l1 = makeEnvelope({ type: "slice-landed", scopeRef: "slice-1" });
		const event = makeEnvelope({ type: "epic-completed" });
		const ctx = buildCheckContext([c1, c2, l1]);
		const result = epicAllSlicesLandedBeforeComplete.check(event, ctx);
		expect(result).not.toBeNull();
		expect(result?.message).toContain("1 slice(s)");
		expect(result?.context?.unresolvedSlices).toEqual(["slice-2"]);
	});

	it("ignores non-epic-completed events", () => {
		const event = makeEnvelope({ type: "epic-created" });
		const ctx = buildCheckContext([]);
		expect(epicAllSlicesLandedBeforeComplete.check(event, ctx)).toBeNull();
	});
});
