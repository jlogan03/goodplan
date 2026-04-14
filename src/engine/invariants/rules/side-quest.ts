import type { InvariantRule } from "../types.js";
import { countMatching } from "./_helpers.js";

/**
 * side-quest.single-active-per-branch: At most one active side quest per branch.
 * A side quest is "active" if it has been created but not completed or abandoned.
 */
export const sideQuestSingleActivePerBranch: InvariantRule = {
	id: "side-quest.single-active-per-branch",
	ruleType: "count_limit",
	description: "At most one active side quest per branch",
	appliesTo: ["entity-lifecycle"],
	check(event, ctx) {
		if (event.type !== "side-quest-created") return null;

		const branch = event.branch;

		// Count side quests created on this branch
		const created = countMatching(
			ctx,
			(e) => e.type === "side-quest-created" && e.branch === branch,
		);
		// Count side quests completed or abandoned on this branch
		const closed = countMatching(
			ctx,
			(e) =>
				(e.type === "side-quest-completed" || e.type === "side-quest-abandoned") &&
				e.branch === branch,
		);

		const active = created - closed;
		if (active >= 1) {
			return {
				message: `Branch "${branch}" already has an active side quest. Complete or abandon it first.`,
				context: { branch, activeCount: active },
			};
		}
		return null;
	},
};
