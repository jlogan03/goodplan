import type { InvariantRule } from "../types.js";
import { lastEvent } from "./_helpers.js";

/**
 * briefing.written-at-pause: After a pause-entered event, the next event
 * MUST be a briefing-written event. Any other event type following
 * pause-entered is a violation.
 */
export const briefingWrittenAtPause: InvariantRule = {
	id: "briefing.written-at-pause",
	ruleType: "precondition",
	description: "A pause must be immediately followed by a briefing",
	appliesTo: ["briefing", "pause-steering"],
	check(event, ctx) {
		if (event.type === "briefing-written" || event.type === "pause-entered") {
			return null;
		}

		const last = lastEvent(ctx);
		if (last !== undefined && last.type === "pause-entered") {
			return {
				message: "A pause-entered event must be immediately followed by a briefing-written event.",
				context: { pauseEventId: last.id, actualEventType: event.type },
			};
		}
		return null;
	},
};
