import { describe, expect, it } from "vitest";
import { isStateError } from "../../../src/schemas/state-events.js";
import type { StateError, StateErrorCode, StateEvent } from "../../../src/schemas/state-events.js";

describe("StateEvent", () => {
	it("INIT_PROJECT event is structurally valid", () => {
		const event: StateEvent = { type: "INIT_PROJECT", name: "my-project", ts: "2026-03-22T00:00:00.000Z" };
		expect(event.type).toBe("INIT_PROJECT");
		expect(event.name).toBe("my-project");
	});

	it("CREATE_EPIC event carries name, goal, and ts", () => {
		const event: StateEvent = {
			type: "CREATE_EPIC",
			name: "my-epic",
			goal: "Build something",
			ts: "2026-03-22T00:00:00.000Z",
		};
		expect(event.type).toBe("CREATE_EPIC");
	});

	it("ACTIVATE_EPIC event carries epic and ts", () => {
		const event: StateEvent = {
			type: "ACTIVATE_EPIC",
			epic: "my-epic",
			ts: "2026-03-22T00:00:00.000Z",
		};
		expect(event.type).toBe("ACTIVATE_EPIC");
	});

	it("epic lifecycle events with no extra payload", () => {
		const simpleEpicEvents: StateEvent[] = [
			{ type: "BEGIN_EXPLORE", epic: "e" },
			{ type: "COMPLETE_EXPLORE", epic: "e" },
			{ type: "BEGIN_ARCHITECTURE", epic: "e" },
			{ type: "COMPLETE_ARCHITECTURE", epic: "e" },
			{ type: "BEGIN_REFINE_ARCHITECTURE", epic: "e" },
			{ type: "BEGIN_SLICING", epic: "e" },
			{ type: "COMPLETE_SLICING", epic: "e" },
			{ type: "BEGIN_REFINE_SLICES", epic: "e" },
		];
		expect(simpleEpicEvents).toHaveLength(8);
		for (const event of simpleEpicEvents) {
			expect(event.type).toBeTruthy();
		}
	});

	it("COMPLETE_REFINE_ARCHITECTURE carries scores and optional override", () => {
		const event: StateEvent = {
			type: "COMPLETE_REFINE_ARCHITECTURE",
			epic: "e",
			scores: { clarity: 8, completeness: 9 },
		};
		expect(event.type).toBe("COMPLETE_REFINE_ARCHITECTURE");

		const withOverride: StateEvent = {
			type: "COMPLETE_REFINE_ARCHITECTURE",
			epic: "e",
			scores: { clarity: 5 },
			override: true,
		};
		expect(withOverride.type).toBe("COMPLETE_REFINE_ARCHITECTURE");
	});

	it("COMPLETE_REFINE_SLICES carries scores and optional override", () => {
		const event: StateEvent = {
			type: "COMPLETE_REFINE_SLICES",
			epic: "e",
			scores: { decomposition: 9 },
		};
		expect(event.type).toBe("COMPLETE_REFINE_SLICES");
	});

	it("COMPLETE_EPIC carries verificationResults", () => {
		const event: StateEvent = {
			type: "COMPLETE_EPIC",
			epic: "e",
			verificationResults: [{ index: 0, passed: true, notes: "All good" }],
		};
		expect(event.type).toBe("COMPLETE_EPIC");
	});

	it("ABANDON_EPIC carries reason", () => {
		const event: StateEvent = {
			type: "ABANDON_EPIC",
			epic: "e",
			reason: "Scope changed",
		};
		expect(event.type).toBe("ABANDON_EPIC");
	});

	it("ADD_VERIFICATION carries verification payload", () => {
		const event: StateEvent = {
			type: "ADD_VERIFICATION",
			epic: "e",
			verification: {
				description: "Tests pass",
				status: "pending",
				addedDuring: "defining-slices",
				modifiedDuring: null,
			},
		};
		expect(event.type).toBe("ADD_VERIFICATION");
	});

	it("UPDATE_VERIFICATION carries index and verification", () => {
		const event: StateEvent = {
			type: "UPDATE_VERIFICATION",
			epic: "e",
			index: 0,
			verification: {
				description: "Tests pass",
				status: "passed",
				addedDuring: "defining-slices",
				modifiedDuring: "activated",
			},
		};
		expect(event.type).toBe("UPDATE_VERIFICATION");
	});

	it("slice submit events are structurally valid", () => {
		const events: StateEvent[] = [
			{ type: "COMPLETE_PLAN", slice: "s" },
			{ type: "COMPLETE_REFINEMENT_ROUND", slice: "s", scores: { quality: 9 } },
			{ type: "COMPLETE_REFINEMENT_ROUND", slice: "s", scores: { quality: 7 }, override: true },
			{ type: "COMPLETE_IMPLEMENTATION", slice: "s" },
		];
		expect(events).toHaveLength(4);
	});

	it("quest submit events are structurally valid", () => {
		const events: StateEvent[] = [
			{ type: "COMPLETE_QUEST_PLAN", quest: "q" },
			{ type: "COMPLETE_QUEST_REFINEMENT_ROUND", quest: "q", scores: { quality: 9 } },
			{ type: "COMPLETE_QUEST_REFINEMENT_ROUND", quest: "q", scores: { quality: 7 }, override: true },
			{ type: "COMPLETE_QUEST_IMPLEMENTATION", quest: "q" },
		];
		expect(events).toHaveLength(4);
	});

	it("discriminated union covers all 23 event types", () => {
		// Compile-time exhaustiveness: this array must include every event type.
		// If a new event type is added to StateEvent without adding it here, this won't catch it at runtime,
		// but the individual tests above cover each type.
		const allTypes: StateEvent["type"][] = [
			"INIT_PROJECT",
			"CREATE_EPIC",
			"BEGIN_EXPLORE",
			"COMPLETE_EXPLORE",
			"BEGIN_ARCHITECTURE",
			"COMPLETE_ARCHITECTURE",
			"BEGIN_REFINE_ARCHITECTURE",
			"COMPLETE_REFINE_ARCHITECTURE",
			"BEGIN_SLICING",
			"COMPLETE_SLICING",
			"BEGIN_REFINE_SLICES",
			"COMPLETE_REFINE_SLICES",
			"ACTIVATE_EPIC",
			"COMPLETE_EPIC",
			"ABANDON_EPIC",
			"ADD_VERIFICATION",
			"UPDATE_VERIFICATION",
			"COMPLETE_PLAN",
			"COMPLETE_REFINEMENT_ROUND",
			"COMPLETE_IMPLEMENTATION",
			"COMPLETE_QUEST_PLAN",
			"COMPLETE_QUEST_REFINEMENT_ROUND",
			"COMPLETE_QUEST_IMPLEMENTATION",
		];
		expect(allTypes).toHaveLength(23);
		// All unique
		expect(new Set(allTypes).size).toBe(23);
	});
});

describe("isStateError", () => {
	it("returns true for a valid StateError", () => {
		const err: StateError = {
			code: "STATE_INVALID_TRANSITION",
			message: "Cannot transition from created",
		};
		expect(isStateError(err)).toBe(true);
	});

	it("returns true for StateError with detail", () => {
		const err: StateError = {
			code: "STATE_ALREADY_INITIALIZED",
			message: "Project already exists",
			detail: { existing: "my-project" },
		};
		expect(isStateError(err)).toBe(true);
	});

	it("returns true for all new error codes", () => {
		const newCodes: StateErrorCode[] = [
			"STATE_EPIC_ALREADY_ACTIVE",
			"STATE_MISSING_VERIFICATIONS",
			"STATE_VERIFICATION_FAILED",
			"STATE_SLICE_NOT_READY",
			"STATE_CONTENT_MISSING",
			"STATE_MAX_ROUNDS_REACHED",
		];
		for (const code of newCodes) {
			const err: StateError = { code, message: `Error: ${code}` };
			expect(isStateError(err)).toBe(true);
		}
	});

	it("returns false for null", () => {
		expect(isStateError(null)).toBe(false);
	});

	it("returns false for undefined", () => {
		expect(isStateError(undefined)).toBe(false);
	});

	it("returns false for a string", () => {
		expect(isStateError("error")).toBe(false);
	});

	it("returns false for an object without code", () => {
		expect(isStateError({ message: "no code" })).toBe(false);
	});

	it("returns false for an object with non-string code", () => {
		expect(isStateError({ code: 123, message: "numeric code" })).toBe(false);
	});

	it("returns false for a ProjectState-like directory object", () => {
		// Ensure we don't confuse a tree node with an error
		expect(isStateError({ type: "directory", contents: {} })).toBe(false);
	});
});
