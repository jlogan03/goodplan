import { defineCommand } from "citty";

/**
 * Global flags shared across all commands.
 * Spread into each command's args definition.
 */
export const globalArgs = {
	json: {
		type: "boolean" as const,
		description: "Output as structured JSON",
		default: false,
	},
	quiet: {
		type: "boolean" as const,
		description: "Minimal output",
		default: false,
	},
	verbose: {
		type: "boolean" as const,
		description: "Enable diagnostic output on stderr",
		default: false,
	},
} as const;

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
	subCommands: {},
});
