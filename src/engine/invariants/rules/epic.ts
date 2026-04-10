import { z } from "zod";
import type { InvariantRule } from "../types.js";
import { countMatching, hasEventOfType, narrowPayload } from "./_helpers.js";

/**
 * Set of event types that represent terminal states.
 * These event types should NOT be blocked by not-abandoned/not-completed rules
 * because they are the events that SET those states.
 */
const TERMINAL_EVENT_TYPES = new Set(["epic-created", "epic-completed", "epic-abandoned"]);

// Payload schema for epic-created events (directory field)
const EpicCreatedPayload = z.object({
	directory: z.string().min(1),
});

/**
 * epic.single-active-per-branch: At most one active epic per branch.
 * An epic is "active" if it has been created but not completed or abandoned.
 */
export const epicSingleActivePerBranch: InvariantRule = {
	id: "epic.single-active-per-branch",
	ruleType: "count_limit",
	description: "At most one active epic per branch",
	appliesTo: ["entity-lifecycle"],
	check(event, ctx) {
		if (event.type !== "epic-created") return null;

		const branch = event.branch;
		const created = countMatching(ctx, (e) => e.type === "epic-created" && e.branch === branch);
		const closed = countMatching(
			ctx,
			(e) => (e.type === "epic-completed" || e.type === "epic-abandoned") && e.branch === branch,
		);

		const active = created - closed;
		if (active >= 1) {
			return {
				message: `Branch "${branch}" already has an active epic. Complete or abandon it first.`,
				context: { branch, activeCount: active },
			};
		}
		return null;
	},
};

/**
 * epic.dir.unique: No two epic-created events may share the same directory.
 */
export const epicDirUnique: InvariantRule = {
	id: "epic.dir.unique",
	ruleType: "unique",
	description: "Epic directory must be unique across all epics",
	appliesTo: ["entity-lifecycle"],
	check(event, ctx) {
		if (event.type !== "epic-created") return null;

		const payload = narrowPayload(event.payload, EpicCreatedPayload);
		if (payload === null) return null;

		const priorCreated = ctx.eventsByType.get("epic-created");
		if (!priorCreated) return null;

		for (const prior of priorCreated) {
			const priorPayload = narrowPayload(prior.payload, EpicCreatedPayload);
			if (priorPayload !== null && priorPayload.directory === payload.directory) {
				return {
					message: `Epic directory "${payload.directory}" already used by a prior epic.`,
					context: { directory: payload.directory, conflictingEventId: prior.id },
				};
			}
		}
		return null;
	},
};

/**
 * epic.goal.committed-before-explore: Goal must be committed before
 * exploration can start.
 */
export const epicGoalCommittedBeforeExplore: InvariantRule = {
	id: "epic.goal.committed-before-explore",
	ruleType: "precondition",
	description: "Epic goal must be committed before exploration starts",
	appliesTo: ["entity-lifecycle", "exploration"],
	check(event, ctx) {
		if (event.type !== "exploration-cycle-started") return null;
		if (hasEventOfType(ctx, "epic-goal-committed")) return null;
		return {
			message: "Cannot start exploration without a committed epic goal.",
		};
	},
};

/**
 * epic.architecture-target-required-before-slice-set: Architecture target
 * must be committed before slice set is committed.
 */
export const epicArchitectureTargetRequiredBeforeSliceSet: InvariantRule = {
	id: "epic.architecture-target-required-before-slice-set",
	ruleType: "precondition",
	description: "Architecture target must be committed before slice set",
	appliesTo: ["entity-lifecycle"],
	check(event, ctx) {
		if (event.type !== "slice-set-committed") return null;
		if (hasEventOfType(ctx, "architecture-target-committed")) return null;
		return {
			message: "Cannot commit slice set without a committed architecture target.",
		};
	},
};

/**
 * epic.pressure-test-required-before-slice-set: Pressure test must be
 * committed before slice set is committed.
 */
export const epicPressureTestRequiredBeforeSliceSet: InvariantRule = {
	id: "epic.pressure-test-required-before-slice-set",
	ruleType: "precondition",
	description: "Pressure test must be committed before slice set",
	appliesTo: ["entity-lifecycle", "pressure-test"],
	check(event, ctx) {
		if (event.type !== "slice-set-committed") return null;
		if (hasEventOfType(ctx, "pressure-test-committed")) return null;
		return {
			message: "Cannot commit slice set without a committed pressure test.",
		};
	},
};

/**
 * epic.architecture-shape-approval-required: Architecture must be shape-approved
 * before pressure test can be drafted.
 */
export const epicArchitectureShapeApprovalRequired: InvariantRule = {
	id: "epic.architecture-shape-approval-required",
	ruleType: "precondition",
	description: "Architecture shape must be approved before pressure test drafting",
	appliesTo: ["entity-lifecycle", "pressure-test"],
	check(event, ctx) {
		if (event.type !== "pressure-test-drafted") return null;
		if (hasEventOfType(ctx, "architecture-shape-approved")) return null;
		if (hasEventOfType(ctx, "architecture-shape-checkpoint-auto-shaped")) return null;
		return {
			message: "Cannot draft pressure test without architecture shape approval.",
		};
	},
};

/**
 * epic.slice-shape-approval-required: Slice set must be shape-approved
 * before slice refinement can begin.
 */
export const epicSliceShapeApprovalRequired: InvariantRule = {
	id: "epic.slice-shape-approval-required",
	ruleType: "precondition",
	description: "Slice set shape must be approved before slice refinement",
	appliesTo: ["entity-lifecycle", "refinement"],
	check(event, ctx) {
		if (event.type !== "slice-refinement-started") return null;
		if (hasEventOfType(ctx, "slice-set-shape-approved")) return null;
		return {
			message: "Cannot start slice refinement without slice set shape approval.",
		};
	},
};

/**
 * epic.goal-drafted-before-commit: Goal must be drafted before it can be committed.
 */
export const epicGoalDraftedBeforeCommit: InvariantRule = {
	id: "epic.goal-drafted-before-commit",
	ruleType: "precondition",
	description: "Epic goal must be drafted before it can be committed",
	appliesTo: ["entity-lifecycle"],
	check(event, ctx) {
		if (event.type !== "epic-goal-committed") return null;
		if (hasEventOfType(ctx, "epic-goal-drafted")) return null;
		return {
			message: "Cannot commit goal without a draft.",
		};
	},
};

/**
 * epic.exploration-concluded-before-architecture: Exploration must be concluded
 * before architecture can be drafted.
 */
export const epicExplorationConcludedBeforeArchitecture: InvariantRule = {
	id: "epic.exploration-concluded-before-architecture",
	ruleType: "precondition",
	description: "Exploration must be concluded before architecture drafting",
	appliesTo: ["entity-lifecycle"],
	check(event, ctx) {
		if (event.type !== "architecture-target-drafted") return null;
		if (hasEventOfType(ctx, "exploration-concluded")) return null;
		return {
			message: "Cannot draft architecture without concluded exploration.",
		};
	},
};

/**
 * epic.not-abandoned: Cannot append events to an abandoned epic.
 * Terminal events (epic-created, epic-completed, epic-abandoned) are exempt.
 */
export const epicNotAbandoned: InvariantRule = {
	id: "epic.not-abandoned",
	ruleType: "precondition",
	description: "Cannot append events to an abandoned epic",
	appliesTo: ["entity-lifecycle", "exploration", "pressure-test", "refinement", "pause-steering"],
	check(event, ctx) {
		if (TERMINAL_EVENT_TYPES.has(event.type)) return null;
		if (!hasEventOfType(ctx, "epic-abandoned")) return null;
		return {
			message: "Cannot modify an abandoned epic.",
		};
	},
};

/**
 * epic.not-completed: Cannot append events to a completed epic.
 * Terminal events (epic-created, epic-completed, epic-abandoned) are exempt.
 */
export const epicNotCompleted: InvariantRule = {
	id: "epic.not-completed",
	ruleType: "precondition",
	description: "Cannot append events to a completed epic",
	appliesTo: ["entity-lifecycle", "exploration", "pressure-test", "refinement", "pause-steering"],
	check(event, ctx) {
		if (TERMINAL_EVENT_TYPES.has(event.type)) return null;
		if (!hasEventOfType(ctx, "epic-completed")) return null;
		return {
			message: "Cannot modify a completed epic.",
		};
	},
};

/**
 * epic.all-slices-landed-before-complete: All slices that were created must
 * have corresponding landed or abandoned events before the epic can complete.
 */
export const epicAllSlicesLandedBeforeComplete: InvariantRule = {
	id: "epic.all-slices-landed-before-complete",
	ruleType: "all_match",
	description: "All slices must be landed or abandoned before epic completes",
	appliesTo: ["entity-lifecycle"],
	check(event, ctx) {
		if (event.type !== "epic-completed") return null;

		const created = ctx.eventsByType.get("slice-created") ?? [];
		const landed = new Set<string>();
		const abandoned = new Set<string>();

		for (const e of ctx.eventsByType.get("slice-landed") ?? []) {
			if (e.scopeRef != null) landed.add(e.scopeRef);
		}
		for (const e of ctx.eventsByType.get("slice-abandoned") ?? []) {
			if (e.scopeRef != null) abandoned.add(e.scopeRef);
		}

		const unresolved: string[] = [];
		for (const e of created) {
			const ref = e.scopeRef;
			if (ref != null && !landed.has(ref) && !abandoned.has(ref)) {
				unresolved.push(ref);
			}
		}

		if (unresolved.length > 0) {
			return {
				message: `Cannot complete epic: ${unresolved.length} slice(s) not yet landed or abandoned.`,
				context: { unresolvedSlices: unresolved },
			};
		}
		return null;
	},
};
