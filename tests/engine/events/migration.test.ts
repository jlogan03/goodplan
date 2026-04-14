import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appendEvent } from "../../../src/engine/events/append.js";
import type { AppendEventOptions } from "../../../src/engine/events/append.js";
import {
	createMigrationRegistry,
	replayWithMigrations,
} from "../../../src/engine/events/migration.js";
import type { AnyEventEnvelope } from "../../../src/schemas/envelope.js";

function makeOpts(eventsPath: string, overrides?: Partial<AppendEventOptions>): AppendEventOptions {
	return {
		eventsPath,
		scope: "epic",
		scopeRef: "test-epic",
		actor: { kind: "cli", id: "test" },
		branch: "main",
		commitHint: null,
		domain: "entity-lifecycle",
		type: "epic-created",
		payload: { name: "test" },
		...overrides,
	};
}

function makeEvent(overrides?: Partial<AnyEventEnvelope>): AnyEventEnvelope {
	return {
		id: "00000000-0000-0000-0000-000000000001",
		schemaVersion: 1,
		ts: "2026-01-01T00:00:00.000Z",
		scope: "epic",
		scopeRef: "test-epic",
		actor: { kind: "cli", id: "test" },
		branch: "main",
		commitHint: null,
		domain: "entity-lifecycle",
		type: "epic-created",
		payload: { name: "test" },
		prevId: null,
		...overrides,
	};
}

describe("MigrationRegistry", () => {
	it("no migration needed -- event at target version passes through unchanged", () => {
		const registry = createMigrationRegistry();
		const event = makeEvent({ schemaVersion: 1 });

		const result = registry.migrateEvent(event, 1);

		expect(result.schemaVersion).toBe(1);
		expect(result.payload).toEqual({ name: "test" });
	});

	it("single migration -- v1 to v2 adds a field", () => {
		const registry = createMigrationRegistry();
		registry.register({
			eventType: "epic-created",
			fromVersion: 1,
			toVersion: 2,
			migrate(event) {
				const payload = event.payload as Record<string, unknown>;
				return { ...event, payload: { ...payload, migrated: true } };
			},
		});

		const event = makeEvent({ schemaVersion: 1 });
		const result = registry.migrateEvent(event, 2);

		expect(result.schemaVersion).toBe(2);
		expect((result.payload as Record<string, unknown>).migrated).toBe(true);
		expect((result.payload as Record<string, unknown>).name).toBe("test");
	});

	it("chained migration -- v1 to v3 applies both steps", () => {
		const registry = createMigrationRegistry();
		registry.register({
			eventType: "epic-created",
			fromVersion: 1,
			toVersion: 2,
			migrate(event) {
				const payload = event.payload as Record<string, unknown>;
				return { ...event, payload: { ...payload, v2field: "added-in-v2" } };
			},
		});
		registry.register({
			eventType: "epic-created",
			fromVersion: 2,
			toVersion: 3,
			migrate(event) {
				const payload = event.payload as Record<string, unknown>;
				return { ...event, payload: { ...payload, v3field: "added-in-v3" } };
			},
		});

		const event = makeEvent({ schemaVersion: 1 });
		const result = registry.migrateEvent(event, 3);

		expect(result.schemaVersion).toBe(3);
		const payload = result.payload as Record<string, unknown>;
		expect(payload.v2field).toBe("added-in-v2");
		expect(payload.v3field).toBe("added-in-v3");
	});

	it("unknown event type passes through unchanged", () => {
		const registry = createMigrationRegistry();
		registry.register({
			eventType: "epic-created",
			fromVersion: 1,
			toVersion: 2,
			migrate(event) {
				return { ...event, payload: { migrated: true } };
			},
		});

		const event = makeEvent({ type: "unknown-type", schemaVersion: 1 });
		const result = registry.migrateEvent(event, 2);

		expect(result.schemaVersion).toBe(1);
		expect(result.payload).toEqual({ name: "test" });
	});

	it("wildcard migration applies to any event type", () => {
		const registry = createMigrationRegistry();
		registry.register({
			eventType: "*",
			fromVersion: 1,
			toVersion: 2,
			migrate(event) {
				const payload = event.payload as Record<string, unknown>;
				return { ...event, payload: { ...payload, wildcardApplied: true } };
			},
		});

		const event = makeEvent({ type: "some-random-type", schemaVersion: 1 });
		const result = registry.migrateEvent(event, 2);

		expect(result.schemaVersion).toBe(2);
		expect((result.payload as Record<string, unknown>).wildcardApplied).toBe(true);
	});

	it("type-specific migration takes precedence over wildcard -- both do NOT run", () => {
		const registry = createMigrationRegistry();
		registry.register({
			eventType: "*",
			fromVersion: 1,
			toVersion: 2,
			migrate(event) {
				const payload = event.payload as Record<string, unknown>;
				return { ...event, payload: { ...payload, wildcardApplied: true } };
			},
		});
		registry.register({
			eventType: "epic-created",
			fromVersion: 1,
			toVersion: 2,
			migrate(event) {
				const payload = event.payload as Record<string, unknown>;
				return { ...event, payload: { ...payload, typeSpecificApplied: true } };
			},
		});

		const event = makeEvent({ schemaVersion: 1 });
		const result = registry.migrateEvent(event, 2);

		expect(result.schemaVersion).toBe(2);
		const payload = result.payload as Record<string, unknown>;
		// Type-specific wins
		expect(payload.typeSpecificApplied).toBe(true);
		// Wildcard did NOT run
		expect(payload.wildcardApplied).toBeUndefined();
	});

	it("already at target version -- no migration applied", () => {
		const registry = createMigrationRegistry();
		registry.register({
			eventType: "epic-created",
			fromVersion: 3,
			toVersion: 4,
			migrate(event) {
				return { ...event, payload: { shouldNotRun: true } };
			},
		});

		const event = makeEvent({ schemaVersion: 3 });
		const result = registry.migrateEvent(event, 3);

		expect(result.schemaVersion).toBe(3);
		expect(result.payload).toEqual({ name: "test" });
	});

	it("above target version -- never downgrade", () => {
		const registry = createMigrationRegistry();

		const event = makeEvent({ schemaVersion: 3 });
		const result = registry.migrateEvent(event, 2);

		expect(result.schemaVersion).toBe(3);
		expect(result.payload).toEqual({ name: "test" });
	});

	it("immutability -- original event is not mutated by migration", () => {
		const registry = createMigrationRegistry();
		registry.register({
			eventType: "epic-created",
			fromVersion: 1,
			toVersion: 2,
			migrate(event) {
				const payload = event.payload as Record<string, unknown>;
				return { ...event, payload: { ...payload, migrated: true } };
			},
		});

		const event = makeEvent({ schemaVersion: 1 });
		const originalPayload = { ...(event.payload as Record<string, unknown>) };
		const originalVersion = event.schemaVersion;

		registry.migrateEvent(event, 2);

		// Original must be unchanged
		expect(event.schemaVersion).toBe(originalVersion);
		expect(event.payload).toEqual(originalPayload);
	});
});

describe("replayWithMigrations", () => {
	let tmpDir: string;
	let eventsPath: string;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "migration-test-"));
		eventsPath = path.join(tmpDir, "scope", "events.jsonl");
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	it("round-trip: append v1 events, replay with v1->v2 migration", async () => {
		// Append 3 events at v1
		for (let i = 0; i < 3; i++) {
			await appendEvent(
				makeOpts(eventsPath, {
					type: "epic-created",
					payload: { name: `event-${i}` },
				}),
			);
		}

		const registry = createMigrationRegistry();
		registry.register({
			eventType: "epic-created",
			fromVersion: 1,
			toVersion: 2,
			migrate(event) {
				const payload = event.payload as Record<string, unknown>;
				return { ...event, payload: { ...payload, migrated: true } };
			},
		});

		const result = await replayWithMigrations({
			eventsPath,
			migrations: registry,
			targetVersion: 2,
		});

		expect(result.events).toHaveLength(3);
		for (const event of result.events) {
			expect(event.schemaVersion).toBe(2);
			expect((event.payload as Record<string, unknown>).migrated).toBe(true);
		}
	});

	it("mixed versions in log -- only v1 events are migrated", async () => {
		// Append 2 events at v1
		await appendEvent(makeOpts(eventsPath, { type: "epic-created", payload: { version: "v1-a" } }));
		await appendEvent(makeOpts(eventsPath, { type: "epic-created", payload: { version: "v1-b" } }));

		// Manually write a v2 event by appending directly to the JSONL
		await appendEvent(
			makeOpts(eventsPath, {
				type: "epic-created",
				payload: { version: "v2-a" },
				schemaVersion: 2,
			}),
		);

		const registry = createMigrationRegistry();
		registry.register({
			eventType: "epic-created",
			fromVersion: 1,
			toVersion: 2,
			migrate(event) {
				const payload = event.payload as Record<string, unknown>;
				return { ...event, payload: { ...payload, migratedFromV1: true } };
			},
		});

		const result = await replayWithMigrations({
			eventsPath,
			migrations: registry,
			targetVersion: 2,
		});

		expect(result.events).toHaveLength(3);

		// First two (v1) should be migrated
		const first = result.events[0];
		expect(first).toBeDefined();
		expect(first?.schemaVersion).toBe(2);
		expect((first?.payload as Record<string, unknown>).migratedFromV1).toBe(true);

		const second = result.events[1];
		expect(second).toBeDefined();
		expect(second?.schemaVersion).toBe(2);
		expect((second?.payload as Record<string, unknown>).migratedFromV1).toBe(true);

		// Third (already v2) should pass through
		const third = result.events[2];
		expect(third).toBeDefined();
		expect(third?.schemaVersion).toBe(2);
		expect((third?.payload as Record<string, unknown>).migratedFromV1).toBeUndefined();
		expect((third?.payload as Record<string, unknown>).version).toBe("v2-a");
	});
});
