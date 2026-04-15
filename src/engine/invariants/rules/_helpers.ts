import type { z } from "zod";
import type { AnyEventEnvelope } from "../../../schemas/envelope.js";
import type { CheckContext } from "../types.js";

/**
 * Return the last event in ctx.allEvents, guarding for noUncheckedIndexedAccess.
 * Mandate use of this helper whenever rules need "the last event in ctx.allEvents"
 * to centralize the undefined guard.
 */
export function lastEvent(ctx: CheckContext): AnyEventEnvelope | undefined {
	return ctx.allEvents[ctx.allEvents.length - 1];
}

/** Find the most recent event matching a type using the pre-built index */
export function findLatest(ctx: CheckContext, type: string): AnyEventEnvelope | undefined {
	const events = ctx.eventsByType.get(type);
	if (!events || events.length === 0) return undefined;
	return events[events.length - 1];
}

/** Count events matching a predicate */
export function countMatching(
	ctx: CheckContext,
	predicate: (e: AnyEventEnvelope) => boolean,
): number {
	let count = 0;
	for (const e of ctx.allEvents) {
		if (predicate(e)) count++;
	}
	return count;
}

/** Check if any event of the given type exists using the pre-built index */
export function hasEventOfType(ctx: CheckContext, type: string): boolean {
	const events = ctx.eventsByType.get(type);
	return events !== undefined && events.length > 0;
}

/**
 * Narrow an event's unknown payload to a typed shape using a Zod schema.
 * Returns the parsed data on success, or null if parsing fails
 * (meaning the payload doesn't match the expected schema -- the invariant
 * passes because this rule doesn't apply to this payload shape).
 */
export function narrowPayload<T>(payload: unknown, schema: z.ZodType<T>): T | null {
	const result = schema.safeParse(payload);
	if (result.success) {
		return result.data;
	}
	return null;
}
