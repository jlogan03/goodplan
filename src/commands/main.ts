import { defineCommand } from "citty";
import { decisionCreateCommand } from "./decision/create.js";
import { decisionListCommand } from "./decision/list.js";
import { decisionShowCommand } from "./decision/show.js";
import { decisionUpdateCommand } from "./decision/update.js";
import { epicAbandonCommand } from "./epic/abandon.js";
import { epicActivateCommand } from "./epic/activate.js";
import { epicAddVerificationCommand } from "./epic/add-verification.js";
import { epicCompleteCommand } from "./epic/complete.js";
import { epicCreateCommand } from "./epic/create.js";
import { epicDefineArchitectureCommand } from "./epic/define-architecture.js";
import { epicDefineSlicesCommand } from "./epic/define-slices.js";
import { epicExploreCommand } from "./epic/explore.js";
import { epicListCommand } from "./epic/list.js";
import { epicRefineArchitectureCommand } from "./epic/refine-architecture.js";
import { epicRefineSlicesCommand } from "./epic/refine-slices.js";
import { epicShowCommand } from "./epic/show.js";
import { epicUpdateVerificationCommand } from "./epic/update-verification.js";
import { globalArgs } from "./global-args.js";
import { initCommand } from "./global/init.js";
import { migrateCommand } from "./global/migrate.js";
import { schemaCommand } from "./global/schema.js";
import { stateCommand } from "./global/state.js";
import { statusCommand } from "./global/status.js";
import { verifyCommand } from "./global/verify.js";
import { learningListCommand } from "./learning/list.js";
import { learningRollupCommand } from "./learning/rollup.js";
import { questAbandonCommand } from "./quest/abandon.js";
import { questCompleteCommand } from "./quest/complete.js";
import { questCreateCommand } from "./quest/create.js";
import { questExploreCommand } from "./quest/explore.js";
import { questImplementCommand } from "./quest/implement.js";
import { questListCommand } from "./quest/list.js";
import { questPlanCommand } from "./quest/plan.js";
import { questRefinePlanCommand } from "./quest/refine-plan.js";
import { questShowCommand } from "./quest/show.js";
import { sliceAbandonCommand } from "./slice/abandon.js";
import { sliceCompleteCommand } from "./slice/complete.js";
import { sliceCreateCommand } from "./slice/create.js";
import { sliceImplementCommand } from "./slice/implement.js";
import { sliceListCommand } from "./slice/list.js";
import { slicePlanCommand } from "./slice/plan.js";
import { sliceRefinePlanCommand } from "./slice/refine-plan.js";
import { sliceShowCommand } from "./slice/show.js";
import { startArchitectureCommand } from "./subagent/start-architecture.js";
import { startExploreCommand } from "./subagent/start-explore.js";
import { startImplementationCommand } from "./subagent/start-implementation.js";
import { startPlanCommand } from "./subagent/start-plan.js";
import { startRefineArchitectureCommand } from "./subagent/start-refine-architecture.js";
import { startRefineSlicesCommand } from "./subagent/start-refine-slices.js";
import { startRefinementCommand } from "./subagent/start-refinement.js";
import { startSlicesCommand } from "./subagent/start-slices.js";
import { submitArchitectureCommand } from "./subagent/submit-architecture.js";
import { submitExploreCommand } from "./subagent/submit-explore.js";
import { submitImplementationCommand } from "./subagent/submit-implementation.js";
import { submitPlanCommand } from "./subagent/submit-plan.js";
import { submitRefineArchitectureCommand } from "./subagent/submit-refine-architecture.js";
import { submitRefineSlicesCommand } from "./subagent/submit-refine-slices.js";
import { submitRefinementCommand } from "./subagent/submit-refinement.js";
import { submitSlicesCommand } from "./subagent/submit-slices.js";
import { taskConvertCommand } from "./task/convert.js";
import { taskCreateCommand } from "./task/create.js";
import { taskDropCommand } from "./task/drop.js";
import { taskListCommand } from "./task/list.js";
import { taskShowCommand } from "./task/show.js";

/**
 * Main gp command. Subcommands are registered here.
 * Uses flat colon-namespaced keys for entity commands (e.g., "epic:create").
 */
export const mainCommand = defineCommand({
	meta: {
		name: "gp",
		description: "Project workflow CLI for structured development with LLMs",
	},
	args: {
		...globalArgs,
	},
	subCommands: {
		init: initCommand,
		migrate: migrateCommand,
		schema: schemaCommand,
		state: stateCommand,
		status: statusCommand,
		verify: verifyCommand,
		"decision:create": decisionCreateCommand,
		"decision:list": decisionListCommand,
		"decision:show": decisionShowCommand,
		"decision:update": decisionUpdateCommand,
		"epic:create": epicCreateCommand,
		"epic:list": epicListCommand,
		"epic:show": epicShowCommand,
		"epic:explore": epicExploreCommand,
		"epic:define-architecture": epicDefineArchitectureCommand,
		"epic:refine-architecture": epicRefineArchitectureCommand,
		"epic:define-slices": epicDefineSlicesCommand,
		"epic:refine-slices": epicRefineSlicesCommand,
		"epic:activate": epicActivateCommand,
		"epic:complete": epicCompleteCommand,
		"epic:abandon": epicAbandonCommand,
		"epic:add-verification": epicAddVerificationCommand,
		"epic:update-verification": epicUpdateVerificationCommand,
		"learning:list": learningListCommand,
		"learning:rollup": learningRollupCommand,
		"quest:create": questCreateCommand,
		"quest:list": questListCommand,
		"quest:show": questShowCommand,
		"quest:explore": questExploreCommand,
		"quest:plan": questPlanCommand,
		"quest:refine-plan": questRefinePlanCommand,
		"quest:implement": questImplementCommand,
		"quest:complete": questCompleteCommand,
		"quest:abandon": questAbandonCommand,
		"task:create": taskCreateCommand,
		"task:list": taskListCommand,
		"task:show": taskShowCommand,
		"task:drop": taskDropCommand,
		"task:convert": taskConvertCommand,
		"slice:create": sliceCreateCommand,
		"slice:list": sliceListCommand,
		"slice:show": sliceShowCommand,
		"slice:plan": slicePlanCommand,
		"slice:refine-plan": sliceRefinePlanCommand,
		"slice:implement": sliceImplementCommand,
		"slice:complete": sliceCompleteCommand,
		"slice:abandon": sliceAbandonCommand,
		"start-plan": startPlanCommand,
		"start-refinement": startRefinementCommand,
		"start-implementation": startImplementationCommand,
		"start-explore": startExploreCommand,
		"start-architecture": startArchitectureCommand,
		"start-slices": startSlicesCommand,
		"start-refine-architecture": startRefineArchitectureCommand,
		"start-refine-slices": startRefineSlicesCommand,
		"submit-plan": submitPlanCommand,
		"submit-refinement": submitRefinementCommand,
		"submit-implementation": submitImplementationCommand,
		"submit-explore": submitExploreCommand,
		"submit-architecture": submitArchitectureCommand,
		"submit-slices": submitSlicesCommand,
		"submit-refine-architecture": submitRefineArchitectureCommand,
		"submit-refine-slices": submitRefineSlicesCommand,
	},
});
