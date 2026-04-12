import { randomUUID } from "node:crypto";
import { defineCommand } from "citty";
import pc from "picocolors";
import { appendEvent } from "../../engine/events/append.js";
import { captureFindingInputSchema } from "../../schemas/commands/finding.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { createEventCommandContext, handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp finding:capture --epic <name>` — capture a finding for an epic.
 *
 * Accepts stdin JSON with finding details.
 * Appends `finding-captured` event with domain "entity-lifecycle".
 */
export const findingCaptureCommand = defineCommand({
	meta: {
		name: "finding:capture",
		description: "Capture a finding for an epic. Accepts stdin JSON.",
	},
	args: {
		...globalArgs,
		epic: {
			type: "string",
			description: "Epic name",
			required: true,
		},
	},
	setup() {},
	async run({ args }) {
		const stdin = await readStdin();
		const parsed = captureFindingInputSchema.safeParse(stdin);

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

		const ctx = createEventCommandContext(args, { requireSlice: false });
		const findingId = randomUUID();

		// Default classification if not provided
		const classification = parsed.data.classification ?? {
			blocking: parsed.data.severity === "blocking",
			inScope: true,
		};

		const payload = {
			findingId,
			summary: parsed.data.summary,
			severity: parsed.data.severity,
			classification,
			...(parsed.data.relatedSubsystems !== undefined
				? { relatedSubsystems: parsed.data.relatedSubsystems }
				: {}),
			...(parsed.data.reshape !== undefined ? { reshape: parsed.data.reshape } : {}),
			...(parsed.data.context !== undefined ? { context: parsed.data.context } : {}),
			...(parsed.data.sliceRef !== undefined ? { sliceRef: parsed.data.sliceRef } : {}),
		};

		try {
			const result = await appendEvent({
				eventsPath: ctx.epicEventsPath,
				scope: "epic",
				scopeRef: ctx.epicName,
				actor: { kind: "cli", id: "gp:finding:capture" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "entity-lifecycle",
				type: "finding-captured",
				payload,
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				output(
					{
						ok: true,
						event: result.event.id,
						entity: `finding:${findingId}`,
					},
					args,
				);
			} else if (!args.quiet) {
				output(`Captured finding "${parsed.data.summary}" for epic ${pc.bold(ctx.epicName)}`, args);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
