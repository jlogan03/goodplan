/**
 * Unit tests for Phase 4 derived state: full epic lifecycle P0 -> P6,
 * pause/resume, steering preference, finding disposition.
 */

import { describe, expect, it } from "vitest";
import { computeDerivedState } from "../../../src/engine/derived-state/compute.js";
import type { AnyEventEnvelope, ContentRef } from "../../../src/schemas/envelope.js";

function makeEvent(
	overrides: Partial<AnyEventEnvelope> & { domain: string; type: string },
): AnyEventEnvelope {
	return {
		id: crypto.randomUUID(),
		schemaVersion: 1,
		ts: new Date().toISOString(),
		scope: "epic",
		scopeRef: "test-epic",
		actor: { kind: "cli", id: "test" },
		branch: "main",
		commitHint: null,
		domain: overrides.domain as AnyEventEnvelope["domain"],
		type: overrides.type,
		payload: overrides.payload ?? {},
		prevId: null,
		...overrides,
	} as AnyEventEnvelope;
}

function makeContentRef(path: string): ContentRef {
	return {
		sha: "a".repeat(40),
		size: 100,
		path,
		mediaType: "text/markdown",
	};
}

/** Build events for a full epic lifecycle through P0 -> P3 */
function makeEventsToP3(): AnyEventEnvelope[] {
	const goalRef = makeContentRef("epics/test-epic/goal.md");
	const summaryRef = makeContentRef("epics/test-epic/exploration-summary.md");
	const archRef = makeContentRef("epics/test-epic/architecture-target.md");
	return [
		makeEvent({
			domain: "entity-lifecycle",
			type: "epic-created",
			payload: { directory: "test-epic" },
		}),
		makeEvent({
			domain: "entity-lifecycle",
			type: "epic-goal-drafted",
			payload: { goal: goalRef },
		}),
		makeEvent({
			domain: "entity-lifecycle",
			type: "epic-goal-committed",
			payload: { goal: goalRef },
		}),
		makeEvent({
			domain: "exploration",
			type: "exploration-cycle-started",
			payload: { cycleNumber: 1 },
		}),
		makeEvent({
			domain: "entity-lifecycle",
			type: "exploration-concluded",
			payload: { summary: summaryRef },
		}),
		makeEvent({
			domain: "entity-lifecycle",
			type: "architecture-target-drafted",
			payload: { architectureTarget: archRef },
		}),
		makeEvent({
			domain: "entity-lifecycle",
			type: "architecture-target-committed",
			payload: { architectureTarget: archRef },
		}),
	];
}

describe("epic full lifecycle (P0 -> P6)", () => {
	it("transitions P3 -> P4 on pressure-test-committed", () => {
		const ptRef = makeContentRef("epics/test-epic/pressure-test.md");
		const events = [
			...makeEventsToP3(),
			makeEvent({
				domain: "entity-lifecycle",
				type: "architecture-shape-approved",
				payload: {},
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "pressure-test-drafted",
				payload: { pressureTest: ptRef },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "pressure-test-committed",
				payload: { pressureTest: ptRef },
			}),
		];
		const state = computeDerivedState(events);
		const epic = state.epics.get("test-epic");
		expect(epic?.phase).toBe("P4");
		expect(epic?.pressureTest).toEqual(ptRef);
	});

	it("transitions P4 -> P5 on slice-set-committed", () => {
		const ptRef = makeContentRef("epics/test-epic/pressure-test.md");
		const sliceSetRef = makeContentRef("epics/test-epic/slice-set.md");
		const events = [
			...makeEventsToP3(),
			makeEvent({
				domain: "entity-lifecycle",
				type: "architecture-shape-approved",
				payload: {},
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "pressure-test-drafted",
				payload: { pressureTest: ptRef },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "pressure-test-committed",
				payload: { pressureTest: ptRef },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "slice-set-drafted",
				payload: { sliceSet: sliceSetRef },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "slice-set-committed",
				payload: { sliceSet: sliceSetRef },
			}),
		];
		const state = computeDerivedState(events);
		const epic = state.epics.get("test-epic");
		expect(epic?.phase).toBe("P5");
		expect(epic?.sliceSet).toEqual(sliceSetRef);
	});

	it("transitions P5 -> P6 on epic-activated", () => {
		const ptRef = makeContentRef("epics/test-epic/pressure-test.md");
		const sliceSetRef = makeContentRef("epics/test-epic/slice-set.md");
		const events = [
			...makeEventsToP3(),
			makeEvent({
				domain: "entity-lifecycle",
				type: "architecture-shape-approved",
				payload: {},
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "pressure-test-drafted",
				payload: { pressureTest: ptRef },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "pressure-test-committed",
				payload: { pressureTest: ptRef },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "slice-set-drafted",
				payload: { sliceSet: sliceSetRef },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "slice-set-committed",
				payload: { sliceSet: sliceSetRef },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "slice-set-shape-approved",
				payload: {},
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-activated",
				payload: {},
			}),
		];
		const state = computeDerivedState(events);
		const epic = state.epics.get("test-epic");
		expect(epic?.phase).toBe("P6");
		expect(epic?.active).toBe(true);
		expect(epic?.paused).toBe(false);
	});
});

describe("pressure test draft state", () => {
	it("sets pressureTest on pressure-test-drafted without advancing phase", () => {
		const ptRef = makeContentRef("epics/test-epic/pressure-test.md");
		const events = [
			...makeEventsToP3(),
			makeEvent({
				domain: "entity-lifecycle",
				type: "architecture-shape-approved",
				payload: {},
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "pressure-test-drafted",
				payload: { pressureTest: ptRef },
			}),
		];
		const state = computeDerivedState(events);
		const epic = state.epics.get("test-epic");
		expect(epic?.phase).toBe("P3"); // draft does not advance
		expect(epic?.pressureTest).toEqual(ptRef);
	});
});

describe("slice set draft state", () => {
	it("sets sliceSet on slice-set-drafted without advancing phase", () => {
		const ptRef = makeContentRef("epics/test-epic/pressure-test.md");
		const sliceSetRef = makeContentRef("epics/test-epic/slice-set.md");
		const events = [
			...makeEventsToP3(),
			makeEvent({
				domain: "entity-lifecycle",
				type: "architecture-shape-approved",
				payload: {},
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "pressure-test-drafted",
				payload: { pressureTest: ptRef },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "pressure-test-committed",
				payload: { pressureTest: ptRef },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "slice-set-drafted",
				payload: { sliceSet: sliceSetRef },
			}),
		];
		const state = computeDerivedState(events);
		const epic = state.epics.get("test-epic");
		expect(epic?.phase).toBe("P4"); // draft does not advance past P4
		expect(epic?.sliceSet).toEqual(sliceSetRef);
	});
});

describe("slice set shape approval", () => {
	it("sets sliceSetShapeApproved on slice-set-shape-approved", () => {
		const events = [
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-created",
				payload: { directory: "test-epic" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "slice-set-shape-approved",
				payload: {},
			}),
		];
		const state = computeDerivedState(events);
		const epic = state.epics.get("test-epic");
		expect(epic?.sliceSetShapeApproved).toBe(true);
	});

	it("sets sliceSetShapeApproved on slice-set-shape-checkpoint-auto-shaped", () => {
		const events = [
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-created",
				payload: { directory: "test-epic" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "slice-set-shape-checkpoint-auto-shaped",
				payload: {},
			}),
		];
		const state = computeDerivedState(events);
		const epic = state.epics.get("test-epic");
		expect(epic?.sliceSetShapeApproved).toBe(true);
	});

	it("defaults sliceSetShapeApproved to false", () => {
		const events = [
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-created",
				payload: { directory: "test-epic" },
			}),
		];
		const state = computeDerivedState(events);
		const epic = state.epics.get("test-epic");
		expect(epic?.sliceSetShapeApproved).toBe(false);
	});
});

describe("pause/resume cycle", () => {
	it("sets paused on epic-paused", () => {
		const events = [
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-created",
				payload: { directory: "test-epic" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-paused",
				payload: {},
			}),
		];
		const state = computeDerivedState(events);
		const epic = state.epics.get("test-epic");
		expect(epic?.paused).toBe(true);
	});

	it("clears paused on epic-resumed", () => {
		const events = [
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-created",
				payload: { directory: "test-epic" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-paused",
				payload: {},
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-resumed",
				payload: {},
			}),
		];
		const state = computeDerivedState(events);
		const epic = state.epics.get("test-epic");
		expect(epic?.paused).toBe(false);
	});

	it("activation clears paused state", () => {
		const events = [
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-created",
				payload: { directory: "test-epic" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-activated",
				payload: {},
			}),
		];
		const state = computeDerivedState(events);
		const epic = state.epics.get("test-epic");
		expect(epic?.paused).toBe(false);
		expect(epic?.active).toBe(true);
	});
});

describe("steering preference", () => {
	it("updates on epic-steering-preference-set", () => {
		const events = [
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-created",
				payload: { directory: "test-epic" },
			}),
			makeEvent({
				domain: "pause-steering",
				type: "epic-steering-preference-set",
				payload: { preference: "always-consult" },
			}),
		];
		const state = computeDerivedState(events);
		const epic = state.epics.get("test-epic");
		expect(epic?.steeringPreference).toBe("always-consult");
	});

	it("defaults to best-guess-and-flag", () => {
		const events = [
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-created",
				payload: { directory: "test-epic" },
			}),
		];
		const state = computeDerivedState(events);
		const epic = state.epics.get("test-epic");
		expect(epic?.steeringPreference).toBe("best-guess-and-flag");
	});
});

describe("finding disposition", () => {
	it("updates finding disposition from payload", () => {
		const events = [
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-created",
				payload: { directory: "test-epic" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "finding-captured",
				payload: { findingId: "f1", summary: "A finding" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "pressure-test-finding-accepted",
				payload: { findingId: "f1", disposition: "dismissed" },
			}),
		];
		const state = computeDerivedState(events);
		const epic = state.epics.get("test-epic");
		expect(epic?.findings).toHaveLength(1);
		expect(epic?.findings[0]?.disposition).toBe("dismissed");
	});

	it("sets disposition to accepted", () => {
		const events = [
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-created",
				payload: { directory: "test-epic" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "finding-captured",
				payload: { findingId: "f1", summary: "A finding" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "pressure-test-finding-accepted",
				payload: { findingId: "f1", disposition: "accepted" },
			}),
		];
		const state = computeDerivedState(events);
		const epic = state.epics.get("test-epic");
		expect(epic?.findings[0]?.disposition).toBe("accepted");
	});
});

describe("epic completion", () => {
	it("sets completed and clears active on epic-completed", () => {
		const events = [
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-created",
				payload: { directory: "test-epic" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-activated",
				payload: {},
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-completed",
				payload: {},
			}),
		];
		const state = computeDerivedState(events);
		const epic = state.epics.get("test-epic");
		expect(epic?.completed).toBe(true);
		expect(epic?.active).toBe(false);
	});
});
