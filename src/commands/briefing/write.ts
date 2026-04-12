import { defineCommand } from "citty";
import pc from "picocolors";
import { appendEvent } from "../../engine/events/append.js";
import { writeBriefingInputSchema } from "../../schemas/commands/briefing.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import {
	createEventCommandContext,
	createProjectCommandContext,
	handleInvariantError,
} from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp briefing:write` — write a structured briefing at project or epic scope.
 *
 * CLI flags: --scope (project|epic), --epic (required when scope=epic)
 * Stdin: { timeContext, currentPosition, lastAction, whereStopped, nextAction, attentionItems, deepLinks? }
 */
export const briefingWriteCommand = defineCommand({
	meta: {
		name: "briefing:write",
		description: "Write a structured briefing. Accepts stdin JSON and --scope (project|epic) flag.",
	},
	args: {
		...globalArgs,
		scope: {
			type: "string",
			description: 'Briefing scope: "project" or "epic" (default: "project")',
			default: "project",
		},
		epic: {
			type: "string",
			description: "Epic name (required when --scope epic)",
		},
	},
	setup() {},
	async run({ args }) {
		const scopeFlag = args.scope as string;

		if (scopeFlag !== "project" && scopeFlag !== "epic") {
			const errorOutput = {
				ok: false,
				error: `Invalid --scope: "${scopeFlag}". Must be "project" or "epic".`,
				code: "VALIDATION_INVALID_INPUT",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: ${errorOutput.error}\n`);
			}
			process.exit(1);
		}

		if (scopeFlag === "epic" && (args.epic === undefined || args.epic === "")) {
			const errorOutput = {
				ok: false,
				error: '--epic is required when --scope is "epic"',
				code: "VALIDATION_INVALID_INPUT",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: ${errorOutput.error}\n`);
			}
			process.exit(1);
		}

		const stdin = await readStdin();
		const parsed = writeBriefingInputSchema.safeParse(stdin);

		if (!parsed.success) {
			const errorOutput = {
				ok: false,
				error: `Invalid input: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
				code: "VALIDATION_INVALID_INPUT",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: ${errorOutput.error}\n`);
			}
			process.exit(1);
		}

		const payload = {
			timeContext: parsed.data.timeContext,
			currentPosition: parsed.data.currentPosition,
			lastAction: parsed.data.lastAction,
			whereStopped: parsed.data.whereStopped,
			nextAction: parsed.data.nextAction,
			attentionItems: parsed.data.attentionItems,
			...(parsed.data.deepLinks !== undefined ? { deepLinks: parsed.data.deepLinks } : {}),
		};

		try {
			if (scopeFlag === "project") {
				const ctx = createProjectCommandContext();
				const result = await appendEvent({
					eventsPath: ctx.projectEventsPath,
					scope: "project",
					scopeRef: null,
					actor: { kind: "cli", id: "gp:briefing:write" },
					branch: ctx.branch,
					commitHint: ctx.commitHint,
					domain: "briefing",
					type: "briefing-written",
					payload,
					beforeAppend: ctx.beforeAppend,
				});

				if (args.json || args.query) {
					output({ ok: true, event: result.event.id, entity: "briefing:project" }, args);
				} else if (!args.quiet) {
					output("Briefing written (project scope)", args);
				}
			} else {
				// Epic scope
				const ctx = createEventCommandContext(args, { requireSlice: false });
				const result = await appendEvent({
					eventsPath: ctx.epicEventsPath,
					scope: "epic",
					scopeRef: ctx.epicName,
					actor: { kind: "cli", id: "gp:briefing:write" },
					branch: ctx.branch,
					commitHint: ctx.commitHint,
					domain: "briefing",
					type: "briefing-written",
					payload,
					beforeAppend: ctx.beforeAppend,
				});

				if (args.json || args.query) {
					output(
						{
							ok: true,
							event: result.event.id,
							entity: `briefing:${ctx.epicName}`,
						},
						args,
					);
				} else if (!args.quiet) {
					output(`Briefing written (epic: ${pc.bold(ctx.epicName)})`, args);
				}
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
