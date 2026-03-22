/**
 * Global flags shared across all commands.
 * Spread into each command's args definition.
 *
 * Extracted to its own module to avoid circular imports
 * between main.ts and individual command files.
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
	/** Reserved for future use. Not yet wired to any command or utility layer. */
	verbose: {
		type: "boolean" as const,
		description: "Enable diagnostic output on stderr",
		default: false,
	},
} as const;
