import { z } from "zod";
import type { InvariantRule } from "../types.js";
import { countMatching, hasEventOfType, narrowPayload } from "./_helpers.js";

// Shared payload schema to extract sliceRef from any slice event payload
const SliceRefPayload = z.object({ sliceRef: z.string().min(1) });

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
 * slice.plan-shape-approval-required: Plan must be shape-approved or auto-shaped
 * before plan can be committed.
 * Retargeted from the v1 `slice-plan-refinement-started` event.
 */
export const slicePlanShapeApprovalRequired: InvariantRule = {
	id: "slice.plan-shape-approval-required",
	ruleType: "precondition",
	description: "Plan shape must be approved or auto-shaped before plan commit",
	appliesTo: ["entity-lifecycle"],
	check(event, ctx) {
		if (event.type !== "slice-plan-committed") return null;
		const sliceRef = narrowPayload(event.payload, SliceRefPayload);
		if (sliceRef === null) return null;
		// Approved or auto-shaped for the same sliceRef satisfies
		for (const type of ["plan-shape-approved", "plan-shape-checkpoint-auto-shaped"] as const) {
			const events = ctx.eventsByType.get(type);
			if (events) {
				for (const e of events) {
					const p = narrowPayload(e.payload, SliceRefPayload);
					if (p !== null && p.sliceRef === sliceRef.sliceRef) return null;
				}
			}
		}
		return {
			message: `Cannot commit plan for slice "${sliceRef.sliceRef}" without plan shape approval or auto-shape.`,
			context: { sliceRef: sliceRef.sliceRef },
		};
	},
};

/**
 * slice.created-before-plan: Slice must exist (have a slice-created event)
 * before a plan can be drafted.
 */
export const sliceCreatedBeforePlan: InvariantRule = {
	id: "slice.created-before-plan",
	ruleType: "precondition",
	description: "Slice must exist before plan can be drafted",
	appliesTo: ["entity-lifecycle"],
	check(event, ctx) {
		if (event.type !== "slice-plan-drafted") return null;
		const sliceRef = narrowPayload(event.payload, SliceRefPayload);
		if (sliceRef === null) return null;
		const createEvents = ctx.eventsByType.get("slice-created");
		if (createEvents) {
			for (const e of createEvents) {
				const p = narrowPayload(e.payload, SliceRefPayload);
				if (p !== null && p.sliceRef === sliceRef.sliceRef) return null;
			}
		}
		return {
			message: `Cannot draft plan for slice "${sliceRef.sliceRef}" — slice does not exist.`,
			context: { sliceRef: sliceRef.sliceRef },
		};
	},
};

/**
 * slice.plan-drafted-before-commit: Plan must be drafted (or shape-approved)
 * before it can be committed.
 */
export const slicePlanDraftedBeforeCommit: InvariantRule = {
	id: "slice.plan-drafted-before-commit",
	ruleType: "precondition",
	description: "Plan must be drafted before commit",
	appliesTo: ["entity-lifecycle"],
	check(event, ctx) {
		if (event.type !== "slice-plan-committed") return null;
		const sliceRef = narrowPayload(event.payload, SliceRefPayload);
		if (sliceRef === null) return null;
		for (const type of ["slice-plan-drafted", "plan-shape-approved"] as const) {
			const events = ctx.eventsByType.get(type);
			if (events) {
				for (const e of events) {
					const p = narrowPayload(e.payload, SliceRefPayload);
					if (p !== null && p.sliceRef === sliceRef.sliceRef) return null;
				}
			}
		}
		return {
			message: `Cannot commit plan for slice "${sliceRef.sliceRef}" — plan not yet drafted.`,
			context: { sliceRef: sliceRef.sliceRef },
		};
	},
};

/**
 * slice.plan-drafted-before-shape: Plan must be drafted before shape
 * checkpoint can start.
 */
export const slicePlanDraftedBeforeShape: InvariantRule = {
	id: "slice.plan-drafted-before-shape",
	ruleType: "precondition",
	description: "Plan must be drafted before shape checkpoint",
	appliesTo: ["entity-lifecycle"],
	check(event, ctx) {
		if (event.type !== "plan-shape-checkpoint-reached") return null;
		const sliceRef = narrowPayload(event.payload, SliceRefPayload);
		if (sliceRef === null) return null;
		const draftEvents = ctx.eventsByType.get("slice-plan-drafted");
		if (draftEvents) {
			for (const e of draftEvents) {
				const p = narrowPayload(e.payload, SliceRefPayload);
				if (p !== null && p.sliceRef === sliceRef.sliceRef) return null;
			}
		}
		return {
			message: `Cannot start shape checkpoint for slice "${sliceRef.sliceRef}" — plan not yet drafted.`,
			context: { sliceRef: sliceRef.sliceRef },
		};
	},
};

/**
 * slice.plan-shape-checkpoint-active: Shape checkpoint must be started
 * and not yet approved/auto-shaped for the given slice.
 * Guards plan-shape-revise, plan-shape-approve, plan-shape-auto.
 */
export const slicePlanShapeCheckpointActive: InvariantRule = {
	id: "slice.plan-shape-checkpoint-active",
	ruleType: "precondition",
	description: "Shape checkpoint must be active (started, not yet approved/auto-shaped)",
	appliesTo: ["entity-lifecycle"],
	check(event, ctx) {
		if (
			event.type !== "plan-shape-revision-proposed" &&
			event.type !== "plan-shape-approved" &&
			event.type !== "plan-shape-checkpoint-auto-shaped"
		) {
			return null;
		}
		const sliceRef = narrowPayload(event.payload, SliceRefPayload);
		if (sliceRef === null) return null;

		// Must have a checkpoint-reached for this sliceRef
		let checkpointStarted = false;
		const reachedEvents = ctx.eventsByType.get("plan-shape-checkpoint-reached");
		if (reachedEvents) {
			for (const e of reachedEvents) {
				const p = narrowPayload(e.payload, SliceRefPayload);
				if (p !== null && p.sliceRef === sliceRef.sliceRef) {
					checkpointStarted = true;
					break;
				}
			}
		}
		if (!checkpointStarted) {
			return {
				message: `No active shape checkpoint for slice "${sliceRef.sliceRef}".`,
				context: { sliceRef: sliceRef.sliceRef },
			};
		}

		// Must not already be approved or auto-shaped for this sliceRef
		for (const type of ["plan-shape-approved", "plan-shape-checkpoint-auto-shaped"] as const) {
			const events = ctx.eventsByType.get(type);
			if (events) {
				for (const e of events) {
					const p = narrowPayload(e.payload, SliceRefPayload);
					if (p !== null && p.sliceRef === sliceRef.sliceRef) {
						return {
							message: `Shape checkpoint for slice "${sliceRef.sliceRef}" already resolved.`,
							context: { sliceRef: sliceRef.sliceRef },
						};
					}
				}
			}
		}

		return null;
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
 * before code refinement can begin.
 *
 * A chunk counts as "decided" if it has EITHER:
 * - a `chunk-verified` event, OR
 * - a `chunk-unverifiable-decided` event
 * for that (sliceRef, chunkId).
 *
 * `chunk-unverifiable` alone does NOT count — the follow-up
 * `chunk-unverifiable-decided` is required.
 *
 * Scoped by sliceRef to avoid cross-slice contamination.
 */
export const sliceChunksAllDecidedBeforeCodeRefine: InvariantRule = {
	id: "slice.chunks-all-decided-before-code-refine",
	ruleType: "all_match",
	description: "All chunks must be decided before code refinement starts",
	appliesTo: ["entity-lifecycle"],
	check(event, ctx) {
		if (event.type !== "slice-code-refinement-started") return null;

		const sliceRef = narrowPayload(event.payload, SliceRefPayload);
		if (sliceRef === null) return null;

		// Collect all started chunk IDs for this slice
		const startedChunks = new Set<string>();
		const chunkEvents = ctx.eventsByType.get("slice-implementation-chunk-started") ?? [];
		for (const e of chunkEvents) {
			const p = narrowPayload(e.payload, z.object({ sliceRef: z.string(), chunkId: z.string() }));
			if (p !== null && p.sliceRef === sliceRef.sliceRef) {
				startedChunks.add(p.chunkId);
			}
		}

		// Collect decided chunk IDs (verified or unverifiable-decided) for this slice
		const decidedChunks = new Set<string>();
		for (const type of ["chunk-verified", "chunk-unverifiable-decided"] as const) {
			const events = ctx.eventsByType.get(type) ?? [];
			for (const e of events) {
				const p = narrowPayload(e.payload, z.object({ sliceRef: z.string(), chunkId: z.string() }));
				if (p !== null && p.sliceRef === sliceRef.sliceRef) {
					decidedChunks.add(p.chunkId);
				}
			}
		}

		const undecided: string[] = [];
		for (const chunkId of startedChunks) {
			if (!decidedChunks.has(chunkId)) {
				undecided.push(chunkId);
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

/**
 * slice.implementation-started-before-chunk: Implementation must be started
 * for a slice before any chunk can be started on it.
 */
export const sliceImplementationStartedBeforeChunk: InvariantRule = {
	id: "slice.implementation-started-before-chunk",
	ruleType: "precondition",
	description: "Implementation must be started before chunks can begin",
	appliesTo: ["entity-lifecycle"],
	check(event, ctx) {
		if (event.type !== "slice-implementation-chunk-started") return null;
		const payload = narrowPayload(event.payload, SliceRefPayload);
		if (payload === null) return null;

		const implEvents = ctx.eventsByType.get("slice-implementation-started");
		if (implEvents) {
			for (const e of implEvents) {
				const p = narrowPayload(e.payload, SliceRefPayload);
				if (p !== null && p.sliceRef === payload.sliceRef) return null;
			}
		}
		return {
			message: `Cannot start chunk for slice "${payload.sliceRef}" — implementation not started.`,
			context: { sliceRef: payload.sliceRef },
		};
	},
};
