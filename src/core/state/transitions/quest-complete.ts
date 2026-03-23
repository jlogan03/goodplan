import type { QuestStatus } from "../../../schemas/entities/quest.js";
import type { ArchitectureDelta } from "../../../schemas/records/architecture-delta.js";
import type { LearningEntry } from "../../../schemas/records/learning.js";
/**
 * COMPLETE_QUEST transition handler.
 * Learnings rollup, architecture delta recording, status completion, activeQuest clearing.
 * Pure function, no I/O.
 */
import type { ProjectState } from "../../tree.js";
import { getJsonl, setEntry } from "../../tree.js";
import type { StateError, StateEvent } from "../types.js";
import { isStateError } from "../types.js";
import {
	appendActivityLog,
	getProject,
	getQuest,
	guardQuestStatus,
	setQuestStatus,
} from "./helpers.js";

type CompleteQuestEvent = Extract<StateEvent, { type: "COMPLETE_QUEST" }>;

export function handleCompleteQuest(
	state: ProjectState,
	event: CompleteQuestEvent,
): ProjectState | StateError {
	const quest = getQuest(state, event.quest);
	const questOrErr = guardQuestStatus(
		quest,
		event.quest,
		"implementation-complete",
		"COMPLETE_QUEST",
	);
	if (isStateError(questOrErr)) return questOrErr;

	// Guard: verificationPassed must be true
	if (!event.verificationPassed) {
		return {
			code: "STATE_VERIFICATION_FAILED",
			message: `Cannot complete quest "${event.quest}" — verification did not pass`,
			detail: { quest: event.quest, verificationPassed: false },
		};
	}

	let tree = state;

	// 1. Learnings: transform LearningInput to LearningEntry, write per-quest and rollup
	if (event.learnings.length > 0) {
		const source = `quests/${event.quest}`;
		const learningEntries: LearningEntry[] = event.learnings.map((l) => ({
			...l,
			source,
			rollup: l.rollupTo.length > 0,
		}));

		// Write to per-quest learnings.jsonl
		const questLearnings =
			getJsonl<LearningEntry>(tree, `quests/${event.quest}/learnings.jsonl`) ?? [];
		tree = setEntry(tree, `quests/${event.quest}/learnings.jsonl`, {
			type: "jsonl",
			content: [...questLearnings, ...learningEntries],
		});

		// Rollup: for each learning with rollupTo targets
		for (const entry of learningEntries) {
			for (const target of entry.rollupTo) {
				if (target === "project") {
					const projectLearnings = getJsonl<LearningEntry>(tree, "learnings.jsonl") ?? [];
					tree = setEntry(tree, "learnings.jsonl", {
						type: "jsonl",
						content: [...projectLearnings, entry],
					});
				}
				// Quests are project-scoped — rollupTo "epic" is silently skipped
				// because there is no parent epic to roll up to.
			}
		}
	}

	// 2. Architecture deltas: write to per-quest architecture-deltas.jsonl
	if (event.architectureDelta.length > 0) {
		// Inject ts from the event timestamp onto each delta
		const deltas: ArchitectureDelta[] = event.architectureDelta.map((d) => ({
			...d,
			ts: event.ts,
		}));
		const existingDeltas =
			getJsonl<ArchitectureDelta>(tree, `quests/${event.quest}/architecture-deltas.jsonl`) ?? [];
		tree = setEntry(tree, `quests/${event.quest}/architecture-deltas.jsonl`, {
			type: "jsonl",
			content: [...existingDeltas, ...deltas],
		});
	}

	// 3. Set status to completed + sync overview
	tree = setQuestStatus(tree, event.quest, questOrErr, "completed", event.ts);

	// 4. Clear activeQuest in project.json
	const project = getProject(tree);
	if (project !== undefined) {
		tree = setEntry(tree, "project.json", {
			type: "json",
			content: { ...project, activeQuest: null, updated: event.ts },
		});
	}

	// 5. Append activity log
	tree = appendActivityLog(
		tree,
		event.ts,
		"complete-quest",
		`quests/${event.quest}`,
		`Quest "${event.quest}" completed`,
	);

	return tree;
}

/** Transition table rows for COMPLETE_QUEST */
export const completeQuestTransitions: ReadonlyArray<{
	from: QuestStatus;
	event: StateEvent["type"];
	to: QuestStatus | "(error)";
}> = [
	{ from: "implementation-complete", event: "COMPLETE_QUEST", to: "completed" },
	{ from: "implementation-complete", event: "COMPLETE_QUEST", to: "(error)" },
] as const;
