import type { ContentRef } from "../../schemas/envelope.js";
import type { AnyEventEnvelope } from "../../schemas/envelope.js";

/**
 * Find the latest plan ContentRef for a given slice from replayed events.
 *
 * Searches backwards through events for `slice-plan-drafted` or
 * `plan-shape-revision-proposed` events matching the sliceRef,
 * returning the plan ContentRef from the most recent one.
 */
export function findLatestPlanRef(
	events: AnyEventEnvelope[],
	sliceRef: string,
): ContentRef | undefined {
	for (let i = events.length - 1; i >= 0; i--) {
		const e = events[i];
		if (e === undefined) continue;
		if (e.type === "plan-shape-revision-proposed" || e.type === "slice-plan-drafted") {
			const payload = e.payload as { sliceRef?: string; plan?: ContentRef };
			if (payload.sliceRef === sliceRef && payload.plan !== undefined) {
				return payload.plan;
			}
		}
	}
	return undefined;
}
