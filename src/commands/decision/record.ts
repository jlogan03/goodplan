import { defineCommand } from "citty";
import pc from "picocolors";
import { appendEvent } from "../../engine/events/append.js";
import { decisionRecordedPayloadSchema } from "../../schemas/events/decision.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { createProjectCommandContext, handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp decision:record` — record a decision via v2 event pattern.
 *
 * Stdin: { id, domain, title, summary, entityPath?, reconsiderWhen? }
 * Emits `decision-recorded` event to project-scope events.jsonl.
 *
 * This is the v2 event-based replacement for `decision:create` (v1 RPC).
 * Both commands coexist.
 */
export const decisionRecordCommand = defineCommand({
	meta: {
		name: "decision:record",
		description:
			"Record a decision (v2 event). Stdin: {id, domain, title, summary, entityPath?, reconsiderWhen?}.",
	},
	args: {
		...globalArgs,
	},
	setup() {},
	async run({ args }) {
		const stdin = await readStdin();
		const parsed = decisionRecordedPayloadSchema.safeParse(stdin);

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
			id: parsed.data.id,
			domain: parsed.data.domain,
			title: parsed.data.title,
			summary: parsed.data.summary,
			...(parsed.data.entityPath !== undefined ? { entityPath: parsed.data.entityPath } : {}),
			...(parsed.data.reconsiderWhen !== undefined
				? { reconsiderWhen: parsed.data.reconsiderWhen }
				: {}),
		};

		try {
			const result = await appendEvent({
				eventsPath: ctx.projectEventsPath,
				scope: "project",
				scopeRef: null,
				actor: { kind: "cli", id: "gp:decision:record" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "decision-learning",
				type: "decision-recorded",
				payload,
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				output(
					{
						ok: true,
						event: result.event.id,
						entity: `decision:${parsed.data.id}`,
					},
					args,
				);
			} else if (!args.quiet) {
				output(`Recorded decision ${pc.bold(parsed.data.id)}: ${parsed.data.title}`, args);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
