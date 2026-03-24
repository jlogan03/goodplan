/**
 * Version stamping for RPC mutations.
 *
 * **INV-001 exception:** Version stamping is intentionally applied post-reduce()
 * in the RPC layer rather than flowing through a STAMP_VERSION state machine event.
 * Rationale: `version` is infrastructure metadata (tracking which CLI version last
 * wrote the data), not workflow state — the state machine need not validate or be
 * aware of it. This is a documented, intentional exception to INV-001, not a silent
 * violation.
 */

import type { Project } from "../../schemas/entities/project.js";
import { parseSemver, semverGreaterThan } from "../../util/semver.js";
import { getJson, setEntry } from "../tree.js";
import type { ProjectState } from "../tree.js";

/**
 * Bump `project.json.version` to `cliVersion` if the CLI version is greater
 * than the current data version. Returns updated state (or original if no bump needed).
 *
 * Guards:
 * - Skips if `project.json` is absent (e.g., corrupted project or race condition)
 * - Skips if data version >= CLI version (no downgrade)
 */
export function bumpDataVersionIfNeeded(state: ProjectState, cliVersion: string): ProjectState {
	const project = getJson<Project>(state, "project.json");
	if (project === undefined) {
		return state;
	}

	let cli: ReturnType<typeof parseSemver>;
	let data: ReturnType<typeof parseSemver>;
	try {
		cli = parseSemver(cliVersion);
		data = parseSemver(project.version);
	} catch {
		// Invalid version string — skip stamping rather than failing the mutation
		return state;
	}

	if (!semverGreaterThan(cli, data)) {
		return state;
	}

	// Bump version in project.json
	const updatedProject: Project = { ...project, version: cliVersion };
	return setEntry(state, "project.json", {
		type: "json",
		content: updatedProject,
	});
}
