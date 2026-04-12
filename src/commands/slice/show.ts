import * as fs from "node:fs";
import * as path from "node:path";
import { defineCommand } from "citty";
import pc from "picocolors";
import { resolveProjectDir } from "../../core/data/project.js";
import { computeDerivedState } from "../../engine/derived-state/compute.js";
import { serializeDerivedState } from "../../engine/derived-state/serialize.js";
import { replayEvents } from "../../engine/events/replay.js";
import { output } from "../../util/output.js";
import { globalArgs } from "../global-args.js";

/**
 * Read v1 slice.json for a specific slice.
 * TODO: Remove after slice 12 completes v1-to-v2 migration.
 */
function readV1Slice(
	goodplanDir: string,
	epicName: string,
	sliceName: string,
): Record<string, unknown> | undefined {
	const slicePath = path.join(goodplanDir, "epics", epicName, "slices", sliceName, "slice.json");
	if (!fs.existsSync(slicePath)) return undefined;
	try {
		return JSON.parse(fs.readFileSync(slicePath, "utf-8")) as Record<string, unknown>;
	} catch {
		return undefined;
	}
}

/**
 * `gp slice:show --slice <name> --epic <name>` (v2) — show slice state from event replay.
 *
 * Replays the epic's events and returns the SliceState projection.
 * Falls back to v1 slice.json when no v2 events exist.
 * TODO: Remove v1 fallback after slice 12 completes migration.
 */
export const sliceShowCommand = defineCommand({
	meta: {
		name: "slice:show",
		description:
			"Show full slice entity details from event-sourced state. Requires --slice and --epic flags.",
	},
	args: {
		...globalArgs,
		slice: {
			type: "string",
			description: "Slice name",
			required: true,
		},
		epic: {
			type: "string",
			description: "Epic name",
			required: true,
		},
	},
	setup() {},
	async run({ args }) {
		const goodplanDir = resolveProjectDir();
		const epicName = args.epic as string;
		const sliceName = args.slice as string;
		const epicEventsPath = path.join(goodplanDir, "epics", epicName, "events.jsonl");

		// Try v2 event replay first
		if (fs.existsSync(epicEventsPath)) {
			const { events } = await replayEvents({ eventsPath: epicEventsPath });
			const state = computeDerivedState(events);
			const epicState = state.epics.get(epicName);
			const sliceState = epicState?.slices.get(sliceName);

			if (sliceState !== undefined) {
				// Serialize for output (Maps -> Records)
				const serialized = serializeDerivedState(state);
				const epicData = serialized.epics[epicName] as
					| { slices?: Record<string, unknown> }
					| undefined;
				const sliceData = epicData?.slices?.[sliceName] as Record<string, unknown> | undefined;

				if (args.json || args.query) {
					output({ ok: true, ...sliceData }, args);
				} else if (!args.quiet) {
					const lines: string[] = [];
					lines.push(`${pc.bold(sliceName)}  phase=${sliceState.phase}  (epic: ${epicName})`);
					lines.push(`  Abandoned: ${sliceState.abandoned}`);
					if (sliceState.goal !== null) {
						lines.push(`  Goal: ${sliceState.goal.sha.slice(0, 8)}...`);
					}
					if (sliceState.plan !== null) {
						lines.push(`  Plan: ${sliceState.plan.sha.slice(0, 8)}...`);
					}
					output(lines.join("\n"), args);
				}
				return;
			}
		}

		// v1 fallback: read slice.json directly
		const v1Slice = readV1Slice(goodplanDir, epicName, sliceName);
		if (v1Slice !== undefined) {
			if (args.json || args.query) {
				output(v1Slice, args);
			} else if (!args.quiet) {
				const lines: string[] = [];
				lines.push(
					`${pc.bold(sliceName)}  ${String(v1Slice.status ?? "unknown")}  (epic: ${epicName})`,
				);
				if (v1Slice.goal !== undefined) {
					lines.push(`  Goal: ${String(v1Slice.goal)}`);
				}
				output(lines.join("\n"), args);
			}
			return;
		}

		// Not found in either v1 or v2
		const errorOutput = {
			ok: false,
			error: `Slice '${sliceName}' not found in epic '${epicName}'`,
			code: "ENTITY_NOT_FOUND",
		};
		if (args.json || args.query) {
			output(errorOutput, args);
		} else {
			process.stderr.write(
				`${pc.red("Error")}: Slice '${sliceName}' not found in epic '${epicName}'\n`,
			);
		}
		process.exit(1);
	},
});
