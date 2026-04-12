import { defineCommand } from "citty";
import pc from "picocolors";
import { computeDerivedState } from "../../engine/derived-state/compute.js";
import { appendEvent } from "../../engine/events/append.js";
import { replayEvents } from "../../engine/events/replay.js";
import { registerSubsystemInputSchema } from "../../schemas/commands/subsystem.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { createProjectCommandContext, handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";

/**
 * `gp subsystem:register` — register a new subsystem at project scope.
 *
 * Stdin: { "name": "auth", "maturity": "experimental", "owns": ["src/auth/**"] }
 */
export const subsystemRegisterCommand = defineCommand({
	meta: {
		name: "subsystem:register",
		description: "Register a new subsystem. Accepts stdin JSON { name, maturity, owns }.",
	},
	args: {
		...globalArgs,
	},
	setup() {},
	async run({ args }) {
		const stdin = await readStdin();
		const parsed = registerSubsystemInputSchema.safeParse(stdin);

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

		// Check for duplicate name
		const { events } = await replayEvents({ eventsPath: ctx.projectEventsPath });
		const state = computeDerivedState(events);
		const existing = state.subsystems.get(parsed.data.name);
		if (existing !== undefined) {
			const errorOutput = {
				ok: false,
				error: `Subsystem '${parsed.data.name}' already exists`,
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
				actor: { kind: "cli", id: "gp:subsystem:register" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "spine",
				type: "subsystem-registered",
				payload: {
					name: parsed.data.name,
					maturity: parsed.data.maturity,
					owns: parsed.data.owns,
				},
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				output({ ok: true, event: result.event.id, entity: `subsystem:${parsed.data.name}` }, args);
			} else if (!args.quiet) {
				output(`Registered subsystem ${pc.bold(parsed.data.name)}`, args);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
