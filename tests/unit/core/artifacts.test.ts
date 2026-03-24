import { describe, expect, it } from "vitest";
import { detectArtifacts } from "../../../src/core/artifacts.js";
import type { DirectoryEntry } from "../../../src/core/tree.js";

// ── Helpers ──────────────────────────────────────────────────

function dir(
	contents: Record<
		string,
		DirectoryEntry | { type: "markdown"; content: string } | { type: "json"; content: unknown }
	>,
): DirectoryEntry {
	return { type: "directory", contents };
}

function md(content = ""): { type: "markdown"; content: string } {
	return { type: "markdown", content };
}

function json(content: unknown): { type: "json"; content: unknown } {
	return { type: "json", content };
}

// ── Slice detectArtifacts ────────────────────────────────────

describe("detectArtifacts — slice", () => {
	it("returns all false for empty tree with no goal", () => {
		const result = detectArtifacts(dir({}), "slice", undefined);
		expect(result).toEqual({
			abandoned: false,
			exploreComplete: false,
			goal: false,
			implementation: false,
			plan: false,
			planRefined: false,
		});
	});

	it("returns all true for slice with all artifacts", () => {
		const tree = dir({
			"slice.json": json({ name: "s", goal: "g" }),
			"plan.md": md("# Plan"),
			"plan-refined.md": md("# Refined"),
			"explore-complete.md": md(),
			"abandoned.md": md(),
			implementation: dir({
				"phase-1": dir({}),
			}),
		});
		const result = detectArtifacts(tree, "slice", { goal: "g" });
		expect(result).toEqual({
			abandoned: true,
			exploreComplete: true,
			goal: true,
			implementation: true,
			plan: true,
			planRefined: true,
		});
	});

	it("detects goal from entity JSON", () => {
		const result = detectArtifacts(dir({}), "slice", { goal: "My goal" });
		expect(result.goal).toBe(true);
	});

	it("goal is false when entity JSON has empty goal", () => {
		const result = detectArtifacts(dir({}), "slice", { goal: "" });
		expect(result.goal).toBe(false);
	});

	it("goal is false when entity JSON is undefined", () => {
		const result = detectArtifacts(dir({}), "slice", undefined);
		expect(result.goal).toBe(false);
	});

	it("detects explore-skipped.md as exploreComplete", () => {
		const tree = dir({ "explore-skipped.md": md() });
		const result = detectArtifacts(tree, "slice", undefined);
		expect(result.exploreComplete).toBe(true);
	});

	it("detects plan-refined as directory", () => {
		const tree = dir({
			"plan-refined": dir({
				"01-review.md": md(),
			}),
		});
		const result = detectArtifacts(tree, "slice", undefined);
		expect(result.planRefined).toBe(true);
	});

	it("implementation is false for empty implementation directory", () => {
		const tree = dir({
			implementation: dir({}),
		});
		const result = detectArtifacts(tree, "slice", undefined);
		expect(result.implementation).toBe(false);
	});

	it("implementation is false when implementation is not a directory", () => {
		const tree = dir({
			implementation: md("not a directory"),
		});
		const result = detectArtifacts(tree, "slice", undefined);
		expect(result.implementation).toBe(false);
	});
});

// ── Quest detectArtifacts ────────────────────────────────────

describe("detectArtifacts — quest", () => {
	it("returns slice-shaped flags for quest", () => {
		const tree = dir({
			"plan.md": md("# Quest Plan"),
		});
		const result = detectArtifacts(tree, "quest", { goal: "Fix it" });
		expect(result).toEqual({
			abandoned: false,
			exploreComplete: false,
			goal: true,
			implementation: false,
			plan: true,
			planRefined: false,
		});
	});
});

// ── Epic detectArtifacts ─────────────────────────────────────

describe("detectArtifacts — epic", () => {
	it("returns all false for empty tree with no goal", () => {
		const result = detectArtifacts(dir({}), "epic", undefined);
		expect(result).toEqual({
			abandoned: false,
			architectureDefined: false,
			exploreComplete: false,
			goal: false,
			implementation: false,
			plan: false,
			planRefined: false,
			slicesDefined: false,
		});
	});

	it("detects architecture and slices", () => {
		const tree = dir({
			architecture: dir({
				"_overview.md": md("# Arch"),
			}),
			slices: dir({
				"sequencing.md": md("# Slices"),
			}),
		});
		const result = detectArtifacts(tree, "epic", { goal: "Build it" });
		expect(result).toEqual({
			abandoned: false,
			architectureDefined: true,
			exploreComplete: false,
			goal: true,
			implementation: false,
			plan: false,
			planRefined: false,
			slicesDefined: true,
		});
	});

	it("plan/planRefined/implementation are always false for epics", () => {
		const tree = dir({
			"plan.md": md("# Plan"),
			"plan-refined.md": md("# Refined"),
			implementation: dir({ phase: dir({}) }),
		});
		const result = detectArtifacts(tree, "epic", undefined);
		expect(result.plan).toBe(false);
		expect(result.planRefined).toBe(false);
		expect(result.implementation).toBe(false);
	});

	it("architectureDefined is false without _overview.md", () => {
		const tree = dir({
			architecture: dir({
				"other.md": md("# Other"),
			}),
		});
		const result = detectArtifacts(tree, "epic", undefined);
		expect(result.architectureDefined).toBe(false);
	});

	it("slicesDefined is false without sequencing.md", () => {
		const tree = dir({
			slices: dir({
				"other.md": md("# Other"),
			}),
		});
		const result = detectArtifacts(tree, "epic", undefined);
		expect(result.slicesDefined).toBe(false);
	});

	it("detects explore-complete.md for epic", () => {
		const tree = dir({
			"explore-complete.md": md(),
		});
		const result = detectArtifacts(tree, "epic", undefined);
		expect(result.exploreComplete).toBe(true);
	});

	it("detects abandoned.md for epic", () => {
		const tree = dir({
			"abandoned.md": md(),
		});
		const result = detectArtifacts(tree, "epic", undefined);
		expect(result.abandoned).toBe(true);
	});
});
