import { describe, expect, it } from "vitest";
import { ZERO_STATE } from "../../../src/core/data/tree.js";
import type { ProjectState } from "../../../src/core/data/tree.js";
import { getJson, getJsonl } from "../../../src/core/data/tree.js";
import { reduce } from "../../../src/core/state/reduce.js";
import { isStateError } from "../../../src/core/state/types.js";
import type { StateError } from "../../../src/core/state/types.js";
import type { Quest } from "../../../src/schemas/entities/quest.js";
import type { Overview } from "../../../src/schemas/entities/overview.js";

const TS = "2026-01-01T00:00:00.000Z";
const TS2 = "2026-01-02T00:00:00.000Z";

function initProject(): ProjectState {
	return reduce(ZERO_STATE, { type: "INIT_PROJECT", name: "test", ts: TS }) as ProjectState;
}

describe("reduce — CREATE_QUEST", () => {
	it("creates quest.json with correct fields", () => {
		const state = initProject();
		const result = reduce(state, {
			type: "CREATE_QUEST",
			name: "fix-logging",
			goal: "Fix structured logging",
			ts: TS2,
		});

		expect(isStateError(result)).toBe(false);
		const newState = result as ProjectState;

		const quest = getJson<Quest>(newState, "quests/fix-logging/quest.json");
		expect(quest).toBeDefined();
		expect(quest!.name).toBe("fix-logging");
		expect(quest!.status).toBe("created");
		expect(quest!.goal).toBe("Fix structured logging");
		expect(quest!.refinement).toBeNull();
		expect(quest!.created).toBe(TS2);
		expect(quest!.updated).toBe(TS2);
	});

	it("updates quests/overview.json with created and completed fields, no epic field", () => {
		const state = initProject();
		const result = reduce(state, {
			type: "CREATE_QUEST",
			name: "q1",
			goal: "Test",
			ts: TS2,
		}) as ProjectState;

		const overview = getJson<Overview>(result, "quests/overview.json");
		expect(overview).toBeDefined();
		expect(overview!.items).toHaveLength(1);
		expect(overview!.items[0]!.name).toBe("q1");
		expect(overview!.items[0]!.status).toBe("created");
		expect(overview!.items[0]!.created).toBe(TS2);
		expect(overview!.items[0]!.completed).toBeNull();
		// No epic field — quests are project-scoped
		expect(overview!.items[0]!.epic).toBeUndefined();
	});

	it("appends activity log entry", () => {
		const state = initProject();
		const result = reduce(state, {
			type: "CREATE_QUEST",
			name: "q1",
			goal: "Test",
			ts: TS2,
		}) as ProjectState;

		const log = getJsonl<Record<string, unknown>>(result, "activity-log.jsonl");
		expect(log).toBeDefined();
		const entry = log![log!.length - 1]!;
		expect(entry.phase).toBe("create-quest");
		expect(entry.scope).toBe("quests/q1");
	});

	it("rejects duplicate quest name", () => {
		const state = initProject();
		const first = reduce(state, {
			type: "CREATE_QUEST",
			name: "q1",
			goal: "First",
			ts: TS,
		}) as ProjectState;

		const result = reduce(first, {
			type: "CREATE_QUEST",
			name: "q1",
			goal: "Second",
			ts: TS2,
		});

		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
	});

	it("rejects when quests/overview.json is missing", () => {
		// Use bare ZERO_STATE (no INIT_PROJECT) — overview.json won't exist
		const result = reduce(ZERO_STATE, {
			type: "CREATE_QUEST",
			name: "q1",
			goal: "Test",
			ts: TS,
		});

		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
	});

	it("creates multiple quests in sequence", () => {
		let s = initProject();
		s = reduce(s, { type: "CREATE_QUEST", name: "q1", goal: "First", ts: TS }) as ProjectState;
		s = reduce(s, { type: "CREATE_QUEST", name: "q2", goal: "Second", ts: TS2 }) as ProjectState;

		const overview = getJson<Overview>(s, "quests/overview.json");
		expect(overview!.items).toHaveLength(2);
	});
});
