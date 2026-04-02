import { describe, expect, it } from "vitest";
import { ZERO_STATE } from "../../../src/core/data/tree.js";
import type { ProjectState } from "../../../src/core/data/tree.js";
import { getJsonl } from "../../../src/core/data/tree.js";
import { reduce } from "../../../src/core/state/reduce.js";
import { isStateError } from "../../../src/core/state/types.js";
import type { StateError } from "../../../src/core/state/types.js";
import type { DecisionEntry } from "../../../src/schemas/records/decision.js";

const TS = "2026-01-01T00:00:00.000Z";
const TS2 = "2026-01-02T00:00:00.000Z";
const TS3 = "2026-01-03T00:00:00.000Z";

function initProject(): ProjectState {
	return reduce(ZERO_STATE, { type: "INIT_PROJECT", name: "test", ts: TS }) as ProjectState;
}

describe("reduce — CREATE_DECISION", () => {
	it("creates entry with correct shape", () => {
		const s = initProject();
		const result = reduce(s, {
			type: "CREATE_DECISION",
			id: "2026-03-20-layered-arch",
			domain: "architecture",
			title: "Four-Layer Architecture",
			summary: "Commands -> RPC -> State Machine + Data Layer",
			ts: TS2,
		});

		expect(isStateError(result)).toBe(false);
		const newState = result as ProjectState;

		const decisions = getJsonl<DecisionEntry>(newState, "decisions.jsonl");
		expect(decisions).toHaveLength(1);
		const d = decisions![0]!;
		expect(d.id).toBe("2026-03-20-layered-arch");
		expect(d.status).toBe("active");
		expect(d.domain).toBe("architecture");
		expect(d.title).toBe("Four-Layer Architecture");
		expect(d.summary).toBe("Commands -> RPC -> State Machine + Data Layer");
		expect(d.date).toBe("2026-01-02"); // date portion of TS2
		expect(d.supersededBy).toBeNull();
	});

	it("duplicate id returns STATE_DUPLICATE_DECISION", () => {
		let s = initProject();
		s = reduce(s, {
			type: "CREATE_DECISION",
			id: "dec-1",
			domain: "testing",
			title: "Use Vitest",
			summary: "Fast and compatible",
			ts: TS,
		}) as ProjectState;

		const result = reduce(s, {
			type: "CREATE_DECISION",
			id: "dec-1",
			domain: "testing",
			title: "Duplicate",
			summary: "Should fail",
			ts: TS2,
		});

		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_DUPLICATE_DECISION");
	});

	it("appends activity log", () => {
		const s = initProject();
		const result = reduce(s, {
			type: "CREATE_DECISION",
			id: "dec-1",
			domain: "architecture",
			title: "Test Decision",
			summary: "Summary",
			ts: TS2,
		}) as ProjectState;

		const log = getJsonl<Record<string, unknown>>(result, "activity-log.jsonl");
		const entry = log![log!.length - 1]!;
		expect(entry.phase).toBe("create-decision");
		expect(entry.scope).toBe("decisions/dec-1");
	});
});

describe("reduce — CREATE_DECISION with provenance fields", () => {
	it("creates entry with entityPath and reconsiderWhen", () => {
		let s = initProject();
		// Create an epic so the entityPath resolves (state machine only — no entityPath validation here)
		s = reduce(s, { type: "CREATE_EPIC", name: "my-epic", goal: "Test epic", ts: TS }) as ProjectState;

		const result = reduce(s, {
			type: "CREATE_DECISION",
			id: "dec-prov",
			domain: "architecture",
			title: "Provenance Decision",
			summary: "Has entityPath",
			entityPath: "epics/my-epic",
			reconsiderWhen: ["Binary exceeds 100MB", "Multi-platform needed"],
			ts: TS2,
		});

		expect(isStateError(result)).toBe(false);
		const newState = result as ProjectState;
		const decisions = getJsonl<DecisionEntry>(newState, "decisions.jsonl");
		expect(decisions).toHaveLength(1);
		const d = decisions![0]!;
		expect(d.entityPath).toBe("epics/my-epic");
		expect(d.reconsiderWhen).toEqual(["Binary exceeds 100MB", "Multi-platform needed"]);
	});

	it("creates entry without provenance fields (backward compat)", () => {
		const s = initProject();
		const result = reduce(s, {
			type: "CREATE_DECISION",
			id: "dec-noprov",
			domain: "testing",
			title: "No Provenance",
			summary: "No entityPath or reconsiderWhen",
			ts: TS2,
		});

		expect(isStateError(result)).toBe(false);
		const newState = result as ProjectState;
		const decisions = getJsonl<DecisionEntry>(newState, "decisions.jsonl");
		expect(decisions).toHaveLength(1);
		const d = decisions![0]!;
		expect(d.entityPath).toBeUndefined();
		expect(d.reconsiderWhen).toBeUndefined();
		// Core fields still present
		expect(d.id).toBe("dec-noprov");
		expect(d.status).toBe("active");
	});

	it("creates entry with only entityPath (no reconsiderWhen)", () => {
		let s = initProject();
		s = reduce(s, { type: "CREATE_EPIC", name: "e1", goal: "G", ts: TS }) as ProjectState;

		const result = reduce(s, {
			type: "CREATE_DECISION",
			id: "dec-ep-only",
			domain: "tooling",
			title: "EP Only",
			summary: "Only entityPath",
			entityPath: "epics/e1",
			ts: TS2,
		});

		expect(isStateError(result)).toBe(false);
		const newState = result as ProjectState;
		const decisions = getJsonl<DecisionEntry>(newState, "decisions.jsonl");
		const d = decisions![0]!;
		expect(d.entityPath).toBe("epics/e1");
		expect(d.reconsiderWhen).toBeUndefined();
	});

	it("creates entry with only reconsiderWhen (no entityPath)", () => {
		const s = initProject();
		const result = reduce(s, {
			type: "CREATE_DECISION",
			id: "dec-rw-only",
			domain: "testing",
			title: "RW Only",
			summary: "Only reconsiderWhen",
			reconsiderWhen: ["When tests slow down"],
			ts: TS2,
		});

		expect(isStateError(result)).toBe(false);
		const newState = result as ProjectState;
		const decisions = getJsonl<DecisionEntry>(newState, "decisions.jsonl");
		const d = decisions![0]!;
		expect(d.entityPath).toBeUndefined();
		expect(d.reconsiderWhen).toEqual(["When tests slow down"]);
	});
});

describe("reduce — UPDATE_DECISION", () => {
	function stateWithActiveDecision(): ProjectState {
		let s = initProject();
		s = reduce(s, {
			type: "CREATE_DECISION",
			id: "dec-1",
			domain: "architecture",
			title: "Original Title",
			summary: "Original Summary",
			ts: TS,
		}) as ProjectState;
		return s;
	}

	it("active -> revisiting", () => {
		const s = stateWithActiveDecision();
		const result = reduce(s, {
			type: "UPDATE_DECISION",
			id: "dec-1",
			changes: { status: "revisiting" },
			ts: TS2,
		}) as ProjectState;

		const decisions = getJsonl<DecisionEntry>(result, "decisions.jsonl");
		expect(decisions![0]!.status).toBe("revisiting");
	});

	it("active -> superseded with supersededBy", () => {
		const s = stateWithActiveDecision();
		const result = reduce(s, {
			type: "UPDATE_DECISION",
			id: "dec-1",
			changes: { status: "superseded", supersededBy: "dec-2" },
			ts: TS2,
		}) as ProjectState;

		const decisions = getJsonl<DecisionEntry>(result, "decisions.jsonl");
		expect(decisions![0]!.status).toBe("superseded");
		expect(decisions![0]!.supersededBy).toBe("dec-2");
	});

	it("revisiting -> active", () => {
		let s = stateWithActiveDecision();
		s = reduce(s, {
			type: "UPDATE_DECISION",
			id: "dec-1",
			changes: { status: "revisiting" },
			ts: TS2,
		}) as ProjectState;

		const result = reduce(s, {
			type: "UPDATE_DECISION",
			id: "dec-1",
			changes: { status: "active" },
			ts: TS3,
		}) as ProjectState;

		const decisions = getJsonl<DecisionEntry>(result, "decisions.jsonl");
		expect(decisions![0]!.status).toBe("active");
	});

	it("revisiting -> superseded", () => {
		let s = stateWithActiveDecision();
		s = reduce(s, {
			type: "UPDATE_DECISION",
			id: "dec-1",
			changes: { status: "revisiting" },
			ts: TS2,
		}) as ProjectState;

		const result = reduce(s, {
			type: "UPDATE_DECISION",
			id: "dec-1",
			changes: { status: "superseded", supersededBy: "dec-2" },
			ts: TS3,
		}) as ProjectState;

		const decisions = getJsonl<DecisionEntry>(result, "decisions.jsonl");
		expect(decisions![0]!.status).toBe("superseded");
		expect(decisions![0]!.supersededBy).toBe("dec-2");
	});

	it("revisiting -> revisiting rejected as invalid transition", () => {
		let s = stateWithActiveDecision();
		s = reduce(s, {
			type: "UPDATE_DECISION",
			id: "dec-1",
			changes: { status: "revisiting" },
			ts: TS2,
		}) as ProjectState;

		const result = reduce(s, {
			type: "UPDATE_DECISION",
			id: "dec-1",
			changes: { status: "revisiting" },
			ts: TS3,
		});

		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
	});

	it("cannot update superseded decision (terminal state)", () => {
		let s = stateWithActiveDecision();
		s = reduce(s, {
			type: "UPDATE_DECISION",
			id: "dec-1",
			changes: { status: "superseded", supersededBy: "dec-2" },
			ts: TS2,
		}) as ProjectState;

		const result = reduce(s, {
			type: "UPDATE_DECISION",
			id: "dec-1",
			changes: { title: "New Title" },
			ts: TS3,
		});

		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
	});

	it("supersededBy rejected without status -> superseded", () => {
		const s = stateWithActiveDecision();
		const result = reduce(s, {
			type: "UPDATE_DECISION",
			id: "dec-1",
			changes: { supersededBy: "dec-2" },
			ts: TS2,
		});

		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
	});

	it("missing id returns error", () => {
		const s = initProject();
		const result = reduce(s, {
			type: "UPDATE_DECISION",
			id: "nonexistent",
			changes: { title: "New" },
			ts: TS,
		});

		expect(isStateError(result)).toBe(true);
		expect((result as StateError).code).toBe("STATE_INVALID_TRANSITION");
	});

	it("updates non-status fields (title, summary)", () => {
		const s = stateWithActiveDecision();
		const result = reduce(s, {
			type: "UPDATE_DECISION",
			id: "dec-1",
			changes: { title: "Updated Title", summary: "Updated Summary" },
			ts: TS2,
		}) as ProjectState;

		const decisions = getJsonl<DecisionEntry>(result, "decisions.jsonl");
		expect(decisions![0]!.title).toBe("Updated Title");
		expect(decisions![0]!.summary).toBe("Updated Summary");
		expect(decisions![0]!.status).toBe("active"); // unchanged
	});

	it("appends activity log", () => {
		const s = stateWithActiveDecision();
		const result = reduce(s, {
			type: "UPDATE_DECISION",
			id: "dec-1",
			changes: { status: "revisiting" },
			ts: TS2,
		}) as ProjectState;

		const log = getJsonl<Record<string, unknown>>(result, "activity-log.jsonl");
		const entry = log![log!.length - 1]!;
		expect(entry.phase).toBe("update-decision");
		expect(entry.scope).toBe("decisions/dec-1");
	});
});
