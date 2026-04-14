import { defineCommand } from "citty";
import pc from "picocolors";
import { appendEvent } from "../../engine/events/append.js";
import { decisionSupersededPayloadSchema } from "../../schemas/events/decision.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { createProjectCommandContext, handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp decision:supersede` — supersede a decision via v2 event pattern.
 *
 * Stdin: { decisionId, reason, supersededBy? }
 * Emits `decision-superseded` event to project-scope events.jsonl.
 */
export const decisionSupersedeCommand = defineCommand({
	meta: {
		name: "decision:supersede",
		description: "Supersede a decision (v2 event). Stdin: {decisionId, reason, supersededBy?}.",
	},
	args: {
		...globalArgs,
	},
	setup() {},
	async run({ args }) {
		const stdin = await readStdin();
		const parsed = decisionSupersededPayloadSchema.safeParse(stdin);

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

		const ctx = createProjectCommandContext();

		const payload = {
			decisionId: parsed.data.decisionId,
			reason: parsed.data.reason,
			...(parsed.data.supersededBy !== undefined ? { supersededBy: parsed.data.supersededBy } : {}),
		};

		try {
			const result = await appendEvent({
				eventsPath: ctx.projectEventsPath,
				scope: "project",
				scopeRef: null,
				actor: { kind: "cli", id: "gp:decision:supersede" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "decision-learning",
				type: "decision-superseded",
				payload,
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				output(
					{
						ok: true,
						event: result.event.id,
						entity: `decision:${parsed.data.decisionId}`,
					},
					args,
				);
			} else if (!args.quiet) {
				output(
					`Superseded decision ${pc.bold(parsed.data.decisionId)}: ${parsed.data.reason}`,
					args,
				);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
