/**
 * RPC init — orchestrates the INIT_PROJECT workflow.
 * Calls assembleState → reduce → commitState.
 */

import type { Project } from "../../schemas/entities/project.js";
import { GoodplanError } from "../../util/errors.js";
import { assembleState } from "../data/assemble.js";
import { commitState } from "../data/commit.js";
import { getJson } from "../data/tree.js";
import { reduce } from "../state/reduce.js";
import { isStateError } from "../state/types.js";

// TODO: Centralized RPC result types (e.g., src/core/rpc/types.ts) deferred until more RPC functions exist.
export interface InitResult {
	name: string;
	version: string;
	projectDir: string;
}

/**
 * Initialize a new project via the state machine.
 *
 * @param projectDir - The `.project/` directory path (will be created by commitState)
 * @param name - Project name
 */
export function rpcInit(projectDir: string, name: string): InitResult {
	// TODO: assembleState() is a temporary stand-in for the full loadState() API
	// that will be implemented in a later slice (see data-layer-api.md).
	const oldState = assembleState(projectDir);

	const event = {
		type: "INIT_PROJECT" as const,
		name,
		ts: new Date().toISOString(),
	};

	const result = reduce(oldState, event);

	if (isStateError(result)) {
		throw new GoodplanError(
			result.code,
			result.message,
			result.detail,
		);
	}

	commitState(projectDir, oldState, result);

	const project = getJson<Project>(result, "project.json");

	if (project === undefined) {
		throw new GoodplanError(
			"INTERNAL_ERROR",
			"project.json missing from state tree after successful INIT_PROJECT transition",
		);
	}

	return {
		name: project.name,
		version: project.version,
		projectDir,
	};
}
