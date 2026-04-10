import type {
	ChunkState,
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
			const dir = (payload.dir as string) ?? event.scopeRef ?? "";
			const epicState = createEmptyEpicState(dir);
			state.epics.set(dir, epicState);
			break;
		}

		case "epic-goal-drafted": {
			const epic = resolveEpic(state, event);
			if (epic !== undefined) {
				epic.goal = (payload.goal as ContentRef) ?? null;
			}
			break;
		}

		case "epic-goal-committed": {
			const epic = resolveEpic(state, event);
			if (epic !== undefined) {
				epic.goal = (payload.goal as ContentRef) ?? epic.goal;
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

		case "architecture-target-committed": {
			const epic = resolveEpic(state, event);
			if (epic !== undefined) {
				epic.architectureTarget = (payload.architectureTarget as ContentRef) ?? null;
				epic.phase = "P3";
			}
			break;
		}

		case "pressure-test-committed": {
			const epic = resolveEpic(state, event);
			if (epic !== undefined) {
				epic.pressureTest = (payload.pressureTest as ContentRef) ?? null;
				epic.phase = "P4";
			}
			break;
		}

		case "pressure-test-finding-accepted": {
			const epic = resolveEpic(state, event);
			if (epic !== undefined) {
				const findingId = payload.findingId as string | undefined;
				if (findingId !== undefined) {
					const finding = epic.findings.find((f) => f.id === findingId);
					if (finding !== undefined) {
						finding.disposition = "accepted";
					}
				}
			}
			break;
		}

		case "slice-set-committed": {
			const epic = resolveEpic(state, event);
			if (epic !== undefined) {
				epic.sliceSet = (payload.sliceSet as ContentRef) ?? null;
				epic.phase = "P5";
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
				const dir = payload.dir as string | undefined;
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

		case "side-quest-plan-committed": {
			const sq = resolveSideQuest(state, event);
			if (sq !== undefined) {
				sq.plan = (payload.plan as ContentRef) ?? null;
				sq.phase = "S1";
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

		default:
			// Silently skip unknown entity-lifecycle event types (forward compat)
			break;
	}
}

// --- Spine Reducer ---

export function reduceSpine(state: DerivedStateData, _event: AnyEventEnvelope): void {
	// Spine events (architecture-committed, conventions-committed, subsystem-registered)
	// currently do not mutate DerivedStateData fields.
	// They affect spine files managed by the milestone system.
	// Stub: silently skip.
	void state;
}

// --- Stub reducers for other domains ---

export function reduceRefinement(state: DerivedStateData, _event: AnyEventEnvelope): void {
	// Stub: refinement events will be handled in trust layer (slice 04+)
	void state;
}

export function reduceExploration(state: DerivedStateData, _event: AnyEventEnvelope): void {
	void state;
}

export function reducePressureTest(state: DerivedStateData, _event: AnyEventEnvelope): void {
	void state;
}

export function reduceFinding(state: DerivedStateData, _event: AnyEventEnvelope): void {
	void state;
}

export function reduceBriefing(state: DerivedStateData, _event: AnyEventEnvelope): void {
	void state;
}

export function reduceDecisionLearning(state: DerivedStateData, _event: AnyEventEnvelope): void {
	void state;
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
				const pref = payload.preference as SteeringPreference | undefined;
				if (pref !== undefined) {
					epic.steeringPreference = pref;
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
	const sliceDir = payload.sliceDir as string | undefined;
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
	};
}
