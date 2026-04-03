/**
 * RPC updateImplementationPhase — triggers UPDATE_IMPLEMENTATION_PHASE state transition.
 * Pattern: loadState → build StateEvent → reduce → commitState → return result.
 */

import type { StateEvent } from "../../schemas/state-events.js";
import { GoodplanError } from "../../util/errors.js";
import { VERSION } from "../../version.js";
import { commitState } from "../data/commit.js";
import { loadState } from "../data/load.js";
import { reduce } from "../state/reduce.js";
import { isStateError } from "../state/types.js";
import { bumpDataVersionIfNeeded } from "./version-stamp.js";

export interface UpdateImplementationPhaseResult {
	entity: string;
	phase: number;
}

export function updateImplementationPhase(
	projectDir: string,
	epic: string,
	slice: string,
	phase: number,
): UpdateImplementationPhaseResult {
	const oldState = loadState(projectDir);
	const ts = new Date().toISOString();

	const event: StateEvent = {
		type: "UPDATE_IMPLEMENTATION_PHASE",
		epic,
		slice,
		phase,
		ts,
	};

	const result = reduce(oldState, event);

	if (isStateError(result)) {
		throw new GoodplanError(result.code, result.message, result.detail);
	}

	const stampedResult = bumpDataVersionIfNeeded(result, VERSION);
	commitState(projectDir, oldState, stampedResult);

	return { entity: slice, phase };
}
