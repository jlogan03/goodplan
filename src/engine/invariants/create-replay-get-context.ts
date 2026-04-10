import type { AnyEventEnvelope } from "../../schemas/envelope.js";
import { computeDerivedState } from "../derived-state/compute.js";
import type { GetCheckContext } from "./create-before-append-hook.js";
import type { CheckContext } from "./types.js";
import { buildCheckContext } from "./types.js";

/**
 * Production getContext factory: replays events from JSONL and builds CheckContext.
 * Accepts the replayEvents function as a parameter (injected at the composition root)
 * to avoid dynamic imports and keep the module statically analyzable.
 *
 * Computes derivedState from the same replayed events (zero additional I/O)
 * and injects it into CheckContext for richer invariant checks.
 */
export function createReplayGetContext(
	replayEvents: (opts: { eventsPath: string }) => Promise<{ events: AnyEventEnvelope[] }>,
): GetCheckContext {
	return async (eventsPath: string): Promise<CheckContext> => {
		const { events } = await replayEvents({ eventsPath });
		const derivedState = computeDerivedState(events);
		return buildCheckContext(events, derivedState);
	};
}
