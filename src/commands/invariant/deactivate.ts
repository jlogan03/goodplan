import { defineCommand } from "citty";
import pc from "picocolors";
import { computeDerivedState } from "../../engine/derived-state/compute.js";
import { appendEvent } from "../../engine/events/append.js";
import { replayEvents } from "../../engine/events/replay.js";
import { deactivateInvariantInputSchema } from "../../schemas/commands/invariant.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { createProjectCommandContext, handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp invariant:deactivate` — deactivate an active custom invariant.
 *
 * Stdin: { "id": "custom.no-large-files" }
 */
export const invariantDeactivateCommand = defineCommand({
	meta: {
		name: "invariant:deactivate",
		description: "Deactivate an active custom invariant. Accepts stdin JSON { id }.",
	},
	args: {
		...globalArgs,
	},
	setup() {},
	async run({ args }) {
		const stdin = await readStdin();
		const parsed = deactivateInvariantInputSchema.safeParse(stdin);

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

		const { events } = await replayEvents({ eventsPath: ctx.projectEventsPath });
		const state = computeDerivedState(events);
		const existing = state.customInvariants.get(parsed.data.id);

		if (existing === undefined) {
			const errorOutput = {
				ok: false,
				error: `Invariant '${parsed.data.id}' not found`,
				code: "ENTITY_NOT_FOUND",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: ${errorOutput.error}\n`);
			}
			process.exit(1);
		}

		if (existing.status === "inactive") {
			const errorOutput = {
				ok: false,
				error: `Invariant '${parsed.data.id}' is already inactive`,
				code: "ENTITY_ALREADY_INACTIVE",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: ${errorOutput.error}\n`);
			}
			process.exit(1);
		}

		try {
			const result = await appendEvent({
				eventsPath: ctx.projectEventsPath,
				scope: "project",
				scopeRef: null,
				actor: { kind: "cli", id: "gp:invariant:deactivate" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "spine",
				type: "invariant-deactivated",
				payload: {
					invariantId: parsed.data.id,
				},
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				output({ ok: true, event: result.event.id, entity: `invariant:${parsed.data.id}` }, args);
			} else if (!args.quiet) {
				output(`Deactivated invariant ${pc.bold(parsed.data.id)}`, args);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
