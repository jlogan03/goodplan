import { describe, expect, it } from "vitest";
import { buildContextBundle } from "../../src/context/bundler.js";
import type { ContentResolver } from "../../src/context/types.js";
import type { DerivedStateData } from "../../src/schemas/entities/derived-state.js";
import type { ContentRef } from "../../src/schemas/envelope.js";
import type { DeepReadonly } from "../../src/util/types.js";

/**
 * Create a minimal mock DerivedStateData for testing.
 */
function createMockState(
	overrides?: Partial<{
		epicDir: string;
		goal: ContentRef | null;
		architectureTarget: ContentRef | null;
		pressureTest: ContentRef | null;
		sliceSet: ContentRef | null;
		sliceDir: string;
		sliceGoal: ContentRef | null;
		slicePlan: ContentRef | null;
		phase: string;
	}>,
): DeepReadonly<DerivedStateData> {
	const epicDir = overrides?.epicDir ?? "test-epic";
	const sliceDir = overrides?.sliceDir;

	const slices = new Map<
		string,
		{
			dir: string;
			goal: ContentRef | null;
			plan: ContentRef | null;
			phase: string;
			chunks: Map<string, never>;
			abandoned: boolean;
		}
	>();

	if (sliceDir !== undefined) {
		slices.set(sliceDir, {
			dir: sliceDir,
			goal: overrides?.sliceGoal ?? null,
			plan: overrides?.slicePlan ?? null,
			phase: "P7",
			chunks: new Map(),
			abandoned: false,
		});
	}

	const epics = new Map();
	epics.set(epicDir, {
		dir: epicDir,
		goal: overrides?.goal ?? null,
		architectureTarget: overrides?.architectureTarget ?? null,
		pressureTest: overrides?.pressureTest ?? null,
		sliceSet: overrides?.sliceSet ?? null,
		steeringPreference: "best-guess-and-flag",
		phase: overrides?.phase ?? "P0",
		slices,
		findings: [],
		active: false,
		paused: false,
		completed: false,
		abandoned: false,
	});

	return {
		project: {
			name: "test-project",
			version: "2.0.0",
			steeringPreference: "best-guess-and-flag",
			initialized: true,
		},
		epics,
		sideQuests: new Map(),
		convergenceSnapshots: new Map(),
		latestDimensionScores: new Map(),
	} as DeepReadonly<DerivedStateData>;
}

function makeContentRef(sha: string, path: string): ContentRef {
	return { sha, size: 100, path, mediaType: "text/markdown" };
}

/**
 * Create a mock ContentResolver that maps SHA -> content.
 */
function createMockResolver(mapping: Record<string, string>): ContentResolver {
	return (ref: ContentRef): string => {
		const content = mapping[ref.sha];
		if (content === undefined) {
			return "";
		}
		return content;
	};
}

describe("buildContextBundle", () => {
	const archTargetRef = makeContentRef("aaa1", "architecture-target.md");
	const archTargetContent = "# Architecture Target\nThe goal state.";
	const goalRef = makeContentRef("bbb1", "goal.md");
	const goalContent = "# Epic Goal\nBuild the thing.";

	it("P10 (implementation) inlines architecture-current-related keys and references architecture-target", () => {
		const state = createMockState({
			goal: goalRef,
			architectureTarget: archTargetRef,
			sliceDir: "slice-01",
			slicePlan: makeContentRef("ccc1", "plan.md"),
		});

		const resolver = createMockResolver({
			bbb1: goalContent,
			aaa1: archTargetContent,
			ccc1: "# Plan\nImplement step by step.",
		});

		const bundle = buildContextBundle(state, "P10", "test-epic/slice-01", resolver);

		expect(bundle.phase).toBe("P10");

		// P10 inlines: plan-chunks, architecture-current
		// plan-chunks resolves to slice plan ContentRef
		const planInline = bundle.inline.find((s) => s.key === "plan-chunks");
		expect(planInline).toBeDefined();
		expect(planInline?.content).toBe("# Plan\nImplement step by step.");

		// architecture-current is filesystem-based, no ContentRef -> empty
		const archInline = bundle.inline.find((s) => s.key === "architecture-current");
		expect(archInline).toBeDefined();

		// architecture-target should be in references
		const archTargetRefSection = bundle.references.find((s) => s.key === "architecture-target");
		expect(archTargetRefSection).toBeDefined();
		expect(archTargetRefSection?.path).toBe("architecture-target.md");
	});

	it("P3 (architecture) inlines both architecture-current and architecture-target", () => {
		const state = createMockState({
			goal: goalRef,
			architectureTarget: archTargetRef,
		});

		const resolver = createMockResolver({
			bbb1: goalContent,
			aaa1: archTargetContent,
		});

		const bundle = buildContextBundle(state, "P3", "test-epic", resolver);

		// P3 inlines: epic-goal, architecture-current, architecture-target, exploration-conclusions, subsystem-registry
		const inlineKeys = bundle.inline.map((s) => s.key);
		expect(inlineKeys).toContain("architecture-current");
		expect(inlineKeys).toContain("architecture-target");
		expect(inlineKeys).toContain("epic-goal");
	});

	it("respects agent-type multipliers on token budget", () => {
		const state = createMockState({});
		const resolver = createMockResolver({});

		const phaseBudget = buildContextBundle(state, "P10", "test-epic", resolver, "phase");
		const reviewerBudget = buildContextBundle(state, "P10", "test-epic", resolver, "reviewer");

		// P10 base = 30000. phase=1.0, reviewer=0.5
		expect(phaseBudget.tokenBudget.total).toBe(30_000);
		expect(reviewerBudget.tokenBudget.total).toBe(15_000);
	});

	it("includes mandatory sections even when they exceed budget", () => {
		const state = createMockState({
			sliceDir: "slice-01",
			slicePlan: makeContentRef("ddd1", "plan.md"),
		});

		// Create a huge plan that exceeds synthesis budget (30000 * 0.3 = 9000 tokens)
		const hugePlan = "x".repeat(50_000); // 12500 tokens
		const resolver = createMockResolver({
			ddd1: hugePlan,
		});

		const bundle = buildContextBundle(state, "P10", "test-epic/slice-01", resolver, "synthesis");

		// Budget is 9000 tokens but mandatory section (plan-chunks) is 12500 tokens
		// It should still be included
		const planInline = bundle.inline.find((s) => s.key === "plan-chunks");
		expect(planInline).toBeDefined();
		expect(planInline?.estimatedTokens).toBe(12_500);
		expect(bundle.tokenBudget.inlineUsed).toBeGreaterThan(bundle.tokenBudget.total);
	});

	it("reference sections are always included regardless of budget", () => {
		const state = createMockState({
			architectureTarget: archTargetRef,
		});

		const resolver = createMockResolver({
			aaa1: archTargetContent,
		});

		// Use synthesis agent with smallest budget
		const bundle = buildContextBundle(state, "P10", "test-epic", resolver, "synthesis");

		// P10 references: architecture-target, subsystem-docs, conventions
		expect(bundle.references.length).toBeGreaterThan(0);
		const refKeys = bundle.references.map((s) => s.key);
		expect(refKeys).toContain("architecture-target");
		expect(refKeys).toContain("conventions");
	});

	it("unknown/missing ContentRefs produce empty inline sections (not crashes)", () => {
		const state = createMockState({});

		// Resolver that returns empty for everything
		const resolver = createMockResolver({});

		// Should not throw
		const bundle = buildContextBundle(state, "P3", "test-epic", resolver);

		expect(bundle.phase).toBe("P3");
		expect(bundle.inline).toBeDefined();
		// All inline sections should have empty content or be missing
		for (const section of bundle.inline) {
			expect(section.content).toBe("");
		}
	});

	it("handles null scopeRef without crashing", () => {
		const state = createMockState({});
		const resolver = createMockResolver({});

		const bundle = buildContextBundle(state, "P0", null, resolver);
		expect(bundle.scopeRef).toBeNull();
		expect(bundle.phase).toBe("P0");
	});

	it("ContentResolver errors produce empty sections", () => {
		const state = createMockState({
			goal: goalRef,
		});

		const failingResolver: ContentResolver = () => {
			throw new Error("I/O failure");
		};

		const bundle = buildContextBundle(state, "P3", "test-epic", failingResolver);

		// Should not throw, epic-goal should be empty
		const goalInline = bundle.inline.find((s) => s.key === "epic-goal");
		expect(goalInline).toBeDefined();
		expect(goalInline?.content).toBe("");
	});
});
