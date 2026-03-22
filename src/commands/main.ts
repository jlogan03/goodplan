import { defineCommand } from "citty";
import { globalArgs } from "./global-args.js";
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
import { initCommand } from "./global/init.js";
import { statusCommand } from "./global/status.js";

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
	},
});
