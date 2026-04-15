import { z } from "zod";
import type { InvariantRule } from "../types.js";
import { narrowPayload } from "./_helpers.js";

// Payload schema for finding-captured events
const FindingCapturedPayload = z.object({
	findingId: z.string().min(1),
});

// Payload schema for finding-triaged events
const FindingTriagedPayload = z.object({
	findingId: z.string().min(1),
});

/**
 * pressure-test.findings-all-accepted-before-slice-set: When committing a
 * slice set, all captured findings must have been triaged (accepted or dismissed).
 */
export const pressureTestFindingsAllAcceptedBeforeSliceSet: InvariantRule = {
	id: "pressure-test.findings-all-accepted-before-slice-set",
	ruleType: "all_match",
	description: "All findings must be triaged before committing slice set",
	appliesTo: ["entity-lifecycle", "finding"],
	check(event, ctx) {
		if (event.type !== "slice-set-committed") return null;

		const captured = ctx.eventsByType.get("finding-captured") ?? [];
		const triaged = new Set<string>();

		for (const e of ctx.eventsByType.get("finding-triaged") ?? []) {
			const payload = narrowPayload(e.payload, FindingTriagedPayload);
			if (payload !== null) {
				triaged.add(payload.findingId);
			}
		}

		const unresolved: string[] = [];
		for (const e of captured) {
			const payload = narrowPayload(e.payload, FindingCapturedPayload);
			if (payload !== null && !triaged.has(payload.findingId)) {
				unresolved.push(payload.findingId);
			}
		}

		if (unresolved.length > 0) {
			return {
				message: `Cannot commit slice set: ${unresolved.length} finding(s) not yet triaged.`,
				context: { unresolvedFindings: unresolved },
			};
		}
		return null;
	},
};
