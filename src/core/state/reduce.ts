/**
 * Core reducer — dispatches state events to transition handlers.
 * Pure function: no I/O, no side effects.
 *
 * Uses a handler Map with typed Extract<StateEvent, {type: T}> signatures.
 * The `handlerRecord` object uses `satisfies Record<StateEvent['type'], Handler>`
 * for compile-time exhaustiveness checking before Map conversion.
 */
import type { ProjectState } from "../tree.js";
import type { StateEvent, StateError } from "./types.js";
import { handleInitProject } from "./transitions/init.js";
import { handleCreateEpic } from "./transitions/epic-create.js";
import {
	handleBeginExplore,
	handleCompleteExplore,
	handleBeginArchitecture,
	handleCompleteArchitecture,
	handleBeginRefineArchitecture,
	handleBeginSlicing,
	handleCompleteSlicing,
	handleBeginRefineSlices,
} from "./transitions/epic-phase.js";
import {
	handleCompleteRefineArchitecture,
	handleCompleteRefineSlices,
} from "./transitions/epic-refine.js";
import {
	handleActivateEpic,
	handleCompleteEpic,
	handleAbandonEpic,
} from "./transitions/epic-lifecycle.js";
import {
	handleAddVerification,
	handleUpdateVerification,
} from "./transitions/epic-verify.js";
import {
	handleCompletePlan,
	handleCompleteRefinementRound,
	handleCompleteImplementation,
	handleCompleteQuestPlan,
	handleCompleteQuestRefinementRound,
	handleCompleteQuestImplementation,
} from "./transitions/slice-submit.js";

/**
 * Handler type: takes state and the narrowed event, returns new state or error.
 */
type Handler<T extends StateEvent["type"] = StateEvent["type"]> = (
	state: ProjectState,
	event: Extract<StateEvent, { type: T }>,
) => ProjectState | StateError;

/**
 * Exhaustiveness-checked handler record. TypeScript ensures every StateEvent type
 * has a corresponding handler at compile time via `satisfies`.
 */
const handlerRecord = {
	INIT_PROJECT: handleInitProject,
	CREATE_EPIC: handleCreateEpic,
	BEGIN_EXPLORE: handleBeginExplore,
	COMPLETE_EXPLORE: handleCompleteExplore,
	BEGIN_ARCHITECTURE: handleBeginArchitecture,
	COMPLETE_ARCHITECTURE: handleCompleteArchitecture,
	BEGIN_REFINE_ARCHITECTURE: handleBeginRefineArchitecture,
	COMPLETE_REFINE_ARCHITECTURE: handleCompleteRefineArchitecture,
	BEGIN_SLICING: handleBeginSlicing,
	COMPLETE_SLICING: handleCompleteSlicing,
	BEGIN_REFINE_SLICES: handleBeginRefineSlices,
	COMPLETE_REFINE_SLICES: handleCompleteRefineSlices,
	ACTIVATE_EPIC: handleActivateEpic,
	COMPLETE_EPIC: handleCompleteEpic,
	ABANDON_EPIC: handleAbandonEpic,
	ADD_VERIFICATION: handleAddVerification,
	UPDATE_VERIFICATION: handleUpdateVerification,
	COMPLETE_PLAN: handleCompletePlan,
	COMPLETE_REFINEMENT_ROUND: handleCompleteRefinementRound,
	COMPLETE_IMPLEMENTATION: handleCompleteImplementation,
	COMPLETE_QUEST_PLAN: handleCompleteQuestPlan,
	COMPLETE_QUEST_REFINEMENT_ROUND: handleCompleteQuestRefinementRound,
	COMPLETE_QUEST_IMPLEMENTATION: handleCompleteQuestImplementation,
} satisfies { [K in StateEvent["type"]]: Handler<K> };

/** Runtime lookup map — derived from the exhaustiveness-checked record. */
const handlers = new Map<string, Handler>(
	Object.entries(handlerRecord) as Array<[string, Handler]>,
);

export function reduce(
	state: ProjectState,
	event: StateEvent,
): ProjectState | StateError {
	const handler = handlers.get(event.type);
	if (handler === undefined) {
		return {
			code: "STATE_INVALID_TRANSITION",
			message: `Unknown event type: ${event.type}`,
			detail: { eventType: event.type },
		};
	}
	// The handler is typed to accept the narrowed event, but we pass via the Map
	// which loses the discriminant. The satisfies check above ensures type safety.
	return handler(state, event as never);
}
