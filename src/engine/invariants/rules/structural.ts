import type { InvariantRule } from "../types.js";
import { lastEvent } from "./_helpers.js";

/**
 * event.prev-id-chain: Every event's `prevId` must match the `id` of the
 * last prior event, or be null if no prior events exist.
 *
 * CONTRACT: This rule requires ctx.allEvents to be the FULL unfiltered
 * event log in log order. If allEvents is filtered or subset, this rule
 * will produce false violations. Callers must ensure the invariant engine
 * passes the complete event history.
 */
export const eventPrevIdChain: InvariantRule = {
	id: "event.prev-id-chain",
	ruleType: "custom",
	description: "Event prevId must chain to the last prior event's id",
	appliesTo: [],
	check(event, ctx) {
		const last = lastEvent(ctx);
		const expectedPrevId = last?.id ?? null;

		if (event.prevId !== expectedPrevId) {
			return {
				message: `Event prevId "${event.prevId}" does not match last event id "${expectedPrevId}".`,
				context: {
					eventId: event.id,
					eventPrevId: event.prevId,
					expectedPrevId,
				},
			};
		}
		return null;
	},
};
