/**
 * Core reducer — dispatches state events to transition handlers.
 * Pure function: no I/O, no side effects.
 *
 * Uses a handler Map with typed Extract<StateEvent, {type: T}> signatures.
 * The `handlerRecord` object uses `satisfies Record<StateEvent['type'], Handler>`
 * for compile-time exhaustiveness checking before Map conversion.
 */
import type { ProjectState } from "../tree.js";
import { handleCreateEpic } from "./transitions/epic-create.js";
import {
	handleAbandonEpic,
	handleActivateEpic,
	handleCompleteEpic,
} from "./transitions/epic-lifecycle.js";
import {
	handleBeginArchitecture,
	handleBeginExplore,
	handleBeginRefineArchitecture,
	handleBeginRefineSlices,
	handleBeginSlicing,
	handleCompleteArchitecture,
	handleCompleteExplore,
	handleCompleteSlicing,
} from "./transitions/epic-phase.js";
import {
	handleCompleteRefineArchitecture,
	handleCompleteRefineSlices,
} from "./transitions/epic-refine.js";
import { handleAddVerification, handleUpdateVerification } from "./transitions/epic-verify.js";
import { handleInitProject } from "./transitions/init.js";
import { handleAbandonQuest } from "./transitions/quest-abandon.js";
import { handleCompleteQuest } from "./transitions/quest-complete.js";
import { handleCreateQuest } from "./transitions/quest-create.js";
import {
	handleBeginQuestImplementation,
	handleBeginQuestRefinement,
} from "./transitions/quest-implement.js";
import { handleBeginQuestPlan } from "./transitions/quest-plan.js";
import { handleAbandonSlice } from "./transitions/slice-abandon.js";
import { handleCompleteSlice } from "./transitions/slice-complete.js";
import { handleCreateSlice } from "./transitions/slice-create.js";
import { handleBeginImplementation, handleBeginRefinement } from "./transitions/slice-implement.js";
import { handleBeginPlan } from "./transitions/slice-plan.js";
import {
	handleCompleteImplementation,
	handleCompletePlan,
	handleCompleteQuestImplementation,
	handleCompleteQuestPlan,
	handleCompleteQuestRefinementRound,
	handleCompleteRefinementRound,
} from "./transitions/slice-submit.js";
import type { StateError, StateEvent } from "./types.js";

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
	CREATE_SLICE: handleCreateSlice,
	BEGIN_PLAN: handleBeginPlan,
	COMPLETE_PLAN: handleCompletePlan,
	BEGIN_REFINEMENT: handleBeginRefinement,
	COMPLETE_REFINEMENT_ROUND: handleCompleteRefinementRound,
	BEGIN_IMPLEMENTATION: handleBeginImplementation,
	COMPLETE_IMPLEMENTATION: handleCompleteImplementation,
	COMPLETE_SLICE: handleCompleteSlice,
	ABANDON_SLICE: handleAbandonSlice,
	CREATE_QUEST: handleCreateQuest,
	BEGIN_QUEST_PLAN: handleBeginQuestPlan,
	COMPLETE_QUEST_PLAN: handleCompleteQuestPlan,
	BEGIN_QUEST_REFINEMENT: handleBeginQuestRefinement,
	COMPLETE_QUEST_REFINEMENT_ROUND: handleCompleteQuestRefinementRound,
	BEGIN_QUEST_IMPLEMENTATION: handleBeginQuestImplementation,
	COMPLETE_QUEST_IMPLEMENTATION: handleCompleteQuestImplementation,
	COMPLETE_QUEST: handleCompleteQuest,
	ABANDON_QUEST: handleAbandonQuest,
} satisfies { [K in StateEvent["type"]]: Handler<K> };

/** Runtime lookup map — derived from the exhaustiveness-checked record. */
const handlers = new Map<string, Handler>(
	Object.entries(handlerRecord) as Array<[string, Handler]>,
);

export function reduce(state: ProjectState, event: StateEvent): ProjectState | StateError {
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
