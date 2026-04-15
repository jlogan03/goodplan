import { z } from "zod";
import type { InvariantRule } from "../types.js";
import { narrowPayload } from "./_helpers.js";

// Payload schema for refinement-converged events
const RefinementConvergedPayload = z.object({
	rubricRef: z.string().min(1),
	dimensions: z.array(
		z.object({
			name: z.string().min(1),
			score: z.number(),
		}),
	),
});

/**
 * refinement.bar-matches-rubric: When refinement converges, the payload
 * must contain a rubric reference and all dimensions must be scored.
 */
export const refinementBarMatchesRubric: InvariantRule = {
	id: "refinement.bar-matches-rubric",
	ruleType: "required",
	description: "Refinement convergence must reference a rubric with all dimensions scored",
	appliesTo: ["refinement"],
	check(event, _ctx) {
		if (event.type !== "refinement-converged") return null;

		const payload = narrowPayload(event.payload, RefinementConvergedPayload);
		if (payload === null) {
			return {
				message: "Refinement convergence payload must contain rubricRef and scored dimensions.",
			};
		}

		if (payload.dimensions.length === 0) {
			return {
				message: "Refinement convergence must include at least one scored dimension.",
				context: { rubricRef: payload.rubricRef },
			};
		}

		return null;
	},
};
