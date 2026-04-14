import * as fs from "node:fs";
import * as path from "node:path";
import type { DerivedStateData } from "../../schemas/entities/derived-state.js";
import type { DeepReadonly } from "../../util/types.js";
import { replayEvents } from "../events/replay.js";
import { computeDerivedState, createEmptyState } from "./compute.js";

/**
 * I/O shell around the pure computeDerivedState reducer.
 *
 * Reads all scope event logs (project + epics + side-quests) and merges
 * them into a single DerivedStateData value.
 *
 * Pragmatic deviation from ports-and-adapters: uses fs.readdirSync directly
 * for filesystem discovery. computeDerivedState remains pure.
 *
 * @param goodplanDir - path to the .goodplan/ directory
 */
export async function replayAllScopes(
	goodplanDir: string,
): Promise<DeepReadonly<DerivedStateData>> {
	// 1. Replay project-scope events
	const projectEventsPath = path.join(goodplanDir, "events.jsonl");
	const projectResult = await replayEvents({ eventsPath: projectEventsPath });
	const state = createEmptyState();

	// Apply project events to state
	const projectState = computeDerivedState(projectResult.events);
	state.project = { ...projectState.project };

	// Merge project-scope subsystems and custom invariants
	for (const [key, sub] of projectState.subsystems) {
		state.subsystems.set(key, { ...sub, owns: [...sub.owns] });
	}
	for (const [key, inv] of projectState.customInvariants) {
		state.customInvariants.set(key, { ...inv });
	}

	// 2. Scan epics directory
	const epicsDir = path.join(goodplanDir, "epics");
	if (fs.existsSync(epicsDir)) {
		const entries = fs.readdirSync(epicsDir, { withFileTypes: true });
		for (const entry of entries) {
			if (!entry.isDirectory()) continue;
			const epicEventsPath = path.join(epicsDir, entry.name, "events.jsonl");
			if (!fs.existsSync(epicEventsPath)) continue;

			const epicResult = await replayEvents({ eventsPath: epicEventsPath });
			const epicState = computeDerivedState(epicResult.events);

			// Merge epic state into the aggregate
			const epicData = epicState.epics.get(entry.name);
			if (epicData !== undefined) {
				state.epics.set(entry.name, { ...epicData, slices: new Map(epicData.slices) });
			}

			// Merge convergence and score data
			for (const [key, snapshot] of epicState.convergenceSnapshots) {
				state.convergenceSnapshots.set(key, { ...snapshot });
			}
			for (const [key, scores] of epicState.latestDimensionScores) {
				state.latestDimensionScores.set(key, [...scores]);
			}
		}
	}

	// 3. Scan side-quests directory
	const sideQuestsDir = path.join(goodplanDir, "side-quests");
	if (fs.existsSync(sideQuestsDir)) {
		const entries = fs.readdirSync(sideQuestsDir, { withFileTypes: true });
		for (const entry of entries) {
			if (!entry.isDirectory()) continue;
			const sqEventsPath = path.join(sideQuestsDir, entry.name, "events.jsonl");
			if (!fs.existsSync(sqEventsPath)) continue;

			const sqResult = await replayEvents({ eventsPath: sqEventsPath });
			const sqState = computeDerivedState(sqResult.events);

			// Merge side-quest state
			const sqData = sqState.sideQuests.get(entry.name);
			if (sqData !== undefined) {
				state.sideQuests.set(entry.name, { ...sqData, chunks: new Map(sqData.chunks) });
			}
		}
	}

	return state as DeepReadonly<DerivedStateData>;
}
