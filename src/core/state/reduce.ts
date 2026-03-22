/**
 * Core reducer — dispatches state events to transition handlers.
 * Pure function: no I/O, no side effects.
 */
import type { ProjectState } from "../data/tree.js";
import type { StateEvent, StateError } from "./types.js";
import { handleInitProject } from "./transitions/init.js";

export function reduce(
	state: ProjectState,
	event: StateEvent,
): ProjectState | StateError {
	switch (event.type) {
		case "INIT_PROJECT":
			return handleInitProject(state, event);
		default:
			return {
				code: "STATE_INVALID_TRANSITION",
				message: `Unknown event type: ${(event as { type: string }).type}`,
				detail: { eventType: (event as { type: string }).type },
			};
	}
}
