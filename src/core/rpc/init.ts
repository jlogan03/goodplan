/**
 * RPC init — thin wrapper over begin('create', {type:'project'}, ...).
 * Preserved for backward compatibility with the init command.
 */

import type { Project } from "../../schemas/entities/project.js";
import { GoodplanError } from "../../util/errors.js";
import { loadState } from "../data/load.js";
import { getJson } from "../tree.js";
import { begin } from "./begin.js";

export interface InitResult {
	name: string;
	version: string;
	projectDir: string;
}

/**
 * Initialize a new project via the state machine.
 * Routes through begin('create', {type:'project'}, {name}).
 *
 * @param projectDir - The `.goodplan/` directory path (will be created by commitState)
 * @param name - Project name
 */
export function rpcInit(projectDir: string, name: string): InitResult {
	begin(projectDir, "create", { type: "project" }, { name });

	// Read the committed state to extract project details
	const newState = loadState(projectDir);
	const project = getJson<Project>(newState, "project.json");

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
