/**
 * Core reducer — dispatches state events to transition handlers.
 * Pure function: no I/O, no side effects.
 */
import type { ProjectState } from "../tree.js";
import type { StateEvent, StateError } from "./types.js";
import { handleInitProject } from "./transitions/init.js";

export function reduce(
	state: ProjectState,
	event: StateEvent,
): ProjectState | StateError {
	switch (event.type) {
		case "INIT_PROJECT":
			return handleInitProject(state, event);
		default: {
			// TODO: When more events are added, replace this with a `never` exhaustiveness check:
			//   const _exhaustive: never = event;
			// This will cause a compile error if any event type is unhandled.
			const unknownEvent = event as { type: string };
			return {
				code: "STATE_INVALID_TRANSITION",
				message: `Unknown event type: ${unknownEvent.type}`,
				detail: { eventType: unknownEvent.type },
			};
		}
	}
}
