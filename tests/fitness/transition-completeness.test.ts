/**
 * Fitness function: Transition completeness.
 * Verifies every StateEvent type has a handler in handlerRecord,
 * and that no handlers exist for non-existent event types.
 * Also smoke-tests reduce() for each event type.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { handlerRecord } from "../../src/core/state/reduce.js";
import { reduce } from "../../src/core/state/reduce.js";
import { ZERO_STATE } from "../../src/core/tree.js";
import { isStateError } from "../../src/schemas/state-events.js";

const STATE_EVENTS_PATH = path.resolve(import.meta.dirname, "../../src/schemas/state-events.ts");

/**
 * Parse the StateEvent union from source to count member types.
 * Counts lines matching `| { type: "EVENT_NAME"` pattern.
 */
function countStateEventMembers(source: string): string[] {
	const typePattern = /\|\s*\{\s*type:\s*"([^"]+)"/g;
	const types: string[] = [];
	let match: RegExpExecArray | null;
	while ((match = typePattern.exec(source)) !== null) {
		types.push(match[1]!);
	}
	return types;
}

describe("Transition completeness", () => {
	const handlerKeys = Object.keys(handlerRecord);
	const source = fs.readFileSync(STATE_EVENTS_PATH, "utf-8");
	const eventTypes = countStateEventMembers(source);

	it("should find event types in StateEvent union", () => {
		expect(eventTypes.length).toBeGreaterThan(0);
	});

	it("should have handler count matching StateEvent union member count", () => {
		expect(handlerKeys.length).toBe(eventTypes.length);
	});

	it("should have a handler for every StateEvent type", () => {
		const missing = eventTypes.filter((t) => !handlerKeys.includes(t));
		if (missing.length > 0) {
			expect.fail(`Missing handlers for event types: ${missing.join(", ")}`);
		}
	});

	it("should not have handlers for non-existent event types", () => {
		const extra = handlerKeys.filter((k) => !eventTypes.includes(k));
		if (extra.length > 0) {
			expect.fail(`Handlers exist for unknown event types: ${extra.join(", ")}`);
		}
	});

	// Smoke-test reduce() for each event type with minimal valid input
	describe("reduce() smoke test per event type", () => {
		const ts = "2026-01-01T00:00:00.000Z";

		// Minimal valid events for each type
		const minimalEvents: Record<string, Record<string, unknown>> = {
			INIT_PROJECT: { type: "INIT_PROJECT", name: "test", ts },
			CREATE_EPIC: { type: "CREATE_EPIC", name: "e1", goal: "g", ts },
			BEGIN_EXPLORE: { type: "BEGIN_EXPLORE", epic: "e1", ts },
			COMPLETE_EXPLORE: { type: "COMPLETE_EXPLORE", epic: "e1", ts },
			BEGIN_ARCHITECTURE: { type: "BEGIN_ARCHITECTURE", epic: "e1", ts },
			COMPLETE_ARCHITECTURE: { type: "COMPLETE_ARCHITECTURE", epic: "e1", ts },
			BEGIN_REFINE_ARCHITECTURE: { type: "BEGIN_REFINE_ARCHITECTURE", epic: "e1", ts },
			COMPLETE_REFINE_ARCHITECTURE: {
				type: "COMPLETE_REFINE_ARCHITECTURE",
				epic: "e1",
				ts,
				scores: { quality: 8 },
			},
			BEGIN_SLICING: { type: "BEGIN_SLICING", epic: "e1", ts },
			COMPLETE_SLICING: { type: "COMPLETE_SLICING", epic: "e1", ts },
			BEGIN_REFINE_SLICES: { type: "BEGIN_REFINE_SLICES", epic: "e1", ts },
			COMPLETE_REFINE_SLICES: {
				type: "COMPLETE_REFINE_SLICES",
				epic: "e1",
				ts,
				scores: { quality: 8 },
			},
			ACTIVATE_EPIC: { type: "ACTIVATE_EPIC", epic: "e1", ts },
			COMPLETE_EPIC: { type: "COMPLETE_EPIC", epic: "e1", ts, verificationResults: [], learnings: [] },
			ABANDON_EPIC: { type: "ABANDON_EPIC", epic: "e1", ts, reason: "test" },
			ADD_VERIFICATION: {
				type: "ADD_VERIFICATION",
				epic: "e1",
				ts,
				verification: { criterion: "test", description: "test" },
			},
			UPDATE_VERIFICATION: {
				type: "UPDATE_VERIFICATION",
				epic: "e1",
				ts,
				index: 0,
				verification: { criterion: "test", description: "test" },
			},
			CREATE_SLICE: { type: "CREATE_SLICE", name: "s1", epic: "e1", goal: "g", ts },
			BEGIN_PLAN: { type: "BEGIN_PLAN", epic: "e1", slice: "s1", ts },
			COMPLETE_PLAN: { type: "COMPLETE_PLAN", epic: "e1", slice: "s1", ts },
			BEGIN_REFINEMENT: { type: "BEGIN_REFINEMENT", epic: "e1", slice: "s1", ts },
			COMPLETE_REFINEMENT_ROUND: {
				type: "COMPLETE_REFINEMENT_ROUND",
				epic: "e1",
				slice: "s1",
				ts,
				scores: { quality: 8 },
			},
			BEGIN_IMPLEMENTATION: { type: "BEGIN_IMPLEMENTATION", epic: "e1", slice: "s1", ts },
			COMPLETE_IMPLEMENTATION: { type: "COMPLETE_IMPLEMENTATION", epic: "e1", slice: "s1", ts },
			UPDATE_IMPLEMENTATION_PHASE: { type: "UPDATE_IMPLEMENTATION_PHASE", epic: "e1", slice: "s1", phase: 1, ts },
			COMPLETE_SLICE: {
				type: "COMPLETE_SLICE",
				epic: "e1",
				slice: "s1",
				ts,
				verificationPassed: true,
				deferred: [],
				learnings: [],
				architectureDelta: [],
			},
			ABANDON_SLICE: { type: "ABANDON_SLICE", epic: "e1", slice: "s1", ts, reason: "test" },
			CREATE_QUEST: { type: "CREATE_QUEST", name: "q1", goal: "g", ts },
			BEGIN_QUEST_EXPLORE: { type: "BEGIN_QUEST_EXPLORE", quest: "q1", ts },
			COMPLETE_QUEST_EXPLORE: { type: "COMPLETE_QUEST_EXPLORE", quest: "q1", ts },
			BEGIN_QUEST_PLAN: { type: "BEGIN_QUEST_PLAN", quest: "q1", ts },
			COMPLETE_QUEST_PLAN: { type: "COMPLETE_QUEST_PLAN", quest: "q1", ts },
			BEGIN_QUEST_REFINEMENT: { type: "BEGIN_QUEST_REFINEMENT", quest: "q1", ts },
			COMPLETE_QUEST_REFINEMENT_ROUND: {
				type: "COMPLETE_QUEST_REFINEMENT_ROUND",
				quest: "q1",
				ts,
				scores: { quality: 8 },
			},
			BEGIN_QUEST_IMPLEMENTATION: { type: "BEGIN_QUEST_IMPLEMENTATION", quest: "q1", ts },
			COMPLETE_QUEST_IMPLEMENTATION: { type: "COMPLETE_QUEST_IMPLEMENTATION", quest: "q1", ts },
			COMPLETE_QUEST: {
				type: "COMPLETE_QUEST",
				quest: "q1",
				ts,
				verificationPassed: true,
				learnings: [],
				architectureDelta: [],
			},
			ABANDON_QUEST: { type: "ABANDON_QUEST", quest: "q1", ts, reason: "test" },
			CREATE_TASK: { type: "CREATE_TASK", name: "t1", title: "Test task", ts },
			DROP_TASK: { type: "DROP_TASK", name: "t1", reason: "not needed", ts },
			CONVERT_TASK: { type: "CONVERT_TASK", name: "t1", to: "quest", convertedName: "q1", ts },
			CREATE_DECISION: {
				type: "CREATE_DECISION",
				id: "d1",
				domain: "test",
				title: "t",
				summary: "s",
				ts,
			},
			UPDATE_DECISION: { type: "UPDATE_DECISION", id: "d1", changes: { title: "new" }, ts },
			ROLLUP_LEARNINGS: { type: "ROLLUP_LEARNINGS", from: "slice/s1", to: "project", ts },
		};

		for (const eventType of handlerKeys) {
			it(`reduce() handles ${eventType} without throwing`, () => {
				const event = minimalEvents[eventType];
				expect(event).toBeDefined();

				// We use ZERO_STATE — most events will return a state error
				// (invalid transition) because preconditions aren't met.
				// The point is: reduce() doesn't throw an exception.
				const result = reduce(ZERO_STATE, event as never);
				expect(result).toBeDefined();

				// Result should be either a valid state or a state error
				if (isStateError(result)) {
					expect(typeof result.code).toBe("string");
					expect(typeof result.message).toBe("string");
				} else {
					expect(result.type).toBe("directory");
				}
			});
		}
	});
});
