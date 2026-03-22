import { defineCommand } from "citty";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { complete } from "../../core/rpc/complete.js";
import { completeSliceInputSchema } from "../../schemas/commands/slice.js";
import { output } from "../../util/output.js";
import { readStdin } from "../../util/stdin.js";
import { validateInput } from "../../util/validate.js";
import { globalArgs } from "../global-args.js";

/**
 * `goodplan slice:complete --slice <name>` — complete a slice.
 *
 * Stdin: { "verificationPassed": true, "deferred": [...], "learnings": [...], "architectureDelta": [...] }
 * Precondition: slice in 'implementation-complete' status.
 * Transition: implementation-complete -> completed
 */
export const sliceCompleteCommand = defineCommand({
	meta: {
		name: "slice:complete",
		description:
			"Complete a slice with verification result, deferred items, learnings, and architecture deltas via stdin. Requires --slice. Stdin: {verificationPassed, deferred?, learnings?, architectureDelta?}.",
	},
	args: {
		...globalArgs,
		slice: {
			type: "string",
			description: "Slice name",
			required: true,
		},
	},
	setup() {},
	async run({ args }) {
		const stdin = await readStdin();
		const input = validateInput(completeSliceInputSchema, args, stdin);

		const projectDir = resolveProjectDir();
		const result = await complete(
			projectDir,
			{ type: "slice", name: input.slice },
			{
				type: "slice",
				verificationPassed: input.verificationPassed,
				...(input.deferred !== undefined ? { deferred: input.deferred } : {}),
				...(input.learnings !== undefined ? { learnings: input.learnings } : {}),
				...(input.architectureDelta !== undefined
					? { architectureDelta: input.architectureDelta }
					: {}),
			},
		);

		if (args.json) {
			output(result, args);
		} else if (!args.quiet) {
			const lines: string[] = [];
			lines.push(
				`${pc.bold(result.entity)}: ${result.previousStatus} ${pc.dim("->")} ${pc.green(result.newStatus)}`,
			);

			const routedCount = result.deferredRouted?.length ?? 0;
			const skippedCount = result.deferredSkipped ?? 0;
			if (routedCount > 0 || skippedCount > 0) {
				lines.push(`  Deferred: ${routedCount} routed, ${skippedCount} skipped`);
			}

			if (result.learningsRolledUp !== undefined) {
				const { epic, project } = result.learningsRolledUp;
				const total = epic + project;
				lines.push(`  Learnings: ${total} rolled up (epic: ${epic}, project: ${project})`);
			}

			if (result.epicComplete !== undefined) {
				lines.push(`  Epic complete: ${result.epicComplete ? "yes" : "no"}`);
			}

			output(lines.join("\n"), args);
		}
	},
});
