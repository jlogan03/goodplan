import type { InvariantRule } from "../types.js";

// Spine-mutation event types that should only occur via milestone batch
const SPINE_MUTATION_TYPES = new Set(["architecture-committed", "conventions-committed"]);

/**
 * spine.write-only-via-milestone: Spine mutations should only occur as part
 * of a milestone batch.
 *
 * TODO: This rule is underspecified in the architecture. The milestone system
 * is not yet built, so this rule currently checks that the immediately preceding
 * event is a milestone-committed event. This will need refinement when the
 * milestone system design is finalized.
 */
export const spineWriteOnlyViaMilestone: InvariantRule = {
	id: "spine.write-only-via-milestone",
	ruleType: "custom",
	description: "Spine mutations should only occur via milestone batch",
	appliesTo: ["spine", "milestone"],
	check(event, ctx) {
		if (!SPINE_MUTATION_TYPES.has(event.type)) return null;

		// Check if the immediately preceding event is a milestone-committed
		const allEvents = ctx.allEvents;
		if (allEvents.length === 0) {
			return {
				message: `Spine mutation "${event.type}" has no preceding milestone-committed event.`,
				context: { eventType: event.type },
			};
		}

		const prev = allEvents[allEvents.length - 1];
		if (prev !== undefined && prev.type === "milestone-committed") {
			return null;
		}

		return {
			message: `Spine mutation "${event.type}" must be preceded by a milestone-committed event.`,
			context: { eventType: event.type },
		};
	},
};
