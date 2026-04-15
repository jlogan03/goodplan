import { defineCommand } from "citty";
import pc from "picocolors";
import { computeDerivedState } from "../../engine/derived-state/compute.js";
import { appendEvent } from "../../engine/events/append.js";
import { replayEvents } from "../../engine/events/replay.js";
import { proposeInvariantInputSchema } from "../../schemas/commands/invariant.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { createProjectCommandContext, handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp invariant:propose` — propose a new custom invariant rule.
 *
 * Stdin: { "id": "custom.no-large-files", "description": "...", "type": "custom" }
 */
export const invariantProposeCommand = defineCommand({
	meta: {
		name: "invariant:propose",
		description:
			"Propose a new custom invariant. Accepts stdin JSON { id, description, type, rule? }.",
	},
	args: {
		...globalArgs,
	},
	setup() {},
	async run({ args }) {
		const stdin = await readStdin();
		const parsed = proposeInvariantInputSchema.safeParse(stdin);

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

		// Check for duplicate ID
		const { events } = await replayEvents({ eventsPath: ctx.projectEventsPath });
		const state = computeDerivedState(events);
		const existing = state.customInvariants.get(parsed.data.id);
		if (existing !== undefined) {
			const errorOutput = {
				ok: false,
				error: `Invariant '${parsed.data.id}' already exists`,
				code: "ENTITY_ALREADY_EXISTS",
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
				actor: { kind: "cli", id: "gp:invariant:propose" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "spine",
				type: "invariant-proposed",
				payload: {
					invariantId: parsed.data.id,
					description: parsed.data.description,
					type: parsed.data.type,
					...(parsed.data.rule !== undefined ? { rule: parsed.data.rule } : {}),
				},
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				output({ ok: true, event: result.event.id, entity: `invariant:${parsed.data.id}` }, args);
			} else if (!args.quiet) {
				output(`Proposed invariant ${pc.bold(parsed.data.id)}`, args);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
