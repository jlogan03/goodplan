import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { resolvePathReferences } from "../../../src/core/rpc/paths.js";
import type { Target } from "../../../src/core/rpc/types.js";

const PROJECT_DIR = "/test/.project";

describe("resolvePathReferences", () => {
	describe("slice targets", () => {
		const target: Target = { type: "slice", name: "my-slice" };
		const sliceDir = path.join(PROJECT_DIR, "slices", "my-slice");

		it("plan → { plan }", () => {
			const result = resolvePathReferences(PROJECT_DIR, target, "plan");
			expect(result).toEqual({ plan: path.join(sliceDir, "plan.md") });
		});

		it("refine-plan → { plan, planRefined }", () => {
			const result = resolvePathReferences(PROJECT_DIR, target, "refine-plan");
			expect(result).toEqual({
				plan: path.join(sliceDir, "plan.md"),
				planRefined: path.join(sliceDir, "plan-refined.md"),
			});
		});

		it("implement → { implementation }", () => {
			const result = resolvePathReferences(PROJECT_DIR, target, "implement");
			expect(result).toEqual({ implementation: path.join(sliceDir, "implementation") });
		});

		it("complete → {}", () => {
			const result = resolvePathReferences(PROJECT_DIR, target, "complete");
			expect(result).toEqual({});
		});

		it("create → {}", () => {
			const result = resolvePathReferences(PROJECT_DIR, target, "create");
			expect(result).toEqual({});
		});

		it("abandon → {}", () => {
			const result = resolvePathReferences(PROJECT_DIR, target, "abandon");
			expect(result).toEqual({});
		});
	});

	describe("quest targets", () => {
		const target: Target = { type: "quest", name: "my-quest" };
		const questDir = path.join(PROJECT_DIR, "quests", "my-quest");

		it("plan → { plan }", () => {
			const result = resolvePathReferences(PROJECT_DIR, target, "plan");
			expect(result).toEqual({ plan: path.join(questDir, "plan.md") });
		});

		it("implement → { implementation }", () => {
			const result = resolvePathReferences(PROJECT_DIR, target, "implement");
			expect(result).toEqual({ implementation: path.join(questDir, "implementation") });
		});
	});

	describe("epic targets", () => {
		const target: Target = { type: "epic", name: "my-epic" };
		const epicDir = path.join(PROJECT_DIR, "epics", "my-epic");

		it("explore → { research, brainstorm }", () => {
			const result = resolvePathReferences(PROJECT_DIR, target, "explore");
			expect(result).toEqual({
				research: path.join(epicDir, "research"),
				brainstorm: path.join(epicDir, "brainstorm"),
			});
		});

		it("define-architecture → { architecture }", () => {
			const result = resolvePathReferences(PROJECT_DIR, target, "define-architecture");
			expect(result).toEqual({ architecture: path.join(epicDir, "architecture") });
		});

		it("refine-architecture → { architecture }", () => {
			const result = resolvePathReferences(PROJECT_DIR, target, "refine-architecture");
			expect(result).toEqual({ architecture: path.join(epicDir, "architecture") });
		});

		it("define-slices → { slices }", () => {
			const result = resolvePathReferences(PROJECT_DIR, target, "define-slices");
			expect(result).toEqual({ slices: path.join(epicDir, "slices") });
		});

		it("refine-slices → { slices }", () => {
			const result = resolvePathReferences(PROJECT_DIR, target, "refine-slices");
			expect(result).toEqual({ slices: path.join(epicDir, "slices") });
		});

		it("activate → {}", () => {
			const result = resolvePathReferences(PROJECT_DIR, target, "activate");
			expect(result).toEqual({});
		});

		it("complete → {}", () => {
			const result = resolvePathReferences(PROJECT_DIR, target, "complete");
			expect(result).toEqual({});
		});
	});

	describe("submit phases map to begin-phase equivalents", () => {
		const sliceTarget: Target = { type: "slice", name: "s1" };
		const sliceDir = path.join(PROJECT_DIR, "slices", "s1");
		const epicTarget: Target = { type: "epic", name: "e1" };
		const epicDir = path.join(PROJECT_DIR, "epics", "e1");

		it("submit-plan (SubmitPhase 'plan') → same as begin plan", () => {
			const result = resolvePathReferences(PROJECT_DIR, sliceTarget, "plan");
			expect(result).toEqual({ plan: path.join(sliceDir, "plan.md") });
		});

		it("submit-refinement → same as refine-plan", () => {
			const result = resolvePathReferences(PROJECT_DIR, sliceTarget, "refinement");
			expect(result).toEqual({
				plan: path.join(sliceDir, "plan.md"),
				planRefined: path.join(sliceDir, "plan-refined.md"),
			});
		});

		it("submit-implementation → same as implement", () => {
			const result = resolvePathReferences(PROJECT_DIR, sliceTarget, "implementation");
			expect(result).toEqual({ implementation: path.join(sliceDir, "implementation") });
		});

		it("submit-explore → same as explore", () => {
			const result = resolvePathReferences(PROJECT_DIR, epicTarget, "explore");
			expect(result).toEqual({
				research: path.join(epicDir, "research"),
				brainstorm: path.join(epicDir, "brainstorm"),
			});
		});

		it("submit-architecture → same as define-architecture", () => {
			const result = resolvePathReferences(PROJECT_DIR, epicTarget, "architecture");
			expect(result).toEqual({ architecture: path.join(epicDir, "architecture") });
		});

		it("submit-slices → same as define-slices", () => {
			const result = resolvePathReferences(PROJECT_DIR, epicTarget, "slices");
			expect(result).toEqual({ slices: path.join(epicDir, "slices") });
		});

		it("submit-refine-architecture → same as refine-architecture", () => {
			const result = resolvePathReferences(PROJECT_DIR, epicTarget, "refine-architecture");
			expect(result).toEqual({ architecture: path.join(epicDir, "architecture") });
		});

		it("submit-refine-slices → same as refine-slices", () => {
			const result = resolvePathReferences(PROJECT_DIR, epicTarget, "refine-slices");
			expect(result).toEqual({ slices: path.join(epicDir, "slices") });
		});
	});

	describe("non-entity targets return {}", () => {
		it("project target → {}", () => {
			const result = resolvePathReferences(PROJECT_DIR, { type: "project" }, "create");
			expect(result).toEqual({});
		});

		it("decision target → {}", () => {
			const result = resolvePathReferences(PROJECT_DIR, { type: "decision", id: "d1" }, "create-decision");
			expect(result).toEqual({});
		});

		it("rollup target → {}", () => {
			const result = resolvePathReferences(PROJECT_DIR, { type: "rollup", from: "a", to: "b" }, "rollup");
			expect(result).toEqual({});
		});
	});

	describe("paths are absolute", () => {
		it("all returned paths are absolute", () => {
			const result = resolvePathReferences(PROJECT_DIR, { type: "slice", name: "s1" }, "refine-plan");
			for (const value of Object.values(result)) {
				expect(path.isAbsolute(value)).toBe(true);
			}
		});
	});
});
