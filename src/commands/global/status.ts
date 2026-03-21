import compile from "@michaelhomer/jqjs";
import { defineCommand } from "citty";
import pc from "picocolors";
import { readProject } from "../../core/data/project.js";
import type { StatusResult } from "../../schemas/commands/status.js";
import { GoodplanError } from "../../util/errors.js";
import { deterministicStringify } from "../../util/json.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

/**
 * Build a StatusResult from the current project state.
 * In slice 01, active pointers are always null (no entity files yet).
 */
export function buildStatusResult(projectDir?: string): StatusResult {
	const project = readProject(projectDir);
	return {
		project: {
			name: project.name,
			version: project.version,
		},
		activeEpic: null,
		activeSlice: null,
		activeQuest: null,
		artifacts: {},
		recommendations: ["Run epic:create to start"],
		warnings: [],
	};
}

/**
 * Format StatusResult as human-readable output.
 */
export function formatStatusHuman(status: StatusResult): string {
	const lines: string[] = [];

	lines.push(`${pc.bold(status.project.name)} v${status.project.version}`);
	lines.push("");

	if (status.activeEpic === null && status.activeSlice === null && status.activeQuest === null) {
		lines.push("No active work");
	}

	if (status.recommendations.length > 0) {
		lines.push("");
		for (const rec of status.recommendations) {
			lines.push(`  ${pc.dim("-")} ${rec}`);
		}
	}

	if (status.warnings.length > 0) {
		lines.push("");
		for (const warn of status.warnings) {
			lines.push(`  ${pc.yellow("!")} ${warn}`);
		}
	}

	return lines.join("\n");
}

/**
 * Apply a jq expression to data and return the results.
 * Throws VALIDATION_INVALID_QUERY for invalid expressions.
 */
export function applyQuery(data: unknown, expr: string): unknown {
	let filter: (input: unknown) => Generator<unknown>;
	try {
		filter = compile(expr);
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		throw new GoodplanError("VALIDATION_INVALID_QUERY", `Invalid jq expression: ${message}`, {
			expression: expr,
		});
	}

	const results: unknown[] = [];
	try {
		for (const value of filter(data)) {
			results.push(value);
		}
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		throw new GoodplanError("VALIDATION_INVALID_QUERY", `jq query execution failed: ${message}`, {
			expression: expr,
		});
	}

	if (results.length === 0) {
		return null;
	}
	if (results.length === 1) {
		return results[0];
	}
	return results;
}

/**
 * `goodplan status` — show current project status.
 *
 * Flags:
 * - --json: output as structured JSON
 * - --query <expr>: apply jq expression to JSON output (requires --json)
 */
export const statusCommand = defineCommand({
	meta: {
		name: "status",
		description: "Show current project status",
	},
	args: {
		...globalArgs,
		query: {
			type: "string",
			description: "jq expression to filter JSON output (requires --json)",
			required: false,
		},
	},
	setup() {},
	async run({ args }) {
		// --query requires --json
		if (args.query && !args.json) {
			throw new GoodplanError("VALIDATION_INVALID_INPUT", "--query requires --json flag");
		}

		const status = buildStatusResult();

		if (args.json) {
			if (args.query) {
				const result = applyQuery(status, args.query);
				process.stdout.write(`${deterministicStringify(result)}\n`);
			} else {
				output(status, args);
			}
		} else {
			const formatted = formatStatusHuman(status);
			output(formatted, args);
		}
	},
});
