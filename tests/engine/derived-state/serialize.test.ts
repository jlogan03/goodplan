import { describe, expect, it } from "vitest";
import { computeDerivedState } from "../../../src/engine/derived-state/compute.js";
import { serializeDerivedState } from "../../../src/engine/derived-state/serialize.js";
import type { AnyEventEnvelope } from "../../../src/schemas/envelope.js";

function makeEvent(
	overrides: Partial<AnyEventEnvelope> & { domain: string; type: string },
): AnyEventEnvelope {
	return {
		id: crypto.randomUUID(),
		schemaVersion: 1,
		ts: new Date().toISOString(),
		scope: "project",
		scopeRef: null,
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

describe("serializeDerivedState", () => {
	it("converts empty state Maps to empty Records", () => {
		const state = computeDerivedState([]);
		const serialized = serializeDerivedState(state);
		expect(serialized.epics).toEqual({});
		expect(serialized.sideQuests).toEqual({});
		expect(serialized.convergenceSnapshots).toEqual({});
		expect(serialized.latestDimensionScores).toEqual({});
	});

	it("is JSON-serializable (no Maps in output)", () => {
		const events = [
			makeEvent({
				domain: "entity-lifecycle",
				type: "project-initialized",
				payload: { name: "test" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-created",
				scope: "epic",
				scopeRef: "e1",
				payload: { dir: "e1" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "slice-created",
				scope: "epic",
				scopeRef: "e1",
				payload: { dir: "s1" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "slice-implementation-chunk-started",
				scope: "epic",
				scopeRef: "e1",
				payload: { sliceDir: "s1", chunkId: "c1", description: "chunk" },
			}),
		];
		const state = computeDerivedState(events);
		const serialized = serializeDerivedState(state);

		// Should be JSON-serializable (no Maps, Sets)
		const json = JSON.stringify(serialized);
		const parsed = JSON.parse(json) as Record<string, unknown>;
		expect(parsed).toBeDefined();
		expect(typeof parsed.epics).toBe("object");
	});

	it("converts nested Maps (epics -> slices -> chunks) to Records", () => {
		const events = [
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-created",
				scope: "epic",
				scopeRef: "e1",
				payload: { dir: "e1" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "slice-created",
				scope: "epic",
				scopeRef: "e1",
				payload: { dir: "s1" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "slice-implementation-chunk-started",
				scope: "epic",
				scopeRef: "e1",
				payload: { sliceDir: "s1", chunkId: "c1", description: "chunk" },
			}),
		];
		const state = computeDerivedState(events);
		const serialized = serializeDerivedState(state);

		const epics = serialized.epics as Record<string, Record<string, unknown>>;
		const e1 = epics.e1;
		expect(e1).toBeDefined();

		const slices = e1?.slices as Record<string, Record<string, unknown>>;
		expect(slices).toBeDefined();
		const s1 = slices?.s1;
		expect(s1).toBeDefined();

		const chunks = s1?.chunks as Record<string, unknown>;
		expect(chunks).toBeDefined();
		expect(chunks?.c1).toBeDefined();
	});

	it("round-trip: serialize then parse produces equivalent plain-object structure", () => {
		const events = [
			makeEvent({
				domain: "entity-lifecycle",
				type: "project-initialized",
				payload: { name: "proj" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-created",
				scope: "epic",
				scopeRef: "e1",
				payload: { dir: "e1" },
			}),
		];
		const state = computeDerivedState(events);
		const serialized = serializeDerivedState(state);
		const json = JSON.stringify(serialized);
		const roundTripped = JSON.parse(json) as Record<string, unknown>;

		expect(roundTripped.project).toEqual(serialized.project);
		expect(roundTripped.epics).toEqual(serialized.epics);
	});

	it("preserves arrays (findings) in serialized output", () => {
		const events = [
			makeEvent({
				domain: "entity-lifecycle",
				type: "epic-created",
				scope: "epic",
				scopeRef: "e1",
				payload: { dir: "e1" },
			}),
			makeEvent({
				domain: "entity-lifecycle",
				type: "finding-captured",
				scope: "epic",
				scopeRef: "e1",
				payload: { findingId: "f1", summary: "test finding" },
			}),
		];
		const state = computeDerivedState(events);
		const serialized = serializeDerivedState(state);

		const e1 = (serialized.epics as Record<string, Record<string, unknown>>).e1;
		const findings = e1?.findings as Array<Record<string, unknown>>;
		expect(Array.isArray(findings)).toBe(true);
		expect(findings?.length).toBe(1);
		expect(findings?.[0]?.summary).toBe("test finding");
	});
});
