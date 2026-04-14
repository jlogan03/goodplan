import type {
	ChunkState,
	ConvergenceSnapshot,
	DerivedStateData,
	EpicState,
	SideQuestState,
	SliceState,
	SteeringPreference,
} from "../../schemas/entities/derived-state.js";
/**
 * Per-domain reducer functions for the derived state computer.
 * Module-internal: NOT exported from the barrel.
 */
import type { AnyEventEnvelope, ContentRef } from "../../schemas/envelope.js";
import { briefingWrittenPayloadSchema } from "../../schemas/events/briefing.js";
import {
	architectureTargetCommittedPayloadSchema,
	architectureTargetDraftedPayloadSchema,
	brainstormCapturedPayloadSchema,
	epicGoalCommittedPayloadSchema,
	epicGoalDraftedPayloadSchema,
	epicSteeringPreferenceSetPayloadSchema,
	explorationCycleStartedPayloadSchema,
	pressureTestCommittedPayloadSchema,
	pressureTestDraftedPayloadSchema,
	pressureTestFindingDispositionPayloadSchema,
	researchCapturedPayloadSchema,
	sliceSetCommittedPayloadSchema,
	sliceSetDraftedPayloadSchema,
} from "../../schemas/events/epic.js";
import { findingTriagedPayloadSchema } from "../../schemas/events/finding.js";
import {
	invariantActivatedPayloadSchema,
	invariantDeactivatedPayloadSchema,
	invariantProposedPayloadSchema,
} from "../../schemas/events/invariant.js";
import {
	artifactRevisedPayloadSchema,
	convergenceOverriddenPayloadSchema,
	refinementCircuitBreakerTrippedPayloadSchema,
	refinementConvergedPayloadSchema,
	refinementRoundStartedPayloadSchema,
	refinementSynthesizedPayloadSchema,
	reviewerScoredPayloadSchema,
} from "../../schemas/events/refinement.js";
import {
	subsystemMaturityUpdatedPayloadSchema,
	subsystemRegisteredPayloadSchema,
	subsystemRetiredPayloadSchema,
} from "../../schemas/events/subsystem.js";

// --- Entity Lifecycle Reducer ---

export function reduceEntityLifecycle(state: DerivedStateData, event: AnyEventEnvelope): void {
	const payload = event.payload as Record<string, unknown>;

	switch (event.type) {
		case "project-initialized": {
			state.project.initialized = true;
			state.project.name = (payload.name as string) ?? "";
			state.project.version = (payload.version as string) ?? "2.0.0";
			break;
		}

		case "epic-created": {
			const dir = (payload.directory as string) ?? (payload.dir as string) ?? event.scopeRef ?? "";
			const epicState = createEmptyEpicState(dir);
			state.epics.set(dir, epicState);
			break;
		}

		case "epic-goal-drafted": {
			const epic = resolveEpic(state, event);
			if (epic !== undefined) {
				const parsed = epicGoalDraftedPayloadSchema.safeParse(payload);
				if (parsed.success) {
					epic.goal = parsed.data.goal;
				}
			}
			break;
		}

		case "epic-goal-committed": {
			const epic = resolveEpic(state, event);
			if (epic !== undefined) {
				const parsed = epicGoalCommittedPayloadSchema.safeParse(payload);
				if (parsed.success) {
					epic.goal = parsed.data.goal;
				}
				epic.phase = "P1";
			}
			break;
		}

		case "exploration-concluded": {
			const epic = resolveEpic(state, event);
			if (epic !== undefined) {
				epic.phase = "P2";
			}
			break;
		}

		case "architecture-target-drafted": {
			const epic = resolveEpic(state, event);
			if (epic !== undefined) {
				const parsed = architectureTargetDraftedPayloadSchema.safeParse(payload);
				if (parsed.success) {
					epic.architectureTarget = parsed.data.architectureTarget;
				}
			}
			break;
		}

		case "architecture-target-committed": {
			const epic = resolveEpic(state, event);
			if (epic !== undefined) {
				const parsed = architectureTargetCommittedPayloadSchema.safeParse(payload);
				if (parsed.success) {
					epic.architectureTarget = parsed.data.architectureTarget;
				}
				epic.phase = "P3";
			}
			break;
		}

		case "architecture-shape-checkpoint-reached": {
			// No state change — checkpoint is informational
			break;
		}

		case "architecture-shape-approved": {
			const epic = resolveEpic(state, event);
			if (epic !== undefined) {
				epic.architectureShapeApproved = true;
			}
			break;
		}

		case "architecture-shape-checkpoint-auto-shaped": {
			const epic = resolveEpic(state, event);
			if (epic !== undefined) {
				epic.architectureShapeApproved = true;
			}
			break;
		}

		case "pressure-test-drafted": {
			const epic = resolveEpic(state, event);
			if (epic !== undefined) {
				const parsed = pressureTestDraftedPayloadSchema.safeParse(payload);
				if (parsed.success) {
					epic.pressureTest = parsed.data.pressureTest;
				}
			}
			break;
		}

		case "pressure-test-committed": {
			const epic = resolveEpic(state, event);
			if (epic !== undefined) {
				const parsed = pressureTestCommittedPayloadSchema.safeParse(payload);
				if (parsed.success) {
					epic.pressureTest = parsed.data.pressureTest;
				}
				epic.phase = "P4";
			}
			break;
		}

		case "pressure-test-finding-accepted": {
			const epic = resolveEpic(state, event);
			if (epic !== undefined) {
				const parsed = pressureTestFindingDispositionPayloadSchema.safeParse(payload);
				if (parsed.success) {
					const finding = epic.findings.find((f) => f.id === parsed.data.findingId);
					if (finding !== undefined) {
						finding.disposition = parsed.data.disposition;
					}
				}
			}
			break;
		}

		case "slice-set-drafted": {
			const epic = resolveEpic(state, event);
			if (epic !== undefined) {
				const parsed = sliceSetDraftedPayloadSchema.safeParse(payload);
				if (parsed.success) {
					epic.sliceSet = parsed.data.sliceSet;
				}
			}
			break;
		}

		case "slice-set-committed": {
			const epic = resolveEpic(state, event);
			if (epic !== undefined) {
				const parsed = sliceSetCommittedPayloadSchema.safeParse(payload);
				if (parsed.success) {
					epic.sliceSet = parsed.data.sliceSet;
				}
				epic.phase = "P5";
			}
			break;
		}

		case "slice-set-shape-checkpoint-reached": {
			// No state change — checkpoint is informational
			break;
		}

		case "slice-set-shape-approved": {
			const epic = resolveEpic(state, event);
			if (epic !== undefined) {
				epic.sliceSetShapeApproved = true;
			}
			break;
		}

		case "slice-set-shape-checkpoint-auto-shaped": {
			const epic = resolveEpic(state, event);
			if (epic !== undefined) {
				epic.sliceSetShapeApproved = true;
			}
			break;
		}

		case "epic-activated": {
			const epic = resolveEpic(state, event);
			if (epic !== undefined) {
				epic.active = true;
				epic.paused = false;
				epic.phase = "P6";
			}
			break;
		}

		case "epic-paused": {
			const epic = resolveEpic(state, event);
			if (epic !== undefined) {
				epic.paused = true;
			}
			break;
		}

		case "epic-resumed": {
			const epic = resolveEpic(state, event);
			if (epic !== undefined) {
				epic.paused = false;
			}
			break;
		}

		case "epic-completed": {
			const epic = resolveEpic(state, event);
			if (epic !== undefined) {
				epic.completed = true;
				epic.active = false;
			}
			break;
		}

		case "epic-abandoned": {
			const epic = resolveEpic(state, event);
			if (epic !== undefined) {
				epic.abandoned = true;
				epic.active = false;
			}
			break;
		}

		case "slice-created": {
			const epic = resolveEpic(state, event);
			if (epic !== undefined) {
				const dir =
					(payload.directory as string | undefined) ??
					(payload.sliceRef as string | undefined) ??
					(payload.dir as string | undefined);
				if (dir !== undefined) {
					const sliceState = createEmptySliceState(dir);
					epic.slices.set(dir, sliceState);
				}
			}
			break;
		}

		case "slice-plan-drafted": {
			const slice = resolveSlice(state, event, payload);
			if (slice !== undefined) {
				slice.plan = (payload.plan as ContentRef) ?? null;
				slice.phase = "P7";
			}
			break;
		}

		case "plan-shape-approved":
		case "plan-shape-checkpoint-auto-shaped": {
			const slice = resolveSlice(state, event, payload);
			if (slice !== undefined) {
				slice.phase = "P8";
			}
			break;
		}

		case "slice-plan-committed": {
			const slice = resolveSlice(state, event, payload);
			if (slice !== undefined) {
				slice.plan = (payload.plan as ContentRef) ?? slice.plan;
				slice.phase = "P9";
			}
			break;
		}

		case "slice-implementation-started": {
			const slice = resolveSlice(state, event, payload);
			if (slice !== undefined) {
				slice.phase = "P10";
			}
			break;
		}

		case "slice-implementation-chunk-started": {
			const slice = resolveSlice(state, event, payload);
			if (slice !== undefined) {
				const chunkId = payload.chunkId as string | undefined;
				if (chunkId !== undefined) {
					const chunk: ChunkState = {
						id: chunkId,
						description: (payload.description as string) ?? "",
						verificationType: (payload.verificationType as string) ?? null,
						status: "pending",
					};
					slice.chunks.set(chunkId, chunk);
				}
			}
			break;
		}

		case "chunk-red-test-written": {
			const chunk = resolveChunk(state, event, payload);
			if (chunk !== undefined) {
				chunk.status = "red-written";
			}
			break;
		}

		case "chunk-red-test-failed": {
			const chunk = resolveChunk(state, event, payload);
			if (chunk !== undefined) {
				chunk.status = "red-failed";
			}
			break;
		}

		case "chunk-green-achieved": {
			const chunk = resolveChunk(state, event, payload);
			if (chunk !== undefined) {
				chunk.status = "green";
			}
			break;
		}

		case "chunk-verified": {
			const chunk = resolveChunk(state, event, payload);
			if (chunk !== undefined) {
				chunk.status = "verified";
			}
			break;
		}

		case "chunk-unverifiable": {
			const chunk = resolveChunk(state, event, payload);
			if (chunk !== undefined) {
				chunk.status = "unverifiable";
			}
			break;
		}

		case "chunk-unverifiable-decided": {
			const chunk = resolveChunk(state, event, payload);
			if (chunk !== undefined) {
				chunk.status = "decided";
			}
			break;
		}

		case "slice-code-refinement-started": {
			const slice = resolveSlice(state, event, payload);
			if (slice !== undefined) {
				slice.phase = "P11";
			}
			break;
		}

		case "code-refinement-converged": {
			const slice = resolveSlice(state, event, payload);
			if (slice !== undefined) {
				// P11 complete, not yet P12
			}
			break;
		}

		case "slice-landed": {
			const slice = resolveSlice(state, event, payload);
			if (slice !== undefined) {
				slice.phase = "P12";
			}
			break;
		}

		case "slice-abandoned": {
			const slice = resolveSlice(state, event, payload);
			if (slice !== undefined) {
				slice.abandoned = true;
			}
			break;
		}

		case "side-quest-created": {
			const dir = (payload.dir as string) ?? event.scopeRef ?? "";
			const sqState = createEmptySideQuestState(dir);
			state.sideQuests.set(dir, sqState);
			break;
		}

		case "side-quest-goal-committed": {
			const sq = resolveSideQuest(state, event);
			if (sq !== undefined) {
				sq.goal = (payload.goal as ContentRef) ?? null;
				sq.phase = "S1";
			}
			break;
		}

		case "side-quest-plan-drafted": {
			const sq = resolveSideQuest(state, event);
			if (sq !== undefined) {
				sq.plan = (payload.plan as ContentRef) ?? null;
			}
			break;
		}

		case "side-quest-plan-shape-approved": {
			const sq = resolveSideQuest(state, event);
			if (sq !== undefined) {
				sq.planShapeApproved = true;
			}
			break;
		}

		case "side-quest-plan-committed": {
			const sq = resolveSideQuest(state, event);
			if (sq !== undefined) {
				sq.plan = (payload.plan as ContentRef) ?? null;
				sq.phase = "S1";
			}
			break;
		}

		case "side-quest-chunk-started": {
			const sq = resolveSideQuest(state, event);
			if (sq !== undefined) {
				const chunkId = payload.chunkId as string | undefined;
				const description = payload.description as string | undefined;
				if (chunkId !== undefined) {
					sq.chunks.set(chunkId, {
						id: chunkId,
						description: description ?? "",
						verificationType: null,
						status: "pending",
					});
				}
			}
			break;
		}

		case "side-quest-chunk-verified": {
			const sq = resolveSideQuest(state, event);
			if (sq !== undefined) {
				const chunkId = payload.chunkId as string | undefined;
				if (chunkId !== undefined) {
					const chunk = sq.chunks.get(chunkId);
					if (chunk !== undefined) {
						chunk.status = "verified";
					}
				}
			}
			break;
		}

		case "side-quest-implementation-started": {
			const sq = resolveSideQuest(state, event);
			if (sq !== undefined) {
				sq.active = true;
				sq.phase = "S2";
			}
			break;
		}

		case "side-quest-landed": {
			const sq = resolveSideQuest(state, event);
			if (sq !== undefined) {
				sq.landed = true;
				sq.active = false;
				sq.phase = "S3";
			}
			break;
		}

		case "side-quest-abandoned": {
			const sq = resolveSideQuest(state, event);
			if (sq !== undefined) {
				sq.abandoned = true;
				sq.active = false;
			}
			break;
		}

		case "finding-captured": {
			const epic = resolveEpic(state, event);
			if (epic !== undefined) {
				const finding = {
					id: (payload.findingId as string) ?? (payload.id as string) ?? "",
					summary: (payload.summary as string) ?? "",
					disposition: "pending" as const,
				};
				epic.findings.push(finding);
			}
			break;
		}

		case "finding-triaged": {
			const epic = resolveEpic(state, event);
			if (epic !== undefined) {
				const parsed = findingTriagedPayloadSchema.safeParse(payload);
				if (parsed.success) {
					const finding = epic.findings.find((f) => f.id === parsed.data.findingId);
					if (finding !== undefined) {
						finding.disposition = parsed.data.disposition;
					}
				}
			}
			break;
		}

		default:
			// Silently skip unknown entity-lifecycle event types (forward compat)
			break;
	}
}

// --- Spine Reducer ---

export function reduceSpine(state: DerivedStateData, event: AnyEventEnvelope): void {
	const payload = event.payload as Record<string, unknown>;

	switch (event.type) {
		case "subsystem-registered": {
			const parsed = subsystemRegisteredPayloadSchema.safeParse(payload);
			if (parsed.success) {
				state.subsystems.set(parsed.data.name, {
					name: parsed.data.name,
					maturity: parsed.data.maturity,
					owns: parsed.data.owns,
					retired: false,
				});
			}
			break;
		}

		case "subsystem-maturity-updated": {
			const parsed = subsystemMaturityUpdatedPayloadSchema.safeParse(payload);
			if (parsed.success) {
				const existing = state.subsystems.get(parsed.data.name);
				if (existing !== undefined) {
					existing.maturity = parsed.data.maturity;
				}
			}
			break;
		}

		case "subsystem-retired": {
			const parsed = subsystemRetiredPayloadSchema.safeParse(payload);
			if (parsed.success) {
				const existing = state.subsystems.get(parsed.data.name);
				if (existing !== undefined) {
					existing.retired = true;
				}
			}
			break;
		}

		case "invariant-proposed": {
			const parsed = invariantProposedPayloadSchema.safeParse(payload);
			if (parsed.success) {
				state.customInvariants.set(parsed.data.invariantId, {
					id: parsed.data.invariantId,
					description: parsed.data.description,
					status: "proposed",
				});
			}
			break;
		}

		case "invariant-activated": {
			const parsed = invariantActivatedPayloadSchema.safeParse(payload);
			if (parsed.success) {
				const existing = state.customInvariants.get(parsed.data.invariantId);
				if (existing !== undefined) {
					existing.status = "active";
				}
			}
			break;
		}

		case "invariant-deactivated": {
			const parsed = invariantDeactivatedPayloadSchema.safeParse(payload);
			if (parsed.success) {
				const existing = state.customInvariants.get(parsed.data.invariantId);
				if (existing !== undefined) {
					existing.status = "inactive";
				}
			}
			break;
		}

		default:
			// Silently skip unknown spine event types (forward compat)
			break;
	}
}

// --- Stub reducers for other domains ---

export function reduceRefinement(state: DerivedStateData, event: AnyEventEnvelope): void {
	const payload = event.payload as Record<string, unknown>;

	switch (event.type) {
		case "refinement-round-started": {
			const parsed = refinementRoundStartedPayloadSchema.safeParse(payload);
			if (parsed.success) {
				const key = `${parsed.data.scopeRef}:${parsed.data.artifactType}`;
				const snapshot: ConvergenceSnapshot = {
					scopeRef: parsed.data.scopeRef,
					artifactType: parsed.data.artifactType,
					state: "CONTINUE",
					round: parsed.data.round,
				};
				state.convergenceSnapshots.set(key, snapshot);
			}
			break;
		}

		case "reviewer-scored": {
			const parsed = reviewerScoredPayloadSchema.safeParse(payload);
			if (parsed.success) {
				const key = `${parsed.data.scopeRef}:${parsed.data.artifactType}`;
				// Update latest dimension scores for this reviewer
				const scoreKey = `${key}:${parsed.data.reviewerId}`;
				state.latestDimensionScores.set(scoreKey, parsed.data.dimensions);
			}
			break;
		}

		case "refinement-synthesized": {
			const parsed = refinementSynthesizedPayloadSchema.safeParse(payload);
			if (parsed.success) {
				const key = `${parsed.data.scopeRef}:${parsed.data.artifactType}`;
				const snapshot = state.convergenceSnapshots.get(key);
				if (snapshot !== undefined) {
					snapshot.synthesisRef = parsed.data.synthesis;
				}
			}
			break;
		}

		case "artifact-revised": {
			const parsed = artifactRevisedPayloadSchema.safeParse(payload);
			if (parsed.success) {
				const key = `${parsed.data.scopeRef}:${parsed.data.artifactType}`;
				const snapshot = state.convergenceSnapshots.get(key);
				if (snapshot !== undefined) {
					snapshot.revisedArtifactRef = parsed.data.artifact;
				}
			}
			break;
		}

		case "refinement-converged": {
			const parsed = refinementConvergedPayloadSchema.safeParse(payload);
			if (parsed.success) {
				const key = `${parsed.data.scopeRef}:${parsed.data.artifactType}`;
				const snapshot = state.convergenceSnapshots.get(key);
				if (snapshot !== undefined) {
					snapshot.state = "CONVERGED";
				}
			}
			break;
		}

		case "refinement-circuit-breaker-tripped": {
			const parsed = refinementCircuitBreakerTrippedPayloadSchema.safeParse(payload);
			if (parsed.success) {
				const key = `${parsed.data.scopeRef}:${parsed.data.artifactType}`;
				const snapshot = state.convergenceSnapshots.get(key);
				if (snapshot !== undefined) {
					snapshot.state = "CIRCUIT-BROKEN";
				}
			}
			break;
		}

		case "convergence-overridden": {
			const parsed = convergenceOverriddenPayloadSchema.safeParse(payload);
			if (parsed.success) {
				const key = `${parsed.data.scopeRef}:${parsed.data.artifactType}`;
				const snapshot = state.convergenceSnapshots.get(key);
				if (snapshot !== undefined) {
					snapshot.state = "CONVERGED";
					snapshot.overridden = true;
				}
			}
			break;
		}

		default:
			// Silently skip unknown refinement event types (forward compat)
			break;
	}
}

export function reduceExploration(state: DerivedStateData, event: AnyEventEnvelope): void {
	const payload = event.payload as Record<string, unknown>;

	switch (event.type) {
		case "exploration-cycle-started": {
			const epic = resolveEpic(state, event);
			if (epic !== undefined) {
				const parsed = explorationCycleStartedPayloadSchema.safeParse(payload);
				if (parsed.success) {
					epic.explorationCycles = parsed.data.cycleNumber;
				}
			}
			break;
		}

		case "research-captured": {
			const epic = resolveEpic(state, event);
			if (epic !== undefined) {
				const parsed = researchCapturedPayloadSchema.safeParse(payload);
				if (parsed.success) {
					epic.researchRefs.push(parsed.data.contentRef);
				}
			}
			break;
		}

		case "brainstorm-captured": {
			const epic = resolveEpic(state, event);
			if (epic !== undefined) {
				const parsed = brainstormCapturedPayloadSchema.safeParse(payload);
				if (parsed.success) {
					epic.brainstormRefs.push(parsed.data.contentRef);
				}
			}
			break;
		}

		default:
			// Silently skip unknown exploration event types (forward compat)
			break;
	}
}

export function reducePressureTest(state: DerivedStateData, _event: AnyEventEnvelope): void {
	void state;
}

export function reduceFinding(state: DerivedStateData, _event: AnyEventEnvelope): void {
	void state;
}

export function reduceBriefing(state: DerivedStateData, event: AnyEventEnvelope): void {
	switch (event.type) {
		case "briefing-written": {
			const parsed = briefingWrittenPayloadSchema.safeParse(event.payload);
			if (parsed.success) {
				const d = parsed.data;
				state.briefings.push({
					scope: event.scopeRef === null ? "project" : "epic",
					scopeRef: event.scopeRef,
					timeContext: d.timeContext,
					currentPosition: d.currentPosition,
					lastAction: d.lastAction,
					whereStopped: d.whereStopped,
					nextAction: d.nextAction,
					attentionItems: d.attentionItems,
					...(d.deepLinks !== undefined ? { deepLinks: d.deepLinks } : {}),
					writtenAt: event.timestamp,
				});
			}
			break;
		}

		default:
			// Silently skip unknown briefing event types (forward compat)
			break;
	}
}

export function reduceDecisionLearning(_state: DerivedStateData, event: AnyEventEnvelope): void {
	switch (event.type) {
		case "decision-recorded":
		case "decision-superseded":
		case "learning-captured":
		case "learning-promoted":
			// These events are recorded in the event log for replay.
			// No derived state updates needed yet — decisions and learnings
			// are currently read from the v1 data layer (decisions.jsonl, learnings/).
			// When the v1 data layer is retired, add Map-based tracking here.
			break;

		default:
			// Silently skip unknown decision-learning event types (forward compat)
			break;
	}
}

export function reducePauseSteering(state: DerivedStateData, event: AnyEventEnvelope): void {
	const payload = event.payload as Record<string, unknown>;

	switch (event.type) {
		case "steering-preference-set": {
			const pref = payload.preference as SteeringPreference | undefined;
			if (pref !== undefined) {
				// If scopeRef is null, it's project-level
				if (event.scopeRef === null) {
					state.project.steeringPreference = pref;
				} else {
					const epic = state.epics.get(event.scopeRef);
					if (epic !== undefined) {
						epic.steeringPreference = pref;
					}
				}
			}
			break;
		}

		case "epic-steering-preference-set": {
			const epic = resolveEpic(state, event);
			if (epic !== undefined) {
				const parsed = epicSteeringPreferenceSetPayloadSchema.safeParse(payload);
				if (parsed.success) {
					epic.steeringPreference = parsed.data.preference;
				}
			}
			break;
		}

		default:
			break;
	}
}

export function reduceReshape(state: DerivedStateData, _event: AnyEventEnvelope): void {
	void state;
}

export function reduceMilestone(state: DerivedStateData, _event: AnyEventEnvelope): void {
	void state;
}

// --- Helpers ---

function resolveEpic(state: DerivedStateData, event: AnyEventEnvelope): EpicState | undefined {
	const ref = event.scopeRef;
	if (ref === null) return undefined;
	return state.epics.get(ref);
}

function resolveSideQuest(
	state: DerivedStateData,
	event: AnyEventEnvelope,
): SideQuestState | undefined {
	const ref = event.scopeRef;
	if (ref === null) return undefined;
	return state.sideQuests.get(ref);
}

function resolveSlice(
	state: DerivedStateData,
	event: AnyEventEnvelope,
	payload: Record<string, unknown>,
): SliceState | undefined {
	const epicRef = event.scopeRef;
	if (epicRef === null) return undefined;
	const epic = state.epics.get(epicRef);
	if (epic === undefined) return undefined;
	const sliceDir =
		(payload.sliceRef as string | undefined) ?? (payload.sliceDir as string | undefined);
	if (sliceDir === undefined) return undefined;
	return epic.slices.get(sliceDir);
}

function resolveChunk(
	state: DerivedStateData,
	event: AnyEventEnvelope,
	payload: Record<string, unknown>,
): ChunkState | undefined {
	const slice = resolveSlice(state, event, payload);
	if (slice === undefined) return undefined;
	const chunkId = payload.chunkId as string | undefined;
	if (chunkId === undefined) return undefined;
	return slice.chunks.get(chunkId);
}

function createEmptyEpicState(dir: string): EpicState {
	return {
		dir,
		goal: null,
		architectureTarget: null,
		pressureTest: null,
		sliceSet: null,
		steeringPreference: "best-guess-and-flag",
		phase: "P0",
		slices: new Map(),
		findings: [],
		active: false,
		paused: false,
		completed: false,
		abandoned: false,
		explorationCycles: 0,
		researchRefs: [],
		brainstormRefs: [],
		architectureShapeApproved: false,
		sliceSetShapeApproved: false,
	};
}

function createEmptySliceState(dir: string): SliceState {
	return {
		dir,
		goal: null,
		plan: null,
		phase: "P0",
		chunks: new Map(),
		abandoned: false,
	};
}

function createEmptySideQuestState(dir: string): SideQuestState {
	return {
		dir,
		goal: null,
		plan: null,
		phase: "S0",
		chunks: new Map(),
		active: false,
		landed: false,
		abandoned: false,
		planShapeApproved: false,
	};
}
