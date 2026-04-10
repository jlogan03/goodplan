import type { AnyEventEnvelope } from "../../schemas/envelope.js";
import type { GetCheckContext } from "./create-before-append-hook.js";
import type { CheckContext } from "./types.js";
import { buildCheckContext } from "./types.js";

/**
 * Production getContext factory: replays events from JSONL and builds CheckContext.
 * Accepts the replayEvents function as a parameter (injected at the composition root)
 * to avoid dynamic imports and keep the module statically analyzable.
 */
export function createReplayGetContext(
	replayEvents: (opts: { eventsPath: string }) => Promise<{ events: AnyEventEnvelope[] }>,
): GetCheckContext {
	return async (eventsPath: string): Promise<CheckContext> => {
		const { events } = await replayEvents({ eventsPath });
		return buildCheckContext(events);
	};
}
