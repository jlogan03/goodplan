import { defineCommand } from "citty";
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
import { statusCommand } from "./global/status.js";
import { sliceAbandonCommand } from "./slice/abandon.js";
import { sliceCompleteCommand } from "./slice/complete.js";
import { sliceCreateCommand } from "./slice/create.js";
import { sliceImplementCommand } from "./slice/implement.js";
import { sliceListCommand } from "./slice/list.js";
import { slicePlanCommand } from "./slice/plan.js";
import { sliceRefinePlanCommand } from "./slice/refine-plan.js";
import { sliceShowCommand } from "./slice/show.js";
import { submitArchitectureCommand } from "./subagent/submit-architecture.js";
import { submitExploreCommand } from "./subagent/submit-explore.js";
import { submitImplementationCommand } from "./subagent/submit-implementation.js";
import { submitPlanCommand } from "./subagent/submit-plan.js";
import { submitRefineArchitectureCommand } from "./subagent/submit-refine-architecture.js";
import { submitRefineSlicesCommand } from "./subagent/submit-refine-slices.js";
import { submitRefinementCommand } from "./subagent/submit-refinement.js";
import { submitSlicesCommand } from "./subagent/submit-slices.js";

/**
 * Main goodplan command. Subcommands are registered here.
 * Uses flat colon-namespaced keys for entity commands (e.g., "epic:create").
 */
export const mainCommand = defineCommand({
	meta: {
		name: "goodplan",
		description: "Project workflow CLI for structured development with LLMs",
	},
	args: {
		...globalArgs,
	},
	subCommands: {
		init: initCommand,
		status: statusCommand,
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
		"slice:create": sliceCreateCommand,
		"slice:list": sliceListCommand,
		"slice:show": sliceShowCommand,
		"slice:plan": slicePlanCommand,
		"slice:refine-plan": sliceRefinePlanCommand,
		"slice:implement": sliceImplementCommand,
		"slice:complete": sliceCompleteCommand,
		"slice:abandon": sliceAbandonCommand,
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
