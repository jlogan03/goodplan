import type { DerivedStateData, ProjectState } from "../../schemas/entities/derived-state.js";
import type { AnyEventEnvelope } from "../../schemas/envelope.js";
import type { DeepReadonly } from "../../util/types.js";
import {
	reduceBriefing,
	reduceDecisionLearning,
	reduceEntityLifecycle,
	reduceExploration,
	reduceFinding,
	reduceMilestone,
	reducePauseSteering,
	reducePressureTest,
	reduceRefinement,
	reduceReshape,
	reduceSpine,
} from "./reducers.js";

/**
 * Create an empty DerivedStateData with default values.
 * All Maps are empty, project is not initialized.
 */
export function createEmptyState(): DerivedStateData {
	const project: ProjectState = {
		name: "",
		version: "",
		steeringPreference: "best-guess-and-flag",
		initialized: false,
	};
	return {
		project,
		epics: new Map(),
		sideQuests: new Map(),
		convergenceSnapshots: new Map(),
		latestDimensionScores: new Map(),
		subsystems: new Map(),
		customInvariants: new Map(),
		briefings: [],
	};
}

/**
 * Pure reducer: replay all events and compute derived state.
 * Dispatches each event to the appropriate domain reducer.
 * Unknown event types are silently skipped (forward compatibility).
 *
 * Returns DeepReadonly<DerivedStateData> for immutability signal (no runtime freeze).
 */
export function computeDerivedState(events: AnyEventEnvelope[]): DeepReadonly<DerivedStateData> {
	const state = createEmptyState();
	for (const event of events) {
		applyEvent(state, event);
	}
	return state as DeepReadonly<DerivedStateData>;
}

/**
 * Dispatch a single event to the appropriate domain reducer.
 */
function applyEvent(state: DerivedStateData, event: AnyEventEnvelope): void {
	switch (event.domain) {
		case "entity-lifecycle":
			reduceEntityLifecycle(state, event);
			break;
		case "spine":
			reduceSpine(state, event);
			break;
		case "refinement":
			reduceRefinement(state, event);
			break;
		case "exploration":
			reduceExploration(state, event);
			break;
		case "pressure-test":
			reducePressureTest(state, event);
			break;
		case "finding":
			reduceFinding(state, event);
			break;
		case "briefing":
			reduceBriefing(state, event);
			break;
		case "decision-learning":
			reduceDecisionLearning(state, event);
			break;
		case "pause-steering":
			reducePauseSteering(state, event);
			break;
		case "reshape":
			reduceReshape(state, event);
			break;
		case "milestone":
			reduceMilestone(state, event);
			break;
		default:
			// Unknown domain: silently skip (forward compatibility)
			break;
	}
}
