import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AnyEventEnvelope } from "../../../src/schemas/envelope.js";
import { replayAllScopes } from "../../../src/engine/derived-state/replay-all-scopes.js";

function makeEventLine(
	overrides: Partial<AnyEventEnvelope> & { domain: string; type: string },
): string {
	const event: AnyEventEnvelope = {
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
	return JSON.stringify(event);
}

function writeEvents(filePath: string, ...lines: string[]): void {
	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

describe("replayAllScopes", () => {
	let tmpDir: string;
	let goodplanDir: string;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "replay-all-scopes-"));
		goodplanDir = path.join(tmpDir, ".goodplan");
		fs.mkdirSync(goodplanDir, { recursive: true });
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	it("handles empty project (no events file)", async () => {
		const state = await replayAllScopes(goodplanDir);
		expect(state.project.initialized).toBe(false);
		expect(state.epics.size).toBe(0);
		expect(state.sideQuests.size).toBe(0);
	});

	it("replays project-scope events", async () => {
		const projectEventsPath = path.join(goodplanDir, "events.jsonl");
		writeEvents(
			projectEventsPath,
			makeEventLine({
				domain: "entity-lifecycle",
				type: "project-initialized",
				payload: { name: "test-project", version: "2.0.0" },
			}),
		);

		const state = await replayAllScopes(goodplanDir);
		expect(state.project.initialized).toBe(true);
		expect(state.project.name).toBe("test-project");
	});

	it("replays epic-scope events and merges into state", async () => {
		const projectEventsPath = path.join(goodplanDir, "events.jsonl");
		writeEvents(
			projectEventsPath,
			makeEventLine({
				domain: "entity-lifecycle",
				type: "project-initialized",
				payload: { name: "test" },
			}),
		);

		const epicEventsPath = path.join(goodplanDir, "epics", "my-epic", "events.jsonl");
		writeEvents(
			epicEventsPath,
			makeEventLine({
				domain: "entity-lifecycle",
				type: "epic-created",
				scope: "epic",
				scopeRef: "my-epic",
				payload: { dir: "my-epic" },
			}),
			makeEventLine({
				domain: "entity-lifecycle",
				type: "epic-goal-committed",
				scope: "epic",
				scopeRef: "my-epic",
				payload: {},
			}),
		);

		const state = await replayAllScopes(goodplanDir);
		expect(state.project.initialized).toBe(true);
		expect(state.epics.size).toBe(1);
		const epic = state.epics.get("my-epic");
		expect(epic).toBeDefined();
		expect(epic?.phase).toBe("P1");
	});

	it("replays side-quest-scope events", async () => {
		const projectEventsPath = path.join(goodplanDir, "events.jsonl");
		writeEvents(
			projectEventsPath,
			makeEventLine({
				domain: "entity-lifecycle",
				type: "project-initialized",
				payload: { name: "test" },
			}),
		);

		const sqEventsPath = path.join(goodplanDir, "side-quests", "fix-typo", "events.jsonl");
		writeEvents(
			sqEventsPath,
			makeEventLine({
				domain: "entity-lifecycle",
				type: "side-quest-created",
				scope: "side-quest",
				scopeRef: "fix-typo",
				payload: { dir: "fix-typo" },
			}),
		);

		const state = await replayAllScopes(goodplanDir);
		expect(state.sideQuests.size).toBe(1);
		expect(state.sideQuests.get("fix-typo")).toBeDefined();
		expect(state.sideQuests.get("fix-typo")?.phase).toBe("S0");
	});

	it("handles missing epics/ and side-quests/ directories", async () => {
		const projectEventsPath = path.join(goodplanDir, "events.jsonl");
		writeEvents(
			projectEventsPath,
			makeEventLine({
				domain: "entity-lifecycle",
				type: "project-initialized",
				payload: { name: "test" },
			}),
		);

		const state = await replayAllScopes(goodplanDir);
		expect(state.project.initialized).toBe(true);
		expect(state.epics.size).toBe(0);
		expect(state.sideQuests.size).toBe(0);
	});

	it("merges multiple epics", async () => {
		const projectEventsPath = path.join(goodplanDir, "events.jsonl");
		writeEvents(
			projectEventsPath,
			makeEventLine({
				domain: "entity-lifecycle",
				type: "project-initialized",
				payload: { name: "test" },
			}),
		);

		for (const epicName of ["epic-a", "epic-b"]) {
			const epicEventsPath = path.join(goodplanDir, "epics", epicName, "events.jsonl");
			writeEvents(
				epicEventsPath,
				makeEventLine({
					domain: "entity-lifecycle",
					type: "epic-created",
					scope: "epic",
					scopeRef: epicName,
					payload: { dir: epicName },
				}),
			);
		}

		const state = await replayAllScopes(goodplanDir);
		expect(state.epics.size).toBe(2);
		expect(state.epics.has("epic-a")).toBe(true);
		expect(state.epics.has("epic-b")).toBe(true);
	});
});
