#!/usr/bin/env bun
/**
 * Smoke test for the event engine (Phases 1-4).
 *
 * Creates a temp directory, exercises append, replay, filtering, and migration,
 * then prints a pass/fail verdict.
 *
 * Run: bun scripts/smoke-event-engine.ts
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { appendEvent } from "../src/engine/events/append.js";
import type { AppendEventOptions } from "../src/engine/events/append.js";
import { createMigrationRegistry, replayWithMigrations } from "../src/engine/events/migration.js";
import { replayEvents } from "../src/engine/events/replay.js";
import type { EventDomain } from "../src/schemas/envelope.js";

const failures: string[] = [];

function assert(condition: boolean, label: string): void {
	if (condition) {
		console.log(`  [PASS] ${label}`);
	} else {
		console.log(`  [FAIL] ${label}`);
		failures.push(label);
	}
}

function makeOpts(
	eventsPath: string,
	domain: EventDomain,
	type: string,
	payload: unknown,
): AppendEventOptions {
	return {
		eventsPath,
		scope: "epic",
		scopeRef: "smoke-epic",
		actor: { kind: "cli", id: "smoke-test" },
		branch: "main",
		commitHint: null,
		domain,
		type,
		payload,
	};
}

async function main(): Promise<void> {
	const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "smoke-event-engine-"));
	const eventsPath = path.join(tmpDir, "epic", "events.jsonl");

	try {
		// --- Step 1: Append 5 events simulating an epic lifecycle ---
		console.log("\n1. Appending 5 events...");
		const events = [
			{
				domain: "entity-lifecycle" as EventDomain,
				type: "project-initialized",
				payload: { name: "smoke-project" },
			},
			{
				domain: "entity-lifecycle" as EventDomain,
				type: "epic-created",
				payload: { name: "smoke-epic" },
			},
			{
				domain: "entity-lifecycle" as EventDomain,
				type: "epic-goal-committed",
				payload: { goal: "test the engine" },
			},
			{
				domain: "entity-lifecycle" as EventDomain,
				type: "slice-plan-drafted",
				payload: { slice: "auth" },
			},
			{
				domain: "milestone" as EventDomain,
				type: "slice-landed",
				payload: { slice: "auth", result: "success" },
			},
		];

		const appendedIds: string[] = [];
		for (const evt of events) {
			const { event } = await appendEvent(makeOpts(eventsPath, evt.domain, evt.type, evt.payload));
			appendedIds.push(event.id);
		}
		assert(appendedIds.length === 5, "Appended 5 events");

		// --- Step 2: Replay all events ---
		console.log("\n2. Replaying all events...");
		const allResult = await replayEvents({ eventsPath });
		assert(
			allResult.events.length === 5,
			`Replayed ${allResult.events.length} events (expected 5)`,
		);
		assert(allResult.skippedLines === 0, "No corrupt lines");

		// Print formatted
		for (const e of allResult.events) {
			console.log(`    ${e.type} [${e.domain}] schema:v${e.schemaVersion}`);
		}

		// --- Step 3: Replay with domain filter ---
		console.log("\n3. Replaying with domain filter (entity-lifecycle)...");
		const filteredResult = await replayEvents({
			eventsPath,
			filter: { domain: "entity-lifecycle" },
		});
		assert(
			filteredResult.events.length === 4,
			`Domain-filtered replay: ${filteredResult.events.length} events (expected 4)`,
		);

		// --- Step 4: Replay with afterId filter ---
		console.log("\n4. Replaying with afterId filter (after 2nd event)...");
		const afterIdResult = await replayEvents({
			eventsPath,
			filter: { afterId: appendedIds[1] ?? "" },
		});
		assert(
			afterIdResult.events.length === 3,
			`afterId-filtered replay: ${afterIdResult.events.length} events (expected 3)`,
		);
		assert(afterIdResult.afterIdFound === true, "afterId anchor was found");

		const afterIdEventIds = afterIdResult.events.map((e) => e.id);
		console.log(`    IDs after anchor: ${afterIdEventIds.join(", ").slice(0, 80)}...`);

		// --- Step 5: Migration (v1->v2) ---
		console.log("\n5. Registering v1->v2 migration and replaying...");
		const registry = createMigrationRegistry();
		registry.register({
			eventType: "*",
			fromVersion: 1,
			toVersion: 2,
			migrate(event) {
				const payload = event.payload as Record<string, unknown>;
				return { ...event, payload: { ...payload, migrated: true } };
			},
		});

		const migratedResult = await replayWithMigrations({
			eventsPath,
			migrations: registry,
			targetVersion: 2,
		});
		assert(
			migratedResult.events.length === 5,
			`Migrated replay: ${migratedResult.events.length} events`,
		);

		const allMigrated = migratedResult.events.every((e) => e.schemaVersion === 2);
		assert(allMigrated, "All events migrated to schemaVersion 2");

		const allHaveMigratedField = migratedResult.events.every(
			(e) => (e.payload as Record<string, unknown>).migrated === true,
		);
		assert(allHaveMigratedField, "All migrated events have migrated:true in payload");

		for (const e of migratedResult.events) {
			console.log(
				`    ${e.type} schema:v${e.schemaVersion} migrated:${(e.payload as Record<string, unknown>).migrated}`,
			);
		}

		// --- Step 6: Verify prevId chain integrity ---
		console.log("\n6. Verifying prevId chain integrity...");
		const chainResult = await replayEvents({ eventsPath });
		let chainValid = true;
		for (let i = 0; i < chainResult.events.length; i++) {
			const event = chainResult.events[i];
			if (event === undefined) continue;
			const expectedPrevId = i === 0 ? null : (chainResult.events[i - 1]?.id ?? null);
			if (event.prevId !== expectedPrevId) {
				chainValid = false;
				console.log(
					`    Chain broken at index ${i}: expected prevId=${expectedPrevId}, got ${event.prevId}`,
				);
			}
		}
		assert(chainValid, "prevId chain is intact (each event references the previous)");
	} finally {
		// --- Cleanup ---
		console.log("\n7. Cleaning up temp directory...");
		fs.rmSync(tmpDir, { recursive: true, force: true });
		console.log(`    Removed ${tmpDir}`);
	}

	// --- Verdict ---
	console.log(`\n${"=".repeat(50)}`);
	if (failures.length === 0) {
		console.log("PASS -- All smoke checks passed.");
		process.exit(0);
	} else {
		console.log(`FAIL -- ${failures.length} check(s) failed:`);
		for (const f of failures) {
			console.log(`  - ${f}`);
		}
		process.exit(1);
	}
}

main().catch((err) => {
	console.error("Smoke test crashed:", err);
	process.exit(1);
});
