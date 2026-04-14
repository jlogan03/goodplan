import type {
	Blocker,
	DerivedStateData,
	EpicState,
	NextStep,
	Phase,
	SideQuestState,
	SliceState,
	Transition,
} from "../../schemas/entities/derived-state.js";
import type { DeepReadonly } from "../../util/types.js";

/**
 * Look up the current phase for a given scope reference.
 * scopeRef is a directory slug: epic dir, "epicDir/sliceDir", or side-quest dir.
 * Returns undefined if the scope is not found.
 */
export function currentPhase(
	state: DeepReadonly<DerivedStateData>,
	scopeRef: string,
): Phase | undefined {
	// Check epics
	const epic = state.epics.get(scopeRef);
	if (epic !== undefined) {
		return epic.phase;
	}

	// Check slices (scopeRef format: "epicDir/sliceDir")
	const slashIdx = scopeRef.indexOf("/");
	if (slashIdx !== -1) {
		const epicDir = scopeRef.slice(0, slashIdx);
		const sliceDir = scopeRef.slice(slashIdx + 1);
		const parentEpic = state.epics.get(epicDir);
		if (parentEpic !== undefined) {
			const slice = parentEpic.slices.get(sliceDir);
			if (slice !== undefined) {
				return slice.phase;
			}
		}
	}

	// Check side-quests
	const sq = state.sideQuests.get(scopeRef);
	if (sq !== undefined) {
		return sq.phase;
	}

	return undefined;
}

/**
 * Return all active entities (not completed, not abandoned, not landed).
 */
export function activeEntities(
	state: DeepReadonly<DerivedStateData>,
): Array<{ kind: "epic" | "slice" | "side-quest"; ref: string; phase: Phase }> {
	const result: Array<{ kind: "epic" | "slice" | "side-quest"; ref: string; phase: Phase }> = [];

	for (const [dir, epic] of state.epics) {
		if (epic.active && !epic.completed && !epic.abandoned) {
			result.push({ kind: "epic", ref: dir, phase: epic.phase });
		}
		for (const [sliceDir, slice] of epic.slices) {
			if (!slice.abandoned && slice.phase !== "P12") {
				result.push({ kind: "slice", ref: `${dir}/${sliceDir}`, phase: slice.phase });
			}
		}
	}

	for (const [dir, sq] of state.sideQuests) {
		if (!sq.landed && !sq.abandoned) {
			result.push({ kind: "side-quest", ref: dir, phase: sq.phase });
		}
	}

	return result;
}

/**
 * Return blockers for a given scope reference.
 * A blocker indicates what must happen before the entity can progress.
 */
export function blockers(state: DeepReadonly<DerivedStateData>, scopeRef: string): Blocker[] {
	const result: Blocker[] = [];

	const epic = state.epics.get(scopeRef);
	if (epic !== undefined) {
		if (!state.project.initialized) {
			result.push({ scopeRef, description: "Project not initialized" });
		}
		if (epic.phase === "P0" && epic.goal === null) {
			result.push({ scopeRef, description: "Epic goal not yet committed" });
		}
		if (epic.phase === "P5" && !epic.active) {
			result.push({ scopeRef, description: "Epic not yet activated" });
		}
		return result;
	}

	// Check slices
	const slashIdx = scopeRef.indexOf("/");
	if (slashIdx !== -1) {
		const epicDir = scopeRef.slice(0, slashIdx);
		const sliceDir = scopeRef.slice(slashIdx + 1);
		const parentEpic = state.epics.get(epicDir);
		if (parentEpic !== undefined) {
			const slice = parentEpic.slices.get(sliceDir);
			if (slice !== undefined) {
				if (slice.phase === "P7" && slice.plan === null) {
					result.push({ scopeRef, description: "Slice plan not yet drafted" });
				}
			}
		}
		return result;
	}

	// Side-quests
	const sq = state.sideQuests.get(scopeRef);
	if (sq !== undefined) {
		if (sq.phase === "S0" && sq.goal === null) {
			result.push({ scopeRef, description: "Side-quest goal not yet committed" });
		}
	}

	return result;
}

/**
 * Return valid transitions (commands) for a given scope reference.
 */
export function validTransitions(
	state: DeepReadonly<DerivedStateData>,
	scopeRef: string,
): Transition[] {
	const result: Transition[] = [];

	const epic = state.epics.get(scopeRef);
	if (epic !== undefined) {
		return epicTransitions(epic, scopeRef);
	}

	// Check slices
	const slashIdx = scopeRef.indexOf("/");
	if (slashIdx !== -1) {
		const epicDir = scopeRef.slice(0, slashIdx);
		const sliceDir = scopeRef.slice(slashIdx + 1);
		const parentEpic = state.epics.get(epicDir);
		if (parentEpic !== undefined) {
			const slice = parentEpic.slices.get(sliceDir);
			if (slice !== undefined) {
				return sliceTransitions(slice, scopeRef);
			}
		}
		return result;
	}

	const sq = state.sideQuests.get(scopeRef);
	if (sq !== undefined) {
		return sideQuestTransitions(sq, scopeRef);
	}

	return result;
}

function epicTransitions(epic: DeepReadonly<EpicState>, scopeRef: string): Transition[] {
	const result: Transition[] = [];
	switch (epic.phase) {
		case "P0":
			result.push({
				command: `gp epic:goal-draft --epic=${scopeRef}`,
				description: "Draft epic goal",
			});
			break;
		case "P1":
			result.push({
				command: `gp epic:explore-start --epic=${scopeRef}`,
				description: "Start exploration",
			});
			break;
		case "P2":
			result.push({
				command: `gp epic:architecture-draft --epic=${scopeRef}`,
				description: "Draft architecture target",
			});
			break;
		case "P3":
			result.push({
				command: `gp epic:pressure-test-draft --epic=${scopeRef}`,
				description: "Draft pressure test",
			});
			break;
		case "P4":
			result.push({
				command: `gp epic:slices-draft --epic=${scopeRef}`,
				description: "Draft slice set",
			});
			break;
		case "P5":
			result.push({ command: `gp epic:activate --epic=${scopeRef}`, description: "Activate epic" });
			break;
		case "P6":
			result.push({ command: `gp slice:create --epic=${scopeRef}`, description: "Create a slice" });
			break;
		default:
			break;
	}
	if (epic.active && !epic.paused) {
		result.push({ command: `gp epic:pause --epic=${scopeRef}`, description: "Pause epic" });
	}
	if (epic.paused) {
		result.push({ command: `gp epic:resume --epic=${scopeRef}`, description: "Resume epic" });
	}
	return result;
}

function sliceTransitions(slice: DeepReadonly<SliceState>, scopeRef: string): Transition[] {
	const result: Transition[] = [];
	switch (slice.phase) {
		case "P6":
		case "P0":
			result.push({
				command: `gp slice:plan-draft --slice=${scopeRef}`,
				description: "Draft slice plan",
			});
			break;
		case "P7":
			result.push({
				command: `gp slice:plan-shape-approve --slice=${scopeRef}`,
				description: "Approve plan shape",
			});
			break;
		case "P8":
			result.push({
				command: `gp slice:plan-commit --slice=${scopeRef}`,
				description: "Commit slice plan",
			});
			break;
		case "P9":
			result.push({
				command: `gp slice:implement-start --slice=${scopeRef}`,
				description: "Start implementation",
			});
			break;
		case "P10":
			result.push({
				command: `gp slice:code-refine-start --slice=${scopeRef}`,
				description: "Start code refinement",
			});
			break;
		case "P11":
			result.push({ command: `gp slice:land --slice=${scopeRef}`, description: "Land slice" });
			break;
		default:
			break;
	}
	return result;
}

function sideQuestTransitions(sq: DeepReadonly<SideQuestState>, scopeRef: string): Transition[] {
	const result: Transition[] = [];
	switch (sq.phase) {
		case "S0":
			result.push({
				command: `gp side-quest:goal-commit --side-quest=${scopeRef}`,
				description: "Commit goal",
			});
			break;
		case "S1":
			result.push({
				command: `gp side-quest:implement-start --side-quest=${scopeRef}`,
				description: "Start implementation",
			});
			break;
		case "S2":
			result.push({
				command: `gp side-quest:land --side-quest=${scopeRef}`,
				description: "Land side-quest",
			});
			break;
		default:
			break;
	}
	return result;
}

/**
 * Suggest next steps across all active entities.
 * Produces NextStep[] with command suggestions and priorities.
 */
export function suggestedNextSteps(state: DeepReadonly<DerivedStateData>): NextStep[] {
	const steps: NextStep[] = [];

	if (!state.project.initialized) {
		steps.push({
			command: "gp init",
			description: "Initialize the project",
			priority: 0,
		});
		return steps;
	}

	let priority = 1;

	// Check epics
	for (const [dir, epic] of state.epics) {
		if (epic.completed || epic.abandoned) continue;

		const transitions = epicTransitions(epic, dir);
		for (const t of transitions) {
			steps.push({ command: t.command, description: t.description, priority });
			priority++;
		}

		// Check slices within active epics
		if (epic.active) {
			for (const [sliceDir, slice] of epic.slices) {
				if (slice.abandoned || slice.phase === "P12") continue;
				const scopeRef = `${dir}/${sliceDir}`;
				const sliceTs = sliceTransitions(slice, scopeRef);
				for (const t of sliceTs) {
					steps.push({ command: t.command, description: t.description, priority });
					priority++;
				}
			}
		}
	}

	// Check side-quests
	for (const [dir, sq] of state.sideQuests) {
		if (sq.landed || sq.abandoned) continue;
		const transitions = sideQuestTransitions(sq, dir);
		for (const t of transitions) {
			steps.push({ command: t.command, description: t.description, priority });
			priority++;
		}
	}

	return steps;
}
