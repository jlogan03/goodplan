import type { InvariantRule } from "../types.js";
import { hasEventOfType } from "./_helpers.js";

/**
 * project.exists: Every event (except project-initialized itself) requires
 * that a project-initialized event exists in the prior event log.
 */
export const projectExists: InvariantRule = {
	id: "project.exists",
	ruleType: "precondition",
	description: "project-initialized must exist before any other event",
	appliesTo: ["entity-lifecycle"],
	check(event, ctx) {
		// Only enforced in project scope — epic/side-quest scopes have their own first-event rules
		if (event.scope !== "project") return null;
		if (event.type === "project-initialized") return null;
		if (hasEventOfType(ctx, "project-initialized")) return null;
		return {
			message: "No project-initialized event found. Initialize the project first.",
		};
	},
};
