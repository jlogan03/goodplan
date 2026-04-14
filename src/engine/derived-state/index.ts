// Public API barrel for derived-state subsystem.
// reducers.ts is intentionally NOT exported (module-internal).

export { computeDerivedState, createEmptyState } from "./compute.js";
export {
	currentPhase,
	activeEntities,
	blockers,
	validTransitions,
	suggestedNextSteps,
} from "./accessors.js";
export { serializeDerivedState } from "./serialize.js";
export type { SerializedDerivedState } from "./serialize.js";
export { replayAllScopes } from "./replay-all-scopes.js";

// Re-export types with `export type` per verbatimModuleSyntax
export type {
	DerivedStateData,
	ProjectState,
	EpicState,
	SliceState,
	SideQuestState,
	ChunkState,
	Phase,
	SteeringPreference,
	NextStep,
	Blocker,
	Transition,
	ConvergenceSnapshot,
	DimensionScore,
	Finding,
} from "../../schemas/entities/derived-state.js";

export type { DeepReadonly } from "../../util/types.js";
