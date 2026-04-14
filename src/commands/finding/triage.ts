import { defineCommand } from "citty";
import pc from "picocolors";
import { computeDerivedState } from "../../engine/derived-state/compute.js";
import { appendEvent } from "../../engine/events/append.js";
import { replayEvents } from "../../engine/events/replay.js";
import { triageFindingInputSchema } from "../../schemas/commands/finding.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { createEventCommandContext, handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp finding:triage --epic <name>` — triage a finding (set disposition).
 *
 * Accepts stdin JSON with findingId, disposition, and reason.
 * Appends `finding-triaged` event with domain "entity-lifecycle".
 */
export const findingTriageCommand = defineCommand({
	meta: {
		name: "finding:triage",
		description: "Triage a finding (set disposition). Accepts stdin JSON.",
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
		const parsed = triageFindingInputSchema.safeParse(stdin);

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

		// Verify finding exists
		const { events } = await replayEvents({ eventsPath: ctx.epicEventsPath });
		const state = computeDerivedState(events);
		const epic = state.epics.get(ctx.epicName);

		if (epic === undefined) {
			const errorOutput = {
				ok: false,
				error: `Epic '${ctx.epicName}' not found in derived state`,
				code: "ENTITY_NOT_FOUND",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: ${errorOutput.error}\n`);
			}
			process.exit(1);
		}

		const finding = epic.findings.find((f) => f.id === parsed.data.findingId);
		if (finding === undefined) {
			const errorOutput = {
				ok: false,
				error: `Finding '${parsed.data.findingId}' not found in epic '${ctx.epicName}'`,
				code: "ENTITY_NOT_FOUND",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: ${errorOutput.error}\n`);
			}
			process.exit(1);
		}

		const payload = {
			findingId: parsed.data.findingId,
			disposition: parsed.data.disposition,
			reason: parsed.data.reason,
		};

		try {
			const result = await appendEvent({
				eventsPath: ctx.epicEventsPath,
				scope: "epic",
				scopeRef: ctx.epicName,
				actor: { kind: "cli", id: "gp:finding:triage" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "entity-lifecycle",
				type: "finding-triaged",
				payload,
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				output(
					{
						ok: true,
						event: result.event.id,
						entity: `finding:${parsed.data.findingId}`,
					},
					args,
				);
			} else if (!args.quiet) {
				output(
					`Finding ${parsed.data.findingId.slice(0, 8)} triaged as ${pc.bold(parsed.data.disposition)} in epic ${pc.bold(ctx.epicName)}`,
					args,
				);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
