import { z } from "zod";
import type { InvariantRule } from "../types.js";
import { countMatching, hasEventOfType, narrowPayload } from "./_helpers.js";

// Payload schema for slice-plan-committed events (chunks with verificationType)
const SlicePlanCommittedPayload = z.object({
	chunks: z.array(
		z.object({
			id: z.string().min(1),
			verificationType: z.string().min(1).optional(),
		}),
	),
});

// Payload schema for slice-implementation-started (deps field)
const SliceImplementationStartedPayload = z.object({
	deps: z.array(z.string()).optional(),
});

/**
 * slice.single-active-per-branch: At most one slice in implementation
 * (P10-P11) per branch.
 */
export const sliceSingleActivePerBranch: InvariantRule = {
	id: "slice.single-active-per-branch",
	ruleType: "count_limit",
	description: "At most one slice in implementation per branch",
	appliesTo: ["entity-lifecycle"],
	check(event, ctx) {
		if (event.type !== "slice-implementation-started") return null;

		const branch = event.branch;
		const started = countMatching(
			ctx,
			(e) => e.type === "slice-implementation-started" && e.branch === branch,
		);
		const finished = countMatching(
			ctx,
			(e) => (e.type === "slice-landed" || e.type === "slice-abandoned") && e.branch === branch,
		);

		const active = started - finished;
		if (active >= 1) {
			return {
				message: `Branch "${branch}" already has a slice in implementation. Land or abandon it first.`,
				context: { branch, activeCount: active },
			};
		}
		return null;
	},
};

/**
 * slice.plan-shape-approval-required: Plan must be shape-approved before
 * plan refinement can begin.
 */
export const slicePlanShapeApprovalRequired: InvariantRule = {
	id: "slice.plan-shape-approval-required",
	ruleType: "precondition",
	description: "Plan shape must be approved before plan refinement",
	appliesTo: ["entity-lifecycle", "refinement"],
	check(event, ctx) {
		if (event.type !== "slice-plan-refinement-started") return null;
		if (hasEventOfType(ctx, "slice-plan-shape-approved")) return null;
		return {
			message: "Cannot start plan refinement without plan shape approval.",
		};
	},
};

/**
 * slice.plan-converged-before-implement: Plan must be converged/committed
 * before implementation can start.
 */
export const slicePlanConvergedBeforeImplement: InvariantRule = {
	id: "slice.plan-converged-before-implement",
	ruleType: "precondition",
	description: "Plan must be converged before implementation starts",
	appliesTo: ["entity-lifecycle", "refinement"],
	check(event, ctx) {
		if (event.type !== "slice-implementation-started") return null;
		if (
			hasEventOfType(ctx, "slice-plan-committed") ||
			hasEventOfType(ctx, "refinement-converged")
		) {
			return null;
		}
		return {
			message: "Cannot start implementation without a committed or converged plan.",
		};
	},
};

/**
 * slice.plan-chunks-decidable: Every chunk in a committed plan must have
 * a verificationType field.
 */
export const slicePlanChunksDecidable: InvariantRule = {
	id: "slice.plan-chunks-decidable",
	ruleType: "all_match",
	description: "Every plan chunk must have a verificationType",
	appliesTo: ["entity-lifecycle"],
	check(event, _ctx) {
		if (event.type !== "slice-plan-committed") return null;

		const payload = narrowPayload(event.payload, SlicePlanCommittedPayload);
		if (payload === null) return null;

		const missing: string[] = [];
		for (const chunk of payload.chunks) {
			if (chunk.verificationType === undefined || chunk.verificationType === "") {
				missing.push(chunk.id);
			}
		}

		if (missing.length > 0) {
			return {
				message: `${missing.length} chunk(s) missing verificationType: ${missing.join(", ")}`,
				context: { missingChunks: missing },
			};
		}
		return null;
	},
};

/**
 * slice.chunks-all-decided-before-code-refine: All chunks must be decided
 * (started/verified/skipped) before code refinement can begin.
 */
export const sliceChunksAllDecidedBeforeCodeRefine: InvariantRule = {
	id: "slice.chunks-all-decided-before-code-refine",
	ruleType: "all_match",
	description: "All chunks must be decided before code refinement starts",
	appliesTo: ["entity-lifecycle"],
	check(event, ctx) {
		if (event.type !== "slice-code-refinement-started") return null;

		// Find the plan commit to get chunk IDs
		const planEvents = ctx.eventsByType.get("slice-plan-committed") ?? [];
		const planEvent = planEvents[planEvents.length - 1];
		if (!planEvent) return null;

		const payload = narrowPayload(planEvent.payload, SlicePlanCommittedPayload);
		if (payload === null) return null;

		const decidedChunks = new Set<string>();
		for (const e of ctx.allEvents) {
			if (e.type === "chunk-started" || e.type === "chunk-verified" || e.type === "chunk-skipped") {
				const chunkPayload = narrowPayload(e.payload, z.object({ chunkId: z.string() }));
				if (chunkPayload !== null) {
					decidedChunks.add(chunkPayload.chunkId);
				}
			}
		}

		const undecided: string[] = [];
		for (const chunk of payload.chunks) {
			if (!decidedChunks.has(chunk.id)) {
				undecided.push(chunk.id);
			}
		}

		if (undecided.length > 0) {
			return {
				message: `${undecided.length} chunk(s) not yet decided: ${undecided.join(", ")}`,
				context: { undecidedChunks: undecided },
			};
		}
		return null;
	},
};

/**
 * slice.code-refinement-converged-before-land: Code refinement must converge
 * before a slice can land.
 */
export const sliceCodeRefinementConvergedBeforeLand: InvariantRule = {
	id: "slice.code-refinement-converged-before-land",
	ruleType: "precondition",
	description: "Code refinement must converge before slice lands",
	appliesTo: ["entity-lifecycle", "refinement"],
	check(event, ctx) {
		if (event.type !== "slice-landed") return null;
		if (hasEventOfType(ctx, "code-refinement-converged")) return null;
		return {
			message: "Cannot land slice without code refinement convergence.",
		};
	},
};

/**
 * slice.deps-landed-before-start: All dependency slices must be landed
 * before implementation can start.
 */
export const sliceDepsLandedBeforeStart: InvariantRule = {
	id: "slice.deps-landed-before-start",
	ruleType: "precondition",
	description: "Dependency slices must be landed before starting implementation",
	appliesTo: ["entity-lifecycle"],
	check(event, ctx) {
		if (event.type !== "slice-implementation-started") return null;

		const payload = narrowPayload(event.payload, SliceImplementationStartedPayload);
		if (payload === null) return null;

		const deps = payload.deps;
		if (deps === undefined || deps.length === 0) return null;

		const landedSlices = new Set<string>();
		for (const e of ctx.eventsByType.get("slice-landed") ?? []) {
			if (e.scopeRef != null) landedSlices.add(e.scopeRef);
		}

		const unlandedDeps: string[] = [];
		for (const dep of deps) {
			if (!landedSlices.has(dep)) {
				unlandedDeps.push(dep);
			}
		}

		if (unlandedDeps.length > 0) {
			return {
				message: `${unlandedDeps.length} dependency slice(s) not yet landed: ${unlandedDeps.join(", ")}`,
				context: { unlandedDeps },
			};
		}
		return null;
	},
};
