import { defineCommand } from "citty";
import { globalArgs } from "./global-args.js";
import { initCommand } from "./global/init.js";

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
	},
});
