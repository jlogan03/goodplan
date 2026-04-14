import { defineCommand } from "citty";
import pc from "picocolors";
import { z } from "zod";
import { appendEvent } from "../../engine/events/append.js";
import {
	ArchitectureDeltaSchema,
	DeferredItemSchema,
} from "../../schemas/entities/slice-artifacts.js";
import { learningInputSchema } from "../../schemas/records/learning.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { createEventCommandContext, handleInvariantError } from "../_shared/command-context.js";
import { globalArgs } from "../global-args.js";

/**
 * Stdin validation schema for `slice:land`.
 * All fields are optional — the command emits the event even with no extras.
 */
const landStdinSchema = z.object({
	deferred: z.array(DeferredItemSchema).optional(),
	learnings: z.array(learningInputSchema).optional(),
	architectureDelta: z.array(ArchitectureDeltaSchema).optional(),
});

/**
 * `gp slice:land --epic <name> --slice <name>` (v2)
 *
 * Accepts optional stdin JSON `{ deferred?, learnings?, architectureDelta? }`.
 * Emits `slice-landed` with domain "entity-lifecycle".
 *
 * This command ONLY emits the event — deferred-item routing and learnings rollup
 * are skill-level composition, not this command's responsibility.
 *
 * Invariant: `slice.code-refinement-converged-before-land` — code refinement must be converged.
 */
export const sliceLandCommand = defineCommand({
	meta: {
		name: "slice:land",
		description: "Land a slice after code refinement convergence.",
	},
	args: {
		...globalArgs,
		epic: {
			type: "string",
			description: "Epic name",
			required: true,
		},
		slice: {
			type: "string",
			description: "Slice name",
			required: true,
		},
	},
	setup() {},
	async run({ args }) {
		const stdin = await readStdin();

		// Validate stdin fields if provided
		const parseResult = landStdinSchema.safeParse(stdin);
		if (!parseResult.success) {
			const errorOutput = {
				ok: false,
				error: `Invalid stdin: ${parseResult.error.issues.map((i) => i.message).join(", ")}`,
				code: "VALIDATION_INVALID_INPUT",
			};
			if (args.json || args.query) {
				output(errorOutput, args);
			} else {
				process.stderr.write(`${pc.red("Error")}: Invalid stdin input\n`);
			}
			process.exit(1);
		}

		const { deferred, learnings, architectureDelta } = parseResult.data;

		const ctx = createEventCommandContext(args, { requireSlice: true });

		try {
			// exactOptionalPropertyTypes: use conditional spread for optional arrays
			const result = await appendEvent({
				eventsPath: ctx.epicEventsPath,
				scope: "epic",
				scopeRef: ctx.epicName,
				actor: { kind: "cli", id: "gp:slice:land" },
				branch: ctx.branch,
				commitHint: ctx.commitHint,
				domain: "entity-lifecycle",
				type: "slice-landed",
				payload: {
					sliceRef: ctx.sliceName,
					...(deferred ? { deferred } : {}),
					...(learnings ? { learnings } : {}),
					...(architectureDelta ? { architectureDelta } : {}),
				},
				beforeAppend: ctx.beforeAppend,
			});

			if (args.json || args.query) {
				output({ ok: true, event: result.event.id, entity: `slice:${ctx.sliceName}` }, args);
			} else if (!args.quiet) {
				output(`Slice ${pc.bold(ctx.sliceName)} landed in epic ${pc.bold(ctx.epicName)}`, args);
			}
		} catch (error) {
			handleInvariantError(error, args);
		}
	},
});
